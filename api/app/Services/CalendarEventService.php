<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * iCalendar (RFC 5545) renderer for BookReady appointments.
 *
 * One small service shared by:
 *   - T1.1  owner-scoped subscribable .ics feed (PublicCalendarFeedController::owner)
 *   - T1.2  single-event "Add to calendar" download (per-appointment endpoint)
 *   - T1.3  customer-scoped subscribable .ics feed (PublicCalendarFeedController::customer)
 *
 * Stateless on purpose — every method takes the data it needs and returns
 * a string. Callers do the DB work + flatten before tenancy()->end().
 *
 * Timezone: appointments are stored as a naive `Y-m-d` date + `H:i:s` time
 * pair representing the business's local clock time. We emit DTSTART/DTEND
 * with TZID=<config('app.timezone')> so any calendar app renders them at
 * the right wall time wherever the viewer is. We do NOT convert to UTC —
 * UTC math on a naive local time would silently shift events on DST days.
 */
class CalendarEventService
{
    /** Default for the X-WR-CALDESC + PRODID hints. */
    private const PRODID = '-//BookReady//Calendar Feed 1.0//EN';

    /**
     * Render a full VCALENDAR wrapping any number of VEVENTs.
     *
     * @param array<int,string> $vevents  Pre-rendered VEVENT blocks (from event() below).
     */
    public static function calendar(string $calendarName, array $vevents, ?string $description = null): string
    {
        $tz   = (string) config('app.timezone', 'UTC');
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:' . self::PRODID,
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:' . self::esc($calendarName),
            'X-WR-TIMEZONE:' . $tz,
        ];
        if ($description) {
            $lines[] = 'X-WR-CALDESC:' . self::esc($description);
        }
        foreach ($vevents as $block) {
            $lines[] = trim($block);
        }
        $lines[] = 'END:VCALENDAR';

        // RFC 5545 mandates CRLF.
        return implode("\r\n", $lines) . "\r\n";
    }

    /**
     * Render a single VEVENT.
     *
     * @param array $appt Required keys:
     *   - id              (int)
     *   - tenant_slug     (string) — used in the UID so a customer aggregating
     *                                multiple tenants' appointments doesn't
     *                                collide on overlapping appointment ids.
     *   - appointment_date (Y-m-d)
     *   - start_time       (H:i or H:i:s)
     *   - end_time         (H:i or H:i:s)
     *   - service_name     (string)
     *   - customer_name    (?string)
     *   - status           (?string)        — cancelled => STATUS:CANCELLED
     *   - notes            (?string)
     *   - manage_url       (?string)        — included in DESCRIPTION
     *   - business_name    (?string)        — used in SUMMARY when not the owner's own feed
     *   - business_address (?string)        — used as LOCATION
     *   - summary_override (?string)        — full override of SUMMARY; otherwise computed
     *   - updated_at       (?string)        — used as DTSTAMP if present
     */
    public static function event(array $appt): string
    {
        $tz = (string) config('app.timezone', 'UTC');

        $date  = (string) $appt['appointment_date'];
        $start = self::pad($appt['start_time']);
        $end   = self::pad($appt['end_time']);

        $dtStart = self::localDateTime($date, $start);
        $dtEnd   = self::localDateTime($date, $end);

        // Stable per-appointment UID. tenant slug + appointment id keys it,
        // domain suffix makes it globally unique.
        $uid = sprintf('appt-%s-%d@bkrdy.me', $appt['tenant_slug'], (int) $appt['id']);

        // DTSTAMP must be a UTC value with the trailing Z (RFC 5545 §3.8.7.2).
        $dtStamp = ! empty($appt['updated_at'])
            ? Carbon::parse((string) $appt['updated_at'])->utc()->format('Ymd\THis\Z')
            : Carbon::now('UTC')->format('Ymd\THis\Z');

        $summary = $appt['summary_override']
            ?? self::buildSummary(
                $appt['service_name']  ?? 'Appointment',
                $appt['customer_name'] ?? null,
                $appt['business_name'] ?? null,
            );

        $descParts = [];
        if (! empty($appt['customer_name']))    $descParts[] = 'Client: ' . $appt['customer_name'];
        if (! empty($appt['service_name']))     $descParts[] = 'Service: ' . $appt['service_name'];
        if (! empty($appt['notes']))            $descParts[] = "\nNotes:\n" . $appt['notes'];
        if (! empty($appt['manage_url']))       $descParts[] = "\nManage booking:\n" . $appt['manage_url'];
        $description = implode("\n", $descParts);

        $lines = [
            'BEGIN:VEVENT',
            'UID:' . $uid,
            'DTSTAMP:' . $dtStamp,
            "DTSTART;TZID={$tz}:{$dtStart}",
            "DTEND;TZID={$tz}:{$dtEnd}",
            'SUMMARY:' . self::esc($summary),
        ];
        if ($description !== '') {
            $lines[] = 'DESCRIPTION:' . self::esc($description);
        }
        if (! empty($appt['business_address'])) {
            $lines[] = 'LOCATION:' . self::esc((string) $appt['business_address']);
        }
        if (($appt['status'] ?? '') === 'cancelled') {
            $lines[] = 'STATUS:CANCELLED';
        }
        $lines[] = 'TRANSP:OPAQUE';
        $lines[] = 'END:VEVENT';

        return implode("\r\n", $lines);
    }

    /** "Service · Client" / "Service" / "Service @ Business" — readable in a busy day view. */
    private static function buildSummary(string $service, ?string $customer, ?string $business): string
    {
        $tail = $customer ? " · {$customer}" : '';
        if ($business) {
            // Customer's aggregated feed reads from multiple tenants — prefix with business so they can tell them apart.
            return "{$business}: {$service}{$tail}";
        }
        return "{$service}{$tail}";
    }

    /** "2026-06-15" + "14:30:00" → "20260615T143000" (TZID-relative). */
    private static function localDateTime(string $ymd, string $his): string
    {
        return str_replace('-', '', $ymd) . 'T' . str_replace(':', '', $his);
    }

    /** Accepts H:i or H:i:s. Calendar wants seconds present. */
    private static function pad(string $time): string
    {
        return substr_count($time, ':') === 1 ? $time . ':00' : $time;
    }

    /**
     * Escape per RFC 5545 §3.3.11: backslash → \\, newline → \n, comma → \,,
     * semicolon → \;. (Folding is omitted — modern clients tolerate >75-octet
     * lines and folding adds complexity for tiny gain.)
     */
    private static function esc(string $value): string
    {
        $value = (string) Str::of($value)->replace("\r\n", "\n");
        return strtr($value, [
            '\\' => '\\\\',
            "\n" => '\\n',
            ','  => '\\,',
            ';'  => '\\;',
        ]);
    }
}
