<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * BookReady operator admin — per-tenant detail drill-in (Phase 3).
 *
 * Powers /admin/tenants/{slug}. Unlike the platform dashboard endpoints
 * (which read the nightly central snapshot), this initializes tenancy for
 * the ONE requested tenant and queries its DB live — a single connection
 * switch is cheap for a detail view, and it gives up-to-the-second numbers.
 *
 * Tenancy-safe: every tenant-DB value is flattened into plain PHP scalars
 * BEFORE tenancy()->end(), so nothing lazy-serializes against a torn-down
 * connection (the BusinessProfileController bug class).
 */
class AdminTenantDetailController extends Controller
{
    private function planMonthlyCents(?string $plan): int
    {
        if (! $plan) return 0;
        return (int) (config("plans.plans.{$plan}.monthly_base_cents", 0));
    }

    /** GET /api/v1/admin/tenants/{slug} */
    public function show(string $slug): JsonResponse
    {
        $tenant = Tenant::find($slug);
        if (! $tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        // Central-side meta (safe — central connection).
        $owner  = $tenant->users()->where('is_owner', true)->first();
        $domain = $tenant->domains()->first();
        $isActive = $tenant->subscription_state === 'active';

        $meta = [
            'id'            => (string) $tenant->id,
            'plan'          => $tenant->plan,
            'state'         => $tenant->subscription_state,
            'created_at'    => $tenant->created_at?->toIso8601String(),
            'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            'domain'        => $domain?->domain,
            'owner_name'    => $owner?->name,
            'owner_email'   => $owner?->email,
            'mrr_cents'     => $isActive ? $this->planMonthlyCents($tenant->plan) : 0,
        ];

        // Tenant-DB live numbers, cached briefly per tenant.
        $tenantData = Cache::remember("admin:tenant-detail:{$slug}:v1", 300, function () use ($tenant) {
            $now   = now();
            $since = $now->copy()->subDays(90)->startOfDay();
            $d30   = $now->copy()->subDays(30);
            $d7    = $now->copy()->subDays(7);

            // Pre-seed a dense 90-day daily series.
            $daily = [];
            for ($i = 90; $i >= 0; $i--) {
                $daily[$now->copy()->subDays($i)->toDateString()] = 0;
            }

            $out = [
                'bookings_total' => 0,
                'bookings_30d'   => 0,
                'bookings_7d'    => 0,
                'last_booking_at'=> null,
                'daily_bookings' => [],
                'recent'         => [],
                'scan_ok'        => false,
            ];

            try {
                tenancy()->initialize($tenant);
                if (Schema::hasTable('appointments')) {
                    $out['bookings_total'] = (int) DB::table('appointments')->count();
                    $out['bookings_30d']   = (int) DB::table('appointments')->where('created_at', '>=', $d30)->count();
                    $out['bookings_7d']    = (int) DB::table('appointments')->where('created_at', '>=', $d7)->count();
                    $lastAt = DB::table('appointments')->max('created_at');
                    $out['last_booking_at'] = $lastAt ? Carbon::parse($lastAt)->toIso8601String() : null;

                    foreach (DB::table('appointments')
                        ->where('created_at', '>=', $since)
                        ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
                        ->groupBy('d')->get() as $r) {
                        if (isset($daily[$r->d])) $daily[$r->d] += (int) $r->c;
                    }

                    // Last 10 bookings — flattened to plain arrays now.
                    $out['recent'] = DB::table('appointments')
                        ->orderByDesc('created_at')
                        ->limit(10)
                        ->get(['service_name', 'customer_name', 'status', 'payment_status', 'appointment_date', 'created_at'])
                        ->map(fn ($a) => [
                            'service_name'     => $a->service_name,
                            'customer_name'    => $a->customer_name,
                            'status'           => $a->status,
                            'payment_status'   => $a->payment_status,
                            'appointment_date' => $a->appointment_date,
                            'created_at'       => $a->created_at ? Carbon::parse($a->created_at)->toIso8601String() : null,
                        ])
                        ->all();

                    $out['scan_ok'] = true;
                }
            } catch (\Throwable $e) {
                // scan_ok stays false → frontend shows a soft "couldn't read" note.
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }

            $series = [];
            foreach ($daily as $date => $count) $series[] = ['date' => $date, 'count' => $count];
            $out['daily_bookings'] = $series;

            return $out;
        });

        return response()->json(array_merge($meta, $tenantData, [
            'computed_at' => now()->toIso8601String(),
        ]));
    }
}
