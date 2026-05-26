<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2: per-staff working hours.
 *
 * Mirrors the shape of the business `hours` table but keyed by staff_id.
 * Empty rows = staff inherits the business hours. The SlotGenerator
 * (Phase 7) will read this table when a service has assigned staff.
 *
 * Each (staff_id, day_of_week) is unique so we can do an idempotent
 * upsert from the editor. is_open uses the same naming as the new
 * editor UI even though the business table uses is_closed — newer
 * code reads more naturally with the positive form.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staff_hours')) return;

        Schema::create('staff_hours', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id');
            $table->unsignedTinyInteger('day_of_week'); // 0=Sunday … 6=Saturday
            $table->boolean('is_open')->default(false);
            $table->time('open_time')->nullable();
            $table->time('close_time')->nullable();
            $table->time('break_start')->nullable();
            $table->time('break_end')->nullable();
            $table->timestamps();

            $table->unique(['staff_id', 'day_of_week'], 'staff_hours_staff_dow_unique');
            $table->index('staff_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_hours');
    }
};
