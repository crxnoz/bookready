<?php

namespace App\Services\Sms;

use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

/**
 * SMS quota tracking + enforcement.
 *
 * Read-side: how many SMS has a tenant sent this billing cycle, what's
 * their plan allowance, and how close are they to the cap. Powers the
 * editor "SMS usage this month" tile and the admin usage dashboard.
 *
 * Write-side gate: SmsService::send calls canSend() before hitting the
 * provider. When `services.twilio.enforce_quota` is true (default) and
 * the tenant is over the hard cap (allowance + 10% grace), the send is
 * blocked with status='over_quota' instead of going to Twilio. This is
 * a runaway-cost backstop: a misconfigured booking flow could otherwise
 * send a tenant past their plan and rack up A2P bills before we noticed.
 *
 * Source of truth:
 *   - Sends: notification_send_log, statuses 'queued'|'sent'|'delivered'
 *     (the only states that actually leave Twilio's network at cost).
 *   - Plan: the tenant's live Stripe subscription's price lookup_key,
 *     parsed exactly like BillingController::subscription. Cached 5min
 *     per tenant — plan changes don't ride hot paths.
 *   - Cycle: Stripe subscription's current_period_start / end. Falls
 *     back to calendar month for tenants without a live subscription.
 *
 * Failure mode: if the Stripe lookup chokes, fall back to the default
 * plan ('solo' / 400 SMS / calendar month) so quota enforcement never
 * blocks a send because Stripe is having a bad day. Logged so support
 * sees the degraded state.
 */
class SmsQuotaService
{
    /**
     * Per-cycle hard-cap grace, expressed as a multiplier on the
     * monthly allowance. 1.10 = allow 10% over plan before we block.
     * Gives owners breathing room for the kind of bursty week (every
     * tenant has them) without nickel-and-diming them mid-month.
     */
    public const HARD_CAP_MULTIPLIER = 1.10;

    /** Warning threshold for the editor banner. */
    public const WARNING_THRESHOLD = 0.80;

    /**
     * Full snapshot — what the editor + admin dashboard consume.
     *
     * Returns:
     *   [
     *     'used'           => int,
     *     'allowed'        => int,
     *     'effective_cap'  => int,   // allowed * HARD_CAP_MULTIPLIER
     *     'percent'        => float, // 0.0-1.0+, can exceed 1.0
     *     'remaining'      => int,   // max(0, effective_cap - used)
     *     'plan'           => ?string ('solo'|'studio'|'salon'|null),
     *     'sms_factor'     => int (1|2|3),
     *     'cycle_start'    => 'YYYY-MM-DD',
     *     'cycle_end'      => 'YYYY-MM-DD',
     *     'is_warning'     => bool,  // >= 80%
     *     'is_over_cap'    => bool,  // >= 100%
     *     'is_over_hard'   => bool,  // >= 110% (would block if enforced)
     *     'enforce_quota'  => bool,
     *   ]
     */
    public static function snapshot(string $tenantId): array
    {
        $plan = self::resolvePlan($tenantId);

        $cycleStart = $plan['cycle_start'];
        $cycleEnd   = $plan['cycle_end'];
        $allowed    = $plan['allowance'];
        $used       = self::usageBetween($tenantId, $cycleStart, $cycleEnd);

        $effectiveCap = (int) ceil($allowed * self::HARD_CAP_MULTIPLIER);
        $percent      = $allowed > 0 ? $used / $allowed : 0.0;

        return [
            'used'          => $used,
            'allowed'       => $allowed,
            'effective_cap' => $effectiveCap,
            'percent'       => round($percent, 3),
            'remaining'     => max(0, $effectiveCap - $used),
            'plan'          => $plan['plan'],
            'sms_factor'    => $plan['sms_factor'],
            'cycle_start'   => $cycleStart->toDateString(),
            'cycle_end'     => $cycleEnd->toDateString(),
            'is_warning'    => $percent >= self::WARNING_THRESHOLD,
            'is_over_cap'   => $percent >= 1.0,
            'is_over_hard'  => $used >= $effectiveCap,
            'enforce_quota' => (bool) config('services.twilio.enforce_quota', true),
        ];
    }

    /**
     * The gate SmsService::send calls. Returns [allowed, reason].
     *
     *   reason === null on allow.
     *   reason === 'over_quota' when the hard cap is exceeded.
     *
     * When enforce_quota is false (config flag), this method always
     * returns allowed=true even when usage is over cap. The snapshot
     * still reports the over-cap state, so the editor banner keeps
     * working as a soft warning during the off-by-default rollout.
     */
    public static function canSend(string $tenantId): array
    {
        if (! (bool) config('services.twilio.enforce_quota', true)) {
            return [true, null];
        }

        // Resolve under-cap state directly — avoids the snapshot()
        // overhead of computing percent / remaining / labels.
        $plan = self::resolvePlan($tenantId);
        $effectiveCap = (int) ceil($plan['allowance'] * self::HARD_CAP_MULTIPLIER);
        $used = self::usageBetween($tenantId, $plan['cycle_start'], $plan['cycle_end']);

        if ($used >= $effectiveCap) {
            return [false, 'over_quota'];
        }
        return [true, null];
    }

