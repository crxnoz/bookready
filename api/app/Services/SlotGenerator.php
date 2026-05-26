<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Pure slot generator — no DB calls.
 * Load all data from DB inside the tenancy context, then pass here.
 *
 * day_of_week mapping: 0=Sunday … 6=Saturday (matches Carbon::dayOfWeek)
 */
class SlotGenerator
{
    /**
     * Generate available time slots.
     *
     * @param  string       $date           YYYY-MM-DD
     * @param  object       $service        services row  (needs ->duration, ->name, ->price, ->id)
     * @param  object|null  $hoursRow       hours row for this day (is_closed, open_time, close_time, break_start, break_end)
     * @param  object|null  $settings       booking_settings row
     * @param  array        $appointments   plain array of ['start_time' => 'HH:MM', 'end_time' => 'HH:MM']
     * @param  string       $appTimezone    app timezone (e.g. 'America/New_York')
     * @param  array        $blockedRanges  optional list of ['start_date' => 'Y-m-d', 'end_date' => 'Y-m-d'|null].
     *                                      When $date falls in any range we short-circuit with a closed message.
     * @return array{slots: list<array{start_time:string,end_time:string,label:string}>, message: string|null}
     */
    public static function generate(
        string  $date,
        object  $service,
        ?object $hoursRow,
        ?object $settings,
        array   $appointments,
        string  $appTimezone = 'UTC',
        array   $blockedRanges = [],
    ): array {
        $today    = Carbon::now($appTimezone)->format('Y-m-d');
        $now      = Carbon::now($appTimezone);

        // ── Booking window ────────────────────────────────────────────────
        $maxDaysAhead   = (int) ($settings->max_days_ahead ?? 30);
        $maxDate        = Carbon::parse($today, $appTimezone)->addDays($maxDaysAhead)->format('Y-m-d');

        if ($date > $maxDate) {
            return [
                'slots'   => [],
                'message' => "Bookings are only available up to {$maxDaysAhead} days in advance.",
            ];
        }

        // ── Slot release window ───────────────────────────────────────────
        $releaseEnabled = (bool) ($settings->slot_release_enabled ?? false);
        if ($releaseEnabled) {
            $windowDays = (int) ($settings->slot_release_window_days ?? $maxDaysAhead);
            $releaseMax = Carbon::parse($today, $appTimezone)->addDays($windowDays)->format('Y-m-d');
            if ($date > $releaseMax) {
                return [
                    'slots'   => [],
                    'message' => 'This date has not been released for booking yet.',
                    // TODO: implement true scheduled release calendar based on slot_release_frequency,
                    // slot_release_day_of_week, slot_release_day_of_month, and slot_release_time.
                ];
            }
        }

        // ── Phase 6: tenant-wide blocked-date short-circuit ───────────────
        // Owner-defined closures override everything below — return an
        // empty slot list with the friendly reason if one is supplied.
        foreach ($blockedRanges as $range) {
            $start = $range['start_date'] ?? null;
            $end   = $range['end_date']   ?? $start;
            if (! $start) continue;
            if ($date >= $start && $date <= ($end ?? $start)) {
                // Phase S5++ — generic message ONLY. The owner-entered
                // `reason` column is sensitive (vacations, doctor visits,
                // family emergencies) and is no longer threaded through
                // public payloads. Keep the slot list empty so the public
                // booking form shows "no times available" cleanly.
                return [
                    'slots'   => [],
                    'message' => 'Closed on this day.',
                ];
            }
        }

        // ── Phase 4: per-service available_days override ──────────────────
        // If the service restricts itself to specific weekdays, reject any
        // date that doesn't fall on one of them. Null/empty array = inherit.
        $availableDays = self::serviceAvailableDays($service);
        if ($availableDays !== null) {
            $dow = Carbon::parse($date, $appTimezone)->dayOfWeek; // 0=Sun
            if (! in_array($dow, $availableDays, true)) {
                return ['slots' => [], 'message' => 'This service is not offered on this day.'];
            }
        }

        // ── Business hours for this day ───────────────────────────────────
        if (! $hoursRow || $hoursRow->is_closed) {
            return ['slots' => [], 'message' => 'The business is closed on this day.'];
        }

        if (! $hoursRow->open_time || ! $hoursRow->close_time) {
            return ['slots' => [], 'message' => 'No hours set for this day.'];
        }

        // ── Settings with defaults ────────────────────────────────────────
        $duration         = (int) ($service->duration   ?? 60);
        $intervalMins     = (int) ($settings->booking_interval_minutes ?? 30);
        // Phase 4: buffers fall back to the global setting unless the
        // service explicitly overrides them. An override of 0 is "no
        // buffer" — explicitly different from "inherit".
        $bufferBefore     = self::serviceBuffer($service, 'before',
                              (int) ($settings->buffer_before_minutes ?? 0));
        $bufferAfter      = self::serviceBuffer($service, 'after',
                              (int) ($settings->buffer_after_minutes  ?? 15));
        $minimumNotice    = (int) ($settings->minimum_notice_minutes   ?? 720);

        // ── Time boundaries (minutes from midnight) ───────────────────────
        $openMin  = self::toMinutes($hoursRow->open_time);
        $closeMin = self::toMinutes($hoursRow->close_time);

        $hasBreak    = $hoursRow->break_start && $hoursRow->break_end;
        $breakStart  = $hasBreak ? self::toMinutes($hoursRow->break_start) : null;
        $breakEnd    = $hasBreak ? self::toMinutes($hoursRow->break_end)   : null;

        // ── Minimum notice cutoff (today only) ───────────────────────────
        // TODO: use per-tenant timezone once tenant timezone is implemented.
        $earliestMin = 0;
        if ($date === $today) {
            $earliestMin = $now->hour * 60 + $now->minute + $minimumNotice;
        }

        // ── Existing appointment blocks (minutes from midnight) ───────────
        $blocks = array_map(fn ($a) => [
            'start' => self::toMinutes($a['start_time']),
            'end'   => self::toMinutes($a['end_time']),
        ], $appointments);

        // ── Generate candidates ───────────────────────────────────────────
        $slots = [];

        for ($start = $openMin; $start + $duration <= $closeMin; $start += $intervalMins) {
            $end = $start + $duration;

            // Minimum notice
            if ($start < $earliestMin) {
                continue;
            }

            // Service window must not overlap break
            if ($hasBreak && self::overlaps($start, $end, $breakStart, $breakEnd)) {
                continue;
            }

            // Blocked window (includes buffer) must not overlap existing appointments
            $blockedStart = max(0, $start - $bufferBefore);
            $blockedEnd   = $end + $bufferAfter;

            $conflict = false;
            foreach ($blocks as $block) {
                if (self::overlaps($blockedStart, $blockedEnd, $block['start'], $block['end'])) {
                    $conflict = true;
                    break;
                }
            }
            if ($conflict) {
                continue;
            }

            $slots[] = [
                'start_time' => self::fromMinutes($start),
                'end_time'   => self::fromMinutes($end),
                'label'      => self::formatLabel($start),
            ];
        }

        return [
            'slots'   => $slots,
            'message' => empty($slots) ? 'No available times for this date.' : null,
        ];
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Phase 4: resolve the buffer for a service. Returns the override when
     * the column exists AND is non-null (an explicit 0 is honored as "no
     * buffer"); otherwise falls back to the global setting.
     */
    public static function serviceBuffer(object $service, string $which, int $globalFallback): int
    {
        $col = $which === 'before'
            ? 'buffer_before_override_minutes'
            : 'buffer_after_override_minutes';
        if (property_exists($service, $col) && $service->{$col} !== null) {
            return max(0, (int) $service->{$col});
        }
        return $globalFallback;
    }

    /**
     * Phase 4: parse services.available_days (JSON array of 0-6). Returns
     * null when the column is missing, null in the DB, or empty — meaning
     * "no restriction, inherit business open days".
     */
    public static function serviceAvailableDays(object $service): ?array
    {
        if (! property_exists($service, 'available_days') || $service->available_days === null) {
            return null;
        }
        $raw = $service->available_days;
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        if (! is_array($decoded) || empty($decoded)) return null;
        $days = array_values(array_unique(array_map('intval', $decoded)));
        $days = array_values(array_filter($days, fn ($d) => $d >= 0 && $d <= 6));
        return empty($days) ? null : $days;
    }

    public static function toMinutes(string $time): int
    {
        $parts = explode(':', substr($time, 0, 5));
        return (int) $parts[0] * 60 + (int) ($parts[1] ?? 0);
    }

    public static function fromMinutes(int $minutes): string
    {
        return sprintf('%02d:%02d', intdiv($minutes, 60), $minutes % 60);
    }

    public static function formatLabel(int $minutes): string
    {
        $h    = intdiv($minutes, 60);
        $m    = $minutes % 60;
        $ampm = $h >= 12 ? 'PM' : 'AM';
        $h12  = $h % 12 ?: 12;
        return sprintf('%d:%02d %s', $h12, $m, $ampm);
    }

    /** True if [startA, endA) overlaps [startB, endB) */
    public static function overlaps(int $startA, int $endA, int $startB, int $endB): bool
    {
        return $startA < $endB && $endA > $startB;
    }

    /**
     * Convenience: check whether a specific start_time (HH:MM) is in a slots array.
     * Used by the booking endpoint to verify the chosen slot is still available.
     */
    public static function containsSlot(array $slots, string $startTime): bool
    {
        $needle = substr($startTime, 0, 5);
        foreach ($slots as $slot) {
            if ($slot['start_time'] === $needle) {
                return true;
            }
        }
        return false;
    }
}
