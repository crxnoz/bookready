<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Availability 2.0 · Phase 2 · Date-drop resolver.
 *
 * Given the booking_settings row + the custom drop list + `now`,
 * computes the latest date currently RELEASED for booking — i.e. the
 * inclusive upper bound the public booking flow uses to decide whether
 * a date is bookable yet.
 *
 *  • "Always Open"     → settings->slot_release_enabled = false
 *                       → returns null (no release gate)
 *  • "Weekly"          → most recent (day_of_week at release_time) past now
 *                       → released_until = release_event + window_days
 *  • "Bi-Weekly"       → same cadence as weekly but every 14 days from the
 *                       owner-set anchor_date
 *  • "Monthly"         → most recent (day_of_month at release_time) past now
 *                       → released_until = release_event + window_days
 *  • "Custom"          → max(available_to) across drops whose release_date ≤ today
 *
 * Pure function — no DB calls. Caller fetches settings + drops and
 * passes them in. Same contract as SlotGenerator. Lets us keep
 * SlotGenerator itself thin and predictable.
 */
class ReleaseWindowResolver
{
    /**
     * @param  object|null  $settings  booking_settings row.
     * @param  array        $drops     List of objects/arrays from slot_release_drops with
     *                                 release_date, available_from, available_to as Y-m-d strings.
     * @param  Carbon       $now       Current moment in the tenant's timezone.
     * @return Carbon|null             Latest released date (00:00 that day) or null = always open.
     */
    public static function releasedUntil(?object $settings, array $drops, Carbon $now): ?Carbon
    {
        if (! $settings || ! ($settings->slot_release_enabled ?? false)) {
            return null;
        }

        $strategy   = (string) ($settings->slot_release_frequency ?? '');
        $windowDays = (int)    ($settings->slot_release_window_days ?? 30);
        $releaseAt  = self::parseTime($settings->slot_release_time ?? null); // [h,m] or null

        switch ($strategy) {
            case 'weekly':
                return self::periodicReleased(
                    $now,
                    7,
                    self::dayOfWeekAnchor($now, (int) ($settings->slot_release_day_of_week ?? 1), $releaseAt),
                    $windowDays,
                );

            case 'biweekly':
                $anchorRaw = $settings->slot_release_anchor_date ?? null;
                if (! $anchorRaw) return null; // bi-weekly without anchor → effectively always open
                return self::periodicReleased(
                    $now,
                    14,
                    self::dateAtTime(Carbon::parse($anchorRaw, $now->getTimezone()), $releaseAt),
                    $windowDays,
                );

            case 'monthly':
                return self::monthlyReleased(
                    $now,
                    max(1, min(31, (int) ($settings->slot_release_day_of_month ?? 1))),
                    $releaseAt,
                    $windowDays,
                );

            case 'custom':
                return self::customReleased($drops, $now);

            default:
                return null;
        }
    }

    /**
     * Resolve a recurring fixed-period schedule (weekly or bi-weekly).
     * The most recent anchor occurrence at or before $now defines the
     * released window: anchor + $windowDays.
     *
     * @param  Carbon  $now
     * @param  int     $periodDays  7 (weekly) or 14 (bi-weekly).
     * @param  Carbon  $referenceAnchor  Any past-or-current occurrence of the anchor (e.g. last Monday at 09:00).
     * @param  int     $windowDays
     */
    private static function periodicReleased(Carbon $now, int $periodDays, Carbon $referenceAnchor, int $windowDays): ?Carbon
    {
        // How many full periods fit between $referenceAnchor and $now (≥0)?
        if ($referenceAnchor->gt($now)) {
            // The reference is in the future — there's a previous occurrence
            // $periodDays ago. Step back.
            $referenceAnchor = $referenceAnchor->copy()->subDays($periodDays);
        }
        $diffDays = (int) floor($referenceAnchor->diffInSeconds($now, false) / 86400);
        $periodsPassed = $diffDays >= 0 ? intdiv($diffDays, $periodDays) : 0;
        $lastEvent = $referenceAnchor->copy()->addDays($periodsPassed * $periodDays);
        if ($lastEvent->gt($now)) {
            // Shouldn't happen but guard against float/clock skew.
            return null;
        }
        return $lastEvent->copy()->addDays($windowDays)->startOfDay();
    }

