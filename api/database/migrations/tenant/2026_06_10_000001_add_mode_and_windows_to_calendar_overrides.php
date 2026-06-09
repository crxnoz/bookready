<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 follow-up — custom slot windows per override.
 *
 * Until now an override defined a date's hours via a single open_time /
 * close_time pair (plus an optional break). That assumes the tech works
 * one contiguous block per day. For techs with irregular schedules
 * ("I'm free 9-10am and 2-3pm Saturday, nothing in between") that
 * single-block model can't express their availability — the existing
 * break field gives them ONE gap, not arbitrary N gaps.
 *
 * This migration adds:
 *
 *   mode          'open_close' (default; existing behaviour) or
 *                 'custom_slots' (use slot_windows instead of open/close).
 *
 *   slot_windows  JSON array of { start: "HH:MM", end: "HH:MM" } objects.
 *                 Used only when mode='custom_slots'. SlotGenerator runs
 *                 once per window — each window becomes its own mini day
 *                 from the generator's perspective, no break logic since
 *                 windows are explicit.
 *
 * Backwards-compatible: every existing override defaults to open_close
 * with null slot_windows, so its behaviour is unchanged.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('calendar_overrides', function (Blueprint $table) {
            $table->string('mode', 16)->default('open_close')->after('is_available');
            $table->json('slot_windows')->nullable()->after('break_end');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_overrides', function (Blueprint $table) {
            $table->dropColumn(['mode', 'slot_windows']);
        });
    }
};
