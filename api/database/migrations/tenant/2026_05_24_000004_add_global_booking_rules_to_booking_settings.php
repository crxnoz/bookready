<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add business-wide booking rules to the existing booking_settings table.
 *
 * These are surfaced via /editor/settings/bookings while the existing
 * columns (booking_interval_minutes, slot_release_*, buffer_*, etc.)
 * keep powering the Availability editor.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('booking_settings', function (Blueprint $table) {
            $table->boolean('booking_enabled')->default(true)->after('id');
            $table->unsignedSmallInteger('cancellation_window_hours')->default(24)->after('auto_confirm_bookings');
            $table->unsignedSmallInteger('reschedule_window_hours')->default(24)->after('cancellation_window_hours');
            $table->boolean('prevent_duplicate_client_bookings')->default(false)->after('reschedule_window_hours');
        });
    }

    public function down(): void
    {
        Schema::table('booking_settings', function (Blueprint $table) {
            $table->dropColumn([
                'booking_enabled',
                'cancellation_window_hours',
                'reschedule_window_hours',
                'prevent_duplicate_client_bookings',
            ]);
        });
    }
};
