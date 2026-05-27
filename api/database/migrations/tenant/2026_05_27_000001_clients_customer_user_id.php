<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 of the customer-accounts feature — link tenant `clients` rows
 * to their (optional) central `customer_users` identity.
 *
 * NULL by default: every existing `clients` row stays anonymous (no
 * BookReady account) until that customer claims an account via the
 * Phase 2 claim flow. New bookings made by a logged-in customer will
 * stamp this column on insert.
 *
 * No DB-level foreign-key constraint — `customer_users` lives in the
 * central database and tenant databases can't FK across connections.
 * Referential integrity is enforced at the application layer (the
 * claim handler validates the customer_users.id exists before linking;
 * customer-deletion unlinks rather than cascades). The cost is that a
 * direct `DELETE FROM customer_users WHERE id = X` outside the app
 * would orphan tenant rows; mitigated by routing all deletes through
 * the customer DangerController in Phase 6.
 *
 * Indexed because the cross-tenant booking listing in Phase 3 is
 * `SELECT FROM clients WHERE customer_user_id = ?` against every
 * tenant the customer touches. Without the index that's a full table
 * scan per tenant.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('clients')) return;
        if (Schema::hasColumn('clients', 'customer_user_id')) return;

        Schema::table('clients', function (Blueprint $table) {
            $table->unsignedBigInteger('customer_user_id')->nullable()->after('id');
            $table->index('customer_user_id');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('clients'))                       return;
        if (! Schema::hasColumn('clients', 'customer_user_id'))  return;

        Schema::table('clients', function (Blueprint $table) {
            try { $table->dropIndex(['customer_user_id']); } catch (\Throwable) {}
            $table->dropColumn('customer_user_id');
        });
    }
};
