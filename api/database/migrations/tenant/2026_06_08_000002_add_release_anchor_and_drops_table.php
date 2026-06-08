<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 2 · Date Drops.
 *
 * Two changes:
 *
 *   1. booking_settings gains slot_release_anchor_date. Only used by the
 *      bi-weekly strategy — owners pick "every other Friday starting from
 *      {anchor}" so we know which Fridays count.
 *
 *   2. New slot_release_drops table backs the "custom" strategy: each
 *      row is one explicit drop ("on release_date, dates available_from
 *      … available_to become bookable"). Multiple drops supported so an
 *      owner can stack a holiday-week + a back-to-school week + …
 *
 * The four periodic columns (slot_release_frequency, *_day_of_week,
 * *_day_of_month, *_time, *_window_days) already exist on booking_settings.
 * Only anchor_date is new.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('booking_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('booking_settings', 'slot_release_anchor_date')) {
                $table->date('slot_release_anchor_date')->nullable()->after('slot_release_window_days');
            }
        });

        if (! Schema::hasTable('slot_release_drops')) {
            Schema::create('slot_release_drops', function (Blueprint $table) {
                $table->id();
                /** When this drop takes effect — at or after this date the range is bookable. */
                $table->date('release_date');
                /** Inclusive start of the bookable range. */
                $table->date('available_from');
                /** Inclusive end of the bookable range. Owner-defined; not bounded by max_days_ahead here. */
                $table->date('available_to');
                $table->timestamps();

                // Sorted listings + "active now" lookups both filter on release_date.
                $table->index('release_date');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('slot_release_drops');
        Schema::table('booking_settings', function (Blueprint $table) {
            if (Schema::hasColumn('booking_settings', 'slot_release_anchor_date')) {
                $table->dropColumn('slot_release_anchor_date');
            }
        });
    }
};
