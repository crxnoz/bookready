<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\CustomerUser;
use App\Models\Tenant;
use App\Support\CustomerAuthCookie;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

/**
 * Phase 6 of the customer-accounts feature — customer-side destructive
 * actions: data export + account deletion.
 *
 * Mirror of App\Http\Controllers\Api\Editor\DangerController (owner
 * side) scoped to a CustomerUser's identity + their cross-tenant
 * appointment history. CRITICAL distinction in the delete path:
 *
 *   The customer can delete THEIR ACCOUNT, but they CANNOT delete the
 *   per-tenant `clients` records or appointments. Those belong to the
 *   businesses (data controllers; we're a data processor for them).
 *   So delete:
 *     - wipes customer_users row + the Sanctum tokens it owns
 *     - NULLs clients.customer_user_id across all linked tenants
 *       (the row stays — name/phone/email/notes intact, just unlinked)
 *     - wipes customer_user_tenants pivot
 *     - clears the auth cookie
 *
 *   Customer who wants their booking history wiped from a specific
 *   business has to contact that business directly. Documented in
 *   the privacy policy.
 *
 * Surface (both under auth:sanctum + customer_session +
 * customer_verified_email + throttle):
 *
 *   GET  /customer/danger/export          JSON dump of profile + bookings
 *   POST /customer/danger/delete-account  body: { password }
 */
class DangerController extends Controller
{
    /**
     * GET /customer/danger/export
     *
     * Returns a JSON dump of:
     *   - the customer's profile fields
     *   - every appointment across every tenant they're linked to
     *
     * No streaming because (a) a customer's history is tiny relative
     * to a tenant's, (b) JSON is easier to consume than CSV for the
     * eventual GDPR rights flow.
     *
     * Cross-tenant iteration scoped to customer_user_tenants pivot,
     * same as BookingsController::index — O(K) where K is the
     * tenants this customer has actually booked at.
     */
    public function export(Request $request): JsonResponse
    {
        $customer = $request->user();

        $payload = [
            'export_generated_at' => now()->toAtomString(),
            'profile' => [
                'id'                => (int) $customer->id,
                'name'              => $customer->name,
                'email'             => $customer->email,
                'phone'             => $customer->phone,
                'email_verified_at' => $customer->email_verified_at?->toAtomString(),
                'last_login_at'     => $customer->last_login_at?->toAtomString(),
                'created_at'        => $customer->created_at?->toAtomString(),
            ],
            'bookings_by_business' => [],
        ];

        $tenantIds = DB::table('customer_user_tenants')
            ->where('customer_user_id', $customer->id)
            ->pluck('tenant_id')
            ->all();

        if (empty($tenantIds)) {
            return response()->json($payload)
                ->header('Content-Disposition',
                    'attachment; filename="bookready-export-' . now()->format('Y-m-d') . '.json"');
        }

        $tenants = Tenant::whereIn('id', $tenantIds)->get()->keyBy('id');

        foreach ($tenantIds as $tid) {
            $tenant = $tenants->get($tid);
            if (! $tenant) continue;

            try {
                tenancy()->initialize($tenant);
                if (! Schema::hasColumn('clients', 'customer_user_id')) continue;

                $clientIds = DB::table('clients')
                    ->where('customer_user_id', $customer->id)
                    ->pluck('id')
                    ->all();

                if (empty($clientIds)) continue;

                $businessName = (string) (
                    DB::table('business_profiles')->value('business_name')
                    ?: $tenant->id
                );

                $rows = DB::table('appointments')
                    ->whereIn('client_id', $clientIds)
                    ->orderByDesc('appointment_date')
                    ->orderByDesc('start_time')
                    ->get();

                $bookings = $rows->map(fn ($r) => [
                    'id'                       => (int) $r->id,
                    'service_name'             => $r->service_name,
                    'service_price'            => $r->service_price !== null ? (float) $r->service_price : null,
                    'service_duration_minutes' => $r->service_duration_minutes !== null ? (int) $r->service_duration_minutes : null,
                    'appointment_date'         => $r->appointment_date,
                    'start_time'               => substr($r->start_time, 0, 5),
                    'end_time'                 => substr($r->end_time,   0, 5),
                    'status'                   => $r->status,
                    'notes'                    => $r->notes,
                    'created_at'               => $r->created_at,
                ])->all();

                $payload['bookings_by_business'][] = [
                    'tenant_id'     => $tenant->id,
                    'business_name' => $businessName,
                    'bookings'      => $bookings,
                ];
            } catch (\Throwable $e) {
                Log::warning('customer.danger.export tenant scan failed', [
                    'customer_user_id' => $customer->id,
                    'tenant_id'        => $tid,
                    'error'            => $e->getMessage(),
                ]);
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        return response()->json($payload)
            ->header('Content-Disposition',
                'attachment; filename="bookready-export-' . now()->format('Y-m-d') . '.json"');
    }

    /**
     * POST /customer/danger/delete-account
     *
     * Body: { password }
     *
     * Hard-deletes the customer_users row + their Sanctum tokens, and
     * unlinks every tenant clients row that pointed at them. Tenant
     * appointment records are LEFT INTACT (business data, separate
     * controller relationship — see privacy policy).
     *
     * Requires the customer's current password as a confirmation step
     * — prevents an attacker who has a stolen session cookie from
     * nuking the account without also knowing the password.
     */
    public function deleteAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string',
        ]);

