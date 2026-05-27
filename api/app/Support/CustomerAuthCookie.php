<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

/**
 * Phase 1 of the customer-accounts feature — owner-equivalent cookie
 * helper for end-client sessions.
 *
 * Intentionally a separate class (not a parameter on AuthCookie) so
 * the constants — cookie name, TTL, token TTL — can diverge later
 * without the owner flow caring. Right now the security profile is
 * identical to AuthCookie:
 *
 *   Name:     bookready_customer_token   (vs owner's bookready_token)
 *   HttpOnly: yes  (JavaScript can't read it)
 *   Secure:   yes in prod
 *   SameSite: Lax
 *   Domain:   host-only on api.bkrdy.me. Dot-prefixed registrable
 *             domains are refused so the cookie cannot leak to tenant
 *             subdomains (lushstudio.bkrdy.me etc.).
 *   TTL:      14 days.
 *
 * Separate cookie name from the owner cookie is the critical bit:
 * a business owner who is ALSO a customer at another salon can be
 * logged in to both contexts simultaneously in the same browser
 * without the two sessions stomping on each other.
 *
 * Reuses the AUTH_COOKIE_DOMAIN env var — both cookies live on the
 * same host (api.bkrdy.me), so there's no reason to manage two
 * separate domain settings.
 */
class CustomerAuthCookie
{
    public const NAME    = 'bookready_customer_token';
    public const TTL_MIN = 60 * 24 * 14; // 14 days

    /**
     * Lifetime for the underlying Sanctum personal_access_token row,
     * in minutes. Pass to createToken() so a leaked token can't be
     * replayed forever. Same 30-day window as owner tokens.
     */
    public const TOKEN_TTL_MIN = 60 * 24 * 30; // 30 days

    public static function make(string $plainTextToken): Cookie
    {
        return cookie(
            name:     self::NAME,
            value:    $plainTextToken,
            minutes:  self::TTL_MIN,
            path:     '/',
            domain:   self::domain(),
            secure:   self::secure(),
            httpOnly: true,
            raw:      false,
            sameSite: 'lax',
        );
    }

    public static function forget(): Cookie
    {
        return cookie()->forget(
            name:   self::NAME,
            path:   '/',
            domain: self::domain(),
        );
    }

    public static function read(Request $request): ?string
    {
        $raw = $request->cookie(self::NAME);
        if (! is_string($raw) || $raw === '') return null;

        return $raw;
    }

    private static function domain(): ?string
    {
        $env = strtolower((string) config('app.env'));
        if (in_array($env, ['local', 'testing'], true)) return null;

        $domain = trim((string) env('AUTH_COOKIE_DOMAIN', ''));

        // Mirror AuthCookie's defense: never allow a registrable-domain
        // cookie that would cover tenant subdomains.
        if (str_starts_with($domain, '.')) return null;

        return $domain !== '' ? $domain : null;
    }

    private static function secure(): bool
    {
        $env = strtolower((string) config('app.env'));

        return ! in_array($env, ['local', 'testing'], true);
    }
}
