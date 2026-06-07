<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * admin:snapshot — nightly cross-tenant aggregator for the admin dashboard.
 *
 * Walks every tenant DB once, rebuilds the platform-wide booking numbers,
 * and writes a single JSON row to platform_dashboard_snapshots (central).
 * The /admin/dashboard/trends endpoint reads the latest row so the
 * dashboard never pays the N-connection cost at request time.
 *
 * Scheduled daily at 03:00 (routes/console.php). Safe to run manually
 * any time — upserts on snapshot_date, so re-running the same day just
 * refreshes today's numbers. Per-tenant failures are caught + logged so
 * one broken tenant DB can't blank the whole snapshot.
 */
class SnapshotPlatformDashboard extends Command
{
    protected $signature = 'admin:snapshot {--days=180 : Daily-series look-back window (≥180 enables the WoW overlay on the activity volume chart)}';

    protected $description = 'Aggregate cross-tenant booking metrics into a central dashboard snapshot.';

    public function handle(): int
    {
        $windowDays = max(7, (int) $this->option('days'));
        $now        = now();
        $since      = $now->copy()->subDays($windowDays)->startOfDay();
        $d30        = $now->copy()->subDays(30);
        $d7         = $now->copy()->subDays(7);
        // Prior-7d window = [14d, 7d) ago. Used for WoW deltas.
        $d14        = $now->copy()->subDays(14);

        // Dense, zero-filled date → count map for the cross-tenant daily
        // booking series. Pre-seed every day in the window so the chart
        // x-axis is continuous even on days with no bookings.
        $daily = [];
        for ($i = $windowDays; $i >= 0; $i--) {
            $daily[$now->copy()->subDays($i)->toDateString()] = 0;
        }

        $perTenant      = [];
        $bookingsTotal  = 0;
        $bookings30d    = 0;
        $bookings7d     = 0;
        $activeTenants  = 0;   // ≥1 booking in last 7d
        $scanned        = 0;
        $failed         = 0;

        // Platform-wide pattern aggregates (last 30d). Cheap to mutate
        // inside the tenant loop because they're plain arrays.
        $dowHod = array_fill(0, 7, array_fill(0, 24, 0));   // [dow 0=Mon][hod 0-23]
        $leadBuckets = array_fill(0, 8, 0);                 // 0:<2h ... 7:>=30d
        $dailyRevenue = [];
        for ($i = $windowDays; $i >= 0; $i--) {
            $dailyRevenue[$now->copy()->subDays($i)->toDateString()] = 0;
        }

        foreach (Tenant::all() as $tenant) {
            try {
                tenancy()->initialize($tenant);
                if (! Schema::hasTable('appointments')) {
                    continue;
                }

                // One batched aggregate query per tenant covering every
                // metric the activity dashboard reads. Conditional sums let
                // us compute the 7d + prior-7d windows in a single scan
                // instead of N round-trips.
                $agg = DB::table('appointments')->selectRaw('
                    COUNT(*) AS total,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS d30,
                    SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS d7,
                    SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS d7_prior,
                    SUM(CASE WHEN created_at >= ? AND status = ? THEN 1 ELSE 0 END) AS cancelled_7d,
                    SUM(CASE WHEN created_at BETWEEN ? AND ? AND status = ? THEN 1 ELSE 0 END) AS cancelled_7d_prior,
                    AVG(CASE WHEN created_at >= ? AND appointment_date IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) ELSE NULL END) AS lead_hours_7d,
                    AVG(CASE WHEN created_at BETWEEN ? AND ? AND appointment_date IS NOT NULL THEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) ELSE NULL END) AS lead_hours_7d_prior,
                    COUNT(DISTINCT CASE WHEN created_at >= ? THEN customer_email END) AS customers_7d,
                    COUNT(DISTINCT CASE WHEN created_at BETWEEN ? AND ? THEN customer_email END) AS customers_7d_prior,
                    SUM(CASE WHEN created_at >= ? THEN ROUND(COALESCE(service_price,0) * 100) ELSE 0 END) AS revenue_7d_cents,
                    SUM(CASE WHEN created_at BETWEEN ? AND ? THEN ROUND(COALESCE(service_price,0) * 100) ELSE 0 END) AS revenue_7d_prior_cents,
                    MAX(created_at) AS last_at
                ', [
                    $d30, $d7,
                    $d14, $d7, // d7_prior window
                    $d7, 'cancelled',
                    $d14, $d7, 'cancelled',
                    $d7,
                    $d14, $d7,
                    $d7,
                    $d14, $d7,
                    $d7,
                    $d14, $d7,
                ])->first();

                $total = (int) ($agg->total ?? 0);
                $t30   = (int) ($agg->d30 ?? 0);
                $t7    = (int) ($agg->d7 ?? 0);
                $t7p   = (int) ($agg->d7_prior ?? 0);
                $lastAt = $agg->last_at;

                // Daily buckets for the 90-day series — folded count +
                // revenue into one query (free; same scan).
                $rows = DB::table('appointments')
                    ->where('created_at', '>=', $since)
                    ->selectRaw('DATE(created_at) as d, COUNT(*) as c, SUM(ROUND(COALESCE(service_price,0)*100)) as r')
                    ->groupBy('d')
                    ->get();
                foreach ($rows as $r) {
                    if (isset($daily[$r->d]))         $daily[$r->d]         += (int) $r->c;
                    if (isset($dailyRevenue[$r->d]))  $dailyRevenue[$r->d]  += (int) $r->r;
                }

