<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Business-wide booking settings.
 *
 * Reads/writes the same tenant `booking_settings` table that the
 * Availability editor uses, so values stay consistent across both
 * surfaces. The API exposes a small subset of fields under cleaner
 * names than the underlying schema:
 *
 *   API field                            Underlying column(s)
 *   ─────────────────────────────────    ────────────────────────────────────
 *   slot_interval_minutes                booking_interval_minutes
 *   slot_release_mode                    slot_release_enabled + slot_release_frequency
 *
 * Buffer / max-appointments / slot-release calendar fields are
 * intentionally not exposed here — those stay in the Availability page.
 */
class BookingSettingsController extends Controller
{
    // Av2.0 P2 — `custom` joins the recurring strategies (drops live in
    // slot_release_drops). `always_open` collapses slot_release_enabled
    // back to false so the public booking flow has no release gate.
    private const ALLOWED_RELEASE_MODES = ['always_open', 'weekly', 'biweekly', 'monthly', 'custom'];

    private function format(object $row): array
    {
        $get = static fn(string $k, $default = null) =>
            property_exists($row, $k) ? $row->{$k} : $default;

        $releaseEnabled = (bool) ($row->slot_release_enabled ?? false);
        $releaseFreq    = $row->slot_release_frequency ?? null;
        $mode = (! $releaseEnabled || ! in_array($releaseFreq, ['weekly', 'biweekly', 'monthly', 'custom'], true))
            ? 'always_open'
            : $releaseFreq;

        $anchorRaw = $get('slot_release_anchor_date');
        $anchor    = $anchorRaw ? substr((string) $anchorRaw, 0, 10) : null;

        $timeRaw   = $get('slot_release_time');
        $time      = $timeRaw ? substr((string) $timeRaw, 0, 5) : null;

        return [
            'id'                                  => (int)  $row->id,
            'booking_enabled'                     => (bool) ($get('booking_enabled', true)),
            'auto_confirm_bookings'               => (bool) $row->auto_confirm_bookings,
            'minimum_notice_minutes'              => (int)  $row->minimum_notice_minutes,
            'max_days_ahead'                      => (int)  $row->max_days_ahead,
            'slot_interval_minutes'               => (int)  $row->booking_interval_minutes,
            // Release strategy (Av2.0 P2)
            'slot_release_mode'                   =>        $mode,
            'slot_release_window_days'            => $row->slot_release_window_days !== null
                                                          ? (int) $row->slot_release_window_days
                                                          : null,
            'slot_release_day_of_week'            => $row->slot_release_day_of_week !== null
                                                          ? (int) $row->slot_release_day_of_week
                                                          : null,
            'slot_release_day_of_month'           => $row->slot_release_day_of_month !== null
                                                          ? (int) $row->slot_release_day_of_month
                                                          : null,
            'slot_release_time'                   => $time,
            'slot_release_anchor_date'            => $anchor,
            'cancellation_window_hours'           => (int)  ($get('cancellation_window_hours', 24)),
            'reschedule_window_hours'             => (int)  ($get('reschedule_window_hours', 24)),
            'prevent_duplicate_client_bookings'   => (bool) ($get('prevent_duplicate_client_bookings', false)),
            'created_at'                          => $row->created_at,
            'updated_at'                          => $row->updated_at,
        ];
    }

    private function ensureRowExists(): object
    {
        $row = DB::table('booking_settings')->first();
        if ($row) return $row;

        $id = DB::table('booking_settings')->insertGetId([
            'buffer_before_minutes'             => 0,
            'buffer_after_minutes'              => 15,
            'minimum_notice_minutes'            => 120,
            'booking_interval_minutes'          => 30,
            'max_days_ahead'                    => 30,
            'auto_confirm_bookings'             => false,
            'slot_release_enabled'              => false,
            'booking_enabled'                   => true,
            'cancellation_window_hours'         => 24,
            'reschedule_window_hours'           => 24,
            'prevent_duplicate_client_bookings' => false,
            'created_at'                        => now(),
            'updated_at'                        => now(),
        ]);

        return DB::table('booking_settings')->where('id', $id)->first();
    }

