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
            tenancy()->end();
            return response()->json([
                'date'    => $date,
                'service' => $serviceData,
                'slots'   => [],
                'message' => $capacity['source'] === 'staff'
                    ? 'This stylist is fully booked for the day. Try another date or stylist.'
                    : 'This day is fully booked. Please choose another date.',
            ]);
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

        return response()->json([
            'date'    => $date,
            'service' => $serviceData,
            'slots'   => $result['slots'],
            'message' => $result['message'],
        ]);
    }
}
