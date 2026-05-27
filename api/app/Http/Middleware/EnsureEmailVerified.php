<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (! $user->email_verified_at) {
            return response()->json([
                'message' => 'Email verification required.',
                'code'    => 'email_unverified',
            ], 403);
        }

        return $next($request);
    }
}