    // GET /editor/settings/bookings
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row    = $this->ensureRowExists();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    // PATCH /editor/settings/bookings
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'booking_enabled'                     => 'sometimes|boolean',
            'auto_confirm_bookings'               => 'sometimes|boolean',
            'minimum_notice_minutes'              => 'sometimes|integer|min:0|max:10080',
            'max_days_ahead'                      => 'sometimes|integer|min:1|max:365',
            'slot_interval_minutes'               => 'sometimes|integer|min:5|max:240',
            'slot_release_mode'                   => 'sometimes|in:' . implode(',', self::ALLOWED_RELEASE_MODES),
            'slot_release_window_days'            => 'sometimes|nullable|integer|min:1|max:365',
            'slot_release_day_of_week'            => 'sometimes|nullable|integer|between:0,6',
            'slot_release_day_of_month'           => 'sometimes|nullable|integer|between:1,31',
            'slot_release_time'                   => 'sometimes|nullable|date_format:H:i',
            'slot_release_anchor_date'            => 'sometimes|nullable|date_format:Y-m-d',
            'cancellation_window_hours'           => 'sometimes|integer|min:0|max:720',
            'reschedule_window_hours'             => 'sometimes|integer|min:0|max:720',
            'prevent_duplicate_client_bookings'   => 'sometimes|boolean',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureRowExists();

        $patch = ['updated_at' => now()];

        foreach (['booking_enabled', 'auto_confirm_bookings', 'prevent_duplicate_client_bookings'] as $f) {
            if (array_key_exists($f, $validated)) {
                $patch[$f] = (bool) $validated[$f];
            }
        }

        foreach ([
            'minimum_notice_minutes', 'max_days_ahead',
            'cancellation_window_hours', 'reschedule_window_hours',
        ] as $f) {
            if (array_key_exists($f, $validated)) {
                $patch[$f] = (int) $validated[$f];
            }
        }

        if (array_key_exists('slot_interval_minutes', $validated)) {
            $patch['booking_interval_minutes'] = (int) $validated['slot_interval_minutes'];
        }

        if (array_key_exists('slot_release_mode', $validated)) {
            $mode = $validated['slot_release_mode'];
            if ($mode === 'always_open') {
                $patch['slot_release_enabled']   = false;
                $patch['slot_release_frequency'] = null;
            } else {
                $patch['slot_release_enabled']   = true;
                $patch['slot_release_frequency'] = $mode;
            }
        }

        if (array_key_exists('slot_release_window_days', $validated)) {
            $patch['slot_release_window_days'] = $validated['slot_release_window_days'] !== null
                ? (int) $validated['slot_release_window_days']
                : null;
        }

        // Av2.0 P2: cadence-specific fields.
        if (array_key_exists('slot_release_day_of_week', $validated)) {
            $patch['slot_release_day_of_week'] = $validated['slot_release_day_of_week'];
        }
        if (array_key_exists('slot_release_day_of_month', $validated)) {
            $patch['slot_release_day_of_month'] = $validated['slot_release_day_of_month'];
        }
        if (array_key_exists('slot_release_time', $validated)) {
            $patch['slot_release_time'] = $validated['slot_release_time'];
        }
        if (array_key_exists('slot_release_anchor_date', $validated)) {
            $patch['slot_release_anchor_date'] = $validated['slot_release_anchor_date'];
        }

        DB::table('booking_settings')->update($patch);

        $row    = DB::table('booking_settings')->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    /**
     * GET /editor/release-state
     *
     * Av2.0 P2: returns the resolved release window for the calendar UI.
     * Tells the Smart Calendar which dates are currently bookable so it
     * can tint un-released cells.
     */
    public function releaseState(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $settings = DB::table('booking_settings')->first();
        $drops    = \Illuminate\Support\Facades\Schema::hasTable('slot_release_drops')
            ? DB::table('slot_release_drops')->get()->all()
            : [];

        $now           = \Carbon\Carbon::now(config('app.timezone'));
        $releasedUntil = \App\Services\ReleaseWindowResolver::releasedUntil($settings, $drops, $now);

        $maxDaysAhead  = (int) ($settings->max_days_ahead ?? 30);
        $maxDate       = $now->copy()->addDays($maxDaysAhead)->toDateString();

        // The effective upper bound is the MIN of release-window and
        // max_days_ahead so the UI can render a single "bookable through"
        // line without re-implementing the gate.
        $effectiveTo = $releasedUntil
            ? min($releasedUntil->toDateString(), $maxDate)
            : $maxDate;

        tenancy()->end();

        return response()->json([
            'released_until'   => $releasedUntil?->toDateString(),
            'max_days_ahead'   => $maxDaysAhead,
            'max_bookable_to'  => $effectiveTo,
            'mode'             => ! ($settings->slot_release_enabled ?? false)
                                    ? 'always_open'
                                    : ($settings->slot_release_frequency ?? 'always_open'),
        ]);
    }
}
