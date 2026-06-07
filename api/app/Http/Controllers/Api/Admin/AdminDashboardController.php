<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Artisan;

/**
 * BookReady operator admin — platform analytics dashboard.
 *
 * Listed under /api/v1/admin/* and guarded by EnsureAdmin (users.is_admin).
 * Platform-side, NOT tenant-side. Do not mix with editor controllers.
 *
 * PHASE 1 (daily-briefing MVP). Everything here reads the CENTRAL DB only
 * (tenants table + config/plans.php price catalog) — no per-tenant DB
 * walking, so this endpoint is cheap even before the nightly snapshot job
 * (Phase 2) exists. Cross-tenant booking aggregates land in /trends later.
 *
 * Historical honesty note: there is no subscription history yet (Cashier
 * `subscriptions` is empty; the snapshot table is Phase 2). So the MRR
 * trajectory is RECONSTRUCTED from tenants.created_at — i.e. "what MRR
 * would have been if every currently-active tenant had been paying since
 * signup." It captures the growth *shape* correctly; it can't see tenants
 * that churned (those rows are deleted) or the 14-day trial gap before a
 * tenant converted. Good enough to read the trend on a young platform;
 * once the snapshot job accumulates real daily rows we swap to those.
 * Signups / growth ARE exact (straight off created_at). Churn isn't
 * computable from current state, so it's deferred to Phase 3 insights
 * rather than shown as a misleading 0%.
 */
class AdminDashboardController extends Controller
{
    /** Monthly price in cents for a paid plan slug; 0 for trial/unknown. */
    private function planMonthlyCents(?string $plan): int
    {
        if (! $plan) return 0;
        $plans = config('plans.plans', []);
        return (int) ($plans[$plan]['monthly_base_cents'] ?? 0);
    }

    /** Compact plan catalog for the frontend (label + monthly price). */
    private function planCatalog(): array
    {
        $out = [];
        foreach (config('plans.plans', []) as $slug => $p) {
            $out[$slug] = [
                'label'        => $p['label'] ?? ucfirst($slug),
                'monthly_cents'=> (int) ($p['monthly_base_cents'] ?? 0),
            ];
        }
        return $out;
    }

