<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\SitePrivacyService;
use App\Services\SlotGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicAvailabilityController extends Controller
{
    /**
     * GET /api/v1/public/sites/{slug}/availability?service_id=1&date=2026-05-30
     * No auth required.
     */
    public function show(Request $request, string $slug): JsonResponse
    {
        $slug = strtolower($slug);

        // Allow lowercase letters, numbers, and hyphens (dashed slugs
        // like "the-fade-room" were previously rejected by [a-z0-9]+).
        if (! preg_match('/^[a-z0-9-]+$/', $slug)) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $tenant = Tenant::find($slug);
        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $validated = $request->validate([
            'service_id' => 'required|integer',
            'date'       => 'required|date_format:Y-m-d',
            // Phase 7: optional. When set, conflicts + blocks are filtered
            // to that staff member's calendar.
            'staff_id'   => 'sometimes|nullable|integer',
            // Av2.0 P4: optional customer email. When a logged-in customer
            // is booking, we use it to unlock after-hours slots gated to
            // existing / VIP customers. Anonymous → 'everyone' tier only.
            'email'      => 'sometimes|nullable|email',
        ]);

        $serviceId = (int) $validated['service_id'];
        $date      = $validated['date'];
        $staffId   = isset($validated['staff_id']) && $validated['staff_id'] !== null
            ? (int) $validated['staff_id']
            : null;

        tenancy()->initialize($tenant);

        // Phase S1 — visibility gate. Private + coming-soon sites must
        // never leak availability either; respond 403 so the booking
        // form fails gracefully rather than appearing functional.
        $block = SitePrivacyService::check($slug, $request->query('unlock'));
        if ($block !== null) {
            tenancy()->end();
            return response()->json(['message' => 'Site unavailable'], 403);
        }

        // Load service (must be active)
        $service = DB::table('services')
            ->where('id', $serviceId)
            ->where('is_active', true)
            ->first();

        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found or unavailable'], 422);
        }

        // day_of_week: 0=Sunday … 6=Saturday (matches Carbon::dayOfWeek)
        $dayOfWeek = (int) Carbon::parse($date)->dayOfWeek;

        // Load hours for this day
        $hoursRow = DB::table('hours')->where('day_of_week', $dayOfWeek)->first();

        // Av2.0 P1 — layer per-date overrides on top of the weekly row.
        // No-op for tenants without overrides; identical to today's behavior.
        $override = \App\Services\AvailabilityOverrideResolver::resolve(
            $date, $hoursRow, $serviceId, $staffId,
        );
        if ($override['closed']) {
            $serviceData = [
                'id'               => (int)   $service->id,
                'name'             =>          $service->name,
                'duration_minutes' => (int)   $service->duration,
                'price'            => (float) $service->price,
            ];
            tenancy()->end();
            return response()->json([
                'date'    => $date,
                'service' => $serviceData,
                'slots'   => [],
                'message' => $override['closed_reason'],
            ]);
        }
        $hoursRow = $override['hoursRow'];

        // Load booking settings
        $settings = DB::table('booking_settings')->first();

        // Short-circuit if booking has been turned off business-wide.
        if ($settings && property_exists($settings, 'booking_enabled') && ! $settings->booking_enabled) {
            tenancy()->end();
            return response()->json([
                'date'    => $date,
                'service' => [
                    'id'               => (int)   $service->id,
                    'name'             =>          $service->name,
                    'duration_minutes' => (int)   $service->duration,
                    'price'            => (float) $service->price,
                ],
                'slots'   => [],
                'message' => 'Booking is currently unavailable.',
            ]);
        }

        // Load existing appointments for this date (exclude cancelled).
        // Phase 7: when a staff_id is supplied AND that column exists in
        // appointments, conflicts only consider that staff's bookings
        // (plus unassigned ones, which still tie up the shop's calendar).
        $apptQuery = DB::table('appointments')
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled']);
        if ($staffId !== null && \Illuminate\Support\Facades\Schema::hasColumn('appointments', 'staff_id')) {
            $apptQuery->where(function ($q) use ($staffId) {
                $q->where('staff_id', $staffId)->orWhereNull('staff_id');
            });
        }
        $appointments = $apptQuery
            ->get()
            ->map(fn ($r) => [
                'start_time' => substr($r->start_time, 0, 5),
                'end_time'   => substr($r->end_time,   0, 5),
            ])
            ->all();

        // Phase 7: per-staff blocked dates also gate availability when a
        // staff is selected. Merge into the same $blockedRanges list as
        // tenant-wide closures so SlotGenerator treats them identically.
        $staffBlockedRanges = [];
        if ($staffId !== null && \Illuminate\Support\Facades\Schema::hasTable('staff_blocked_dates')) {
            $staffBlockedRanges = DB::table('staff_blocked_dates')
                ->where('staff_id', $staffId)
                ->where('start_date', '<=', $date)
                ->where(function ($q) use ($date) {
                    $q->where('end_date', '>=', $date)->orWhereNull('end_date');
                })
                ->get(['start_date', 'end_date'])
                ->map(fn ($r) => [
                    'start_date' => $r->start_date,
                    'end_date'   => $r->end_date,
                    // Phase S5++ — never echo owner-entered reasons back
                    // to anonymous visitors. SlotGenerator falls back to a
                    // generic "Closed on this day" message when reason is
                    // absent.
                ])
                ->all();
        }

        // Phase 6: tenant-wide blocked dates. SlotGenerator returns an
        // empty list with a friendly message when the chosen date falls
        // inside any range. Only ranges whose end >= today are queried
        // (also includes single-day blocks via end_date IS NULL fallback).
        $blockedRanges = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('blocked_dates')) {
            $blockedRanges = DB::table('blocked_dates')
                ->where(function ($q) use ($date) {
                    // Range must overlap or contain the requested date.
                    $q->where('start_date', '<=', $date)
                      ->where(function ($q2) use ($date) {
                          $q2->where('end_date', '>=', $date)
                             ->orWhereNull('end_date');
                      });
                })
                ->get(['start_date', 'end_date'])
                ->map(fn ($r) => [
                    'start_date' => $r->start_date,
                    'end_date'   => $r->end_date,
                    // Phase S5++ — `reason` stripped; see SitePrivacy notes.
                ])
                ->all();
        }

        // Av2.0 P2 — compute the release window (Always Open / Weekly /
        // Bi-Weekly / Monthly / Custom). Drops list is empty for non-custom
        // strategies, which is fine — the resolver ignores it.
        $drops = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('slot_release_drops')) {
            $drops = DB::table('slot_release_drops')->get()->all();
        }
        $releasedUntil = \App\Services\ReleaseWindowResolver::releasedUntil(
            $settings, $drops, \Carbon\Carbon::now(config('app.timezone')),
        );

        // Av2.0 P3 — day-level capacity gate. When full, return empty
        // slots with a friendly reason instead of rendering bookable
        // times the customer can't actually take.
        $capacity = \App\Services\CapacityResolver::resolve($date, $settings, $staffId);
        if ($capacity['full']) {
            $serviceData = [
                'id'               => (int)   $service->id,
                'name'             =>          $service->name,
                'duration_minutes' => (int)   $service->duration,
                'price'            => (float) $service->price,
            ];

            // Av2.0 P6 — a fully-booked day is exactly when squeeze-ins
            // apply. Tell the widget whether to offer one (enabled + access
            // tier + under the daily limit).
            $squeezeIn = $this->squeezeInOffer($date, $validated['email'] ?? null);

            tenancy()->end();
            return response()->json([
                'date'    => $date,
                'service' => $serviceData,
                'slots'   => [],
                'message' => $capacity['source'] === 'staff'
                    ? 'This stylist is fully booked for the day. Try another date or stylist.'
                    : 'This day is fully booked. Please choose another date.',
                'squeeze_in' => $squeezeIn,
            ]);
        }

        // Av2.0 P4 — after-hours. If enabled + the customer's access tier
        // qualifies + we're under the after-hours daily cap, extend the
        // hours row's close so SlotGenerator produces premium slots too.
        // We remember the regular close to tag + price those slots after.
        $afterHoursRegularClose = null;
        $afterHoursFeeCents     = 0;
        if (\Illuminate\Support\Facades\Schema::hasTable('after_hours_config') && $hoursRow && ! empty($hoursRow->close_time)) {
            $ahConfig = DB::table('after_hours_config')->first();
            $window   = \App\Services\AfterHoursResolver::extendedClose($hoursRow->close_time, $ahConfig);
            if ($window) {
                // Access tier check (anonymous → 'everyone' only).
                $client = null;
                $email  = $validated['email'] ?? null;
                if ($email && \Illuminate\Support\Facades\Schema::hasTable('clients')) {
                    $client = DB::table('clients')->where('email', $email)->first();
                }
                $allowed = \App\Services\AfterHoursResolver::accessAllowed(
                    (string) ($ahConfig->access_tier ?? 'everyone'), $client,
                );

                // Separate after-hours capacity cap.
                $capOk = true;
                if ($allowed && $ahConfig->daily_capacity !== null
                    && \Illuminate\Support\Facades\Schema::hasColumn('appointments', 'is_after_hours')) {
                    $ahCount = (int) DB::table('appointments')
                        ->where('appointment_date', $date)
                        ->where('is_after_hours', true)
                        ->whereNotIn('status', ['cancelled'])
                        ->count();
                    $capOk = $ahCount < (int) $ahConfig->daily_capacity;
                }

                if ($allowed && $capOk) {
                    $afterHoursRegularClose = $window['regular_close'];
                    $afterHoursFeeCents     = $window['fee_cents'];
                    // Extend the close so SlotGenerator emits premium slots.
                    $hoursRow->close_time   = $window['extended_close'];
                }
            }
        }

        // Av2.0 follow-up — owner-announced squeeze-ins. Load BEFORE
        // tenancy()->end() so we can append them to the slot list as a
        // third tier (alongside regular + after_hours). Each announcement
        // row's windows produce one bookable slot at window.start; the
        // customer-side renderer groups them under their own section
        // ("Squeeze-in +$FEE") below the after-hours section.
        $squeezeInAnnouncements = [];
        $squeezeInDefaultFeeCents = 0;
        if (\Illuminate\Support\Facades\Schema::hasTable('squeeze_in_announcements')) {
            $squeezeInAnnouncements = DB::table('squeeze_in_announcements')
                ->where('date', $date)
                ->get()
                ->all();
        }
        if (\Illuminate\Support\Facades\Schema::hasTable('squeeze_in_config')) {
            $siCfg = DB::table('squeeze_in_config')->first();
            if ($siCfg) $squeezeInDefaultFeeCents = (int) ($siCfg->fee_cents ?? 0);
        }

        // Snapshot service data before ending tenancy
        $serviceData = [
            'id'               => (int)   $service->id,
            'name'             =>          $service->name,
            'duration_minutes' => (int)   $service->duration,
            'price'            => (float) $service->price,
        ];

        tenancy()->end();

        // Pure slot generation — no DB calls here
        $result = SlotGenerator::generate(
            date:          $date,
            service:       $service,
            hoursRow:      $hoursRow,
            settings:      $settings,
            appointments:  $appointments,
            appTimezone:   config('app.timezone'),
            blockedRanges: array_merge($blockedRanges, $staffBlockedRanges),
            releasedUntil: $releasedUntil,
        );

        // Av2.0 follow-up — if the override defined custom slot windows
        // instead of one open/close range, drop generated slots that
        // fell into the gaps between windows. SlotGenerator was run
        // against the windows' envelope (min start → max end) so a slot
        // could land in a gap; this filter excludes those.
        $slots = $result['slots'];
        if (! empty($override['slot_windows'])) {
            $slots = \App\Services\AvailabilityOverrideResolver::filterToWindows($slots, $override['slot_windows']);
        }

        // Av2.0 P4 — tag the premium slots (start >= regular close) with a
        // tier + price delta so the booking widget can render a "+$X" badge.
        if ($afterHoursRegularClose !== null) {
            $feeDollars = round($afterHoursFeeCents / 100, 2);
            $slots = array_map(function ($slot) use ($afterHoursRegularClose, $feeDollars) {
                if (\App\Services\AfterHoursResolver::isAfterHours($slot['start_time'], $afterHoursRegularClose)) {
                    $slot['tier']        = 'after_hours';
                    $slot['price_delta'] = $feeDollars;
                }
                return $slot;
            }, $slots);
        }

        // Av2.0 follow-up — append owner-announced squeeze-in slots as a
        // third tier. Each announcement's windows contribute one slot per
        // window at window.start. We dedup against existing slot times so
        // a time that's already regularly available doesn't ALSO show up
        // under "Squeeze-in" (owners only announce when regular capacity
        // is exhausted, but be defensive).
        if (! empty($squeezeInAnnouncements)) {
            $existingTimes = array_flip(array_column($slots, 'start_time'));
            foreach ($squeezeInAnnouncements as $announcement) {
                // Service filter — null service_ids means "all services".
                $allowedServices = $announcement->service_ids
                    ? json_decode((string) $announcement->service_ids, true)
                    : null;
                if (is_array($allowedServices) && ! in_array((int) $service->id, $allowedServices, true)) {
                    continue;
                }
                $windows = json_decode((string) ($announcement->slot_windows ?? ''), true) ?? [];
                $feeCents = $announcement->fee_cents !== null
                    ? (int) $announcement->fee_cents
                    : $squeezeInDefaultFeeCents;
                $feeDollars = round($feeCents / 100, 2);

                foreach ($windows as $w) {
                    if (! isset($w['start'], $w['end'])) continue;
                    $startTime = (string) $w['start'];
                    // Dedup: skip if a regular slot already exists at this time.
                    if (isset($existingTimes[$startTime])) continue;

                    // Build a slot row matching the shape SlotGenerator emits.
                    // Convert HH:MM → minutes for SlotGenerator::formatLabel.
                    [$h, $m] = array_map('intval', explode(':', $startTime, 2));
                    $minutes = $h * 60 + $m;
                    $slots[] = [
                        'start_time'  => $startTime,
                        'end_time'    => (string) $w['end'],
                        'label'       => \App\Services\SlotGenerator::formatLabel($minutes),
                        'tier'        => 'squeeze_in',
                        'price_delta' => $feeDollars,
                    ];
                    $existingTimes[$startTime] = true;
                }
            }
            // Re-sort by start_time so the slot list reads chronologically.
            usort($slots, fn ($a, $b) => strcmp($a['start_time'], $b['start_time']));
        }

        return response()->json([
            'date'    => $date,
            'service' => $serviceData,
            'slots'   => $slots,
            'message' => $result['message'],
        ]);
    }

    /**
     * Av2.0 P6 — squeeze-in offer for a full day. Returns null when not
     * applicable; otherwise {available:true, fee:float}. Assumes tenancy
     * is initialized (called before tenancy()->end()).
     */
    private function squeezeInOffer(string $date, ?string $email): ?array
    {
        if (! \Illuminate\Support\Facades\Schema::hasTable('squeeze_in_config')) return null;
        $config = DB::table('squeeze_in_config')->first();
        if (! $config || ! $config->enabled) return null;

        // Access tier.
        $client = ($email && \Illuminate\Support\Facades\Schema::hasTable('clients'))
            ? DB::table('clients')->where('email', $email)->first()
            : null;
        if (! \App\Services\AfterHoursResolver::accessAllowed((string) ($config->access_tier ?? 'existing'), $client)) {
            return null;
        }

        // Daily limit.
        if ($config->daily_limit !== null && \Illuminate\Support\Facades\Schema::hasTable('availability_requests')) {
            $used = (int) DB::table('availability_requests')
                ->where('kind', 'squeeze_in')
                ->where('preferred_date', $date)
                ->whereIn('status', ['pending', 'suggested', 'approved', 'accepted'])
                ->count();
            if ($used >= (int) $config->daily_limit) return null;
        }

        return [
            'available' => true,
            'fee'       => round((int) ($config->fee_cents ?? 0) / 100, 2),
        ];
    }

    /**
     * GET /api/v1/public/sites/{slug}/availability/overview?from=YYYY-MM-DD&to=YYYY-MM-DD&service_id=N
     *
     * Returns a per-date state for the customer-facing booking calendar so
     * cells render with the right visual cue at a glance:
     *
     *   past         – date < today
     *   closed       – weekly schedule closed, override closed, or
     *                  inside a tenant-wide blocked_dates range
     *   not_released – beyond the current release window (Date Drops)
     *   open         – has hours and room
     *   waitlist     – open but at-or-over capacity; customer can join the
     *                  waitlist (waitlist is the universal fallback)
     *   squeeze_in   – open but at-or-over capacity AND the tenant has
     *                  squeeze-ins enabled (replaces waitlist for those
     *                  tenants)
     *
     * Performance: one batch query per data source (~7 total), then a pure
     * O(days) loop. Service-aware via the optional service_id filter so a
     * date that's blocked for one service but open for another reads
     * correctly per the customer's chosen service.
     *
     * Range capped at 62 days so a single request can't enumerate the year.
     */
    public function overview(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'from'       => 'required|date_format:Y-m-d',
            'to'         => 'required|date_format:Y-m-d|after_or_equal:from',
            'service_id' => 'sometimes|integer',
        ]);

        $tenant = Tenant::where('id', $slug)->first();
        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $from = Carbon::parse($request->input('from'));
        $to   = Carbon::parse($request->input('to'));
        if ($from->diffInDays($to) > 62) {
            return response()->json(['message' => 'Range too wide.'], 422);
        }

        $serviceId = $request->integer('service_id') ?: null;
        $fromStr   = $from->toDateString();
        $toStr     = $to->toDateString();
        $today     = Carbon::today()->toDateString();

        tenancy()->initialize($tenant);

        $dates = [];
        try {
            // Weekly fallback hours keyed by day_of_week.
            $weeklyByDow = [];
            if (\Illuminate\Support\Facades\Schema::hasTable('hours')) {
                foreach (DB::table('hours')->get() as $h) {
                    $weeklyByDow[(int) $h->day_of_week] = $h;
                }
            }

            // Per-date overrides indexed by ISO date.
            $overridesByDate = [];
            if (\Illuminate\Support\Facades\Schema::hasTable('calendar_overrides')) {
                $rows = DB::table('calendar_overrides')
                    ->whereBetween('date', [$fromStr, $toStr])
                    ->get();
                foreach ($rows as $r) $overridesByDate[$r->date] = $r;
            }

            // Tenant-wide blocked ranges that overlap our window.
            $blockedRanges = [];
            if (\Illuminate\Support\Facades\Schema::hasTable('blocked_dates')) {
                $blockedRanges = DB::table('blocked_dates')
                    ->where('start_date', '<=', $toStr)
                    ->where(function ($q) use ($fromStr) {
                        $q->where('end_date', '>=', $fromStr)->orWhereNull('end_date');
                    })
                    ->get(['start_date', 'end_date'])
                    ->all();
            }

            // Booking settings (capacity default).
            $settings = DB::table('booking_settings')->first();

            // Release window cutoff.
            $drops = \Illuminate\Support\Facades\Schema::hasTable('slot_release_drops')
                ? DB::table('slot_release_drops')->get()->all()
                : [];
            $releasedUntil = \App\Services\ReleaseWindowResolver::releasedUntil($settings, $drops, Carbon::now());

            // Appointment counts per date (excludes cancelled).
            $apptCountByDate = [];
            $apptQuery = DB::table('appointments')
                ->whereBetween('appointment_date', [$fromStr, $toStr])
                ->whereNotIn('status', ['cancelled']);
            // service_id filter only when the column exists AND the caller
            // selected one. Without it, the overview reflects whole-day
            // capacity regardless of service.
            if ($serviceId !== null && \Illuminate\Support\Facades\Schema::hasColumn('appointments', 'service_id')) {
                $apptQuery->where('service_id', $serviceId);
            }
            $rows = $apptQuery->selectRaw('appointment_date, COUNT(*) AS c')
                ->groupBy('appointment_date')
                ->get();
            foreach ($rows as $r) $apptCountByDate[$r->appointment_date] = (int) $r->c;

            // Squeeze-in feature toggle.
            $squeezeEnabled = false;
            if (\Illuminate\Support\Facades\Schema::hasTable('squeeze_in_config')) {
                $cfg = DB::table('squeeze_in_config')->first();
                $squeezeEnabled = (bool) ($cfg->enabled ?? false);
            }

            // Per-date override-row capacity (Av2.0 P3 column).
            $overrideCapacityCol = \Illuminate\Support\Facades\Schema::hasColumn('calendar_overrides', 'max_appointments');
            $globalCap = $settings->max_appointments_per_day ?? null;

            // Walk the range.
            $loop = $from->copy();
            while ($loop->lte($to)) {
                $ds = $loop->toDateString();
                $dates[$ds] = $this->computeOverviewState(
                    $ds, $today, $loop->dayOfWeek,
                    $weeklyByDow, $overridesByDate, $blockedRanges,
                    $apptCountByDate, $globalCap, $overrideCapacityCol,
                    $releasedUntil, $squeezeEnabled, $serviceId,
                );
                $loop->addDay();
            }
        } finally {
            tenancy()->end();
        }

        return response()->json(['dates' => $dates]);
    }

    /**
     * Pure resolver, no DB calls. All lookups happen via pre-built indexes
     * passed in from overview(). Order matches the spec's precedence:
     * past > not_released > closed > full(squeeze_in|waitlist) > open.
     */
    private function computeOverviewState(
        string  $date,
        string  $today,
        int     $dayOfWeek,
        array   $weeklyByDow,
        array   $overridesByDate,
        array   $blockedRanges,
        array   $apptCountByDate,
        ?int    $globalCap,
        bool    $overrideCapacityCol,
        ?Carbon $releasedUntil,
        bool    $squeezeEnabled,
        ?int    $serviceId,
    ): string {
        if ($date < $today) return 'past';

        if ($releasedUntil !== null && $date > $releasedUntil->toDateString()) {
            return 'not_released';
        }

        // Tenant-wide block overlap.
        foreach ($blockedRanges as $b) {
            $start = (string) $b->start_date;
            $end   = (string) ($b->end_date ?? $b->start_date);
            if ($date >= $start && $date <= $end) return 'closed';
        }

        // Override wins over weekly. Service filter on an override closes
        // the date for that customer's service selection only.
        $override = $overridesByDate[$date] ?? null;
        $weekly   = $weeklyByDow[$dayOfWeek] ?? null;

        if ($override !== null) {
            if (! $override->is_available) return 'closed';
            if ($serviceId !== null && ! empty($override->service_ids)) {
                $allowed = json_decode((string) $override->service_ids, true);
                if (is_array($allowed) && ! in_array($serviceId, $allowed, true)) {
                    return 'closed';
                }
            }
        } else {
            if (! $weekly || $weekly->is_closed) return 'closed';
        }

        // Capacity: override wins over global default.
        $cap = null;
        if ($override !== null && $overrideCapacityCol && $override->max_appointments !== null) {
            $cap = (int) $override->max_appointments;
        } elseif ($globalCap !== null) {
            $cap = (int) $globalCap;
        }

        $count = (int) ($apptCountByDate[$date] ?? 0);
        if ($cap !== null && $count >= $cap) {
            return $squeezeEnabled ? 'squeeze_in' : 'waitlist';
        }

        return 'open';
    }
}
