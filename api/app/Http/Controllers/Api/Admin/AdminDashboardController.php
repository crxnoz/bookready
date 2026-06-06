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
     * Phase 3 — operational health. Four independently-guarded probes so
     * one failure (a missing log, a down mailer) degrades that one metric
     * rather than blanking the card. Cached 120s.
     */
    public function health(): JsonResponse
    {
        $payload = Cache::remember('admin:dashboard:health:v1', 120, function () {
            return [
                'api_errors' => $this->probeApiErrors(),
                'queue'      => $this->probeQueue(),
                'deploy'     => $this->probeDeploy(),
                'mailer'     => $this->probeMailer(),
                'computed_at'=> now()->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    /** Count ERROR/CRITICAL log lines in the last 24h from the Laravel log. */
    private function probeApiErrors(): array
    {
        try {
            $path = storage_path('logs/laravel.log');
            if (! is_file($path)) {
                return ['status' => 'unknown', 'count_24h' => null, 'note' => 'No log file.'];
            }
            // Read the tail (logs rotate, but cap the read regardless).
            $size = filesize($path);
            $read = 512 * 1024; // last 512KB is plenty for a 24h window
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
                try {
                    if (Carbon::parse($m[1])->gte($cutoff)) $count++;
                } catch (\Throwable) { /* skip unparseable */ }
            }
            return [
                'status'    => $count === 0 ? 'ok' : ($count < 10 ? 'warn' : 'bad'),
                'count_24h' => $count,
                'note'      => $count === 0 ? 'No errors in 24h.' : "{$count} in the last 24h.",
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'count_24h' => null, 'note' => 'Log read failed.'];
        }
    }

    /** Queue connection + best-effort depth (Redis llen on the default queue). */
    private function probeQueue(): array
    {
        $conn = (string) config('queue.default', 'sync');
        $depth = null;
        try {
            if ($conn === 'redis') {
                // Laravel Horizon/queue stores jobs under "queues:{name}".
                $depth = (int) \Illuminate\Support\Facades\Redis::connection()->llen('queues:default');
            } elseif (\Illuminate\Support\Facades\Schema::hasTable('jobs')) {
                $depth = (int) DB::table('jobs')->count();
            }
        } catch (\Throwable) {
            $depth = null;
        }
        return [
            'status'     => $depth === null ? 'ok' : ($depth < 50 ? 'ok' : ($depth < 500 ? 'warn' : 'bad')),
            'connection' => $conn,
            'depth'      => $depth,
            'note'       => $depth === null
                ? ucfirst($conn) . ' queue.'
                : "{$depth} job" . ($depth === 1 ? '' : 's') . ' pending.',
        ];
    }

    /** Last deploy from storage/app/last-deploy.json (written by the deploy). */
    private function probeDeploy(): array
    {
        try {
            $path = storage_path('app/last-deploy.json');
            if (! is_file($path)) {
                return ['status' => 'unknown', 'commit' => null, 'deployed_at' => null, 'note' => 'No deploy stamp.'];
            }
            $data = json_decode((string) file_get_contents($path), true) ?: [];
            $at = $data['deployed_at'] ?? null;
            return [
                'status'      => 'ok',
                'commit'      => isset($data['commit']) ? substr((string) $data['commit'], 0, 7) : null,
                'deployed_at' => $at,
                'note'        => $at ? Carbon::parse($at)->diffForHumans() : 'Deployed.',
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'commit' => null, 'deployed_at' => null, 'note' => 'Stamp read failed.'];
        }
    }

    /** Resend mailer reachability — cached auth ping, timeout-guarded. */
    private function probeMailer(): array
    {
        $from = (string) config('mail.from.address', '');
        $key  = (string) (config('services.resend.key') ?: env('RESEND_API_KEY', ''));
        if ($key === '') {
            return ['status' => 'unknown', 'from' => $from, 'note' => 'RESEND_API_KEY not configured.'];
        }
        try {
            $res = Http::withToken($key)->timeout(3)->get('https://api.resend.com/domains');
            return [
                'status' => $res->successful() ? 'ok' : 'bad',
                'from'   => $from,
                'note'   => $res->successful() ? 'Resend reachable.' : 'Resend returned ' . $res->status() . '.',
            ];
        } catch (\Throwable $e) {
            return ['status' => 'unknown', 'from' => $from, 'note' => 'Resend ping failed.'];
        }
    }
}
