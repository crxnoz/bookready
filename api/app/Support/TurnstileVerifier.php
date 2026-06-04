<?php

namespace App\Support;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Cloudflare Turnstile token verifier.
 *
 * Used by the VerifyTurnstile middleware on signup + sensitive auth
 * endpoints to stop bots before they hit the database. Server-side
 * verification is mandatory — the frontend token alone proves nothing.
 *
 * Config: see config/services.php 'turnstile' block. Keys live in
 * .env as TURNSTILE_SITE_KEY (frontend exposes it) + TURNSTILE_SECRET
 * (backend only). Set TURNSTILE_DISABLED=true to bypass in local dev
 * or before the Cloudflare account is provisioned.
 *
 * Cloudflare docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
class TurnstileVerifier
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    /**
     * Cloudflare-published "always passes" test secret. Used as a safe
     * fallback so the app works in dev / before keys are provisioned.
     * Pairs with site key 1x00000000000000000000AA.
     */
    private const TEST_SECRET = '1x0000000000000000000000000000000AA';

    /**
     * Verify a Turnstile token against Cloudflare.
     *
     * Returns true if the token is valid OR if Turnstile is disabled
     * via env (dev mode / not yet provisioned). Returns false on any
     * other outcome — invalid token, network error, missing token, etc.
     *
     * Always logs failures so abuse + misconfig are visible in
     * /var/log/bookready-alert.log.
     */
    public function verify(?string $token, ?string $remoteIp = null): bool
    {
        if (config('services.turnstile.disabled', false)) {
            // Explicit dev bypass. Log so we never accidentally ship to
            // prod with the bypass on.
            Log::info('TurnstileVerifier: bypassed via TURNSTILE_DISABLED');
            return true;
        }

        if (! $token || ! is_string($token)) {
            Log::warning('TurnstileVerifier: missing or invalid token shape', [
                'ip' => $remoteIp,
            ]);
            return false;
        }

        $secret = config('services.turnstile.secret') ?: self::TEST_SECRET;

        try {
            $resp = Http::asForm()->timeout(5)->post(self::VERIFY_URL, [
                'secret'   => $secret,
                'response' => $token,
                // remoteip is optional but Cloudflare uses it for analytics
                // + lets it catch token-replay across IPs.
                'remoteip' => $remoteIp,
            ]);
        } catch (\Throwable $e) {
            // Fail closed on network errors — better to bounce a real
            // user than to silently let bots through. The frontend
            // should surface the generic "please try again" copy.
            Log::error('TurnstileVerifier: HTTP call to Cloudflare failed', [
                'error' => $e->getMessage(),
                'ip'    => $remoteIp,
            ]);
            return false;
        }

        if (! $resp->ok()) {
            Log::error('TurnstileVerifier: non-2xx from Cloudflare', [
                'status' => $resp->status(),
                'ip'     => $remoteIp,
            ]);
            return false;
        }

        $body = $resp->json();
        $success = (bool) ($body['success'] ?? false);

        if (! $success) {
            // error-codes is an array, e.g. ['invalid-input-response',
            // 'timeout-or-duplicate']. Log them so we can tell legit
            // misconfig (bad secret) from bots (invalid tokens).
            Log::warning('TurnstileVerifier: token rejected', [
                'errors' => $body['error-codes'] ?? [],
                'ip'     => $remoteIp,
            ]);
        }

        return $success;
    }
}
