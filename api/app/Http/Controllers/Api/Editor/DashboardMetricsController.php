<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\CapacityResolver;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dashboard 2.0 metrics endpoint.
 *
 * Returns precomputed totals and period-over-period deltas for the
 * /editor home dashboard. The frontend was originally computing these
 * client-side from the 200-appointment window the appointments index
 * returns, which is fine for chart trends but breaks down for all-time
 * numbers (avg ticket, return rate, no-show rate) on tenants with more
 * than 200 paid appointments.
 *
 * Caching: 5 minutes per tenant. Dashboard reads are frequent (every
 * page load) and the numbers shift slowly. A 5-minute TTL keeps the
 * page snappy without showing genuinely stale data.
 *
 * The "% full" occupancy figure uses CapacityResolver (Availability 2.0
 * P3). When no caps are configured for the tenant (no global default,
 * no per-date overrides) the chip is hidden via `occupancy.available =
 * false`. Per the product call, we do NOT fall back to a heuristic, a
 * wrong number erodes trust faster than a missing one.
 *
 * Timezone: all period boundaries use the app default timezone for now
 * (typically UTC). For tenants in non-UTC business hours, headlines
 * may shift by a day near midnight. Phase 1.5 can accept a `?tz=` query
 * parameter from the frontend to use the user's local timezone, since
 * the dashboard chart already does its bucketing in local time.
 */
class DashboardMetricsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $tenant   = Tenant::findOrFail($tenantId);

        $payload = Cache::remember(
            "dashboard:metrics:{$tenantId}",
            300,
            function () use ($tenant) {
                tenancy()->initialize($tenant);
                try {
                    return $this->compute();
                } finally {
                    tenancy()->end();
                }
            },
        );

        return response()->json($payload);
    }

    /** Build the metrics payload. Caller is responsible for tenancy init/end. */
    private function compute(): array
    {
        $tz    = config('app.timezone', 'UTC');
        $now   = Carbon::now($tz);
        $today = $now->copy()->startOfDay();

        // Booking settings drives currency + global capacity default.
        $settings = DB::table('booking_settings')->first();
        $currency = $settings?->currency ?? 'USD';

        // All-time revenue + appointment counts.
        $allTimeRevenue = (float) DB::table('appointments')
            ->selectRaw('COALESCE(SUM(deposit_paid_amount), 0) + COALESCE(SUM(balance_paid_amount), 0) AS rev')
            ->value('rev');
        $allTimeAppts = (int) DB::table('appointments')->count();
        $allTimePaid  = (int) DB::table('appointments')
            ->whereRaw('COALESCE(deposit_paid_amount,0) + COALESCE(balance_paid_amount,0) > 0')
            ->count();
        $avgTicket = $allTimePaid > 0 ? round($allTimeRevenue / $allTimePaid, 2) : null;

        // Period buckets (today, week-to-date, month-to-date, year-to-date)
        // plus prior equivalents for the deltas.
        $periods = $this->buildPeriods($today);
        $revenue = [];
        $appts   = [];
        foreach ($periods as $key => $p) {
            $revenue[$key] = [
                'value' => $this->periodRevenue($p['start'], $p['end']),
                'prior' => $this->periodRevenue($p['priorStart'], $p['priorEnd']),
            ];
            $appts[$key] = [
                'value' => $this->periodAppts($p['start'], $p['end']),
                'prior' => $this->periodAppts($p['priorStart'], $p['priorEnd']),
            ];
        }

        // Return rate, all-time. We group by lowered email when present and
        // fall back to phone for customers who only left a phone number.
        // Cancelled appointments don't count as visits. Two visits = a
        // returning customer for our purposes.
        $visits = DB::table('appointments')
            ->whereNotIn('status', ['cancelled'])
            ->select('customer_email', 'customer_phone')
            ->get();
        $counts = [];
        foreach ($visits as $v) {
            $key = strtolower(trim((string) ($v->customer_email ?? '')));
            if ($key === '') {
                $key = trim((string) ($v->customer_phone ?? ''));
            }
            if ($key === '') continue;
            $counts[$key] = ($counts[$key] ?? 0) + 1;
        }
        $totalCustomers  = count($counts);
        $returnCustomers = 0;
        foreach ($counts as $n) {
            if ($n >= 2) $returnCustomers++;
        }
        $returnRatePct = $totalCustomers > 0
            ? (int) round($returnCustomers / $totalCustomers * 100)
            : null;

        // No-show rate, all-time. Denominator excludes cancelled (a
        // cancellation isn't a no-show; counting it as one would punish
        // tenants whose customers cancel responsibly).
        $totalNonCancelled = (int) DB::table('appointments')->whereNotIn('status', ['cancelled'])->count();
        $noShows           = (int) DB::table('appointments')->where('status', 'no_show')->count();
        $noShowRatePct     = $totalNonCancelled > 0
            ? (int) round($noShows / $totalNonCancelled * 100)
            : null;

        // Occupancy / "% full" for the current month.
        $occupancy = $this->computeOccupancy($today, $settings);

        // Today's capacity verdict, for the header "X / Y appointments today"
        // ratio. capacity is null when the day is uncapped (no global default,
        // no per-date override) — the header then falls back to a plain count.
        $todayVerdict = CapacityResolver::resolve($today->toDateString(), $settings, null);

        return [
            'currency'         => $currency,
            'revenue'          => [
                'all_time' => round($allTimeRevenue, 2),
                'today'    => $revenue['today'],
                'week'     => $revenue['week'],
                'month'    => $revenue['month'],
                'year'     => $revenue['year'],
            ],
            'appointments'     => [
                'all_time' => $allTimeAppts,
                'today'    => $appts['today'],
                'week'     => $appts['week'],
                'month'    => $appts['month'],
                'year'     => $appts['year'],
            ],
            'avg_ticket'       => $avgTicket,
            'return_rate_pct'  => $returnRatePct,
            'no_show_rate_pct' => $noShowRatePct,
            'occupancy'        => $occupancy,
            'capacity_today'   => [
                'capacity' => $todayVerdict['capacity'],   // int|null (null = uncapped)
                'booked'   => $todayVerdict['count'],
                'full'     => $todayVerdict['full'],
            ],
            'generated_at'     => $now->toIso8601String(),
        ];
    }

    /**
     * Build the four period windows we report on (today / this week /
     * this month / this year) plus their prior-equivalent windows used
     * for the deltas. All windows are [start, end) inclusive-exclusive
     * so neighbouring windows never double-count a boundary minute.
     */
    private function buildPeriods(Carbon $today): array
    {
        return [
            'today' => [
                'start'      => $today->copy(),
                'end'        => $today->copy()->addDay(),
                'priorStart' => $today->copy()->subDay(),
                'priorEnd'   => $today->copy(),
            ],
            'week' => [
                'start'      => $today->copy()->startOfWeek(Carbon::MONDAY),
                'end'        => $today->copy()->startOfWeek(Carbon::MONDAY)->addWeek(),
                'priorStart' => $today->copy()->startOfWeek(Carbon::MONDAY)->subWeek(),
                'priorEnd'   => $today->copy()->startOfWeek(Carbon::MONDAY),
            ],
            'month' => [
                'start'      => $today->copy()->startOfMonth(),
                'end'        => $today->copy()->startOfMonth()->addMonth(),
                'priorStart' => $today->copy()->startOfMonth()->subMonth(),
                'priorEnd'   => $today->copy()->startOfMonth(),
            ],
            'year' => [
                'start'      => $today->copy()->startOfYear(),
                'end'        => $today->copy()->startOfYear()->addYear(),
                'priorStart' => $today->copy()->startOfYear()->subYear(),
                'priorEnd'   => $today->copy()->startOfYear(),
            ],
        ];
    }

    private function periodRevenue(Carbon $start, Carbon $end): float
    {
        $val = (float) DB::table('appointments')
            ->where('created_at', '>=', $start)
            ->where('created_at', '<',  $end)
            ->selectRaw('COALESCE(SUM(deposit_paid_amount), 0) + COALESCE(SUM(balance_paid_amount), 0) AS rev')
            ->value('rev');
        return round($val, 2);
    }

    private function periodAppts(Carbon $start, Carbon $end): int
    {
        return (int) DB::table('appointments')
            ->where('created_at', '>=', $start)
            ->where('created_at', '<',  $end)
            ->count();
    }

    /**
     * "% full" for the current calendar month. Uses CapacityResolver to
     * pick the right cap per day (global default with per-date overrides
     * winning where present).
     *
     * Hidden (`available` = false) when no global cap is set AND no
     * per-date overrides have max_appointments set. The frontend reads
     * `available` to decide whether to show the chip at all.
     */
    private function computeOccupancy(Carbon $today, ?object $settings): array
    {
        $monthStart = $today->copy()->startOfMonth();
        $monthEnd   = $today->copy()->startOfMonth()->addMonth();

        $globalCap = $settings?->max_appointments_per_day ?? null;

        $hasOverrideCaps = false;
        if (Schema::hasTable('calendar_overrides') && Schema::hasColumn('calendar_overrides', 'max_appointments')) {
            $hasOverrideCaps = DB::table('calendar_overrides')
                ->whereBetween('date', [
                    $monthStart->toDateString(),
                    $monthEnd->copy()->subDay()->toDateString(),
                ])
                ->whereNotNull('max_appointments')
                ->exists();
        }

        if ($globalCap === null && ! $hasOverrideCaps) {
            return [
                'available' => false,
                'period'    => 'month',
                'percent'   => null,
                'booked'    => null,
                'capacity'  => null,
            ];
        }

        $totalCap    = 0;
        $totalBooked = 0;
        $loop        = $monthStart->copy();
        while ($loop < $monthEnd) {
            $verdict = CapacityResolver::resolve($loop->toDateString(), $settings, null);
            if ($verdict['capacity'] !== null) {
                $totalCap    += $verdict['capacity'];
                $totalBooked += $verdict['count'];
            }
            $loop->addDay();
        }

        $pct = $totalCap > 0 ? (int) round($totalBooked / $totalCap * 100) : null;

        return [
            'available' => true,
            'period'    => 'month',
            'percent'   => $pct,
            'booked'    => $totalBooked,
            'capacity'  => $totalCap,
        ];
    }
}
