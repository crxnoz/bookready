<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 7 · Waitlist.
 *
 * One row per customer waiting for a cancellation slot. When an
 * existing appointment cancels, WaitlistService::onAppointmentCancelled
 * scans this table for matches and dispatches a "spot opened" email
 * with a claim token. First-come-first-served by created_at.
 *
 * Status lifecycle:
 *   pending   → just joined, hasn't been offered anything yet
 *   notified  → spot-opened email dispatched, awaiting claim
 *   claimed   → customer clicked claim → appointment created, entry done
 *   expired   → notification window passed without a claim → re-eligible
 *               on the NEXT matching cancellation (so a missed email
 *               doesn't drop them from the queue forever)
 *   removed   → owner manually pulled them from the editor /waitlist page
 *
 * Customer fields mirror appointments — same shape so the claim handler
 * can create an appointment from a waitlist row cleanly.
 */
return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('waitlist_entries')) return;

        Schema::create('waitlist_entries', function (Blueprint $table) {
            $table->id();

            // Customer details (no account required — same shape as appointments).
            $table->string('customer_name', 200);
            $table->string('customer_email', 200);
            $table->string('customer_phone', 32)->nullable();

            // Preferred booking.
            $table->unsignedBigInteger('service_id');
            $table->unsignedBigInteger('staff_id')->nullable();
            $table->date('preferred_date')->nullable();      // null = any date in range
            $table->date('earliest_date');                    // lower bound for matching
            $table->date('latest_date');                      // upper bound (also pruned when past)
            $table->text('notes')->nullable();

            // Notification + claim state.
            $table->enum('status', ['pending', 'notified', 'claimed', 'expired', 'removed'])
                  ->default('pending');
            $table->string('claim_token', 64)->nullable()->unique();
            $table->timestamp('notified_at')->nullable();
            $table->timestamp('notification_expires_at')->nullable();
            $table->unsignedBigInteger('notified_appointment_id')->nullable(); // appointment that just cancelled
            $table->unsignedBigInteger('claimed_appointment_id')->nullable();  // appointment created on claim

            $table->timestamps();

            // Matching scan filters by status + service + date range — composite
            // index keeps the lookup cheap even with thousands of entries.
            $table->index(['status', 'service_id'], 'idx_status_service');
            $table->index('earliest_date');
            $table->index('latest_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waitlist_entries');
    }
};
