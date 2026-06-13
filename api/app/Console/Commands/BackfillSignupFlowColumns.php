<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Support\BillingInternal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * One-time backfill for the signup-reorder migration. Stamps the
 * three new central columns (onboarding_completed_at,
 * plan_selected_at, selected_plan, selected_cycle) on tenants that
 * are already past the gates so the new redirectFor doesn't bounce
 * them back into onboarding / plan-pick.
 *
 * Rules:
 *   1. Any tenant whose subscription_state IS alive (trialing,
 *      active, past_due) is past every gate — mirror trial_acknowledged_at
 *      into the three new flags. selected_plan + selected_cycle
 *      best-effort from tenants.plan + 'monthly'.
 *
 *   2. Tenants whose business_profiles.onboarding_completed_at is
 *      set in their tenant DB get the central mirror, but stay at
 *      whatever state they're in.
 *
 *   3. Internal-allowlist tenants → all flags NOW so they land in
 *      /editor immediately.
 *
 *   4. cancelled / trial_expired tenants → leave NULL. They re-enter
 *      the flow at the right gate when they reactivate.
 *
 * Idempotent: re-running only updates rows whose flags are still
 * NULL. Safe to run multiple times.
 *
 *   php artisan signup:backfill
 */
class BackfillSignupFlowColumns extends Command
{
    protected $signature = 'signup:backfill {--dry-run : Print what would happen, change nothing.}';
    protected $description = 'Backfill onboarding_completed_at / plan_selected_at / selected_plan on existing tenants.';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        if (! Schema::hasColumn('tenants', 'onboarding_completed_at')) {
            $this->error('Migration 2026_06_13_000001_add_signup_flow_columns_to_tenants has not run yet.');
            return self::FAILURE;
        }

        $touched  = 0;
        $internal = 0;
        $alive    = 0;
        $synced   = 0;

        foreach (Tenant::all() as $tenant) {
            $owner = DB::table('users')->where('tenant_id', $tenant->id)->where('is_owner', 1)->value('email');

            // Rule 3 — internal allowlist tenants jump straight to active.
            if ($owner && BillingInternal::isInternal($owner)) {
                $this->stamp($tenant, [
                    'onboarding_completed_at' => $tenant->onboarding_completed_at ?? now(),
                    'plan_selected_at'        => $tenant->plan_selected_at ?? now(),
                    'selected_plan'           => $tenant->selected_plan ?? ($tenant->plan ?? 'solo'),
                    'selected_cycle'          => $tenant->selected_cycle ?? 'monthly',
                ], $dry);
                $internal++;
                $touched++;
                continue;
            }

            // Rule 1 — alive tenants (trialing/active/past_due) are past every gate.
            if (in_array($tenant->subscription_state, Tenant::STATES_PUBLIC_LIVE, true)) {
                $whenAck = $tenant->trial_acknowledged_at ?? $tenant->created_at;
                $this->stamp($tenant, [
                    'onboarding_completed_at' => $tenant->onboarding_completed_at ?? $whenAck,
                    'plan_selected_at'        => $tenant->plan_selected_at ?? $whenAck,
                    'selected_plan'           => $tenant->selected_plan ?? ($tenant->plan ?? 'solo'),
                    'selected_cycle'          => $tenant->selected_cycle ?? 'monthly',
                ], $dry);
                $alive++;
                $touched++;
                continue;
            }

            // Rule 2 — tenants who finished the wizard but haven't paid yet.
            // business_profiles.onboarding_completed_at lives on the tenant
            // DB; initialize tenancy to read it. Safe-skip if the table
            // doesn't exist for some old schema.
            try {
                tenancy()->initialize($tenant);
                $completedAt = null;
                if (Schema::hasTable('business_profiles') && Schema::hasColumn('business_profiles', 'onboarding_completed_at')) {
                    $completedAt = DB::table('business_profiles')->value('onboarding_completed_at');
                }
                tenancy()->end();

                if ($completedAt && ! $tenant->onboarding_completed_at) {
                    $this->stamp($tenant, ['onboarding_completed_at' => $completedAt], $dry);
                    $synced++;
                    $touched++;
                }
            } catch (\Throwable $e) {
                try { tenancy()->end(); } catch (\Throwable $i) {}
                Log::warning("signup:backfill skipped {$tenant->id}: " . $e->getMessage());
            }
        }

        $this->info(sprintf(
            '%s — touched=%d (internal=%d alive=%d wizard-sync=%d)',
            $dry ? 'DRY RUN' : 'DONE',
            $touched, $internal, $alive, $synced,
        ));
        return self::SUCCESS;
    }

    private function stamp(Tenant $tenant, array $updates, bool $dry): void
    {
        $clean = array_filter($updates, fn($v) => $v !== null);
        if (! $clean) return;
        $this->line('  ' . ($dry ? '[dry] ' : '') . $tenant->id . ' ← ' . json_encode($clean));
        if (! $dry) {
            Tenant::where('id', $tenant->id)->update($clean);
        }
    }
}
