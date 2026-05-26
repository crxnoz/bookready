<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 7 — Bind appointments to a specific staff member + track the
 * add-on subtotal separately from the service price.
 *
 * appointments.staff_id is nullable so legacy bookings (and tenants
 * with only one staff member) keep working without forcing a value.
 * The SlotGenerator filters conflicts by staff when an id is set.
 *
 * appointments.addons_subtotal_cents lives next to the existing payment
 * columns so refund / receipt math can show "service + add-ons = total"
 * without re-summing the pivot. Snapshots in appointment_addons remain
 * the source of truth for what the client actually selected.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('appointments')) return;

        Schema::table('appointments', function (Blueprint $table) {
            if (! Schema::hasColumn('appointments', 'staff_id')) {
                $table->unsignedBigInteger('staff_id')->nullable()->after('service_id');
                $table->index('staff_id');
            }
            if (! Schema::hasColumn('appointments', 'addons_subtotal_cents')) {
                $table->unsignedInteger('addons_subtotal_cents')->default(0)->after('staff_id');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('appointments')) return;

        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'addons_subtotal_cents')) {
                $table->dropColumn('addons_subtotal_cents');
            }
            if (Schema::hasColumn('appointments', 'staff_id')) {
                $table->dropIndex(['staff_id']);
                $table->dropColumn('staff_id');
            }
        });
    }
};
