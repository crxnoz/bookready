<?php

namespace App\Http\Middleware;

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

        return $next($request);
    }
}