    /**
     * Monthly release on a specific day-of-month + time. Wraps day numbers
     * that don't exist in shorter months (Feb 31 → Feb 28/29).
     */
    private static function monthlyReleased(Carbon $now, int $dayOfMonth, ?array $releaseAt, int $windowDays): ?Carbon
    {
        // Try this month first; if the day hasn't arrived yet, fall back to
        // last month's release.
        $candidate = self::safeMonthDay($now->copy()->startOfMonth(), $dayOfMonth);
        $candidate = self::dateAtTime($candidate, $releaseAt);
        if ($candidate->gt($now)) {
            $candidate = self::safeMonthDay($now->copy()->startOfMonth()->subMonth(), $dayOfMonth);
            $candidate = self::dateAtTime($candidate, $releaseAt);
        }
        if ($candidate->gt($now)) {
            return null; // future-only — nothing released yet
        }
        return $candidate->copy()->addDays($windowDays)->startOfDay();
    }

    private static function customReleased(array $drops, Carbon $now): ?Carbon
    {
        $today = $now->toDateString();
        $latest = null;
        foreach ($drops as $d) {
            $releaseDate   = self::asString($d, 'release_date');
            $availableTo   = self::asString($d, 'available_to');
            if ($releaseDate === null || $availableTo === null) continue;
            if ($releaseDate > $today) continue; // not released yet
            if ($latest === null || $availableTo > $latest) {
                $latest = $availableTo;
            }
        }
        return $latest ? Carbon::parse($latest, $now->getTimezone())->startOfDay() : null;
    }

    /**
     * The most recent moment in the past where DoW=$dow at $releaseAt.
     * If today is the right DoW and the release time hasn't hit yet,
     * we step back 7 days so we use last week's release.
     */
    private static function dayOfWeekAnchor(Carbon $now, int $dow, ?array $releaseAt): Carbon
    {
        $dow = max(0, min(6, $dow));
        $candidate = $now->copy();
        // Walk backward up to 7 days to find the most recent DoW match.
        while ($candidate->dayOfWeek !== $dow) {
            $candidate = $candidate->subDay();
        }
        $candidate = self::dateAtTime($candidate, $releaseAt);
        if ($candidate->gt($now)) $candidate = $candidate->subDays(7);
        return $candidate;
    }

    private static function dateAtTime(Carbon $date, ?array $releaseAt): Carbon
    {
        $h = $releaseAt[0] ?? 0;
        $m = $releaseAt[1] ?? 0;
        return $date->copy()->setTime($h, $m, 0);
    }

    /** Clamp day-of-month into the actual length of the target month. */
    private static function safeMonthDay(Carbon $monthStart, int $day): Carbon
    {
        $maxDay = (int) $monthStart->copy()->endOfMonth()->day;
        return $monthStart->copy()->setDay(min($day, $maxDay));
    }

    /** Parse "HH:MM[:SS]" → [hour, minute] or null. */
    private static function parseTime(mixed $raw): ?array
    {
        if (! is_string($raw) || $raw === '') return null;
        $parts = explode(':', $raw);
        if (count($parts) < 2) return null;
        return [(int) $parts[0], (int) $parts[1]];
    }

    /** Read a string field from a stdClass row or array. */
    private static function asString(mixed $d, string $key): ?string
    {
        if (is_object($d) && property_exists($d, $key)) {
            $v = $d->$key;
            return $v === null ? null : (string) $v;
        }
        if (is_array($d) && array_key_exists($key, $d)) {
            return $d[$key] === null ? null : (string) $d[$key];
        }
        return null;
    }
}
