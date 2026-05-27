<?php

namespace App\Support;

use Illuminate\Http\Request;

class TrustedBrowserOrigin
{
    public static function check(Request $request): bool
    {
        $origin = $request->headers->get('Origin');
        if (! is_string($origin) || trim($origin) === '') {
            $origin = self::originFromReferer($request);
        }

        if (! is_string($origin) || trim($origin) === '') {
            return false;
        }

        return in_array(self::normalize($origin), self::origins(), true);
    }

    public static function origins(): array
    {
        $default = implode(',', [
            'https://app.bkrdy.me',
            'http://localhost:3000',
            'https://localhost:3000',
            'http://127.0.0.1:3000',
            'https://127.0.0.1:3000',
            'http://app.daysbookings.site',
            'https://app.daysbookings.site',
        ]);

        $raw = (string) env('AUTH_COOKIE_TRUSTED_ORIGINS', $default);

        return array_values(array_filter(array_map(
            fn ($origin) => self::normalize($origin),
            explode(',', $raw),
        )));
    }

    public static function normalize(string $origin): string
    {
        return rtrim(strtolower(trim($origin)), '/');
    }

    private static function originFromReferer(Request $request): ?string
    {
        $referer = $request->headers->get('Referer');
        if (! is_string($referer) || trim($referer) === '') return null;

        $parts = parse_url($referer);
        if (! is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }

        $origin = strtolower($parts['scheme']) . '://' . strtolower($parts['host']);
        if (isset($parts['port'])) {
            $origin .= ':' . $parts['port'];
        }

        return $origin;
    }
}
