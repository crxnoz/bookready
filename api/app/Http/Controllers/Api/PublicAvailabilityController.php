<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
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

        if (! preg_match('/^[a-z0-9]+$/', $slug)) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $tenant = Tenant::find($slug);
        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $validated = $request->validate([
            'service_id' => 'required|integer',
            'date'       => 'required|date_format:Y-m-d',
        ]);

        $serviceId = (int) $validated['service_id'];
        $date      = $validated['date'];

        tenancy()->initialize($tenant);

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

        // Load existing appointments for this date (exclude cancelled)
        $appointments = DB::table('appointments')
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->map(fn ($r) => [
                'start_time' => substr($r->start_time, 0, 5),
                'end_time'   => substr($r->end_time,   0, 5),
            ])
            ->all();

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
                ->get(['start_date', 'end_date', 'reason'])
                ->map(fn ($r) => [
                    'start_date' => $r->start_date,
                    'end_date'   => $r->end_date,
                    'reason'     => $r->reason,
                ])
                ->all();
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
            blockedRanges: $blockedRanges,
        );

        return response()->json([
            'date'    => $date,
            'service' => $serviceData,
            'slots'   => $result['slots'],
            'message' => $result['message'],
        ]);
    }
}
