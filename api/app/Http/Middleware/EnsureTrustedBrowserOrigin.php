<?php

namespace App\Http\Middleware;

use App\Support\TrustedBrowserOrigin;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class EnsureTrustedBrowserOrigin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! TrustedBrowserOrigin::check($request)) {
            Log::channel('security')->warning('auth.untrusted_origin', [
                'origin'  => $request->headers->get('Origin'),
                'referer' => $request->headers->get('Referer'),
                'path'    => $request->path(),
                'ip'      => $request->ip(),
            ]);

            return response()->json(['message' => 'Untrusted origin.'], 403);
        }

        return $next($request);
    }
}
