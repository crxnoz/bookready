<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Wave D — gate for routes a tenant OWNER or a logged-in STAFF member
 * may both reach. Mirrors EnsureTenantOwner but widens the pass to
 * include role==='staff'. Owners still pass (is_owner true), so moving
 * a route from tenant_owner to tenant_member never narrows owner access.
 *
 * Per-staff row scoping (you can only touch your own appointments /
 * hours / profile) is enforced INSIDE the controller, not here — this
 * middleware only answers "is this user allowed into the tenant member
 * surface at all".
 */
class EnsureTenantMember
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $isMember = ($user->is_owner ?? false) || ($user->role ?? null) === 'staff';
        if (! $isMember || ! $user->tenant_id) {
            return response()->json(['message' => 'Member access required.'], 403);
        }

        // KILLSWITCH-1 — master switch is a true kill switch for live staff
        // sessions. Owners ALWAYS pass; this gate only runs for staff. One
        // central read per staff request (Tenant lives on the central DB, so
        // this is safe without tenancy init). Flip staff_login_enabled off
        // and existing staff are blocked at the member surface immediately.
        $isStaff = ! ($user->is_owner ?? false) && ($user->role ?? null) === 'staff';
        if ($isStaff) {
            $tenant = Tenant::find($user->tenant_id);
            if (! (bool) ($tenant->staff_login_enabled ?? false)) {
                return response()->json(['message' => 'Staff logins are turned off for this business.'], 403);
            }
        }

        return $next($request);
    }
}
