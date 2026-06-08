<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\NotificationSettingsService;
use App\Services\SlotGenerator;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Public, token-based cancel/reschedule. Clients hit these from the
 * "Manage your booking" link in their confirmation email — no auth.
 *
 * Routes:
 *   GET  /api/v1/public/sites/{slug}/manage/{token}
 *   POST /api/v1/public/sites/{slug}/manage/{token}/cancel
 *   POST /api/v1/public/sites/{slug}/manage/{token}/reschedule
 */
class PublicManageBookingController extends Controller
{
    private function resolveTenant(string $slug): ?Tenant
    {
        $slug = strtolower($slug);
        // Allow dashes (e.g. "the-fade-room"). [a-z0-9]+ rejected them.
        if (! preg_match('/^[a-z0-9-]+$/', $slug)) return null;
        return Tenant::find($slug);
    }

    private function loadBookingSettings(): ?object
    {
        if (! Schema::hasTable('booking_settings')) return null;
        return DB::table('booking_settings')->first();
    }

    /**
     * Format the appointment shape returned to the public manage page.
     * @param object $row
     */
    private function formatPublic(object $row, ?object $bs): array
    {
        $tzId  = config('app.timezone');
        $now   = Carbon::now($tzId);
        $start = Carbon::parse("{$row->appointment_date} " . substr($row->start_time, 0, 5), $tzId);
        $hoursAway = $now->diffInMinutes($start, false) / 60;

        $cancelWin   = $bs && property_exists($bs, 'cancellation_window_hours') ? (int) $bs->cancellation_window_hours : 24;
        $reschedWin  = $bs && property_exists($bs, 'reschedule_window_hours')   ? (int) $bs->reschedule_window_hours   : 24;

        // Terminal states cannot be acted on.
        $terminal = in_array($row->status, ['cancelled', 'completed', 'no_show'], true);

        $canCancel     = ! $terminal && $hoursAway >= $cancelWin;
        $canReschedule = ! $terminal && $hoursAway >= $reschedWin;

        return [
            'id'                          => (int) $row->id,
            'customer_name'               => $row->customer_name,
            'customer_email'              => $row->customer_email,
            'service_id'                  => $row->service_id !== null ? (int) $row->service_id : null,
            'service_name'                => $row->service_name,
            'service_duration_minutes'    => $row->service_duration_minutes !== null ? (int) $row->service_duration_minutes : null,
            'service_price'               => $row->service_price !== null ? (float) $row->service_price : null,
            'appointment_date'            => $row->appointment_date,
            'start_time'                  => substr($row->start_time, 0, 5),
            'end_time'                    => substr($row->end_time,   0, 5),
            'status'                      => $row->status,
            'is_terminal'                 => $terminal,
            'hours_until_appointment'     => round($hoursAway, 1),
            'can_cancel'                  => $canCancel,
            'can_reschedule'              => $canReschedule,
            'cancellation_window_hours'   => $cancelWin,
            'reschedule_window_hours'     => $reschedWin,
        ];
    }

