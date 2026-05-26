<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 16 — Booking Questions (form builder).
 *
 * Owners can define custom questions that appear on the public booking
 * form below the customer-info step. Question types: text, textarea,
 * checkbox, dropdown, image.
 *
 * Scope:
 *   - 'all'     → question shows on every booking
 *   - 'services'→ only when the chosen service is in service_ids JSON
 *
 * Answers are stored as a JSON snapshot on the appointment so a later
 * question edit/delete doesn't rewrite history.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('booking_questions')) {
            Schema::create('booking_questions', function (Blueprint $table) {
                $table->id();
                $table->string('label', 255);
                $table->string('type', 32);           // text | textarea | checkbox | dropdown | image
                $table->json('options')->nullable();  // for dropdown: ['Option A', 'Option B', ...]
                $table->text('help_text')->nullable();
                $table->boolean('required')->default(false);
                $table->string('scope', 16)->default('all'); // all | services
                $table->json('service_ids')->nullable();     // when scope='services'
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();

                $table->index('is_active');
                $table->index('sort_order');
            });
        }

        // JSON snapshot on appointments. Keeps history immutable when an
        // owner later edits or deletes a question.
        if (Schema::hasTable('appointments') && ! Schema::hasColumn('appointments', 'question_answers')) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->json('question_answers')->nullable()->after('addons_subtotal_cents');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('appointments') && Schema::hasColumn('appointments', 'question_answers')) {
            Schema::table('appointments', function (Blueprint $table) {
                $table->dropColumn('question_answers');
            });
        }

        Schema::dropIfExists('booking_questions');
    }
};