    /**
     * Resolve plan + cycle window. 5-minute cache per tenant: plan
     * changes mid-cycle are rare, and SMS sends are hot enough that
     * a per-send Stripe roundtrip would add noticeable latency
     * (Stripe p99 is ~200ms over the public internet).
     *
     * Returns the same shape regardless of how the plan was found,
     * including the fallback path (default Solo / calendar month) so
     * callers don't need to special-case missing data.
     */
    private static function resolvePlan(string $tenantId): array
    {
        $cacheKey = "sms_quota.plan.{$tenantId}";

        return Cache::remember($cacheKey, 300, function () use ($tenantId) {
            $tenant = Tenant::find($tenantId);
            if (! $tenant) return self::defaultPlan();

            try {
                // Pull the live Stripe subscription with the price expanded
                // so we can read lookup_key without a second roundtrip.
                $stripeSubId = null;
                $localSub = $tenant->subscription('default');
                if ($localSub && $localSub->stripe_id) {
                    $stripeSubId = $localSub->stripe_id;
                }

                if (! $stripeSubId) {
                    return self::defaultPlan();
                }

                $stripeSub = Cashier::stripe()->subscriptions->retrieve($stripeSubId, [
                    'expand' => ['items.data.price'],
                ]);

                $price = $stripeSub->items->data[0]->price ?? null;
                $lookupKey = $price?->lookup_key;

                $plan = null;
                $smsFactor = 1;
                if ($lookupKey && preg_match('/^br_(solo|studio|salon)_(monthly|annual)_(\d+)x$/', $lookupKey, $m)) {
                    $plan      = $m[1];
                    $smsFactor = max(1, (int) $m[3]);
                }

                $smsBase  = $plan ? (int) (config("plans.plans.{$plan}.sms_base") ?? 0) : 0;
                $allowance = $smsBase * $smsFactor;

                $cycleStart = $stripeSub->current_period_start
                    ? Carbon::createFromTimestamp($stripeSub->current_period_start)
                    : Carbon::now()->startOfMonth();
                $cycleEnd = $stripeSub->current_period_end
                    ? Carbon::createFromTimestamp($stripeSub->current_period_end)
                    : Carbon::now()->endOfMonth();

                // If we got a Stripe subscription but couldn't parse the
                // plan / read allowance — treat as default rather than 0,
                // so quota doesn't block sends on a price drift.
                if ($plan === null || $allowance <= 0) {
                    $default = self::defaultPlan();
                    return [
                        'plan'        => $default['plan'],
                        'sms_factor'  => $default['sms_factor'],
                        'allowance'   => $default['allowance'],
                        // ...but keep the Stripe cycle window if we have it.
                        'cycle_start' => $cycleStart,
                        'cycle_end'   => $cycleEnd,
                    ];
                }

                return [
                    'plan'        => $plan,
                    'sms_factor'  => $smsFactor,
                    'allowance'   => $allowance,
                    'cycle_start' => $cycleStart,
                    'cycle_end'   => $cycleEnd,
                ];
            } catch (\Throwable $e) {
                Log::warning('sms_quota.resolve_plan failed; using default', [
                    'tenant_id' => $tenantId,
                    'error'     => $e->getMessage(),
                ]);
                return self::defaultPlan();
            }
        });
    }

    /**
     * Fallback plan resolution: trial tenants, tenants without a Stripe
     * sub, or any error path. Solo base SMS (400) over the calendar
     * month. Generous enough that the only thing it gates is a
     * misconfigured runaway flow.
     */
    private static function defaultPlan(): array
    {
        $base = (int) (config('plans.plans.solo.sms_base') ?? 400);
        return [
            'plan'        => null,
            'sms_factor'  => 1,
            'allowance'   => $base,
            'cycle_start' => Carbon::now()->startOfMonth(),
            'cycle_end'   => Carbon::now()->endOfMonth(),
        ];
    }

    /**
     * Count of billable SMS in the window. Only counts statuses that
     * actually leave Twilio at cost:
     *   - queued     (Twilio accepted, in flight)
     *   - sent       (delivery callback received, downstream in progress)
     *   - delivered  (carrier confirmed)
     *
     * Excluded: dry_run (Twilio not configured), opted_out (TCPA
     * suppression), failed (Twilio rejected — no charge), undelivered
     * (carrier dropped — generally no charge), over_quota (this
     * service blocked the send before Twilio).
     */
    private static function usageBetween(string $tenantId, Carbon $start, Carbon $end): int
    {
        return (int) DB::table('notification_send_log')
            ->where('tenant_id', $tenantId)
            ->where('channel', 'sms')
            ->whereIn('status', ['queued', 'sent', 'delivered'])
            ->whereBetween('created_at', [$start, $end])
            ->count();
    }
}
