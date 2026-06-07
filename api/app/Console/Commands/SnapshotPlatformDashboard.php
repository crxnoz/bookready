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
    protected $signature = 'admin:snapshot {--days=90 : Daily-series look-back window}';

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

                // Daily buckets for the 90-day series.
                $rows = DB::table('appointments')
                    ->where('created_at', '>=', $since)
                    ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
                    ->groupBy('d')
                    ->get();
                foreach ($rows as $r) {
                    if (isset($daily[$r->d])) {
                        $daily[$r->d] += (int) $r->c;
                    }
                }

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
        foreach ($daily as $date => $count) {
            $dailySeries[] = ['date' => $date, 'count' => $count];
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
            'daily_bookings' => $dailySeries,
            'per_tenant'     => $perTenant,
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