    /**
     * GET /api/v1/admin/dashboard/summary
     *
     * One composed payload for the Phase-1 dashboard. Cached 5 minutes;
     * the page's Refresh button busts it by appending a cache-skip param
     * is not supported — instead the cache window is short enough that a
     * reload within the hour shows fresh-enough numbers.
     */
    public function summary(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:summary:v1', 300, function () {
            $now  = now();

            // Pull every tenant once — small central table, cheap.
            // We only need a few columns for all the aggregates below.
            $tenants = Tenant::query()
                ->get(['id', 'plan', 'subscription_state', 'created_at']);

            $isActive  = fn ($t) => $t->subscription_state === 'active';
            $isTrial   = fn ($t) => $t->subscription_state === 'trialing';

            // ── KPI: active / trial counts + 7-day deltas ──
            $weekAgo     = $now->copy()->subDays(7);
            $twoWeeksAgo = $now->copy()->subDays(14);

            $activeTenants = $tenants->filter($isActive);
            $trialTenants  = $tenants->filter($isTrial);

            $activeDelta7d = $activeTenants
                ->filter(fn ($t) => $t->created_at && $t->created_at->gte($weekAgo))
                ->count();
            $trialDelta7d = $trialTenants
                ->filter(fn ($t) => $t->created_at && $t->created_at->gte($weekAgo))
                ->count();

            // ── KPI: MRR (sum of active tenants' monthly plan price) ──
            $mrrCents = 0;
            foreach ($activeTenants as $t) {
                $mrrCents += $this->planMonthlyCents($t->plan);
            }
            // Reconstructed MRR as of 7 days ago = active tenants that
            // already existed a week ago. The delta is the rest.
            $mrrCentsPrev = 0;
            foreach ($activeTenants as $t) {
                if ($t->created_at && $t->created_at->lt($weekAgo)) {
                    $mrrCentsPrev += $this->planMonthlyCents($t->plan);
                }
            }
            $mrrDeltaCents = $mrrCents - $mrrCentsPrev;

            // ── KPI: new signups this week vs previous week ──
            $newSignups7d = $tenants
                ->filter(fn ($t) => $t->created_at && $t->created_at->gte($weekAgo))
                ->count();
            $newSignupsPrev7d = $tenants
                ->filter(fn ($t) => $t->created_at
                    && $t->created_at->gte($twoWeeksAgo)
                    && $t->created_at->lt($weekAgo))
                ->count();

            // ── MRR trajectory: 12 weekly buckets, stacked by plan ──
            // For each week-ending date, sum the monthly price of every
            // currently-active tenant that had signed up by that date.
            $mrrSeries = [];
            for ($w = 11; $w >= 0; $w--) {
                $weekEnd = $now->copy()->subWeeks($w)->endOfWeek();
                $byPlan  = ['solo' => 0, 'studio' => 0, 'salon' => 0];
                foreach ($activeTenants as $t) {
                    if ($t->created_at && $t->created_at->lte($weekEnd)) {
                        $plan = $t->plan;
                        if (isset($byPlan[$plan])) {
                            $byPlan[$plan] += $this->planMonthlyCents($plan);
                        }
                    }
                }
                $mrrSeries[] = array_merge(
                    ['week' => $weekEnd->toDateString()],
                    $byPlan,
                );
            }

            // ── Growth: weekly new-signups + cumulative tenant count,
            //    13 weeks (~90 days). Exact from created_at. ──
            $growthSeries = [];
            for ($w = 12; $w >= 0; $w--) {
                $weekStart = $now->copy()->subWeeks($w)->startOfWeek();
                $weekEnd   = $now->copy()->subWeeks($w)->endOfWeek();
                $signups = $tenants->filter(fn ($t) =>
                    $t->created_at
                    && $t->created_at->betweenIncluded($weekStart, $weekEnd)
                )->count();
                $cumulative = $tenants->filter(fn ($t) =>
                    $t->created_at && $t->created_at->lte($weekEnd)
                )->count();
                $growthSeries[] = [
                    'week'       => $weekStart->toDateString(),
                    'signups'    => $signups,
                    'cumulative' => $cumulative,
                ];
            }

            // ── Activity feed: most recent signups with current status. ──
            $activity = $tenants
                ->filter(fn ($t) => $t->created_at)
                ->sortByDesc(fn ($t) => $t->created_at->getTimestamp())
                ->take(12)
                ->map(fn ($t) => [
                    'ts'     => $t->created_at->toIso8601String(),
                    'type'   => 'signup',
                    'tenant' => (string) $t->id,
                    'plan'   => $t->plan,
                    'state'  => $t->subscription_state,
                ])
                ->values()
                ->all();

            return [
                'kpis' => [
                    'active_tenants'    => $activeTenants->count(),
                    'active_delta_7d'   => $activeDelta7d,
                    'trial_tenants'     => $trialTenants->count(),
                    'trial_delta_7d'    => $trialDelta7d,
                    'mrr_cents'         => $mrrCents,
                    'mrr_delta_cents'   => $mrrDeltaCents,
                    'new_signups_7d'    => $newSignups7d,
                    'new_signups_prev_7d' => $newSignupsPrev7d,
                ],
                'mrr_series'    => $mrrSeries,
                'growth_series' => $growthSeries,
                'activity'      => $activity,
                'plan_catalog'  => $this->planCatalog(),
                'computed_at'   => $now->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/trends
     *
     * Phase 2 — cross-tenant operational view. Reads the LATEST row from
     * platform_dashboard_snapshots (written nightly by admin:snapshot) and
     * merges its per-tenant booking aggregates with central tenant info
     * (plan / state / created_at / owner) + per-tenant MRR. Returns
     * everything the heatmap, top-tenants bar, booking-volume chart, and
     * extended tenant table need — pre-merged so the frontend is dumb.
     *
     * Cheap: one central snapshot row + one tenants query + one owners
     * query. No per-tenant DB walk at request time (that's the snapshot
     * job's job). Cached 5 min.
     */
    public function trends(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:trends:v1', 300, function () {
            $now = now();

            $snap = DB::table('platform_dashboard_snapshots')
                ->orderByDesc('snapshot_date')
                ->first();

            // No snapshot yet (fresh deploy, job hasn't run). Return a
            // clear empty shape so the UI can prompt to run admin:snapshot.
            if (! $snap) {
                return [
                    'snapshot_date'  => null,
                    'stale'          => false,
                    'platform'       => null,
                    'daily_bookings' => [],
                    'top_tenants'    => [],
                    'heatmap'        => [],
                    'tenants'        => [],
                    'computed_at'    => $now->toIso8601String(),
                ];
            }

            $data = json_decode($snap->payload, true) ?: [];
            $perTenant = collect($data['per_tenant'] ?? [])->keyBy('id');

            // Stale if the latest snapshot predates yesterday (job missed).
            $snapDate = Carbon::parse($snap->snapshot_date);
            $stale = $snapDate->lt($now->copy()->subDay()->startOfDay());

            // Central tenant rows + owners (bulk, no N+1).
            $tenants = Tenant::query()->get(['id', 'plan', 'subscription_state', 'created_at']);
            $owners = User::query()
                ->where('is_owner', true)
                ->get(['tenant_id', 'name', 'email'])
                ->keyBy('tenant_id');

            // Merge each tenant with its snapshot aggregates + MRR + tier.
            $rows = $tenants->map(function ($t) use ($perTenant, $owners) {
                $agg = $perTenant->get($t->id, []);
                $bookings30d = (int) ($agg['bookings_30d'] ?? 0);
                $bookings7d  = (int) ($agg['bookings_7d'] ?? 0);
                $lastAt      = $agg['last_booking_at'] ?? null;
                $owner       = $owners->get($t->id);
                $isActive    = $t->subscription_state === 'active';

                return [
                    'id'                  => (string) $t->id,
                    'plan'                => $t->plan,
                    'state'               => $t->subscription_state,
                    'created_at'          => $t->created_at?->toIso8601String(),
                    'owner_name'          => $owner?->name,
                    'owner_email'         => $owner?->email,
                    'mrr_cents'           => $isActive ? $this->planMonthlyCents($t->plan) : 0,
                    'bookings_total'      => (int) ($agg['bookings_total'] ?? 0),
                    'bookings_30d'        => $bookings30d,
                    'bookings_7d'         => $bookings7d,
                    'bookings_prior_7d'   => (int) ($agg['bookings_prior_7d'] ?? 0),
                    'cancelled_7d'        => (int) ($agg['cancelled_7d'] ?? 0),
                    'customers_7d'        => (int) ($agg['customers_7d'] ?? 0),
                    'revenue_7d_cents'    => (int) ($agg['revenue_7d_cents'] ?? 0),
                    'last_booking_at'     => $lastAt,
                    'tier'                => $this->activityTier($lastAt),
                ];
            })->values();

            // Platform KPIs — sum/average across all tenants for both
            // the current 7d window and the prior 7d (for WoW deltas).
            $kpis = $this->computePlatformKpis($perTenant);

            // Top tenants by 30-day booking volume (drop zeros). WoW delta
            // chip alongside the count.
            $topTenants = $rows
                ->filter(fn ($r) => $r['bookings_30d'] > 0)
                ->sortByDesc('bookings_30d')
                ->take(8)
                ->map(fn ($r) => [
                    'id'                => $r['id'],
                    'bookings_30d'      => $r['bookings_30d'],
                    'bookings_7d'       => $r['bookings_7d'],
                    'bookings_prior_7d' => $r['bookings_prior_7d'],
                ])
                ->values();

            // Heatmap tiles — every tenant, lightweight.
            $heatmap = $rows->map(fn ($r) => [
                'id'              => $r['id'],
                'tier'            => $r['tier'],
                'bookings_30d'    => $r['bookings_30d'],
                'last_booking_at' => $r['last_booking_at'],
            ])->values();

            return [
                'snapshot_date'  => $snapDate->toDateString(),
                'stale'          => $stale,
                'platform'       => $data['platform'] ?? null,
                'kpis'           => $kpis,
                'daily_bookings' => $data['daily_bookings'] ?? [],
                'top_tenants'    => $topTenants,
                'heatmap'        => $heatmap,
                'tenants'        => $rows,
                'computed_at'    => $now->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * Activity tier from a tenant's last booking timestamp:
     *   alive   — booked within 7 days
     *   slowing — 8-30 days
     *   dormant — >30 days, or never booked
     */
    private function activityTier(?string $lastBookingAt): string
    {
        if (! $lastBookingAt) return 'dormant';
        $last = Carbon::parse($lastBookingAt);
        if ($last->gte(now()->subDays(7)))  return 'alive';
        if ($last->gte(now()->subDays(30))) return 'slowing';
        return 'dormant';
    }

    /**
     * Roll per-tenant snapshot aggregates up into platform-wide KPIs for
     * the activity dashboard, with both current and prior-7d values for
     * WoW delta arrows.
     *
     * Honest math note: distinct customers across tenants are SUMMED
     * (not deduped) because customer_email is per-tenant — the same
     * person booking at two tenants would count twice. In practice
     * tenants don't share customers and this is fine for trending.
     *
     * Lead time is a WEIGHTED average across tenants (weighted by their
     * 7d booking count) so a tiny tenant with one weird outlier booking
     * can't dominate the platform number.
     */
    private function computePlatformKpis(\Illuminate\Support\Collection $perTenant): array
    {
        $sum = function (string $key) use ($perTenant): int {
            return (int) $perTenant->sum(fn ($t) => (int) ($t[$key] ?? 0));
        };

        $bookings7d        = $sum('bookings_7d');
        $bookingsPrior7d   = $sum('bookings_prior_7d');
        $cancelled7d       = $sum('cancelled_7d');
        $cancelledPrior7d  = $sum('cancelled_prior_7d');
        $customers7d       = $sum('customers_7d');
        $customersPrior7d  = $sum('customers_prior_7d');
        $revenue7d         = $sum('revenue_7d_cents');
        $revenuePrior7d    = $sum('revenue_prior_7d_cents');

        $activeTenants7d      = $perTenant->filter(fn ($t) => (int) ($t['bookings_7d'] ?? 0) > 0)->count();
        $activeTenantsPrior7d = $perTenant->filter(fn ($t) => (int) ($t['bookings_prior_7d'] ?? 0) > 0)->count();

        // Weighted-average lead time across tenants.
        $weightedLead = function (string $hourKey, string $weightKey) use ($perTenant): ?float {
            $totalW = 0;
            $weighted = 0.0;
            foreach ($perTenant as $t) {
                $h = $t[$hourKey] ?? null;
                $w = (int) ($t[$weightKey] ?? 0);
                if ($h === null || $w <= 0) continue;
                $weighted += ((float) $h) * $w;
                $totalW   += $w;
            }
            return $totalW > 0 ? round($weighted / $totalW, 1) : null;
        };

        $leadHours7d       = $weightedLead('lead_hours_7d',       'bookings_7d');
        $leadHoursPrior7d  = $weightedLead('lead_hours_prior_7d', 'bookings_prior_7d');

        $cancellationPct = $bookings7d > 0
            ? round($cancelled7d / $bookings7d * 100, 1)
            : null;
        $cancellationPctPrior = $bookingsPrior7d > 0
            ? round($cancelledPrior7d / $bookingsPrior7d * 100, 1)
            : null;

        return [
            'bookings_7d'                 => $bookings7d,
            'bookings_prior_7d'           => $bookingsPrior7d,
            'active_tenants_7d'           => $activeTenants7d,
            'active_tenants_prior_7d'     => $activeTenantsPrior7d,
            'cancellation_pct_7d'         => $cancellationPct,
            'cancellation_pct_prior_7d'   => $cancellationPctPrior,
            'lead_hours_7d'               => $leadHours7d,
            'lead_hours_prior_7d'         => $leadHoursPrior7d,
            'customers_7d'                => $customers7d,
            'customers_prior_7d'          => $customersPrior7d,
            'revenue_7d_cents'            => $revenue7d,
            'revenue_prior_7d_cents'      => $revenuePrior7d,
        ];
    }

    /**
     * GET /api/v1/admin/dashboard/activity/patterns
     *
     * Time-of-day × day-of-week heatmap + lead-time histogram. Reads
     * the latest snapshot — patterns are computed during the nightly
     * walk so this endpoint is one central row + a JSON decode.
     *
     * Labels for the 8 lead-time buckets are server-side so the UI
     * stays in lock-step with what the snapshot SQL actually buckets.
     */
    public function activityPatterns(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:activity:patterns:v1', 300, function () {
            $snap = DB::table('platform_dashboard_snapshots')->orderByDesc('snapshot_date')->first();
            if (! $snap) {
                return ['snapshot_date' => null, 'matrix' => null, 'lead_time' => [], 'computed_at' => now()->toIso8601String()];
            }
            $data = json_decode($snap->payload, true) ?: [];

            $bucketLabels = [
                '<2h', '2–12h', '12–24h', '1–3d', '3–7d', '1–2w', '2–4w', '30d+',
            ];
            $buckets = $data['lead_time_buckets'] ?? array_fill(0, 8, 0);
            $leadTime = [];
            for ($i = 0; $i < 8; $i++) {
                $leadTime[] = ['label' => $bucketLabels[$i], 'count' => (int) ($buckets[$i] ?? 0)];
            }

            return [
                'snapshot_date' => $snap->snapshot_date,
                'matrix'        => $data['dow_hod_matrix'] ?? null, // [dow 0=Mon][hod 0-23]
                'lead_time'     => $leadTime,
                'computed_at'   => now()->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/activity/revenue
     *
     * 90-day daily revenue series + per-tenant 7d/30d/total revenue.
     * Estimate, NOT Stripe-precise — sums `service_price` across
     * appointments (so includes booked-but-unpaid). Useful for trend
     * tracking; not a financial source of truth.
     */
    public function activityRevenue(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:activity:revenue:v1', 300, function () {
            $snap = DB::table('platform_dashboard_snapshots')->orderByDesc('snapshot_date')->first();
            if (! $snap) {
                return [
                    'snapshot_date'  => null,
                    'kpis'           => null,
                    'daily_revenue'  => [],
                    'top_tenants'    => [],
                    'computed_at'    => now()->toIso8601String(),
                ];
            }
            $data = json_decode($snap->payload, true) ?: [];
            $perTenant = collect($data['per_tenant'] ?? []);

            $totalRevenue = (int) $perTenant->sum(fn ($t) => (int) ($t['revenue_total_cents'] ?? 0));
            $revenue30d   = (int) $perTenant->sum(fn ($t) => (int) ($t['revenue_30d_cents']   ?? 0));
            $revenue7d    = (int) $perTenant->sum(fn ($t) => (int) ($t['revenue_7d_cents']    ?? 0));
            $revenuePrior = (int) $perTenant->sum(fn ($t) => (int) ($t['revenue_prior_7d_cents'] ?? 0));

            $topTenants = $perTenant
                ->filter(fn ($t) => (int) ($t['revenue_30d_cents'] ?? 0) > 0)
                ->sortByDesc(fn ($t) => (int) ($t['revenue_30d_cents'] ?? 0))
                ->take(10)
                ->map(fn ($t) => [
                    'id'                     => (string) ($t['id'] ?? ''),
                    'revenue_7d_cents'       => (int) ($t['revenue_7d_cents'] ?? 0),
                    'revenue_30d_cents'      => (int) ($t['revenue_30d_cents'] ?? 0),
                    'revenue_prior_7d_cents' => (int) ($t['revenue_prior_7d_cents'] ?? 0),
                ])
                ->values();

            return [
                'snapshot_date' => $snap->snapshot_date,
                'kpis' => [
                    'revenue_7d_cents'       => $revenue7d,
                    'revenue_prior_7d_cents' => $revenuePrior,
                    'revenue_30d_cents'      => $revenue30d,
                    'revenue_total_cents'    => $totalRevenue,
                ],
                'daily_revenue' => $data['daily_revenue'] ?? [],
                'top_tenants'   => $topTenants,
                'computed_at'   => now()->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/insights
     *
     * Phase 3 — rule-based observations. Each rule only appears when it
     * has something to say, so the panel reads as a triage list, not a
     * wall of always-on cards. Computed from central tenants + the latest
     * snapshot's per-tenant booking aggregates. Cached 15 min.
     *
     * Severity: 'warn' (needs attention) · 'good' (positive) · 'info'.
     */
    public function insights(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:insights:v1', 900, function () {
            $now = now();

            $tenants = Tenant::query()->get(['id', 'plan', 'subscription_state', 'created_at', 'trial_ends_at']);

            $snap = DB::table('platform_dashboard_snapshots')->orderByDesc('snapshot_date')->first();
            $per  = $snap
                ? collect(json_decode($snap->payload, true)['per_tenant'] ?? [])->keyBy('id')
                : collect();

            $insights = [];

            // 1) Churn risk — active-subscription tenants with no booking in 30d.
            $churnRisk = $tenants
                ->filter(fn ($t) => $t->subscription_state === 'active')
                ->filter(function ($t) use ($per) {
                    $agg = $per->get($t->id);
                    if (! $agg) return false;          // no snapshot row → skip
                    return (int) ($agg['bookings_30d'] ?? 0) === 0;
                })
                ->map(fn ($t) => (string) $t->id)
                ->values();
            if ($churnRisk->isNotEmpty()) {
                $insights[] = [
                    'id'       => 'churn_risk',
                    'severity' => 'warn',
                    'title'    => $churnRisk->count() . ' active ' . str('tenant')->plural($churnRisk->count())
                                  . ' with no bookings in 30 days',
                    'detail'   => 'Paying tenants going quiet are the strongest churn signal. Reach out before renewal.',
                    'tenants'  => $churnRisk->all(),
                ];
            }

            // 2) Trials expiring within 7 days (still trialing).
            $expiringSoon = $tenants
                ->filter(fn ($t) => $t->subscription_state === 'trialing'
                    && $t->trial_ends_at
                    && $t->trial_ends_at->betweenIncluded($now, $now->copy()->addDays(7)))
                ->sortBy(fn ($t) => $t->trial_ends_at)
                ->map(fn ($t) => (string) $t->id)
                ->values();
            if ($expiringSoon->isNotEmpty()) {
                $insights[] = [
                    'id'       => 'trials_expiring',
                    'severity' => 'warn',
                    'title'    => $expiringSoon->count() . ' ' . str('trial')->plural($expiringSoon->count())
                                  . ' expiring this week',
                    'detail'   => 'Last-chance window to convert. A nudge email or check-in lands best now.',
                    'tenants'  => $expiringSoon->all(),
                ];
            }

            // 3) Stuck trials — trial window passed but still trialing (never
            //    converted, never explicitly canceled).
            $stuckTrials = $tenants
                ->filter(fn ($t) => $t->subscription_state === 'trialing'
                    && $t->trial_ends_at
                    && $t->trial_ends_at->lt($now))
                ->map(fn ($t) => (string) $t->id)
                ->values();
            if ($stuckTrials->isNotEmpty()) {
                $insights[] = [
                    'id'       => 'stuck_trials',
                    'severity' => 'info',
                    'title'    => $stuckTrials->count() . ' expired ' . str('trial')->plural($stuckTrials->count())
                                  . ' never converted',
                    'detail'   => 'Trial ended without a paid plan or an explicit cancel. Worth a win-back or cleanup.',
                    'tenants'  => $stuckTrials->all(),
                ];
            }

            // 4) Fastest growing — top tenant by 7d bookings whose last week
            //    beat its prior 3-week weekly average (real acceleration).
            $accelerating = $tenants
                ->map(function ($t) use ($per) {
                    $agg = $per->get($t->id);
                    if (! $agg) return null;
                    $d7  = (int) ($agg['bookings_7d'] ?? 0);
                    $d30 = (int) ($agg['bookings_30d'] ?? 0);
                    $priorWeeklyAvg = max(0, ($d30 - $d7)) / 3;
                    return $d7 > 0 && $d7 > $priorWeeklyAvg
                        ? ['id' => (string) $t->id, 'd7' => $d7, 'prior' => $priorWeeklyAvg]
                        : null;
                })
                ->filter()
                ->sortByDesc('d7')
                ->values();
            if ($accelerating->isNotEmpty()) {
                $top = $accelerating->first();
                $insights[] = [
                    'id'       => 'fastest_growing',
                    'severity' => 'good',
                    'title'    => $top['id'] . ' is accelerating',
                    'detail'   => $top['d7'] . ' bookings in the last 7 days — above its prior weekly pace. '
                                  . ($accelerating->count() > 1
                                      ? ($accelerating->count() - 1) . ' other '
                                        . str('tenant')->plural($accelerating->count() - 1) . ' also picking up.'
                                      : ''),
                    'tenants'  => $accelerating->take(5)->pluck('id')->all(),
                ];
            }

            // 5) Trial→paid conversion among tenants past their trial window.
            $pastTrial = $tenants->filter(fn ($t) =>
                $t->created_at && $t->created_at->lt($now->copy()->subDays(config('plans.trial_days', 14))));
            if ($pastTrial->isNotEmpty()) {
                $converted = $pastTrial->filter(fn ($t) => $t->subscription_state === 'active')->count();
                $rate = (int) round($converted / $pastTrial->count() * 100);
                $insights[] = [
                    'id'       => 'conversion',
                    'severity' => $rate >= 40 ? 'good' : 'info',
                    'title'    => "Trial→paid conversion: {$rate}%",
                    'detail'   => "{$converted} of {$pastTrial->count()} tenants past their "
                                  . config('plans.trial_days', 14) . "-day trial are on a paid plan. "
                                  . '(Lifetime, not month-over-month — needs the snapshot history to trend.)',
                    'tenants'  => [],
                ];
            }

            // 6) Never-booked tenants (signed up, zero appointments ever).
            $neverBooked = $tenants
                ->filter(function ($t) use ($per) {
                    $agg = $per->get($t->id);
                    return $agg && (int) ($agg['bookings_total'] ?? 0) === 0;
                })
                ->map(fn ($t) => (string) $t->id)
                ->values();
            if ($neverBooked->isNotEmpty()) {
                $insights[] = [
                    'id'       => 'never_booked',
                    'severity' => 'info',
                    'title'    => $neverBooked->count() . ' ' . str('tenant')->plural($neverBooked->count())
                                  . ' with zero bookings ever',
                    'detail'   => 'Signed up but never took a booking — onboarding drop-off or test accounts.',
                    'tenants'  => $neverBooked->all(),
                ];
            }

            return [
                'insights'      => $insights,
                'snapshot_date' => $snap?->snapshot_date,
                'computed_at'   => $now->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/health
     *
     * Operational health — every probe is independently guarded so one
     * failure (a missing log, a slow tenant DB) degrades that one tile
     * rather than blanking the card. Cached 120s; bypass with ?fresh=1
     * from the dashboard's "Re-probe" quick action.
     *
     * Each probe returns the same envelope:
     *   { status, value, note, runbook? }
     * where status ∈ ok|warn|bad|unknown and `runbook` is a one-line
     * "first thing to check" shown in the UI when status !== 'ok'.
     */
    public function health(): JsonResponse
    {
        $fresh = request()->boolean('fresh');
        if ($fresh) Cache::forget('admin:dashboard:health:v2');

        $payload = Cache::remember('admin:dashboard:health:v2', 120, fn () => $this->getHealthSnapshot());

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/health/sparklines
     *
     * Returns the last 24h of (status, numeric_value, snapshot_at) tuples
     * per trendable probe, for the inline mini-charts on /admin/system.
     * One indexed range scan per probe; cheap.
     *
     * Cached 30s — points only change every 15 min so longer caching is
     * wasted, shorter wastes a query per global refresh.
     */
    public function sparklines(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:sparklines:v1', 30, function () {
            $since = now()->copy()->subHours(24);
            $rows = DB::table('system_health_snapshots')
                ->where('snapshot_at', '>=', $since)
                ->orderBy('snapshot_at')
                ->get(['probe_key', 'snapshot_at', 'status', 'numeric_value']);

            $byProbe = [];
            foreach ($rows as $r) {
                $byProbe[$r->probe_key] ??= [];
                $byProbe[$r->probe_key][] = [
                    'at'     => Carbon::parse($r->snapshot_at)->toIso8601String(),
                    'status' => $r->status,
                    'value'  => $r->numeric_value === null ? null : (float) $r->numeric_value,
                ];
            }
            return [
                'probes'      => $byProbe,
                'since'       => $since->toIso8601String(),
                'computed_at' => now()->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * Extract a numeric trended value from a probe envelope. Returns null
     * for probes that aren't usefully trendable (mailer, last_deploy).
     * Shared by admin:health-tick and any future analytics.
     */
    public function numericValueFor(string $probeKey, array $probe): ?float
    {
        $meta = (array) ($probe['meta'] ?? []);
        return match ($probeKey) {
            'api_errors'         => (float) ($meta['count_24h'] ?? 0),
            'database'           => isset($meta['response_ms']) ? (float) $meta['response_ms'] : null,
            'disk'               => isset($meta['used_pct'])    ? (float) $meta['used_pct']    : null,
            'ssl'                => isset($meta['days_left'])   ? (float) $meta['days_left']   : null,
            'queue'              => isset($meta['depth'])       ? (float) $meta['depth']       : null,
            'snapshot_freshness' => isset($meta['hours_old'])   ? (float) $meta['hours_old']   : null,
            'scheduler'          => isset($meta['age_sec'])     ? (float) $meta['age_sec']     : null,
            'public_site'        => isset($meta['response_ms']) ? (float) $meta['response_ms'] : null,
            default              => null, // mailer + last_deploy → no trend
        };
    }

    /**
     * Pure health snapshot — same shape as /dashboard/health, but bypasses
     * caching so console commands (admin:health-alert, admin:health-digest)
     * always see live probe state. Public so both the cached HTTP endpoint
     * and the scheduled alerters can share probe code.
     */
    public function getHealthSnapshot(): array
    {
        return [
            'sections' => [
                'reliability' => [
                    'api_errors' => $this->probeApiErrors(),
                    'database'   => $this->probeDatabase(),
                    'disk'       => $this->probeDisk(),
                    'ssl'        => $this->probeSsl(),
                ],
                'background' => [
                    'queue'              => $this->probeQueue(),
                    'snapshot_freshness' => $this->probeSnapshotFreshness(),
                    'scheduler'          => $this->probeScheduler(),
                ],
                'reachability' => [
                    'public_site' => $this->probePublicSite(),
                    'mailer'      => $this->probeMailer(),
                ],
                'deploy' => [
                    'last_deploy' => $this->probeDeploy(),
                ],
            ],
            'computed_at' => now()->toIso8601String(),
        ];
    }

    /**
     * POST /api/v1/admin/dashboard/actions/{name}
     *
     * Safe maintenance actions exposed as one-click buttons on the System
     * Health page. Anything destructive (drop tables, force-renew SSL,
     * restart pm2) stays SSH-only — only operations that are idempotent
     * AND can't hurt anything in flight are allowed here.
     */
    public function runAction(string $name): JsonResponse
    {
        switch ($name) {
            case 'reprobe':
                // Bust the health cache so the next GET re-runs every probe.
                Cache::forget('admin:dashboard:health:v2');
                return response()->json(['ok' => true, 'note' => 'Health cache cleared.']);

            case 'snapshot':
                // Synchronous snapshot — slow on hundreds of tenants but the
                // user explicitly asked for it.
                try {
                    Artisan::call('admin:snapshot');
                    Cache::forget('admin:dashboard:trends:v1');
                    Cache::forget('admin:dashboard:insights:v1');
                    return response()->json(['ok' => true, 'note' => trim(Artisan::output())]);
                } catch (\Throwable $e) {
                    return response()->json(['ok' => false, 'note' => $e->getMessage()], 500);
                }

            case 'clear-cache':
                try {
                    Artisan::call('optimize:clear');
                    return response()->json(['ok' => true, 'note' => 'Config / route / view cache cleared.']);
                } catch (\Throwable $e) {
                    return response()->json(['ok' => false, 'note' => $e->getMessage()], 500);
                }

            default:
                return response()->json(['ok' => false, 'note' => 'Unknown action.'], 404);
        }
    }

    // ── DRILL-DOWNS ───────────────────────────────────────────────────────
    //
    // Three endpoints powering the "click a card → see what's actually
    // wrong" flow on /admin/system/{errors|queue|deploys}. Each is its
    // own endpoint so a slow log parse doesn't slow the cheap probes.

    /**
     * GET /api/v1/admin/dashboard/errors
     *
     * Reads the last ~2MB of laravel.log, parses entries, groups them by
     * (level + exception class + first-line digest), and returns the
     * groups + a 24-hour hourly histogram. Single pass, no DB hit.
     * Cached 60s.
     */
    public function errors(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:errors:v1', 60, function () {
            $path = storage_path('logs/laravel.log');
            if (! is_file($path)) {
                return ['groups' => [], 'histogram' => $this->emptyHourlyHistogram(),
                        'total' => 0, 'computed_at' => now()->toIso8601String()];
            }

            // Read tail (last 2MB — more than enough for 24h on a healthy
            // system; rotates daily, so old data isn't in this file anyway).
            $size = filesize($path);
            $read = 2 * 1024 * 1024;
            $fh = fopen($path, 'rb');
            if ($size > $read) fseek($fh, -$read, SEEK_END);
            $blob = stream_get_contents($fh);
            fclose($fh);

            $cutoff = now()->subDay();
            $entries = $this->parseLogEntries($blob, $cutoff);

            // Group by (level + class + normalized first line).
            $groups = [];
            $hourly = $this->emptyHourlyHistogram();
            foreach ($entries as $e) {
                $hourKey = $e['at']->copy()->startOfHour()->format('Y-m-d\TH:00:00\Z');
                if (isset($hourly[$hourKey])) $hourly[$hourKey]++;

                $key = $e['level'] . '|' . $e['class'] . '|' . $this->messageDigest($e['message']);
                if (! isset($groups[$key])) {
                    $groups[$key] = [
                        'level'         => $e['level'],
                        'class'         => $e['class'],
                        'message'       => $e['message'],
                        'count'         => 0,
                        'latest_at'     => $e['at']->toIso8601String(),
                        'sample_trace'  => $e['trace_head'],
                    ];
                }
                $groups[$key]['count']++;
                if ($e['at']->toIso8601String() > $groups[$key]['latest_at']) {
                    $groups[$key]['latest_at']    = $e['at']->toIso8601String();
                    $groups[$key]['sample_trace'] = $e['trace_head'];
                }
            }

            // Convert hourly map to ordered array.
            $hist = [];
            foreach ($hourly as $hour => $count) $hist[] = ['hour' => $hour, 'count' => $count];

            return [
                'groups'      => array_values(collect($groups)
                    ->sortByDesc('count')
                    ->take(20)
                    ->all()),
                'histogram'   => $hist,
                'total'       => count($entries),
                'computed_at' => now()->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/queue
     *
     * Pending jobs (LRANGE the redis queue, decode each blob to get the
     * displayName) + failed_jobs rows from the DB. Caller drilling in
     * after the queue card went yellow needs both — pending tells you
     * what's backed up, failed tells you what already broke.
     */
    public function queue(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:queue:v1', 30, function () {
            $conn = (string) config('queue.default', 'sync');
            $pending = [];
            $depth = 0;

            try {
                if ($conn === 'redis') {
                    $r = \Illuminate\Support\Facades\Redis::connection();
                    $depth = (int) $r->llen('queues:default');
                    // First 25 are enough — operator drills in to see WHAT's
                    // queued, not exhaustively.
                    $raw = $r->lrange('queues:default', 0, 24);
                    foreach ((array) $raw as $blob) {
                        $job = json_decode((string) $blob, true) ?: [];
                        $pending[] = [
                            'display_name' => $job['displayName'] ?? ($job['job'] ?? 'unknown'),
                            'attempts'     => $job['attempts'] ?? 0,
                            'pushed_at'    => isset($job['pushedAt'])
                                ? Carbon::createFromTimestamp($job['pushedAt'])->toIso8601String()
                                : null,
                        ];
                    }
                }
            } catch (\Throwable) {}

            $failed = [];
            try {
                if (Schema::hasTable('failed_jobs')) {
                    $failed = DB::table('failed_jobs')
                        ->orderByDesc('failed_at')
                        ->limit(25)
                        ->get(['uuid', 'connection', 'queue', 'payload', 'exception', 'failed_at'])
                        ->map(function ($row) {
                            $payload = json_decode($row->payload, true) ?: [];
                            // First line of the exception is the most useful — the
                            // full backtrace is huge but kept for "view full".
                            $excerpt = strtok((string) $row->exception, "\n");
                            return [
                                'uuid'         => $row->uuid,
                                'connection'   => $row->connection,
                                'queue'        => $row->queue,
                                'display_name' => $payload['displayName'] ?? 'unknown',
                                'failed_at'    => Carbon::parse($row->failed_at)->toIso8601String(),
                                'exception'    => $excerpt,
                                'trace_head'   => $this->headOfTrace((string) $row->exception),
                            ];
                        })
                        ->all();
                }
            } catch (\Throwable) {}

            return [
                'connection'  => $conn,
                'depth'       => $depth,
                'pending'     => $pending,
                'failed'      => $failed,
                'failed_table_exists' => Schema::hasTable('failed_jobs'),
                'computed_at' => now()->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /**
     * GET /api/v1/admin/dashboard/deploys
     *
     * Append-only log: storage/app/deploys.jsonl (one JSON object per
     * line, written by the deploy script). Reading 200 lines is cheap and
     * the file stays small even after a year of deploys.
     */
    public function deploys(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:deploys:v1', 60, function () {
            $path = storage_path('app/deploys.jsonl');
            if (! is_file($path)) {
                return ['deploys' => [], 'note' => 'No deploy log yet (next deploy populates this).',
                        'computed_at' => now()->toIso8601String()];
            }
            // Read up to 200 most recent lines.
            $lines = [];
            $fh = fopen($path, 'rb');
            $size = filesize($path);
            $read = min($size, 200 * 1024);
            if ($size > $read) fseek($fh, -$read, SEEK_END);
            $buf = stream_get_contents($fh);
            fclose($fh);
            foreach (array_reverse(array_filter(explode("\n", $buf))) as $line) {
                $row = json_decode($line, true);
                if (! is_array($row)) continue;
                $lines[] = [
                    'commit'      => isset($row['commit']) ? substr((string) $row['commit'], 0, 7) : null,
                    'message'     => $row['message'] ?? null,
                    'deployed_at' => $row['deployed_at'] ?? null,
                ];
                if (count($lines) >= 20) break;
            }
            return ['deploys' => $lines, 'computed_at' => now()->toIso8601String()];
        });

        return response()->json($payload);
    }

    // ── Helpers for drill-downs ───────────────────────────────────────────

    /** Empty 24-bucket hourly histogram, oldest → newest, ISO hour keys. */
    private function emptyHourlyHistogram(): array
    {
        $now = now()->copy()->startOfHour();
        $out = [];
        for ($i = 23; $i >= 0; $i--) {
            $out[$now->copy()->subHours($i)->format('Y-m-d\TH:00:00\Z')] = 0;
        }
        return $out;
    }

    /**
     * Parse Laravel log lines into structured entries. Multi-line stack
     * traces are folded back to their leading [YYYY-MM-DD ...] entry.
     * Returns only ERROR+ entries within the 24h window.
     *
     * Entry shape: ['at'=>Carbon, 'level', 'class', 'message', 'trace_head']
     */
    private function parseLogEntries(string $blob, Carbon $cutoff): array
    {
        $out = [];
        $current = null;

        foreach (explode("\n", $blob) as $line) {
            if (preg_match('/^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\]\s+\S+\.(ERROR|CRITICAL|ALERT|EMERGENCY):\s*(.*)$/', $line, $m)) {
                if ($current) $out[] = $current;
                try { $at = Carbon::parse($m[1]); } catch (\Throwable) { $current = null; continue; }
                if ($at->lt($cutoff)) { $current = null; continue; }

                $rest = $m[3];
                // Try to pull an exception class. Two common shapes:
                //   "SQLSTATE[42S02]: ..."
                //   "App\\Exceptions\\Foo: blah"
                //   "{...\"exception\":\"[object] (Illuminate\\Database\\QueryException(...))\"}"
                $class = '';
                if (preg_match('/\[object\] \(([A-Za-z_\\\\]+)\(/', $rest, $cm)) {
                    $class = $cm[1];
                } elseif (preg_match('/^([A-Za-z_\\\\]{6,}Exception):/', $rest, $cm)) {
                    $class = $cm[1];
                }

                // First line of the human message (before any { JSON context).
                $msg = preg_replace('/\s*\{.*$/', '', $rest);
                $msg = trim(substr((string) $msg, 0, 240));

                $current = [
                    'at'         => $at,
                    'level'      => $m[2],
                    'class'      => $class ?: 'Error',
                    'message'    => $msg,
                    'trace_head' => '',
                ];
            } elseif ($current) {
                // Continuation line — keep up to ~4 trace lines for the sample.
                $traceLines = substr_count($current['trace_head'], "\n");
                if ($traceLines < 4) {
                    $trim = rtrim($line);
                    if ($trim !== '') {
                        $current['trace_head'] = $current['trace_head'] === ''
                            ? $trim
                            : $current['trace_head'] . "\n" . $trim;
                    }
                }
            }
        }
        if ($current) $out[] = $current;
        return $out;
    }

    /** Stable digest of a log message for grouping (strip dynamic bits). */
    private function messageDigest(string $msg): string
    {
        // Replace numbers, quoted values, hex IDs — the bits that vary
        // between otherwise-identical errors. Keep first 80 chars.
        $d = preg_replace('/\d+/', '#', $msg) ?? $msg;
        $d = preg_replace('/"[^"]*"/', '"…"', $d) ?? $d;
        $d = preg_replace("/'[^']*'/", "'…'", $d) ?? $d;
        return strtolower(trim(substr($d, 0, 80)));
    }

    /** First 6 lines of an exception trace, for the failed_jobs sample. */
    private function headOfTrace(string $exception): string
    {
        $lines = explode("\n", $exception);
        return implode("\n", array_slice($lines, 0, 6));
    }

    // ── PROBES ────────────────────────────────────────────────────────────
    //
    // Every probe returns:
    //   ['status'=>ok|warn|bad|unknown, 'value'=>string,
    //    'note'=>string, 'runbook'=>string, 'meta'=>array?]
    // Frontend renders `value` as the headline, `note` as the subtext, and
    // shows `runbook` under both when status !== 'ok'.

    /** Count ERROR/CRITICAL log lines in the last 24h from the Laravel log. */
    private function probeApiErrors(): array
    {
        try {
            $path = storage_path('logs/laravel.log');
            if (! is_file($path)) {
                return ['status' => 'unknown', 'value' => '—', 'note' => 'No log file.',
                        'runbook' => 'Verify storage/logs is writable by www-data.'];
            }
            $size = filesize($path);
            $read = 512 * 1024;
            $fh = fopen($path, 'rb');
            if ($size > $read) fseek($fh, -$read, SEEK_END);
            $contents = stream_get_contents($fh);
            fclose($fh);

            $cutoff = now()->subDay();
            $count = 0;
            foreach (explode("\n", $contents) as $line) {
                if (! preg_match('/^\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\]\s+\S+\.(ERROR|CRITICAL|ALERT|EMERGENCY)/', $line, $m)) {
                    continue;
                }
                try { if (Carbon::parse($m[1])->gte($cutoff)) $count++; }
                catch (\Throwable) {}
            }
            return [
                'status'  => $count <= 2 ? 'ok' : ($count < 20 ? 'warn' : 'bad'),
                'value'   => (string) $count,
                'note'    => $count === 0 ? 'No errors in 24h.' : "{$count} in the last 24h.",
                'runbook' => 'ssh root@198.211.116.44 \'tail -200 /var/www/bookready-api/api/storage/logs/laravel.log\'',
                'meta'    => ['count_24h' => $count],
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'value' => '—', 'note' => 'Log read failed.',
                    'runbook' => $e->getMessage()];
        }
    }

    /** SELECT 1 against the central DB (fast, ~1ms). */
    private function probeDatabase(): array
    {
        try {
            $start = microtime(true);
            DB::connection()->select('SELECT 1 as ok');
            $ms = (int) round((microtime(true) - $start) * 1000);
            return [
                'status'  => $ms < 50 ? 'ok' : ($ms < 200 ? 'warn' : 'bad'),
                'value'   => $ms . 'ms',
                'note'    => 'Central DB responding (' . config('database.default') . ').',
                'runbook' => $ms < 50 ? '' : 'systemctl status mysql; check load average + slow query log.',
                'meta'    => ['response_ms' => $ms],
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'bad',
                'value'   => 'down',
                'note'    => 'DB unreachable: ' . substr($e->getMessage(), 0, 80),
                'runbook' => 'systemctl status mysql; check DB_HOST / credentials in .env.',
                'meta'    => ['response_ms' => null],
            ];
        }
    }

    /** Disk free on the volume hosting Laravel storage. */
    private function probeDisk(): array
    {
        try {
            $path = storage_path();
            $free  = @disk_free_space($path);
            $total = @disk_total_space($path);
            if (! $free || ! $total) {
                return ['status' => 'unknown', 'value' => '—', 'note' => 'Could not read disk space.'];
            }
            $usedPct = 100 - round(($free / $total) * 100);
            $freeGb  = round($free / 1024 / 1024 / 1024, 1);
            $totalGb = round($total / 1024 / 1024 / 1024, 1);
            return [
                'status'  => $usedPct < 80 ? 'ok' : ($usedPct < 92 ? 'warn' : 'bad'),
                'value'   => $usedPct . '%',
                'note'    => "{$freeGb} GB free of {$totalGb} GB.",
                'runbook' => $usedPct < 80 ? '' : 'du -sh /var/log /var/www/bookready-api/api/storage/logs /var/lib/mysql | sort -h',
                'meta'    => ['used_pct' => $usedPct, 'free_gb' => $freeGb, 'total_gb' => $totalGb],
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'value' => '—', 'note' => 'Disk probe failed.'];
        }
    }

    /** SSL cert expiry — probes the LIVE served cert, no filesystem access needed. */
    private function probeSsl(): array
    {
        $host = parse_url((string) config('app.url', 'https://api.bkrdy.me'), PHP_URL_HOST) ?: 'api.bkrdy.me';
        try {
            $ctx = stream_context_create(['ssl' => [
                'capture_peer_cert' => true,
                'verify_peer'       => true,
                'verify_peer_name'  => true,
            ]]);
            $client = @stream_socket_client("ssl://{$host}:443", $errno, $err, 3, STREAM_CLIENT_CONNECT, $ctx);
            if (! $client) {
                return [
                    'status' => 'bad', 'value' => 'unreachable',
                    'note' => "Could not establish TLS to {$host}: {$err}",
                    'runbook' => 'Check nginx + certbot status; dig +short ' . $host,
                ];
            }
            $params = stream_context_get_params($client);
            fclose($client);
            $cert = @openssl_x509_parse($params['options']['ssl']['peer_certificate']);
            $expiresAt = $cert['validTo_time_t'] ?? 0;
            $daysLeft  = (int) floor(($expiresAt - time()) / 86400);
            return [
                'status'  => $daysLeft > 14 ? 'ok' : ($daysLeft > 3 ? 'warn' : 'bad'),
                'value'   => $daysLeft . 'd',
                'note'    => "{$host} cert valid through " . date('M j, Y', $expiresAt) . '.',
                'runbook' => $daysLeft > 14 ? '' : 'certbot renew --force-renewal; nginx -t && systemctl reload nginx',
                'meta'    => ['days_left' => $daysLeft, 'host' => $host],
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'value' => '—', 'note' => 'SSL probe failed.'];
        }
    }

    /** Queue connection + Redis llen on the default queue. */
    private function probeQueue(): array
    {
        $conn = (string) config('queue.default', 'sync');
        $depth = null;
        try {
            if ($conn === 'redis') {
                $depth = (int) \Illuminate\Support\Facades\Redis::connection()->llen('queues:default');
            } elseif (Schema::hasTable('jobs')) {
                $depth = (int) DB::table('jobs')->count();
            }
        } catch (\Throwable) {
            $depth = null;
        }
        return [
            'status'  => $depth === null ? 'ok' : ($depth < 50 ? 'ok' : ($depth < 500 ? 'warn' : 'bad')),
            'value'   => $depth === null ? $conn : (string) $depth,
            'note'    => $depth === null
                ? ucfirst($conn) . ' queue.'
                : "{$depth} job" . ($depth === 1 ? '' : 's') . ' pending.',
            'runbook' => ($depth ?? 0) < 50 ? '' : 'redis-cli LLEN queues:default; check worker process is up.',
            'meta'    => ['connection' => $conn, 'depth' => $depth],
        ];
    }

    /** How fresh is the nightly cross-tenant snapshot? */
    private function probeSnapshotFreshness(): array
    {
        try {
            $row = DB::table('platform_dashboard_snapshots')
                ->orderByDesc('snapshot_date')->first();
            if (! $row) {
                return [
                    'status' => 'bad', 'value' => 'never',
                    'note' => 'No snapshot has ever been written.',
                    'runbook' => 'php artisan admin:snapshot — or use the Quick Action.',
                ];
            }
            // Snapshot row is dated end-of-day for the day the job ran;
            // we want elapsed hours since then.
            $hours = abs((int) now()->diffInHours(Carbon::parse($row->snapshot_date)->endOfDay()));
            // Snapshot job runs daily 03:00; healthy = ≤30h old.
            return [
                'status'  => $hours < 30 ? 'ok' : ($hours < 50 ? 'warn' : 'bad'),
                'value'   => Carbon::parse($row->snapshot_date)->diffForHumans(),
                'note'    => "Last snapshot: {$row->snapshot_date}.",
                'runbook' => $hours < 30 ? '' : 'Check schedule:run cron; run admin:snapshot manually if needed.',
                'meta'    => ['hours_old' => $hours, 'snapshot_date' => $row->snapshot_date],
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'value' => '—', 'note' => 'Snapshot table read failed.'];
        }
    }

    /** Scheduler heartbeat — proves schedule:run cron is firing every minute. */
    private function probeScheduler(): array
    {
        try {
            $path = storage_path('app/scheduler-tick.json');
            if (! is_file($path)) {
                return [
                    'status' => 'warn', 'value' => '—',
                    'note' => 'No scheduler tick written yet (or routes/console.php not deployed).',
                    'runbook' => 'Wait 1 min after deploy. If still missing: crontab -l | grep schedule:run',
                ];
            }
            $tick = json_decode((string) @file_get_contents($path), true) ?: [];
            $at = $tick['at'] ?? null;
            if (! $at) {
                return ['status' => 'warn', 'value' => '—', 'note' => 'Tick file unreadable.'];
            }
            $ageSec = abs((int) now()->diffInSeconds(Carbon::parse($at)));
            return [
                'status'  => $ageSec < 300 ? 'ok' : ($ageSec < 1800 ? 'warn' : 'bad'),
                'value'   => $ageSec < 60 ? $ageSec . 's' : (int) round($ageSec / 60) . 'm',
                'note'    => 'Last scheduler tick: ' . Carbon::parse($at)->diffForHumans() . '.',
                'runbook' => $ageSec < 300 ? '' : 'crontab -l | grep schedule:run; systemctl status cron',
                'meta'    => ['age_sec' => $ageSec, 'last_at' => $at],
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'value' => '—', 'note' => 'Scheduler probe failed.'];
        }
    }

    /** Sample fetch of one public tenant site — covers DNS + nginx + php-fpm + app boot. */
    private function probePublicSite(): array
    {
        try {
            // Pick an active tenant. Falls back gracefully if there's none.
            $tenant = Tenant::query()
                ->where('subscription_state', 'active')
                ->orderBy('created_at')
                ->first();
            $slug = $tenant?->id ?? 'lushstudio';
            $url  = "https://{$slug}.bkrdy.me";
            $start = microtime(true);
            $res = Http::timeout(5)->get($url);
            $ms  = (int) round((microtime(true) - $start) * 1000);
            $code = $res->status();
            $ok   = $code >= 200 && $code < 400;
            return [
                'status'  => ! $ok ? 'bad' : ($ms < 1500 ? 'ok' : 'warn'),
                'value'   => "{$code} · {$ms}ms",
                'note'    => "Probe target: {$slug}.bkrdy.me",
                'runbook' => $ok ? '' : 'curl -I ' . $url . '; check nginx + php-fpm + DNS for the wildcard.',
                'meta'    => ['probe_slug' => $slug, 'response_ms' => $ms, 'http_code' => $code],
            ];
        } catch (\Throwable $e) {
            return [
                'status'  => 'bad', 'value' => 'unreachable',
                'note'    => 'Public site probe failed: ' . substr($e->getMessage(), 0, 80),
                'runbook' => 'systemctl status nginx php8.2-fpm; check the wildcard DNS record.',
            ];
        }
    }

    /** Last deploy from storage/app/last-deploy.json (written by the deploy script). */
    private function probeDeploy(): array
    {
        try {
            $path = storage_path('app/last-deploy.json');
            if (! is_file($path)) {
                return ['status' => 'unknown', 'value' => '—',
                        'note' => 'No deploy stamp.', 'runbook' => 'Re-run the deploy block in CLAUDE.md.'];
            }
            $data = json_decode((string) file_get_contents($path), true) ?: [];
            $at   = $data['deployed_at'] ?? null;
            $msg  = $data['message'] ?? 'deploy';
            $sha  = isset($data['commit']) ? substr((string) $data['commit'], 0, 7) : null;
            return [
                'status'  => 'ok',
                'value'   => $sha ?? '—',
                'note'    => ($at ? Carbon::parse($at)->diffForHumans() : 'Deployed') . ' · ' . $msg,
                'runbook' => '',
                'meta'    => ['commit' => $sha, 'deployed_at' => $at, 'message' => $msg],
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'value' => '—', 'note' => 'Stamp read failed.'];
        }
    }

    /**
     * Mailer config check. Live ping is intentionally avoided: the prod
     * Resend key is send-scoped, so /domains 401s and false-alarms.
     * Real send liveness surfaces via api-errors when sends fail.
     */
    private function probeMailer(): array
    {
        $from   = (string) config('mail.from.address', '');
        $mailer = (string) config('mail.default', '');
        $key    = (string) (config('services.resend.key') ?: env('RESEND_API_KEY', ''));
        $configured = $key !== '' && str_starts_with($key, 're_');
        return [
            'status'  => $configured ? 'ok' : 'unknown',
            'value'   => $configured ? 'Resend' : '—',
            'note'    => $configured
                ? 'Configured (' . ($mailer ?: 'resend') . ', from ' . $from . ').'
                : 'RESEND_API_KEY missing or malformed.',
            'runbook' => $configured ? '' : 'Set RESEND_API_KEY in /var/www/bookready-api/api/.env; php artisan config:clear.',
            'meta'    => ['from' => $from, 'mailer' => $mailer],
        ];
    }
}
