<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 6 — Tenant-wide blocked dates.
 *
 * Closures that apply to the whole shop (holidays, vacations, special
 * events that take the studio offline). Per-staff vacations / personal
 * days already live in staff_blocked_dates from Phase 2; this table is
 * intentionally tenant-scoped so we don't duplicate the staff dimension.
 *
 * end_date is nullable to support a single-day block as well as a range.
 * The SlotGenerator treats `start_date <= date <= (end_date ?? start_date)`
 * as a hard close, returning an empty slot list with a friendly message.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('blocked_dates')) return;

        Schema::create('blocked_dates', function (Blueprint $table) {
            $table->id();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->string('reason', 200)->nullable();
            $table->timestamps();

            $table->index('start_date');
            $table->index(['start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blocked_dates');
    }
};
