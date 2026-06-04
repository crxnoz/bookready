<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * #155 — canonical subscription state on the tenants table.
     *
     * This is the source of truth the read-only gate + parked-page
     * renderer consult on every request. Mirrors what Stripe knows
     * but lives on the central tenants row so we don't have to
     * cross-join to tenant_subscriptions for the hot path.
     *
     * States:
     *   trialing       — in the 14-day free window, has card on file,
     *                    not yet charged. Editor read+write, public
     *                    site live, can take bookings.
     *   active         — paid subscription, recurring. Same access.
     *   past_due       — Stripe couldn't charge a renewal; we got
     *                    invoice.payment_failed. Editor still readable
     *                    + writable to let them fix the card, but
     *                    consider banner+nudge UX. We treat past_due
     *                    as still-paying for now (Stripe retries).
     *   trial_expired  — trial ended without a successful charge
     *                    (no card, declined, removed). Editor read-only,
     *                    public site parked. Data preserved.
     *   cancelled      — owner cancelled or we terminated. Same
     *                    read-only / parked behavior as trial_expired.
     *
     * Existing tenants are backfilled to `active` since they were
     * already in production before this change.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('subscription_state', 32)
                ->default('trialing')
                ->after('plan')
                ->index();
        });

        // Backfill: every tenant that existed before this migration is
        // treated as active (they were paying or in legacy free state
        // before the trial flow existed). New tenants will land on
        // 'trialing' via the default.
        DB::table('tenants')->update(['subscription_state' => 'active']);
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropIndex(['subscription_state']);
            $table->dropColumn('subscription_state');
        });
    }
};
