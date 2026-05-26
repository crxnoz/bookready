<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 5 — Service add-ons.
 *
 * Three tables land together:
 *
 *   service_addons         — the catalog. Each row is a tenant-defined
 *                            add-on with its own price + duration delta.
 *   service_addon_links    — many-to-many between services and add-ons.
 *                            is_required is per-link so the same add-on
 *                            can be required for one service, optional
 *                            for another.
 *   appointment_addons     — booking-time snapshot. Captures the add-on's
 *                            price + duration at the moment the appointment
 *                            was created so later price changes don't
 *                            rewrite history. Phase 7 wires the writes.
 *
 * Prices stored as integer cents to dodge floating-point precision
 * issues — same convention payment_settings + appointments already use.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('service_addons')) {
            Schema::create('service_addons', function (Blueprint $table) {
                $table->id();
                $table->string('name', 200);
                $table->text('description')->nullable();
                $table->string('image_url', 1000)->nullable();
                $table->unsignedInteger('extra_price_cents')->default(0);
                $table->unsignedSmallInteger('extra_duration_minutes')->default(0);
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->timestamps();

                $table->index('is_active');
                $table->index('sort_order');
            });
        }

        if (! Schema::hasTable('service_addon_links')) {
            Schema::create('service_addon_links', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('service_id');
                $table->unsignedBigInteger('addon_id');
                $table->boolean('is_required')->default(false);
                $table->timestamps();

                $table->unique(['service_id', 'addon_id'], 'service_addon_links_unique');
                $table->index('service_id');
                $table->index('addon_id');
            });
        }

        if (! Schema::hasTable('appointment_addons')) {
            Schema::create('appointment_addons', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('appointment_id');
                $table->unsignedBigInteger('addon_id');
                // Snapshot at booking time. Owners can edit / archive
                // add-ons later without breaking past appointment totals.
                $table->unsignedInteger('price_snapshot_cents')->default(0);
                $table->unsignedSmallInteger('duration_snapshot_minutes')->default(0);
                $table->string('name_snapshot', 200)->nullable();
                $table->timestamps();

                $table->index('appointment_id');
                $table->index('addon_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_addons');
        Schema::dropIfExists('service_addon_links');
        Schema::dropIfExists('service_addons');
    }
};
