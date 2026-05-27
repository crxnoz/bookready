<?php

namespace App\Http\Middleware;

use App\Models\CustomerUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Phase 2 of the customer-accounts feature — defense-in-depth check
 * that the authenticated tokenable on this request is a CustomerUser,
 * not an owner User.
 *
 * Sanctum's auth:sanctum guard resolves a Bearer token by looking up
 * the personal_access_tokens.tokenable_type morph and returning that
 * model. So a token issued to a User and a token issued to a
 * CustomerUser both pass auth:sanctum cleanly. Without this check,
 * an owner who somehow holds a customer-route URL could call into
 * /customer/* endpoints and see/manipulate data the customer-side
 * controllers expect to belong to a CustomerUser.
 *
 * The AuthFromCookie middleware promotes the right cookie per route,
 * so in normal browser flow the wrong tokenable type can't reach
 * here. But (a) legacy Bearer-header clients can still send any token
 * to any path, and (b) defense in depth is cheap. This middleware
 * runs AFTER auth:sanctum on every customer route.
 *
 * Returns 401 (not 403) on mismatch — from the customer-portal
 * perspective, an owner token is the same as no auth at all.
 */
class EnsureCustomerSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user instanceof CustomerUser) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return $next($request);
    }
}
