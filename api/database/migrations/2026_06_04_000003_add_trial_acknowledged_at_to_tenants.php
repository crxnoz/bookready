<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A5 refinement — "trial acknowledged" flag.
 *
 * Original A5 check used (stripe_id || subscription_state) to gate
 * /editor. That broke because BillingController::startTrial sets both
 * optimistically the moment the user clicks "Start free trial" —
 * BEFORE Stripe Checkout actually completes. A user who bails on the
 * Stripe page still has those fields set, so signing out and back in
 * skipped /checkout/trial.
 *
 * New rule: card capture is OPTIONAL, but the trial-info page is
 * mandatory. Users acknowledge by either:
 *   - clicking "Start free trial" (which now also stamps this flag), or
 *   - clicking the new "Skip for now" button on /checkout/trial.
 *
 * Once set, the user can navigate freely to /editor; the trial
 * countdown still runs on subscription_state for the existing
 * EnforceWriteGate machinery to lock them out after expiry.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('trial_acknowledged_at')->nullable()->after('trial_ends_at');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('trial_acknowledged_at');
        });
    }
};
