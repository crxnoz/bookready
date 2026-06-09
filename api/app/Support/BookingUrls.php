<?php

namespace App\Support;

/**
 * Centralized booking-related URL construction. Replaces the
 * `sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $manageToken)`
 * pattern that was duplicated across 6 controllers + the reminder
 * command — any future change to the URL shape now happens here.
 *
 * Both helpers return null when the manage token is absent so callers
 * can keep using the same `($manageToken ? ... : null)` pattern as a
 * one-liner without wrapping in conditionals.
 */
class BookingUrls
{
    /** Tenant subdomain → manage-booking page (frontend). */
    public static function manage(string $tenantSlug, ?string $manageToken): ?string
    {
        if (! $manageToken) return null;
        return sprintf('https://%s.bkrdy.me/manage/%s', $tenantSlug, $manageToken);
    }

    /** API → single-appointment .ics download. Same manage-token capability
     *  gate as the cancel/reschedule endpoints; the suffix `.ics` is part of
     *  the route so calendar clients route by extension. */
    public static function calendarIcs(string $tenantSlug, ?string $manageToken): ?string
    {
        if (! $manageToken) return null;
        return sprintf(
            'https://api.bkrdy.me/api/v1/public/sites/%s/manage/%s/calendar.ics',
            $tenantSlug,
            $manageToken,
        );
    }
}