    public function show(string $slug, string $token): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Booking not found'], 404);

        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'manage_token')) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $row = DB::table('appointments')->where('manage_token', $token)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $bs     = $this->loadBookingSettings();
        $result = $this->formatPublic($row, $bs);

        tenancy()->end();
        return response()->json($result);
    }

    public function cancel(string $slug, string $token): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Booking not found'], 404);

        $ownerEmail = $tenant->owner?->email;
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'manage_token')) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $row = DB::table('appointments')->where('manage_token', $token)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        if (in_array($row->status, ['cancelled', 'completed', 'no_show'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This booking can no longer be changed.'], 422);
        }

        $bs        = $this->loadBookingSettings();
        $cancelWin = $bs && property_exists($bs, 'cancellation_window_hours') ? (int) $bs->cancellation_window_hours : 24;
        $tzId      = config('app.timezone');
        $start     = Carbon::parse("{$row->appointment_date} " . substr($row->start_time, 0, 5), $tzId);
        $hoursAway = Carbon::now($tzId)->diffInMinutes($start, false) / 60;

        if ($hoursAway < $cancelWin) {
            tenancy()->end();
            return response()->json([
                'message' => "Cancellations require at least {$cancelWin} hour" . ($cancelWin === 1 ? '' : 's') . " notice.",
            ], 422);
        }

        DB::table('appointments')->where('id', $row->id)->update([
            'status'     => 'cancelled',
            'updated_at' => now(),
        ]);

        // Build email payload before ending tenancy.
        $extras = \App\Services\AppointmentMailer::buildExtras(
            (int) $row->id,
            property_exists($row, 'staff_id') ? $row->staff_id : null,
        );
        $appt = [
            'id'               => (int) $row->id,
            'customer_name'    => $row->customer_name,
            'customer_email'   => $row->customer_email,
            'customer_phone'   => $row->customer_phone,
            'service_name'     => $row->service_name,
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr($row->start_time, 0, 5),
            'end_time'         => substr($row->end_time,   0, 5),
            'status'           => 'cancelled',
            'notes'            => $row->notes,
            'staff_name'       => $extras['staff_name'],
            'addons'           => $extras['addons'],
        ];
        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        $notify       = NotificationSettingsService::load();

        tenancy()->end();

        // Client gets a cancellation receipt (gated by notification toggle).
        AppointmentMailer::sendCancelled($appt, $businessName, $notify);

        // Owner ALWAYS gets a heads-up when a client cancels — this is an
        // ops event, not a marketing email, so it ignores the toggle.
        AppointmentMailer::sendClientCancelledToOwner($appt, $businessName, $ownerEmail, $notify);

        return response()->json([
            'message' => 'Your booking has been cancelled.',
            'status'  => 'cancelled',
        ]);
    }

    public function reschedule(Request $request, string $slug, string $token): JsonResponse
    {
        $validated = $request->validate([
            'appointment_date' => 'required|date_format:Y-m-d',
            'start_time'       => 'required|date_format:H:i',
        ]);
        $newDate  = $validated['appointment_date'];
        $newStart = substr($validated['start_time'], 0, 5);

        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Booking not found'], 404);

        $ownerEmail = $tenant->owner?->email;

        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'manage_token')) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $row = DB::table('appointments')->where('manage_token', $token)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        if (in_array($row->status, ['cancelled', 'completed', 'no_show'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This booking can no longer be changed.'], 422);
        }

        // Policy enforcement: max_reschedules_per_booking
        // null = unlimited, 0 = none allowed, N = cap. Read defensively in
        // case the policy table hasn't been migrated.
        if (Schema::hasTable('business_policies') && Schema::hasColumn('business_policies', 'max_reschedules_per_booking')) {
            $maxReschedule = DB::table('business_policies')->value('max_reschedules_per_booking');
            if ($maxReschedule !== null) {
                $current = property_exists($row, 'reschedule_count') ? (int) ($row->reschedule_count ?? 0) : 0;
                if ($current >= (int) $maxReschedule) {
                    tenancy()->end();
                    return response()->json([
                        'message' => 'This booking has been rescheduled the maximum number of times. Please contact us directly to change it.',
                    ], 422);
                }
            }
        }

        $bs         = $this->loadBookingSettings();
        $reschedWin = $bs && property_exists($bs, 'reschedule_window_hours') ? (int) $bs->reschedule_window_hours : 24;

        // Window measured against the CURRENT appointment time.
        $tzId   = config('app.timezone');
        $oldStart = Carbon::parse("{$row->appointment_date} " . substr($row->start_time, 0, 5), $tzId);
        $hoursAway = Carbon::now($tzId)->diffInMinutes($oldStart, false) / 60;
        if ($hoursAway < $reschedWin) {
            tenancy()->end();
            return response()->json([
                'message' => "Reschedules require at least {$reschedWin} hour" . ($reschedWin === 1 ? '' : 's') . " notice.",
            ], 422);
        }

        // Pull the service. Use the snapshot fields from the appointment row
        // so the duration matches the booking even if the service has changed.
        if ($row->service_id === null) {
            tenancy()->end();
            return response()->json(['message' => 'Cannot reschedule this booking.'], 422);
        }
        $service = DB::table('services')
            ->where('id', $row->service_id)
            ->where('is_active', true)
            ->first();
        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'The service is no longer available.'], 422);
        }

        // Booking window guards on the new date.
        if ($bs && property_exists($bs, 'booking_enabled') && ! $bs->booking_enabled) {
            tenancy()->end();
            return response()->json(['message' => 'Booking is currently unavailable.'], 422);
        }
        $maxDaysAhead = $bs ? (int) ($bs->max_days_ahead ?? 30) : 30;
        $today        = Carbon::now($tzId)->format('Y-m-d');
        $maxDate      = Carbon::parse($today)->addDays($maxDaysAhead)->format('Y-m-d');
        if ($newDate > $maxDate) {
            tenancy()->end();
            return response()->json([
                'message' => "Bookings are only available up to {$maxDaysAhead} days in advance.",
            ], 422);
        }

        // Slot availability check — same flow as PublicBookingController.
        $dayOfWeek = (int) Carbon::parse($newDate)->dayOfWeek;
        $hoursRow  = DB::table('hours')->where('day_of_week', $dayOfWeek)->first();

        // Av2.0 P1 — honor per-date overrides on reschedule too so a
        // client can't sidestep a same-day closure by rescheduling into it.
        $staffIdForOverride = property_exists($row, 'staff_id') ? ($row->staff_id ?? null) : null;
        $override = \App\Services\AvailabilityOverrideResolver::resolve(
            $newDate, $hoursRow, (int) $service->id, $staffIdForOverride ? (int) $staffIdForOverride : null,
        );
        if ($override['closed']) {
            tenancy()->end();
            return response()->json(['message' => $override['closed_reason']], 422);
        }
        $hoursRow = $override['hoursRow'];

        // Av2.0 P2 — release window enforced on reschedule too.
        $drops = [];
        if (\Illuminate\Support\Facades\Schema::hasTable('slot_release_drops')) {
            $drops = DB::table('slot_release_drops')->get()->all();
        }
        $releasedUntil = \App\Services\ReleaseWindowResolver::releasedUntil(
            $bs, $drops, \Carbon\Carbon::now(config('app.timezone')),
        );
        if ($releasedUntil !== null && $newDate > $releasedUntil->format('Y-m-d')) {
            tenancy()->end();
            return response()->json(['message' => 'This date has not been released for booking yet.'], 422);
        }
        $others    = DB::table('appointments')
            ->where('appointment_date', $newDate)
            ->where('id', '!=', $row->id)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->map(fn ($r) => [
                'start_time' => substr($r->start_time, 0, 5),
                'end_time'   => substr($r->end_time,   0, 5),
            ])
            ->all();

        if ($bs && isset($bs->max_appointments_per_day) && $bs->max_appointments_per_day !== null) {
            $cap = (int) $bs->max_appointments_per_day;
            if ($cap > 0 && count($others) >= $cap) {
                tenancy()->end();
                return response()->json([
                    'message' => 'This day is fully booked. Please choose another date.',
                ], 422);
            }
        }

        $result = SlotGenerator::generate(
            date:          $newDate,
            service:       $service,
            hoursRow:      $hoursRow,
            settings:      $bs,
            appointments:  $others,
            appTimezone:   $tzId,
            releasedUntil: $releasedUntil,
        );
        if (! SlotGenerator::containsSlot($result['slots'], $newStart)) {
            tenancy()->end();
            return response()->json(['message' => 'This time is no longer available.'], 422);
        }

        $duration = (int) $service->duration;
        $endTime  = Carbon::createFromFormat('H:i', $newStart)
            ->addMinutes($duration)
            ->format('H:i');

        // Snapshot the OLD time before we overwrite — used in both emails.
        $oldApptSnap = [
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr($row->start_time, 0, 5),
            'end_time'         => substr($row->end_time,   0, 5),
        ];

        $update = [
            'appointment_date' => $newDate,
            'start_time'       => $newStart,
            'end_time'         => $endTime,
            'updated_at'       => now(),
        ];
        if (Schema::hasColumn('appointments', 'reschedule_count')) {
            $update['reschedule_count'] = (property_exists($row, 'reschedule_count')
                ? (int) ($row->reschedule_count ?? 0)
                : 0) + 1;
        }
        DB::table('appointments')->where('id', $row->id)->update($update);

        $updated     = DB::table('appointments')->find($row->id);
        $publicView  = $this->formatPublic($updated, $bs);
        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        $notify       = NotificationSettingsService::load();

        // Plain-array snapshot for both emails.
        $manageToken = property_exists($updated, 'manage_token') ? $updated->manage_token : null;
        $manageUrl   = $manageToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $manageToken) : null;
        $extras = \App\Services\AppointmentMailer::buildExtras(
            (int) $updated->id,
            property_exists($updated, 'staff_id') ? $updated->staff_id : null,
        );
        $apptForMail = [
            'id'               => (int) $updated->id,
            'customer_name'    => $updated->customer_name,
            'customer_email'   => $updated->customer_email,
            'customer_phone'   => $updated->customer_phone,
            'service_name'     => $updated->service_name,
            'appointment_date' => $updated->appointment_date,
            'start_time'       => substr($updated->start_time, 0, 5),
            'end_time'         => substr($updated->end_time,   0, 5),
            'status'           => $updated->status,
            'manage_url'       => $manageUrl,
            'staff_name'       => $extras['staff_name'],
            'addons'           => $extras['addons'],
        ];

        tenancy()->end();

        // Owner ALWAYS gets a heads-up when a client reschedules.
        AppointmentMailer::sendClientRescheduledToOwner(
            $apptForMail, $oldApptSnap, $businessName, $ownerEmail, $notify,
        );

        // Client gets a receipt for the new time (gated by the
        // appointment_confirmed_email toggle in NotificationSettingsService).
        AppointmentMailer::sendRescheduled(
            $apptForMail, $oldApptSnap, $businessName, 'client', $notify,
        );

        return response()->json([
            'message'     => 'Your booking has been rescheduled.',
            'appointment' => $publicView,
        ]);
    }
}
