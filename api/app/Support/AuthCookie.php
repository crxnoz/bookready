<?php

namespace App\Support;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;

class AuthCookie
{
    public const NAME    = 'bookready_token';
    public const TTL_MIN = 60 * 24 * 14; // 14 days

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
