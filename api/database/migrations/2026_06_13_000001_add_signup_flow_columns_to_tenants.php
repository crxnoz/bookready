<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Signup-reorder phase 1 — central columns the new redirect logic
 * keys off without initializing tenancy.
 *
 *   onboarding_completed_at — mirror of business_profiles.onboarding_completed_at,
 *                             written when the wizard finishes. AuthController::
 *                             redirectFor reads this to decide between
 *                             /editor/onboard and /checkout/plan.
 *
 *   plan_selected_at        — stamped when the new /checkout/plan submit
 *                             succeeds. Gates the /checkout/trial step.
 *
 *   selected_plan           — 'solo' | 'studio'. Threaded into the trial
 *                             Stripe Checkout's price-id lookup. Distinct
 *                             from tenants.plan (which the Stripe webhook
 *                             owns once a real subscription exists).
 *
 *   selected_cycle          — 'monthly' | 'annual'. Same flow.
 *
 * All four are nullable so the migration is additive and the deploy
 * stays zero-downtime. Backfill is a separate artisan command.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $t) {
            if (! Schema::hasColumn('tenants', 'onboarding_completed_at')) {
                $t->timestamp('onboarding_completed_at')->nullable()->after('trial_acknowledged_at');
            }
            if (! Schema::hasColumn('tenants', 'plan_selected_at')) {
                $t->timestamp('plan_selected_at')->nullable()->after('onboarding_completed_at');
            }
            if (! Schema::hasColumn('tenants', 'selected_plan')) {
                $t->string('selected_plan', 20)->nullable()->after('plan_selected_at');
            }
            if (! Schema::hasColumn('tenants', 'selected_cycle')) {
                $t->string('selected_cycle', 20)->nullable()->after('selected_plan');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $t) {
            foreach (['selected_cycle', 'selected_plan', 'plan_selected_at', 'onboarding_completed_at'] as $col) {
                if (Schema::hasColumn('tenants', $col)) {
                    $t->dropColumn($col);
                }
            }
        });
    }
};
