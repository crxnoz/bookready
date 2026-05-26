<?php

namespace App\Support;

use Symfony\Component\HttpFoundation\Cookie;

/**
 * Phase S6 — owner-session cookie helper.
 *
 * Centralizes the httpOnly cookie that carries the Sanctum bearer token.
 * Replaces the prior pattern of stashing the plain token in localStorage
 * (XSS-readable, easily exfiltrated).
 *
 * Cookie shape:
 *   Name:     bookready_token
 *   HttpOnly: yes  (JavaScript can't read it)
 *   Secure:   yes in prod (https only)
 *   SameSite: Lax (sent on top-level navigations + same-site XHR — works
 *             for app.bkrdy.me → api.bkrdy.me because they share the
 *             registrable domain)
 *   Domain:   .bkrdy.me in prod so cookie is shared across the editor
 *             host + the API host. Null in local dev so the cookie
 *             attaches to whatever hostname Laravel is responding from.
 *   TTL:      14 days. Roughly mirrors how long owners stay logged in.
 *
 * Backend uses both flows during the transition window:
 *   - Authorization: Bearer <token> header (legacy localStorage clients)
 *   - bookready_token cookie (new cookie-based clients)
 * The AuthFromCookie middleware copies the cookie into the Authorization
 * header when no header is present, so Sanctum sees one consistent flow.
 */
class AuthCookie
{
    public const NAME       = 'bookready_token';
    public const TTL_MIN    = 60 * 24 * 14; // 14 days

    /**
     * Build the Set-Cookie value for a freshly minted Sanctum token.
     */
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

    /**
     * Build an expired Set-Cookie to clear the session client-side.
     */
    public static function forget(): Cookie
    {
        // Laravel's cookie()->forget() helper returns a zero-TTL cookie
        // with matching name/domain/path so the browser drops it.
        return cookie()->forget(
            name:   self::NAME,
            path:   '/',
            domain: self::domain(),
        );
    }

    /**
     * Read + URL-decode the token value from the request. Returns null
     * when the cookie isn't present or is empty.
     */
    public static function read(\Illuminate\Http\Request $request): ?string
    {
        $raw = $request->cookie(self::NAME);
        if (! is_string($raw) || $raw === '') return null;
        return $raw;
    }

    private static function domain(): ?string
    {
        // Production tenant sites + editor + API all live on subdomains
        // of bkrdy.me. Setting Domain=.bkrdy.me makes the cookie shared
        // across app.bkrdy.me + api.bkrdy.me + {slug}.bkrdy.me, which is
        // exactly what we want for the editor → API flow.
        // Override via SESSION_DOMAIN if you ever fork the production
        // domain set.
        $env = strtolower((string) config('app.env'));
        if (in_array($env, ['local', 'testing'], true)) return null;
        return (string) (env('AUTH_COOKIE_DOMAIN') ?: '.bkrdy.me');
    }

    private static function secure(): bool
    {
        $env = strtolower((string) config('app.env'));
        // HTTPS-only outside local/testing. Browsers refuse Secure
        // cookies over http://localhost, so dev would simply not set
        // the cookie.
        return ! in_array($env, ['local', 'testing'], true);
    }
}
