<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

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
                    'id'              => (string) $t->id,
                    'plan'            => $t->plan,
                    'state'           => $t->subscription_state,
                    'created_at'      => $t->created_at?->toIso8601String(),
                    'owner_name'      => $owner?->name,
                    'owner_email'     => $owner?->email,
                    'mrr_cents'       => $isActive ? $this->planMonthlyCents($t->plan) : 0,
                    'bookings_total'  => (int) ($agg['bookings_total'] ?? 0),
                    'bookings_30d'    => $bookings30d,
                    'bookings_7d'     => $bookings7d,
                    'last_booking_at' => $lastAt,
                    'tier'            => $this->activityTier($lastAt),
                ];
            })->values();

            // Top tenants by 30-day booking volume (drop zeros).
            $topTenants = $rows
                ->filter(fn ($r) => $r['bookings_30d'] > 0)
                ->sortByDesc('bookings_30d')
                ->take(8)
                ->map(fn ($r) => [
                    'id'           => $r['id'],
                    'bookings_30d' => $r['bookings_30d'],
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
}
