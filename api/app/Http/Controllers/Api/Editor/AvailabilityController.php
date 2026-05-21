<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AvailabilityController extends Controller
{
    private const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // ── Formatters (plain arrays — avoids Eloquent connection lookups after tenancy()->end()) ──

    private function formatHour(object $row): array
    {
        return [
            'id'          => (int)   $row->id,
            'day_of_week' => (int)   $row->day_of_week,
            'day_name'    =>          self::DAYS[(int) $row->day_of_week],
            'is_open'     => ! (bool) $row->is_closed,
            'open_time'   =>          $this->fmtTime($row->open_time),
            'close_time'  =>          $this->fmtTime($row->close_time),
            'break_start' =>          $this->fmtTime($row->break_start ?? null),
            'break_end'   =>          $this->fmtTime($row->break_end   ?? null),
        ];
    }

    private function formatSettings(object $row): array
    {
        return [
            'id'                        => (int)   $row->id,
            'buffer_before_minutes'     => (int)   $row->buffer_before_minutes,
            'buffer_after_minutes'      => (int)   $row->buffer_after_minutes,
            'minimum_notice_minutes'    => (int)   $row->minimum_notice_minutes,
            'booking_interval_minutes'  => (int)   $row->booking_interval_minutes,
            'max_days_ahead'            => (int)   $row->max_days_ahead,
            'max_appointments_per_day'  =>          $row->max_appointments_per_day !== null
                                                        ? (int) $row->max_appointments_per_day
                                                        : null,
            'auto_confirm_bookings'     => (bool)  $row->auto_confirm_bookings,
            'slot_release_enabled'      => (bool)  $row->slot_release_enabled,
            'slot_release_frequency'    =>          $row->slot_release_frequency,
            'slot_release_day_of_week'  =>          $row->slot_release_day_of_week  !== null
                                                        ? (int) $row->slot_release_day_of_week
                                                        : null,
            'slot_release_day_of_month' =>          $row->slot_release_day_of_month !== null
                                                        ? (int) $row->slot_release_day_of_month
                                                        : null,
            'slot_release_time'         =>          $this->fmtTime($row->slot_release_time),
            'slot_release_window_days'  =>          $row->slot_release_window_days  !== null
                                                        ? (int) $row->slot_release_window_days
                                                        : null,
        ];
    }

    private function fmtTime(?string $t): ?string
    {
        return $t ? substr($t, 0, 5) : null;
    }

    // ── Ensure hours rows exist (seed all 7 days if missing) ──────────────────

    private function ensureHours(): void
    {
        $existing = DB::table('hours')->pluck('day_of_week')->toArray();
        foreach (range(0, 6) as $day) {
            if (! in_array($day, $existing, true)) {
                $closed = in_array($day, [0, 6]);
                DB::table('hours')->insert([
                    'day_of_week' => $day,
                    'is_closed'   => $closed,
                    'open_time'   => $closed ? null : '09:00:00',
                    'close_time'  => $closed ? null : '18:00:00',
                    'break_start' => null,
                    'break_end'   => null,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ]);
            }
        }
    }

    // ── Ensure booking_settings row exists (create defaults if missing) ───────

    private function ensureSettings(): void
    {
        if (! DB::table('booking_settings')->exists()) {
            DB::table('booking_settings')->insert([
                'buffer_before_minutes'    => 0,
                'buffer_after_minutes'     => 15,
                'minimum_notice_minutes'   => 720,
                'booking_interval_minutes' => 30,
                'max_days_ahead'           => 30,
                'auto_confirm_bookings'    => false,
                'slot_release_enabled'     => false,
                'created_at'               => now(),
                'updated_at'               => now(),
            ]);
        }
    }

    // ── GET /api/v1/editor/availability ──────────────────────────────────────

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureHours();
        $this->ensureSettings();

        $hours = DB::table('hours')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => $this->formatHour($r))
            ->values()
            ->all();

        $settings = $this->formatSettings(DB::table('booking_settings')->first());

        tenancy()->end();

        return response()->json([
            'hours'    => $hours,
            'settings' => $settings,
        ]);
    }

    // ── PATCH /api/v1/editor/availability ────────────────────────────────────

    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'hours'                             => 'sometimes|array|size:7',
            'hours.*.day_of_week'               => 'required_with:hours|integer|between:0,6',
            'hours.*.is_open'                   => 'required_with:hours|boolean',
            'hours.*.open_time'                 => 'nullable|date_format:H:i',
            'hours.*.close_time'                => 'nullable|date_format:H:i',
            'hours.*.break_start'               => 'nullable|date_format:H:i',
            'hours.*.break_end'                 => 'nullable|date_format:H:i',

            'settings'                          => 'sometimes|array',
            'settings.buffer_before_minutes'    => 'sometimes|integer|min:0|max:120',
            'settings.buffer_after_minutes'     => 'sometimes|integer|min:0|max:120',
            'settings.minimum_notice_minutes'   => 'sometimes|integer|min:0',
            'settings.booking_interval_minutes' => 'sometimes|integer|in:15,30,60',
            'settings.max_days_ahead'           => 'sometimes|integer|min:1|max:365',
            'settings.max_appointments_per_day' => 'nullable|integer|min:1',
            'settings.auto_confirm_bookings'    => 'sometimes|boolean',
            'settings.slot_release_enabled'     => 'sometimes|boolean',
            'settings.slot_release_frequency'   => 'nullable|in:weekly,biweekly,monthly,custom',
            'settings.slot_release_day_of_week' => 'nullable|integer|between:0,6',
            'settings.slot_release_day_of_month'=> 'nullable|integer|between:1,31',
            'settings.slot_release_time'        => 'nullable|date_format:H:i',
            'settings.slot_release_window_days' => 'nullable|integer|min:1|max:365',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureHours();
        $this->ensureSettings();

        // ── Update hours ──────────────────────────────────────────────────────
        if ($request->has('hours')) {
            foreach ($request->input('hours') as $day) {
                DB::table('hours')
                    ->where('day_of_week', $day['day_of_week'])
                    ->update([
                        'is_closed'   => ! $day['is_open'],
                        'open_time'   => $day['open_time']   ?? null,
                        'close_time'  => $day['close_time']  ?? null,
                        'break_start' => $day['break_start'] ?? null,
                        'break_end'   => $day['break_end']   ?? null,
                        'updated_at'  => now(),
                    ]);
            }
        }

        // ── Update settings ───────────────────────────────────────────────────
        if ($request->has('settings')) {
            $s = $request->input('settings');
            $patch = ['updated_at' => now()];

            $intFields = [
                'buffer_before_minutes', 'buffer_after_minutes',
                'minimum_notice_minutes', 'booking_interval_minutes',
                'max_days_ahead',
            ];
            foreach ($intFields as $f) {
                if (isset($s[$f])) $patch[$f] = (int) $s[$f];
            }

            if (array_key_exists('max_appointments_per_day', $s)) {
                $patch['max_appointments_per_day'] = $s['max_appointments_per_day'] !== null
                    ? (int) $s['max_appointments_per_day']
                    : null;
            }

            $boolFields = ['auto_confirm_bookings', 'slot_release_enabled'];
            foreach ($boolFields as $f) {
                if (isset($s[$f])) $patch[$f] = (bool) $s[$f];
            }

            $nullableFields = [
                'slot_release_frequency', 'slot_release_time',
            ];
            foreach ($nullableFields as $f) {
                if (array_key_exists($f, $s)) $patch[$f] = $s[$f];
            }

            $nullableInts = [
                'slot_release_day_of_week', 'slot_release_day_of_month', 'slot_release_window_days',
            ];
            foreach ($nullableInts as $f) {
                if (array_key_exists($f, $s)) {
                    $patch[$f] = $s[$f] !== null ? (int) $s[$f] : null;
                }
            }

            DB::table('booking_settings')->update($patch);
        }

        // ── Read back (still inside tenant context) ───────────────────────────
        $hours = DB::table('hours')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => $this->formatHour($r))
            ->values()
            ->all();

        $settings = $this->formatSettings(DB::table('booking_settings')->first());

        tenancy()->end();

        return response()->json([
            'hours'    => $hours,
            'settings' => $settings,
        ]);
    }
}
