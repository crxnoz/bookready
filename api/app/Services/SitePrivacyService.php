<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Phase S1 — gates all public-facing tenant endpoints (site lookup,
 * availability, booking POST) on the owner's site_visibility setting.
 *
 * Visibility states (stored on business_profiles):
 *   - 'public'      → return data as normal
 *   - 'coming_soon' → return only business_name + status flag
 *   - 'private'     → require a short-lived signed unlock token derived
 *                     from the site password
 *
 * Call from INSIDE a `tenancy()->initialize()` scope so the
 * business_profiles row is readable.
 */
class SitePrivacyService
{
    /** Token TTL after unlock (in seconds). 24 hours = a session-ish window. */
    private const TOKEN_TTL = 86400;

    /**
     * If the site should be blocked, returns a payload to JSON-encode
     * back to the client (always 200 — we don't want to leak that the
     * site exists vs. doesn't). If the site is accessible, returns null.
     *
     * @param string      $slug         Tenant slug (used in the token signature)
     * @param string|null $unlockToken  Optional unlock token from ?unlock=
     * @return array|null
     */
    public static function check(string $slug, ?string $unlockToken = null): ?array
    {
        $profile = self::loadProfile();
        $visibility = $profile['site_visibility'] ?? 'public';

        if ($visibility === 'public') return null;

        $businessName = $profile['business_name'] ?? null;

        if ($visibility === 'coming_soon') {
            return [
                'status'        => 'coming_soon',
                'business_name' => $businessName,
            ];
        }

        if ($visibility === 'private') {
            // Token grants the bearer access for TOKEN_TTL.
            if ($unlockToken && self::verifyToken($slug, $unlockToken)) {
                return null;
            }
            return [
                'status'        => 'locked',
                'business_name' => $businessName,
                // Tell the frontend whether a password is actually required
                // (vs. just "this site is private — no entry"). If no
                // password is set, the site is effectively locked-out.
                'has_password'  => ! empty($profile['site_password_hash']),
            ];
        }

        // Unknown visibility value — fail open to public to avoid breaking
        // tenants that somehow got into a bad state. Log? (TODO)
        return null;
    }

    /**
     * Try a password against the saved hash. Returns a short-lived signed
     * unlock token on success, or null on miss.
     */
    public static function tryUnlock(string $slug, string $password): ?string
    {
        $profile = self::loadProfile();
        $hash    = $profile['site_password_hash'] ?? null;

        if (! $hash) {
            // Phase S5 — log password attempt against a site that has no
            // password set, so admins can tell a probe apart from a legit
            // visitor on a misconfigured site.
            Log::channel('security')->info('site.unlock.no_password_set', [
                'slug' => $slug,
            ]);
            return null;
        }
        if (! Hash::check($password, $hash)) {
            Log::channel('security')->warning('site.unlock.bad_password', [
                'slug' => $slug,
            ]);
            return null;
        }

        Log::channel('security')->info('site.unlock.success', [
            'slug' => $slug,
        ]);
        return self::mintToken($slug);
    }

    /**
     * HMAC-signed token: base64({exp}.{sig}) where sig = HMAC-SHA256(
     *   "{slug}.{exp}", APP_KEY ).
     */
    private static function mintToken(string $slug, int $ttlSeconds = self::TOKEN_TTL): string
    {
        $exp = time() + $ttlSeconds;
        $key = (string) config('app.key');
        $sig = hash_hmac('sha256', $slug . '.' . $exp, $key);
        return rtrim(strtr(base64_encode($exp . '.' . $sig), '+/', '-_'), '=');
    }

    private static function verifyToken(string $slug, string $token): bool
    {
        $raw = base64_decode(strtr($token, '-_', '+/'), true);
        if (! is_string($raw) || ! str_contains($raw, '.')) return false;

        [$exp, $sig] = explode('.', $raw, 2);
        if (! ctype_digit($exp)) return false;
        if ((int) $exp < time())  return false;

        $key      = (string) config('app.key');
        $expected = hash_hmac('sha256', $slug . '.' . $exp, $key);
        return hash_equals($expected, $sig);
    }

    /**
     * Load the visibility + password hash defensively. Tenants that
     * pre-date the migration have neither column → treat as 'public'.
     */
    private static function loadProfile(): array
    {
        if (! Schema::hasTable('business_profiles')) return [];

        $cols = ['business_name'];
        if (Schema::hasColumn('business_profiles', 'site_visibility'))    $cols[] = 'site_visibility';
        if (Schema::hasColumn('business_profiles', 'site_password_hash')) $cols[] = 'site_password_hash';

        $row = DB::table('business_profiles')->select($cols)->first();
        if (! $row) return [];
        return (array) $row;
    }
}
