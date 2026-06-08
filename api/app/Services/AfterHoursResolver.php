<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Availability 2.0 · Phase 4 · After-hours window math.
 *
 * Pure functions — no DB. The caller loads the after_hours_config row and
 * the (override-resolved) hours row, then asks this resolver:
 *
 *   1. extendedClose()  — how far past regular close can we offer slots?
 *      The caller swaps the hours row's close_time for this extended value
 *      and re-runs SlotGenerator, getting after-hours slots for free
 *      (same conflict + interval logic as the regular path).
 *
 *   2. isAfterHours()   — is a given start time in the premium zone?
 *      Used to TAG generated slots with a fee, and (server-side, at booking
 *      time) to validate + price an after-hours booking.
 *
 * Keeping this separate from SlotGenerator means the booking engine stays
 * untouched; after-hours is a thin layer the callers compose in.
 */
class AfterHoursResolver
{
    /**
     * Resolve the after-hours window for a day.
     *
     * @param ?string $regularClose  hours row close_time (HH:MM[:SS])
     * @param ?object $config        after_hours_config row
     * @return array{regular_close:string, extended_close:string, fee_cents:int}|null
     *         null when after-hours is disabled / not applicable.
     */
    public static function extendedClose(?string $regularClose, ?object $config): ?array
    {
        if (! $config || ! ($config->enabled ?? false) || ! $regularClose) return null;

        $close = Carbon::createFromFormat('H:i', substr($regularClose, 0, 5));

        $maxExt = (int) ($config->max_extension_minutes ?? 0);
        if ($maxExt <= 0) return null;
        $extended = $close->copy()->addMinutes($maxExt);

        // Hard cap at latest_booking_time if set.
        if (! empty($config->latest_booking_time)) {
            $latest = Carbon::createFromFormat('H:i', substr((string) $config->latest_booking_time, 0, 5));
            if ($latest->lt($extended)) $extended = $latest;
        }

        // No window if the cap is at or before regular close.
        if ($extended->lte($close)) return null;

        return [
            'regular_close'  => $close->format('H:i:s'),
            'extended_close' => $extended->format('H:i:s'),
            'fee_cents'      => (int) ($config->fee_cents ?? 0),
        ];
    }

    /** True when $startTime (HH:MM[:SS]) is at or after the regular close. */
    public static function isAfterHours(string $startTime, string $regularClose): bool
    {
        $start = substr($startTime, 0, 5);
        $close = substr($regularClose, 0, 5);
        return strcmp($start, $close) >= 0;
    }

    /**
     * Does this customer qualify for after-hours access?
     *
     * @param string  $tier    everyone | existing | vip
     * @param ?object $client  clients row (null = anonymous / not found)
     */
    public static function accessAllowed(string $tier, ?object $client): bool
    {
        return match ($tier) {
            'vip'      => (bool) ($client->is_vip ?? false),
            'existing' => $client !== null,
            default    => true, // everyone
        };
    }
}
