<?php

namespace App\Http\Middleware;

use App\Support\AuthCookie;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Phase S6 — promote the httpOnly auth cookie into an Authorization header.
 *
 * Sanctum's TokenGuard only checks the Authorization header (and a few
 * other token-style sources, but not arbitrary cookies). To keep the
 * downstream guard untouched, this middleware reads the bookready_token
 * cookie and stuffs `Authorization: Bearer <token>` onto the request
 * BEFORE auth:sanctum runs.
 *
 * Behavior:
 *   - If the request already has Authorization, do nothing (legacy
 *     localStorage clients still work).
 *   - If the cookie is present, set Authorization from it.
 *   - If neither is present, do nothing — downstream guard returns 401
 *     for protected routes, public routes work as normal.
 *
 * Registered globally in the api routing group so it runs on every
 * /api/v1/* request. Cheap on every request (just a string lookup).
 */
class AuthFromCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->headers->has('Authorization')) {
            return $next($request);
        }

        $token = AuthCookie::read($request);
        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }
}