        $customer = $request->user();
        if (! $customer instanceof CustomerUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Read the authoritative password hash. Per #159, identities.password
        // is canonical (login + change-password check it); customer_users.password
        // is mirrored but is stale if a dual-write ever fails. Mirror the
        // ProfileController::changePassword pattern so the only "you can prove
        // you own this account" gate matches in both surfaces — otherwise
        // an attacker who knew the original password (but can't log in
        // after a reset) could still nuke the account.
        $identityHash = null;
        if ($customer->identity_id) {
            $identityHash = DB::table('identities')->where('id', $customer->identity_id)->value('password');
        }
        $authoritativeHash = $identityHash ?: $customer->password;

        if (! $authoritativeHash || ! Hash::check($validated['password'], $authoritativeHash)) {
            throw ValidationException::withMessages([
                'password' => ['Password is incorrect.'],
            ]);
        }

        $customerId = (int) $customer->id;
        $email      = $customer->email;

        // Iterate linked tenants once to NULL out clients.customer_user_id.
        // We do this BEFORE deleting customer_users / the pivot so we
        // know which tenants to visit. A tenant-side failure just leaves
        // an orphan link (harmless — the customer_users row is gone, so
        // any future SELECT FROM clients WHERE customer_user_id = X
        // returns nothing).
        $tenantIds = DB::table('customer_user_tenants')
            ->where('customer_user_id', $customerId)
            ->pluck('tenant_id')
            ->all();

        $unlinkedTotal = 0;

        foreach ($tenantIds as $tid) {
            try {
                $tenant = Tenant::find($tid);
                if (! $tenant) continue;
                tenancy()->initialize($tenant);
                if (! Schema::hasColumn('clients', 'customer_user_id')) continue;

                $unlinkedTotal += DB::table('clients')
                    ->where('customer_user_id', $customerId)
                    ->update(['customer_user_id' => null, 'updated_at' => now()]);
            } catch (\Throwable $e) {
                Log::warning('customer.danger.delete unlink failed', [
                    'customer_user_id' => $customerId,
                    'tenant_id'        => $tid,
                    'error'            => $e->getMessage(),
                ]);
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        // Now wipe central-side state. Order matters slightly — drop
        // the pivot before the customer_users row so the FK semantics
        // are clean (no DB constraint here, but logically tidier).
        DB::table('customer_user_tenants')->where('customer_user_id', $customerId)->delete();

        // Revoke every Sanctum token before deleting the model (the
        // tokens FK polymorphically; on cascade they'd go too, but
        // explicit cleanup is clearer).
        $customer->tokens()->delete();
        $customer->delete();

        Log::channel('security')->info('customer.account.deleted', [
            'customer_user_id'      => $customerId,
            'email'                 => $email,
            'unlinked_clients_rows' => $unlinkedTotal,
            'unlinked_tenants'      => count($tenantIds),
        ]);

        return response()
            ->json([
                'message'              => 'Your account has been deleted.',
                'unlinked_clients'     => $unlinkedTotal,
                'unlinked_tenants'     => count($tenantIds),
            ])
            ->withCookie(CustomerAuthCookie::forget());
    }
}
