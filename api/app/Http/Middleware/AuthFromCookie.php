<?php

namespace App\Http\Middleware;

use App\Support\AuthCookie;
use App\Support\TrustedBrowserOrigin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;

class AuthFromCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->headers->has('Authorization')) {
            return $next($request);
        }

        if (! TrustedBrowserOrigin::check($request)) {
            $token = AuthCookie::read($request);
            if ($token !== null) {
                // Resolve the token to the owning user so an alert is
                // actionable (we can notify, force-logout, or audit a
                // specific account). PersonalAccessToken::findToken
                // handles the plain-text → hash lookup safely and
                // returns null on miss, so a forged cookie still logs
                // without throwing.
                $userId = null;
                try {
                    $userId = PersonalAccessToken::findToken($token)?->tokenable_id;
                } catch (\Throwable) {
                    // Lookup failure is non-fatal; log without user_id.
                }

                Log::channel('security')->warning('auth.cookie.untrusted_origin', [
                    'user_id' => $userId,
                    'origin'  => $request->headers->get('Origin'),
                    'referer' => $request->headers->get('Referer'),
                    'path'    => $request->path(),
                    'ip'      => $request->ip(),
                ]);
            }

            return $next($request);
        }

        $token = AuthCookie::read($request);
        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }
}
