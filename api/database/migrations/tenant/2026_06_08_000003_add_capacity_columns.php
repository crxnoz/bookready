<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 3 · Capacity Management.
 *
 * Two columns:
 *
 *   calendar_overrides.max_appointments  — per-date capacity override.
 *     Wins over booking_settings.max_appointments_per_day on the date
 *     where it's set. NULL means "use the default."
 *
 *   staff.default_daily_capacity        — per-staff overall daily cap.
 *     When a customer is booking with a specific staff member, the
 *     CapacityResolver enforces this on top of the date-level cap.
 *     NULL = unlimited (only the date-level cap applies).
 *
 * Per-staff-per-date can layer on later via a JSON column on
 * calendar_overrides. Phase 3 v1 covers the two main dimensions; the
 * spec calls out staff+date as an enhancement, not a requirement.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('calendar_overrides', function (Blueprint $table) {
            if (! Schema::hasColumn('calendar_overrides', 'max_appointments')) {
                $table->unsignedSmallInteger('max_appointments')->nullable()->after('break_end');
            }
        });

        Schema::table('staff', function (Blueprint $table) {
            if (! Schema::hasColumn('staff', 'default_daily_capacity')) {
                $table->unsignedSmallInteger('default_daily_capacity')->nullable()->after('id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('calendar_overrides', function (Blueprint $table) {
            if (Schema::hasColumn('calendar_overrides', 'max_appointments')) {
                $table->dropColumn('max_appointments');
            }
        });

        Schema::table('staff', function (Blueprint $table) {
            if (Schema::hasColumn('staff', 'default_daily_capacity')) {
                $table->dropColumn('default_daily_capacity');
            }
        });
    }
};
