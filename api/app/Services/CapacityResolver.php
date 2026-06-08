<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 3 · Capacity resolver.
 *
 * Day-level workload cap. Distinct from slot-level conflict checks
 * (which already exist in SlotGenerator): even when individual times
 * are mechanically free, the owner can cap "how many customers can we
 * possibly take in one day."
 *
 * Capacity stacks across three layers, applied in order:
 *
 *   1. Per-staff cap (staff.default_daily_capacity)
 *      Only applied when the customer is booking with a specific staff
 *      member. Counts that staff's appointments only (plus unassigned ones
 *      that still tie up the shop's calendar).
 *
 *   2. Per-date cap (calendar_overrides.max_appointments)
 *      Wins over the global default on the date where it's set.
 *
 *   3. Global default (booking_settings.max_appointments_per_day)
 *      Applies whenever no per-date override exists. NULL = unlimited.
 *
 * Pure function — no schema mutations or appointment lookups beyond
 * a single COUNT query. The two resolvers (Override + Release + this)
 * are deliberately separate so each gate is auditable on its own.
 */
class CapacityResolver
{
    /**
     * Resolve the capacity verdict for a date.
     *
     * @param  string    $date       YYYY-MM-DD
     * @param  ?object   $settings   booking_settings row
     * @param  ?int      $staffId    Optional — when set, also enforce the staff's daily cap
     * @return array{
     *   capacity:   int|null,   // effective cap (null = unlimited)
     *   count:      int,        // existing non-cancelled appointments on the date
     *   full:       bool,       // true when count >= capacity
     *   source:     string,     // 'override' | 'global' | 'staff' | 'unlimited'
     * }
     */
    public static function resolve(string $date, ?object $settings, ?int $staffId = null): array
    {
        // Date-level cap (override > global default).
        $dateCap = null;
        $source  = 'unlimited';
        if (Schema::hasTable('calendar_overrides') && Schema::hasColumn('calendar_overrides', 'max_appointments')) {
            $override = DB::table('calendar_overrides')->where('date', $date)->first();
            if ($override && $override->max_appointments !== null) {
                $dateCap = (int) $override->max_appointments;
                $source  = 'override';
            }
        }
        if ($dateCap === null && $settings && isset($settings->max_appointments_per_day) && $settings->max_appointments_per_day !== null) {
            $dateCap = (int) $settings->max_appointments_per_day;
            $source  = 'global';
        }

        // Staff-level cap (independent of date-level — both apply when set).
        $staffCap = null;
        if ($staffId !== null && Schema::hasTable('staff') && Schema::hasColumn('staff', 'default_daily_capacity')) {
            $staff = DB::table('staff')->where('id', $staffId)->first(['default_daily_capacity']);
            if ($staff && $staff->default_daily_capacity !== null) {
                $staffCap = (int) $staff->default_daily_capacity;
            }
        }

        // Effective cap = min(dateCap, staffCap) where each is null = unlimited.
        $capacity = self::tighter($dateCap, $staffCap);
        if ($capacity === $staffCap && $staffCap !== null && $staffCap !== $dateCap) {
            $source = 'staff';
        }

        // Count current non-cancelled appointments on the date. When a
        // staff is specified, count THAT staff's appointments only (plus
        // unassigned ones, which still occupy a slot on the shop calendar).
        $countQuery = DB::table('appointments')
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled']);
        if ($staffId !== null && Schema::hasColumn('appointments', 'staff_id')) {
            $countQuery->where(function ($q) use ($staffId) {
                $q->where('staff_id', $staffId)->orWhereNull('staff_id');
            });
        }
        $count = (int) $countQuery->count();

        return [
            'capacity' => $capacity,
            'count'    => $count,
            'full'     => $capacity !== null && $count >= $capacity,
            'source'   => $capacity === null ? 'unlimited' : $source,
        ];
    }

    /** Smaller of two caps; null treated as unlimited. */
    private static function tighter(?int $a, ?int $b): ?int
    {
        if ($a === null) return $b;
        if ($b === null) return $a;
        return min($a, $b);
    }
}
