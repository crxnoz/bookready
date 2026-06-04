<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class AuthCookie
{
    public const NAME    = 'bookready_token';
    public const TTL_MIN = 60 * 24 * 14; // 14 days

    /**
     * Lifetime for the underlying Sanctum personal_access_token row, in
     * minutes. Set explicitly on every createToken() call so a token
     * leaked outside the cookie path (e.g. via server-side compromise)
     * cannot be replayed indefinitely. Kept slightly longer than the
     * cookie TTL so a user with an in-flight session past 14 days
     * fails on the cookie expiry rather than a DB-level revocation
     * (which would produce a less obvious "unauthenticated" UX).
     */
    public const TOKEN_TTL_MIN = 60 * 24 * 30; // 30 days

    /**
     * #158 — when the user UNCHECKS "Remember me" we issue a session
     * cookie (no Max-Age, evaporates on browser close) and a much
     * shorter Sanctum token TTL as the at-rest backstop. 24h is short
     * enough that a forgotten tab on a shared device times out by
     * tomorrow, long enough that a normal workday doesn't get kicked
     * out mid-session.
     */
    public const SESSION_TOKEN_TTL_MIN = 60 * 24; // 24 hours

    /**
     * Build the auth cookie. $remember controls persistence:
     *   true  (default): TTL_MIN minutes (14 days) — persistent cookie
     *                    survives browser restarts. Original behavior.
     *   false:           minutes=0 → session cookie, expires when the
     *                    browser closes. Pair with createToken using
     *                    SESSION_TOKEN_TTL_MIN to bound the at-rest
     *                    token life too.
     */
    public static function make(string $plainTextToken, bool $remember = true): Cookie
    {
        return cookie(
            name:     self::NAME,
            value:    $plainTextToken,
            // minutes=0 yields a session cookie in Symfony's Cookie:
            // no Max-Age / Expires attribute, browser drops it on close.
            minutes:  $remember ? self::TTL_MIN : 0,
            path:     '/',
            domain:   self::domain(),
            secure:   self::secure(),
            httpOnly: true,
            raw:      false,
            sameSite: 'lax',
        );
    }

    /**
     * Token TTL helper — matches the cookie's persistence so the two
     * never disagree. Callers pass this into createToken().
     */
    public static function tokenTtlMinutes(bool $remember = true): int
    {
        return $remember ? self::TOKEN_TTL_MIN : self::SESSION_TOKEN_TTL_MIN;
    }

    public static function forget(): Cookie
    {
        return cookie()->forget(
            name:   self::NAME,
            path:   '/',
            domain: self::domain(),
        );
    }

    public static function forgetLegacySharedDomain(): Cookie
    {
        return cookie()->forget(
            name:   self::NAME,
            path:   '/',
            domain: '.bkrdy.me',
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

        // Never allow a registrable-domain cookie that covers tenant sites.
        if (str_starts_with($domain, '.')) return null;

        return $domain !== '' ? $domain : null;
    }

    private static function secure(): bool
    {
        $env = strtolower((string) config('app.env'));

        return ! in_array($env, ['local', 'testing'], true);
    }
}
