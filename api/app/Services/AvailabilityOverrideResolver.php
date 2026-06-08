<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 1
 *
 * Layers per-date overrides (from `calendar_overrides`) onto the
 * weekly hours row before slot generation. Keeps SlotGenerator itself
 * a pure function — this resolver is the merge step the caller runs
 * between fetching the weekly row and calling SlotGenerator::generate().
 *
 * Three callers use this:
 *   - PublicAvailabilityController (slot list endpoint)
 *   - PublicBookingController       (re-validate on booking submit)
 *   - PublicManageBookingController (re-validate on reschedule)
 *
 * Why a resolver vs putting this inside SlotGenerator:
 *   SlotGenerator's docblock promises "no DB calls." A DB lookup here
 *   would violate that contract and force every caller to pre-load the
 *   override (more boilerplate). A small focused service keeps the
 *   contract clean and gives all three callers a one-line splice.
 *
 * Safety: when the `calendar_overrides` table doesn't exist yet (fresh
 * tenant mid-migration, or rollback), the resolver passes the weekly
 * row through unchanged. ZERO behaviour change for tenants without
 * overrides.
 */
class AvailabilityOverrideResolver
{
    /**
     * Resolve the effective hours row for $date, factoring in any
     * per-date override on top of the supplied weekly row.
     *
     * @param  string       $date            YYYY-MM-DD
     * @param  object|null  $weeklyHoursRow  Result of `DB::table('hours')->where('day_of_week', …)->first()` for the date's DoW.
     * @param  int|null     $serviceId       Service the customer is trying to book — checked against override.service_ids.
     * @param  int|null     $staffId         Optional staff filter — checked against override.staff_ids.
     * @return array{
     *   closed:        bool,
     *   closed_reason: string|null,
     *   hoursRow:      object|null,
     *   override_id:   int|null,
     * }
     */
    public static function resolve(
        string  $date,
        ?object $weeklyHoursRow,
        ?int    $serviceId = null,
        ?int    $staffId   = null,
    ): array {
        // Table missing → no overrides possible. Return weekly unchanged.
        if (! Schema::hasTable('calendar_overrides')) {
            return self::passthrough($weeklyHoursRow);
        }

        $override = DB::table('calendar_overrides')->where('date', $date)->first();
        if (! $override) {
            return self::passthrough($weeklyHoursRow);
        }

        // Force-closed override always wins.
        if (! $override->is_available) {
            return [
                'closed'        => true,
                'closed_reason' => 'The business is closed on this day.',
                'hoursRow'      => null,
                'override_id'   => (int) $override->id,
            ];
        }

        // Service filter — if the override restricts services and the
        // requested service isn't in the list, day is closed for THIS
        // service only. Other services still resolve normally.
        if ($serviceId !== null && $override->service_ids !== null) {
            $allowedServices = json_decode((string) $override->service_ids, true);
            if (is_array($allowedServices) && ! in_array($serviceId, $allowedServices, true)) {
                return [
                    'closed'        => true,
                    'closed_reason' => 'This service is not offered on this day.',
                    'hoursRow'      => null,
                    'override_id'   => (int) $override->id,
                ];
            }
        }

        // Staff filter — only applies when the customer chose a staff member.
        if ($staffId !== null && $override->staff_ids !== null) {
            $allowedStaff = json_decode((string) $override->staff_ids, true);
            if (is_array($allowedStaff) && ! in_array($staffId, $allowedStaff, true)) {
                return [
                    'closed'        => true,
                    'closed_reason' => 'This stylist is not available on this day.',
                    'hoursRow'      => null,
                    'override_id'   => (int) $override->id,
                ];
            }
        }

        // Build a synthetic hours row: override values win for any field
        // they set; otherwise fall through to weekly. An override that
        // only changes break (leaves open/close null) gets the weekly
        // open/close — matches owner intent.
        $synthetic = (object) [
            'day_of_week' => $weeklyHoursRow->day_of_week ?? null,
            'open_time'   => self::pick($override->open_time,   $weeklyHoursRow->open_time   ?? null),
            'close_time'  => self::pick($override->close_time,  $weeklyHoursRow->close_time  ?? null),
            'break_start' => self::pick($override->break_start, $weeklyHoursRow->break_start ?? null),
            'break_end'   => self::pick($override->break_end,   $weeklyHoursRow->break_end   ?? null),
            'is_closed'   => 0,
        ];

        return [
            'closed'        => false,
            'closed_reason' => null,
            'hoursRow'      => $synthetic,
            'override_id'   => (int) $override->id,
        ];
    }

    private static function passthrough(?object $weeklyHoursRow): array
    {
        return [
            'closed'        => false,
            'closed_reason' => null,
            'hoursRow'      => $weeklyHoursRow,
            'override_id'   => null,
        ];
    }

    /** Override value wins when set; otherwise fall back to weekly. */
    private static function pick(mixed $overrideValue, mixed $weeklyValue): mixed
    {
        return $overrideValue !== null && $overrideValue !== '' ? $overrideValue : $weeklyValue;
    }
}
