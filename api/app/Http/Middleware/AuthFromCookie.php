<?php

namespace App\Http\Middleware;

use App\Support\AuthCookie;
use App\Support\CustomerAuthCookie;
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

        // Pick the right cookie for the route. Owner routes (the default)
        // use bookready_token; customer routes use bookready_customer_token.
        // Path-based selection is deliberate — a single browser can hold
        // BOTH cookies (a business owner who is also a customer at another
        // salon), and we must not promote the wrong one and authenticate
        // as the wrong tokenable_type. If we promoted both, the later
        // Authorization set wins and the request authenticates as whichever
        // came last, which would 403 inside EnsureTenantOwner / customer-
        // session middleware in confusing ways.
        $isCustomerRoute = str_starts_with($request->path(), 'api/v1/customer/');
        $token = $isCustomerRoute
            ? CustomerAuthCookie::read($request)
            : AuthCookie::read($request);
        $cookieEvent = $isCustomerRoute
            ? 'auth.customer_cookie.untrusted_origin'
            : 'auth.cookie.untrusted_origin';

        if (! TrustedBrowserOrigin::check($request)) {
            if ($token !== null) {
                // Resolve the token to the owning user so an alert is
                // actionable (we can notify, force-logout, or audit a
                // specific account). PersonalAccessToken::findToken
                // handles the plain-text → hash lookup safely and
                // returns null on miss, so a forged cookie still logs
                // without throwing. tokenable_type tells us whether
                // this was an owner (User) or a customer (CustomerUser).
                $userId   = null;
                $userType = null;
                try {
                    $tokenRow = PersonalAccessToken::findToken($token);
                    $userId   = $tokenRow?->tokenable_id;
                    $userType = $tokenRow?->tokenable_type;
                } catch (\Throwable) {
                    // Lookup failure is non-fatal; log without user_id.
                }

                Log::channel('security')->warning($cookieEvent, [
                    'user_id'   => $userId,
                    'user_type' => $userType,
                    'origin'    => $request->headers->get('Origin'),
                    'referer'   => $request->headers->get('Referer'),
                    'path'      => $request->path(),
                    'ip'        => $request->ip(),
                ]);
            }

            return $next($request);
        }

        if ($token !== null) {
            $request->headers->set('Authorization', 'Bearer ' . $token);
        }

        return $next($request);
    }
}
