<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 2: per-staff blocked dates (vacations / personal days).
 *
 * end_date is nullable to support a single-day block as well as ranges.
 * Phase 6 will add a tenant-wide `blocked_dates` table for closures that
 * apply to everyone; this table is intentionally staff-scoped.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('staff_blocked_dates')) return;

        Schema::create('staff_blocked_dates', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id');
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('reason', 200)->nullable();
            $table->timestamps();

            $table->index('staff_id');
            $table->index(['staff_id', 'start_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_blocked_dates');
    }
};
