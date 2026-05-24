<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Socialite\Facades\Socialite;

/**
 * Google "Sign in" only — matches an existing user by email.
 *
 * Sign-UP via Google is intentionally not supported in this MVP: new
 * tenants still need to pick a business name + template, which the
 * email/password register flow already handles. If we add Google sign-up
 * later, branch in handleCallback() when no user is found.
 *
 * Flow:
 *   1. Frontend opens /api/v1/auth/google/redirect → 302 to Google
 *   2. Google sends user to /api/v1/auth/google/callback
 *   3. We look up the user by email, mint a Sanctum token, and 302 to
 *      the editor app at /auth/google/complete?token=... (frontend
 *      stores it then routes to /editor).
 *   4. On no-match / error, we 302 to /login?google_error=...
 */
class GoogleAuthController extends Controller
{
    private const APP_BASE = 'https://app.bkrdy.me';

    public function redirect(): RedirectResponse
    {
        return Socialite::driver('google')
            ->stateless()
            ->scopes(['openid', 'profile', 'email'])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        // Surface Google's error param (e.g. user clicked "Cancel") cleanly.
        if ($request->query('error')) {
            return redirect()->away(self::APP_BASE . '/login?google_error=' . urlencode((string) $request->query('error')));
        }

        try {
            $google = Socialite::driver('google')->stateless()->user();
        } catch (\Throwable $e) {
            Log::warning('Google OAuth callback failed', ['error' => $e->getMessage()]);
            return redirect()->away(self::APP_BASE . '/login?google_error=' . urlencode('Could not complete Google sign-in.'));
        }

        $email = strtolower((string) ($google->getEmail() ?? ''));
        if ($email === '') {
            return redirect()->away(self::APP_BASE . '/login?google_error=' . urlencode('Google did not share an email.'));
        }

        $user = User::where('email', $email)->first();
        if (! $user) {
            return redirect()->away(self::APP_BASE . '/login?google_error=' . urlencode(
                'No BookReady account uses this Google email. Sign up first.'
            ));
        }

        // Issue a Sanctum token tagged so we can audit Google sessions later.
        $token = $user->createToken('google-oauth')->plainTextToken;

        // Send to the frontend's bridge page. Keep the token in the
        // fragment (after #) so it never hits server logs.
        $payload = [
            'token'     => $token,
            'tenant_id' => $user->tenant_id,
            'user'      => [
                'id'        => $user->id,
                'name'      => $user->name,
                'email'     => $user->email,
                'tenant_id' => $user->tenant_id,
                'is_owner'  => (bool) ($user->is_owner ?? false),
                'is_admin'  => (bool) ($user->is_admin ?? false),
            ],
        ];

        $fragment = base64_encode(json_encode($payload));
        return redirect()->away(self::APP_BASE . '/auth/google/complete#' . $fragment);
    }
}
