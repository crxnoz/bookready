<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! ($user->is_owner ?? false) || ($user->role ?? null) === 'staff' || ! $user->tenant_id) {
            return response()->json(['message' => 'Owner access required.'], 403);
        }

        return $next($request);
    }
}
