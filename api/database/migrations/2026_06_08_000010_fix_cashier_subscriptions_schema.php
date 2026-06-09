<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fix the Cashier subscriptions table for laravel/cashier v15.8.
 *
 * Cashier resolves a billable's subscriptions via
 *   hasMany(Subscription, $billable->getForeignKey())->where('type', ...)
 * For the Tenant billable that foreign key is `tenant_id` and the
 * discriminator column is `type`.
 *
 * The original create_subscriptions migration built a polymorphic shape
 * (billable_id / billable_type / name) that this Cashier version never
 * matches, so $tenant->subscribed()/subscription() threw
 *   SQLSTATE[42S22] Unknown column 'subscriptions.tenant_id'
 * the moment the Subscription billing screen was actually loaded. Because
 * Cashier sets tenant_id + type on insert (which the NOT NULL billable_id /
 * name columns also blocked), the table has never been read or written
 * successfully — it is empty in practice.
 *
 * Bring it to the Cashier v15.8 shape: add tenant_id + type, backfill from
 * the legacy columns if any rows somehow exist, then drop the unused ones.
 * Guarded on `tenant_id` so it's a no-op if already correct.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('subscriptions')) {
            return;
        }
        if (Schema::hasColumn('subscriptions', 'tenant_id')) {
            return; // already on the correct shape
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->string('tenant_id')->nullable()->after('id');
            $table->string('type')->nullable()->after('tenant_id');
        });

        // Backfill from the legacy polymorphic columns (no-op on an empty table).
        if (Schema::hasColumn('subscriptions', 'billable_id')) {
            DB::table('subscriptions')->update(['tenant_id' => DB::raw('billable_id')]);
        }
        if (Schema::hasColumn('subscriptions', 'name')) {
            DB::table('subscriptions')->update(['type' => DB::raw('`name`')]);
        }

        // Drop the legacy composite index (named off billable_*); tolerate absence.
        try {
            Schema::table('subscriptions', fn (Blueprint $t) => $t->dropIndex(['billable_id', 'billable_type']));
        } catch (\Throwable $e) {
            // index may not exist on some environments — ignore
        }

        Schema::table('subscriptions', function (Blueprint $table) {
            $drop = array_values(array_filter(
                ['billable_id', 'billable_type', 'name'],
                fn ($c) => Schema::hasColumn('subscriptions', $c),
            ));
            if ($drop) {
                $table->dropColumn($drop);
            }
            $table->index(['tenant_id', 'stripe_status']);
        });
    }

    public function down(): void
    {
        // Non-reversible: we don't restore the broken polymorphic shape.
    }
};
