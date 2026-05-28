<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/**
 * BookReady operator admin — tenant management.
 *
 * Listed under /api/v1/admin/* and guarded by EnsureAdmin (users.is_admin).
 * This is platform-side, NOT tenant-side. Do not mix with editor controllers.
 */
class AdminTenantsController extends Controller
{
    private function formatTenant(Tenant $t): array
    {
        $owner  = $t->users()->where('is_owner', true)->first();
        $domain = $t->domains()->first();

        return [
            'id'            => (string) $t->id,
            'plan'          =>          $t->plan ?? null,
            'created_at'    =>          $t->created_at?->toIso8601String(),
            'updated_at'    =>          $t->updated_at?->toIso8601String(),
            'domain'        =>          $domain?->domain,
            'owner_id'      =>          $owner?->id,
            'owner_name'    =>          $owner?->name,
            'owner_email'   =>          $owner?->email,
            'stripe_id'     =>          $t->stripe_id ?? null,
            'trial_ends_at' =>          $t->trial_ends_at?->toIso8601String(),
        ];
    }

    // GET /api/v1/admin/tenants
    public function index(): JsonResponse
    {
        $tenants = Tenant::orderByDesc('created_at')->get();
        $rows    = $tenants->map(fn (Tenant $t) => $this->formatTenant($t))->all();

        return response()->json([
            'tenants' => $rows,
            'count'   => count($rows),
        ]);
    }

    /**
     * GET /api/v1/admin/stats
     *
     * Lightweight platform-wide counters for the admin dashboard. The
     * booking counts require walking each tenant DB (one query per
     * tenant per metric), which would be expensive at 100+ tenants —
     * so we cache the whole payload for 5 minutes. Admin can hit the
     * Refresh button on the page to force a re-fetch, but the cache
     * window keeps the cost bounded.
     */
    public function stats(): JsonResponse
    {
        $payload = Cache::remember('admin:stats:v1', 300, function () {
            $now          = now();
            $sevenDaysAgo = $now->copy()->subDays(7);

            $tenantsCount   = Tenant::count();
            $newTenants7d   = Tenant::where('created_at', '>=', $sevenDaysAgo)->count();
            $customersCount = Schema::hasTable('customer_users')
                ? DB::table('customer_users')->count()
                : 0;
            $verifiedCustomers = Schema::hasTable('customer_users')
                ? DB::table('customer_users')->whereNotNull('email_verified_at')->count()
                : 0;

            // Walk every tenant DB once. Per-tenant query failures
            // (mid-migration, broken DB, etc.) are caught so a single
            // bad tenant doesn't blank the whole stats payload.
            $bookingsTotal = 0;
            $bookings7d    = 0;
            $activeTenants = 0;  // tenants with any booking in the last 7d
            foreach (Tenant::all() as $tenant) {
                try {
                    tenancy()->initialize($tenant);
                    if (! Schema::hasTable('appointments')) continue;

                    $bookingsTotal += DB::table('appointments')->count();
                    $tenant7d = DB::table('appointments')
                        ->where('created_at', '>=', $sevenDaysAgo)
                        ->count();
                    $bookings7d += $tenant7d;
                    if ($tenant7d > 0) $activeTenants++;
                } catch (\Throwable $e) {
                    Log::warning('admin.stats tenant scan failed', [
                        'tenant_id' => $tenant->id,
                        'error'     => $e->getMessage(),
                    ]);
                } finally {
                    try { tenancy()->end(); } catch (\Throwable) {}
                }
            }

            return [
                'tenants_count'       => $tenantsCount,
                'new_tenants_7d'      => $newTenants7d,
                'active_tenants_7d'   => $activeTenants,
                'customers_count'     => $customersCount,
                'verified_customers'  => $verifiedCustomers,
                'bookings_total'      => $bookingsTotal,
                'bookings_7d'         => $bookings7d,
                'computed_at'         => $now->toIso8601String(),
            ];
        });

        return response()->json($payload);
    }

    // DELETE /api/v1/admin/tenants/{id}
    public function destroy(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            // Type-to-confirm guard — caller must echo back the slug exactly.
            'confirm_slug' => 'required|string',
        ]);

        if ($validated['confirm_slug'] !== $id) {
            return response()->json([
                'message' => 'Slug confirmation did not match.',
            ], 422);
        }

        $tenant = Tenant::find($id);
        if (! $tenant) {
            return response()->json(['message' => 'Tenant not found'], 404);
        }

        // Snapshot for the response and best-effort cleanup of side data.
        $snapshot = $this->formatTenant($tenant);

        // Best-effort R2 cleanup (uploads under tenants/{id}/…) — failure is
        // non-fatal; we'll still complete the DB delete.
        try {
            Storage::disk('r2')->deleteDirectory("tenants/{$tenant->id}");
        } catch (\Throwable $e) {
            Log::warning('Admin: R2 cleanup failed during tenant delete', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
        }

        // Delete the central User (owner) BEFORE the tenant — otherwise the
        // FK on users.tenant_id would dangle if we ever add a constraint.
        try {
            $tenant->users()->delete();
        } catch (\Throwable $e) {
            Log::warning('Admin: deleting tenant users failed (continuing)', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
        }

        // Stancl's HasDatabase trait drops the tenant DB on delete.
        try {
            $tenant->delete();
        } catch (\Throwable $e) {
            Log::error('Admin: tenant delete failed', [
                'tenant' => $tenant->id,
                'error'  => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Tenant database delete failed. Check logs.',
            ], 500);
        }

        Log::info('Admin: tenant deleted', [
            'tenant'  => $snapshot['id'],
            'owner'   => $snapshot['owner_email'],
            'actor'   => $request->user()?->email,
        ]);

        return response()->json([
            'message' => 'Tenant deleted',
            'tenant'  => $snapshot,
        ]);
    }
}