                // Day-of-week × hour-of-day matrix, last 30 days, summed
                // across tenants. WEEKDAY() returns 0=Mon..6=Sun (MySQL).
                $dowHodRows = DB::table('appointments')
                    ->where('created_at', '>=', $d30)
                    ->selectRaw('WEEKDAY(created_at) as dow, HOUR(created_at) as hod, COUNT(*) as c')
                    ->groupBy('dow', 'hod')
                    ->get();
                foreach ($dowHodRows as $r) {
                    $dow = (int) $r->dow;
                    $hod = (int) $r->hod;
                    if ($dow >= 0 && $dow < 7 && $hod >= 0 && $hod < 24) {
                        $dowHod[$dow][$hod] += (int) $r->c;
                    }
                }

                // Lead-time histogram: bucket booking → appointment date
                // by hours. Bucket boundaries chosen so each bucket holds
                // meaningfully different customer behaviour.
                //   0: 0-2h (walk-in), 1: 2-12h, 2: 12-24h, 3: 1-3d,
                //   4: 3-7d, 5: 1-2w, 6: 2-4w, 7: 30d+
                $leadRows = DB::table('appointments')
                    ->where('created_at', '>=', $d30)
                    ->whereNotNull('appointment_date')
                    ->selectRaw('
                        CASE
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 2   THEN 0
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 12  THEN 1
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 24  THEN 2
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 72  THEN 3
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 168 THEN 4
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 336 THEN 5
                            WHEN TIMESTAMPDIFF(HOUR, created_at, appointment_date) < 720 THEN 6
                            ELSE 7
                        END as bucket,
                        COUNT(*) as c
                    ')
                    ->groupBy('bucket')
                    ->get();
                foreach ($leadRows as $r) {
                    $bucket = (int) $r->bucket;
                    if ($bucket >= 0 && $bucket < 8) {
                        $leadBuckets[$bucket] += (int) $r->c;
                    }
                }

                // Per-tenant 30d revenue + total revenue (cheap — same table).
                $revRow = DB::table('appointments')->selectRaw('
                    SUM(CASE WHEN created_at >= ? THEN ROUND(COALESCE(service_price,0) * 100) ELSE 0 END) AS rev_30d,
                    SUM(ROUND(COALESCE(service_price,0) * 100)) AS rev_total
                ', [$d30])->first();

                $bookingsTotal += $total;
                $bookings30d   += $t30;
                $bookings7d    += $t7;
                if ($t7 > 0) $activeTenants++;

                $perTenant[] = [
                    'id'                     => (string) $tenant->id,
                    'bookings_total'         => $total,
                    'bookings_30d'           => $t30,
                    'bookings_7d'            => $t7,
                    'bookings_prior_7d'      => $t7p,
                    'cancelled_7d'           => (int) ($agg->cancelled_7d ?? 0),
                    'cancelled_prior_7d'     => (int) ($agg->cancelled_7d_prior ?? 0),
                    'customers_7d'           => (int) ($agg->customers_7d ?? 0),
                    'customers_prior_7d'     => (int) ($agg->customers_7d_prior ?? 0),
                    'lead_hours_7d'          => $agg->lead_hours_7d !== null ? round((float) $agg->lead_hours_7d, 1) : null,
                    'lead_hours_prior_7d'    => $agg->lead_hours_7d_prior !== null ? round((float) $agg->lead_hours_7d_prior, 1) : null,
                    'revenue_7d_cents'       => (int) ($agg->revenue_7d_cents ?? 0),
                    'revenue_prior_7d_cents' => (int) ($agg->revenue_7d_prior_cents ?? 0),
                    'revenue_30d_cents'      => (int) ($revRow->rev_30d ?? 0),
                    'revenue_total_cents'    => (int) ($revRow->rev_total ?? 0),
                    'last_booking_at'        => $lastAt
                        ? \Illuminate\Support\Carbon::parse($lastAt)->toIso8601String()
                        : null,
                ];
                $scanned++;
            } catch (\Throwable $e) {
                $failed++;
                Log::warning('admin:snapshot tenant scan failed', [
                    'tenant_id' => $tenant->id,
                    'error'     => $e->getMessage(),
                ]);
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        $dailySeries = [];
        $dailyRevSeries = [];
        foreach ($daily as $date => $count) {
            $dailySeries[]    = ['date' => $date, 'count' => $count];
            $dailyRevSeries[] = ['date' => $date, 'cents' => $dailyRevenue[$date] ?? 0];
        }

        $payload = [
            'computed_at' => $now->toIso8601String(),
            'window_days' => $windowDays,
            'platform' => [
                'bookings_total'      => $bookingsTotal,
                'bookings_30d'        => $bookings30d,
                'bookings_7d'         => $bookings7d,
                'active_tenant_count' => $activeTenants,
                'tenants_scanned'     => $scanned,
                'tenants_failed'      => $failed,
            ],
            'daily_bookings'    => $dailySeries,
            'daily_revenue'     => $dailyRevSeries,
            'dow_hod_matrix'    => $dowHod,
            'lead_time_buckets' => $leadBuckets,
            'per_tenant'        => $perTenant,
        ];

        DB::table('platform_dashboard_snapshots')->updateOrInsert(
            ['snapshot_date' => $now->toDateString()],
            ['payload' => json_encode($payload), 'updated_at' => $now, 'created_at' => $now],
        );

        // Prune anything older than the window so the table stays tiny.
        DB::table('platform_dashboard_snapshots')
            ->where('snapshot_date', '<', $now->copy()->subDays($windowDays)->toDateString())
            ->delete();

        $this->info("Snapshot written for {$now->toDateString()}: "
            . "{$scanned} tenants scanned ({$failed} failed), "
            . "{$bookingsTotal} bookings total, {$bookings7d} in 7d.");

        return self::SUCCESS;
    }
}
