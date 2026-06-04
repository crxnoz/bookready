<?php

namespace App\Http\Middleware;

use App\Support\TurnstileVerifier;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Reject requests that don't carry a valid Cloudflare Turnstile token.
 *
 * Reads the token from the JSON body's `turnstile_token` field, hands
 * it to TurnstileVerifier, and 422s on rejection with a friendly
 * message the frontend can surface verbatim.
 *
 * Applied to:
 *   - POST /auth/register (owner signup)
 *   - POST /auth/password/forgot (owner forgot password)
 *   - POST /customer/auth/register (customer signup)
 *   - POST /customer/auth/password/forgot (customer forgot password)
 *   - POST /auth/verify-email/resend (verify-email resend; anti-spam)
 *
 * Login is intentionally NOT gated — the existing throttle:10,1 +
 * Sanctum revocation are enough, and CAPTCHA on every sign-in would
 * be friction for legitimate users.
 *
 * Middleware alias: 'turnstile'. Register in bootstrap/app.php.
 */
class VerifyTurnstile
{
    public function __construct(
        private readonly TurnstileVerifier $verifier,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token    = $request->input('turnstile_token');
        $remoteIp = $request->ip();

        if (! $this->verifier->verify($token, $remoteIp)) {
            return response()->json([
                'message' => 'We could not verify you are human. Please refresh and try again.',
                'errors'  => [
                    'turnstile_token' => ['CAPTCHA verification failed. Refresh the page and try again.'],
                ],
            ], 422);
        }

        return $next($request);
    }
}
