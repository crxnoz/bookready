<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Flip the default for booking_settings.auto_confirm_bookings to true.
 *
 * The original migration shipped this as default false, which meant new
 * tenants had to opt in to auto-confirm or every booking would sit as
 * a "pending request" until they manually confirmed. That's the wrong
 * default for the typical salon/barber/lash flow — almost every owner
 * wants the calendar to fill automatically.
 *
 * Existing tenant rows are NOT touched. Whatever value an owner
 * already chose stays put. This migration only affects:
 *   - new tenants provisioned after this runs (their booking_settings
 *     row is created via the column default)
 *   - any future row insert that omits the column
 *
 * No data backfill is intentional. We don't want to override settings
 * any existing owner has explicitly chosen.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('booking_settings')) return;
        Schema::table('booking_settings', function (Blueprint $table) {
            $table->boolean('auto_confirm_bookings')->default(true)->change();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('booking_settings')) return;
        Schema::table('booking_settings', function (Blueprint $table) {
            $table->boolean('auto_confirm_bookings')->default(false)->change();
        });
    }
};
