<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Block any request from a user who isn't a BookReady platform admin.
 *
 * Apply alongside auth:sanctum — this middleware doesn't authenticate,
 * it only authorizes. The flag lives at users.is_admin in the central DB.
 */
class EnsureAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        if (! ($user->is_admin ?? false)) {
            return response()->json(['message' => 'Admin access required.'], 403);
        }
        return $next($request);
    }
}
