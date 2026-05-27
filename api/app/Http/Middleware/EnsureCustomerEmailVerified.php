<?php

namespace App\Http\Middleware;

use App\Models\CustomerUser;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Phase 2 of the customer-accounts feature — gate state-changing
 * customer routes behind email verification.
 *
 * Mirror of EnsureEmailVerified for the customer side. Intentionally
 * NOT applied to:
 *   - /customer/auth/me     (frontend reads verification state from here)
 *   - /customer/auth/logout (must be reachable even if account stale)
 *   - /customer/auth/verify-email/resend (would create a deadlock —
 *     can't get verified without sending the link, can't send the
 *     link without being verified)
 *
 * Returns 403 with a structured code so the frontend can render the
 * "please verify" banner cleanly. Matches the owner middleware's
 * response shape for consistency.
 */
class EnsureCustomerEmailVerified
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user instanceof CustomerUser) {
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
