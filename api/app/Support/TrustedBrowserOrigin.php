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

        $normalized = self::normalize($origin);

        // Static allowlist — primarily app.bkrdy.me for owner sessions.
        if (in_array($normalized, self::origins(), true)) {
            return true;
        }

        // Customer routes AND public booking-flow routes additionally
        // accept any tenant subdomain.
        //
        // - /customer/* — the in-page TfrAuthModal on a tenant site
        //   POSTs login/register/forgot-password with Origin set to
        //   the tenant subdomain. Without this branch the modal 403s.
        // - /public/* — public booking POST + manage-booking + site
        //   show are HIT BY the tenant subdomain itself (the visitor
        //   is ON {slug}.bkrdy.me). The trust check in AuthFromCookie
        //   gates customer-cookie promotion. Without this branch the
        //   customer cookie is never promoted for an authed booker,
        //   so the booking-to-account stamp silently no-ops.
        //
        // The risk window is narrow: DNS for *.bkrdy.me is controlled
        // by us, so an attacker can't simply register a subdomain to
        // forge a trusted origin. The pattern in isTenantOrigin() also
        // forbids ports, paths, embedded credentials, and any character
        // that isn't an alnum/hyphen.
        $path = $request->path();
        if (str_starts_with($path, 'api/v1/customer/') ||
            str_starts_with($path, 'api/v1/public/')) {
            return self::isTenantOrigin($normalized);
        }

        return false;
    }

    /**
     * True if $origin is a well-formed tenant subdomain of one of our
     * known apex domains. Used by the customer-route branch of check().
     *
     * Matches the same regex pattern as config/cors.php
     * allowed_origins_patterns so the two layers agree about which
     * origins are tenant subdomains.
     */
    public static function isTenantOrigin(string $origin): bool
    {
        if (preg_match('#^https://[a-z0-9][a-z0-9-]{0,62}\.bkrdy\.me$#', $origin)) {
            return true;
        }
        // Staging tenant subdomains (*.staging.bkrdy.me) used by the
        // tenant-side TfrAuthModal. Mirror of the cors.php pattern so
        // the customer-route branch above accepts e.g.
        // https://lushstudio.staging.bkrdy.me.
        if (preg_match('#^https://[a-z0-9][a-z0-9-]{0,62}\.staging\.bkrdy\.me$#', $origin)) {
            return true;
        }
        if (preg_match('#^https?://[a-z0-9][a-z0-9-]{0,62}\.daysbookings\.site$#', $origin)) {
            return true;
        }
        return false;
    }

    public static function origins(): array
    {
        $default = implode(',', [
            'https://app.bkrdy.me',
            // The apex marketing surface links straight to /login + /register
            // and posts auth requests with Origin: https://bkrdy.me. Without
            // this entry the request passes the CORS allowlist but then 403s
            // here with "Untrusted origin." — surfacing as "Failed to fetch"
            // in the browser console.
            'https://bkrdy.me',
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
