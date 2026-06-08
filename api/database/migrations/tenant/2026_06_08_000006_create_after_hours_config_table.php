<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 4 · After Hours.
 *
 * Tenant-wide config (single row) for monetizing premium time outside
 * normal working hours. After-hours slots are appended to the regular
 * list with a fee; booking one adds the fee to the appointment total
 * (same mechanism as add-ons, so it flows through the existing
 * deposit/full Stripe path untouched).
 *
 * Also adds shared surcharge columns to appointments — used by BOTH
 * after-hours (§4) and squeeze-ins (§6) so premium bookings are
 * auditable without two near-identical column sets.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('after_hours_config')) {
            Schema::create('after_hours_config', function (Blueprint $table) {
                $table->id();
                $table->boolean('enabled')->default(false);
                $table->unsignedInteger('fee_cents')->default(2500);          // +$25 default
                $table->unsignedInteger('max_extension_minutes')->default(120); // how far past close
                $table->time('latest_booking_time')->nullable();               // hard cap, e.g. 20:00
                // Who may see + book after-hours slots.
                $table->enum('access_tier', ['everyone', 'existing', 'vip'])->default('everyone');
                $table->unsignedInteger('daily_capacity')->nullable();         // separate after-hours cap (null = unlimited)
                $table->timestamps();
            });
        }

        // Shared surcharge columns on appointments.
        if (Schema::hasTable('appointments')) {
            Schema::table('appointments', function (Blueprint $table) {
                if (! Schema::hasColumn('appointments', 'is_after_hours')) {
                    $table->boolean('is_after_hours')->default(false)->after('status');
                }
                if (! Schema::hasColumn('appointments', 'surcharge_cents')) {
                    $table->unsignedInteger('surcharge_cents')->default(0)->after('is_after_hours');
                }
                if (! Schema::hasColumn('appointments', 'surcharge_reason')) {
                    $table->string('surcharge_reason', 60)->nullable()->after('surcharge_cents');
                }
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('after_hours_config');
        if (Schema::hasTable('appointments')) {
            Schema::table('appointments', function (Blueprint $table) {
                foreach (['is_after_hours', 'surcharge_cents', 'surcharge_reason'] as $c) {
                    if (Schema::hasColumn('appointments', $c)) $table->dropColumn($c);
                }
            });
        }
    }
};
