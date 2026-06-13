<?php

namespace App\Console\Commands;

use App\Mail\PreTrialReaperWarningMail;
use App\Models\Tenant;
use App\Support\BillingInternal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Pre-trial garbage collector.
 *
 * Tenants that signed up but never finished the trial setup chew
 * through real infrastructure — a MySQL database, a subdomain row, a
 * provisioning queue slot, seeded content, storage for any uploaded
 * media. Without a reaper, every bot / abandoned account holds a
 * subdomain forever and costs us money.
 *
 * Two-stage reaper:
 *   - Day 14 (warn) → email the owner "your site will be removed in 7 days"
 *   - Day 21 (delete) → drop the tenant DB, the central rows, the domain
 *
 * "Day N" is measured from tenants.created_at. Internal-allowlist
 * tenants are exempt regardless of state — founder / QA accounts
 * never lapse.
 *
 *   php artisan signup:reap-pre-trial --dry-run     # print the targets, change nothing
 *   php artisan signup:reap-pre-trial               # warn + delete for real
 */
class ReapPreTrialTenants extends Command
{
    protected $signature = 'signup:reap-pre-trial {--dry-run : Print targets without sending emails or deleting.}';
    protected $description = 'Email warning at day 14, delete at day 21 — only tenants stuck in pre_trial.';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        $warnThreshold   = now()->subDays(14);
        $deleteThreshold = now()->subDays(21);

        $warned  = 0;
        $deleted = 0;
        $skipped = 0;

        foreach (Tenant::where('subscription_state', Tenant::STATE_PRE_TRIAL)->get() as $tenant) {
            $owner = DB::table('users')
                ->where('tenant_id', $tenant->id)
                ->where('is_owner', 1)
                ->select('id', 'email', 'name')
                ->first();

            if ($owner && BillingInternal::isInternal($owner->email)) {
                $skipped++;
                continue;
            }

            $createdAt = $tenant->created_at;
            if (! $createdAt) { $skipped++; continue; }

            // Day 21 — delete. Order matters: warn first, then delete in
            // a separate iteration so we don't email + delete the same
            // tenant in one tick.
            if ($createdAt->lte($deleteThreshold)) {
                $this->line(sprintf('  %s DELETE %s (owner=%s, age=%dd)', $dry ? '[dry]' : '', $tenant->id, $owner->email ?? '?', $createdAt->diffInDays(now())));
                if (! $dry) {
                    $this->deleteTenant($tenant);
                }
                $deleted++;
                continue;
            }

            // Day 14 — warn. Idempotent guard: only send once. Uses a
            // simple null/value check on data.reaper_warned_at so we
            // don't need a new column.
            if ($createdAt->lte($warnThreshold)) {
                $data = is_array($tenant->data ?? null) ? $tenant->data : [];
                if (! empty($data['reaper_warned_at'])) {
                    $skipped++;
                    continue;
                }

                $this->line(sprintf('  %s WARN %s (owner=%s, age=%dd)', $dry ? '[dry]' : '', $tenant->id, $owner->email ?? '?', $createdAt->diffInDays(now())));
                if (! $dry && $owner && $owner->email) {
                    try {
                        Mail::to($owner->email)->send(new PreTrialReaperWarningMail(
                            ownerName:  $owner->name ?? 'there',
                            tenantSlug: $tenant->id,
                            createdAt:  $createdAt,
                        ));
                    } catch (\Throwable $e) {
                        Log::warning("signup:reap-pre-trial warn email failed for {$tenant->id}: " . $e->getMessage());
                    }

                    $data['reaper_warned_at'] = now()->toIso8601String();
                    Tenant::where('id', $tenant->id)->update(['data' => $data]);
                }
                $warned++;
                continue;
            }

            $skipped++;
        }

        $this->info(sprintf(
            '%s — warned=%d deleted=%d skipped=%d',
            $dry ? 'DRY RUN' : 'DONE', $warned, $deleted, $skipped,
        ));
        return self::SUCCESS;
    }

    /**
     * Hard-delete the tenant — DB, domain rows, central rows. Mirrors
     * AdminTenantDetailController::destroy + the compensating rollback
     * in TenantProvisioningService so reaped tenants don't leak schema.
     */
    private function deleteTenant(Tenant $tenant): void
    {
        try { tenancy()->end(); } catch (\Throwable $ignored) {}

        try {
            $tenant->database()->manager()->deleteDatabase($tenant);
        } catch (\Throwable $ignored) {
            try {
                $prefix  = config('tenancy.database.prefix', env('TENANCY_DB_PREFIX', 'tenant_'));
                $dbName  = $prefix . $tenant->id;
                DB::statement("DROP DATABASE IF EXISTS `{$dbName}`");
            } catch (\Throwable $ignored2) {}
        }

        try { DB::table('users')->where('tenant_id', $tenant->id)->delete(); }       catch (\Throwable $i) {}
        try { DB::table('domains')->where('tenant_id', $tenant->id)->delete(); }     catch (\Throwable $i) {}
        try { DB::table('tenant_subscriptions')->where('tenant_id', $tenant->id)->delete(); } catch (\Throwable $i) {}
        try { DB::table('tenants')->where('id', $tenant->id)->delete(); }            catch (\Throwable $i) {}

        Log::info("signup:reap-pre-trial deleted tenant {$tenant->id}");
    }
}
