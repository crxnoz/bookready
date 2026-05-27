<?php

namespace App\Http\Middleware;

use App\Support\AuthCookie;
use App\Support\TrustedBrowserOrigin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class AuthFromCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->headers->has('Authorization')) {
            return $next($request);
        }

        if (! TrustedBrowserOrigin::check($request)) {
            if (AuthCookie::read($request) !== null) {
                Log::channel('security')->warning('auth.cookie.untrusted_origin', [
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
