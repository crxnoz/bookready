<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Per-customer per-day appointment cap.
 *
 * Most beauty businesses don't want one customer hogging multiple slots
 * on the same day (they want fairness, and they want enough slot churn
 * to fit other customers in). But some businesses absolutely do allow
 * back-to-back same-day visits (multi-service customers, lash+brow in
 * one trip booked as two appointments, etc.). So this is configurable:
 *
 *   1 (default) = one appointment per customer per day. The common case.
 *   N          = up to N per day.
 *   NULL       = unlimited (legacy behavior; opt-in).
 *
 * Existing tenants don't get rewritten; only the column default applies
 * to brand-new booking_settings rows.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('booking_settings')) return;
        if (Schema::hasColumn('booking_settings', 'max_appointments_per_customer_per_day')) return;

        Schema::table('booking_settings', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_appointments_per_customer_per_day')
                ->default(1)
                ->nullable()
                ->after('prevent_duplicate_client_bookings');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('booking_settings')) return;
        if (! Schema::hasColumn('booking_settings', 'max_appointments_per_customer_per_day')) return;

        Schema::table('booking_settings', function (Blueprint $table) {
            $table->dropColumn('max_appointments_per_customer_per_day');
        });
    }
};
