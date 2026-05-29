<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\NotificationSettingsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 of the customer-accounts feature — customer's own bookings
 * across every BookReady business they've used.
 *
 * Surface (all under auth:sanctum + customer_session + customer_verified_email):
 *
 *   GET    /api/v1/customer/bookings
 *          List every appointment across linked tenants, ordered most
 *          recent first. Scoped to tenants in the customer_user_tenants
 *          pivot (typically 1–3 per customer) — does NOT walk every
 *          tenant in the platform.
 *
 *   GET    /api/v1/customer/bookings/{tenant_slug}/{appointment_id}
 *          Detail for a single appointment.
 *
 *   POST   /api/v1/customer/bookings/{tenant_slug}/{appointment_id}/cancel
 *          Customer-initiated cancel. Mirrors the token-gated
 *          PublicManageBookingController::cancel path including
 *          window enforcement + the dual-notification (client receipt
 *          + owner heads-up).
 *
 *   POST   /api/v1/customer/bookings/{tenant_slug}/{appointment_id}/reschedule
 *          body: { appointment_date: Y-m-d, start_time: H:i }
 *          Same shape as the token-gated reschedule.
 *
 * IDOR defense — every endpoint that touches a specific appointment
 * resolves the appointment, joins to clients, and asserts
 * clients.customer_user_id == auth()->user()->id BEFORE doing
 * anything. The tenant slug in the URL is not load-bearing for
 * authorization — the customer_user_id check is the gate.
 *
 * Cancel/reschedule logic is intentionally duplicated from
 * PublicManageBookingController rather than extracted to a shared
 * service — extracting would require a wider refactor and risk
 * regressing a working flow. If a third caller ever needs the same
 * logic, that's the moment to extract App\Services\AppointmentManagementService.
 */
class BookingsController extends Controller
{
    // GET /api/v1/customer/bookings
    public function index(Request $request): JsonResponse
    {
        $customer = $request->user();

        // Build the set of tenants we'll scan. Start with the pivot
        // (fast path — these are tenants the customer is known to have
        // booked at) and then UNION every tenant so we catch bookings
        // made anonymously under the same email/phone before they had
        // an account, or made by a misconfigured client where the
        // customer_user_id stamp never landed. Self-healing: whenever
        // we find a match by email/phone in a tenant not yet in the
        // pivot, we stamp clients.customer_user_id + upsert the pivot
        // row, so the NEXT request takes the fast path.
        $pivotTenantIds = DB::table('customer_user_tenants')
            ->where('customer_user_id', $customer->id)
            ->pluck('tenant_id')
            ->all();
        $allTenants = Tenant::all();

        $email = $customer->email
            ? strtolower(trim((string) $customer->email))
            : null;
        $phone = $customer->phone
            ? trim((string) $customer->phone)
            : null;

        $bookings        = [];
        $newPivotInserts = [];

        foreach ($allTenants as $tenant) {
            try {
                tenancy()->initialize($tenant);

                if (! Schema::hasColumn('clients', 'customer_user_id')) {
                    continue;
                }

                // Pull every clients row that COULD belong to this
                // customer: stamped already, or matches their email or
                // phone. Email comparison is case-insensitive (Eloquent
                // LOWER() on both sides).
                $query = DB::table('clients')->where(function ($q) use ($customer, $email, $phone) {
                    $q->where('customer_user_id', $customer->id);
                    if ($email !== null) {
                        $q->orWhereRaw('LOWER(email) = ?', [$email]);
                    }
                    if ($phone !== null && $phone !== '') {
                        $q->orWhere('phone', $phone);
                    }
                });
                $matchedClients = $query->get(['id', 'customer_user_id']);

                if ($matchedClients->isEmpty()) continue;

                // Self-heal: stamp any unstamped matches with the
                // customer's id. Doing it here means the OWNER's
                // /editor/customers Account badge also lights up on
                // the first dashboard visit by the customer.
                $unstampedIds = $matchedClients
                    ->where('customer_user_id', null)
                    ->pluck('id')
                    ->all();
                if (! empty($unstampedIds)) {
                    DB::table('clients')
                        ->whereIn('id', $unstampedIds)
                        ->update([
                            'customer_user_id' => $customer->id,
                            'updated_at'       => now(),
                        ]);
                }

                $clientIds    = $matchedClients->pluck('id')->all();
                $businessName = (string) (
                    DB::table('business_profiles')->value('business_name')
                    ?: $tenant->id
                );

                $rows = DB::table('appointments')
                    ->whereIn('client_id', $clientIds)
                    ->orderByDesc('appointment_date')
                    ->orderByDesc('start_time')
                    ->limit(500)   // hard cap — pagination later
                    ->get();

                foreach ($rows as $row) {
                    $bookings[] = $this->formatBookingRow($row, $tenant->id, $businessName);
                }

                // Mark this tenant for a deferred pivot upsert (we
                // can't write to the central DB while tenancy is
                // initialized — connections are pinned mid-loop).
                if (! in_array($tenant->id, $pivotTenantIds, true)) {
                    $newPivotInserts[] = $tenant->id;
                }
            } catch (\Throwable $e) {
                Log::warning('customer.bookings.index tenant scan failed', [
                    'customer_user_id' => $customer->id,
                    'tenant_id'        => $tenant->id,
                    'error'            => $e->getMessage(),
                ]);
            } finally {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        // Deferred pivot upserts (back on the central connection).
        foreach ($newPivotInserts as $tid) {
            try {
                DB::table('customer_user_tenants')->updateOrInsert(
                    ['customer_user_id' => $customer->id, 'tenant_id' => $tid],
                    [
                        'first_booked_at' => DB::raw('COALESCE(first_booked_at, NOW())'),
                        'last_booked_at'  => now(),
                        'updated_at'      => now(),
                        'created_at'      => DB::raw('COALESCE(created_at, NOW())'),
                    ],
                );
            } catch (\Throwable $e) {
                Log::warning('customer.bookings.index pivot upsert failed', [
                    'customer_user_id' => $customer->id,
                    'tenant_id'        => $tid,
                    'error'            => $e->getMessage(),
                ]);
            }
        }

        // Final sort across all tenants combined.
        usort($bookings, fn($a, $b) => strcmp(
            $b['appointment_date'] . ' ' . $b['start_time'],
            $a['appointment_date'] . ' ' . $a['start_time'],
        ));

        return response()->json($bookings);
    }

    // GET /api/v1/customer/bookings/{tenant_slug}/{id}
    public function show(Request $request, string $tenantSlug, int $id): JsonResponse
    {
        $context = $this->loadContext($request, $tenantSlug, $id);
        if ($context instanceof JsonResponse) return $context;

        [$tenant, $row, $businessName, $bookingSettings] = $context;
        $payload = $this->formatBookingDetail($row, $tenant->id, $businessName, $bookingSettings);

        tenancy()->end();
        return response()->json($payload);
    }

    // POST /api/v1/customer/bookings/{tenant_slug}/{id}/cancel
    public function cancel(Request $request, string $tenantSlug, int $id): JsonResponse
    {
        $context = $this->loadContext($request, $tenantSlug, $id);
        if ($context instanceof JsonResponse) return $context;

        [$tenant, $row, $businessName, $bookingSettings] = $context;

        if (in_array($row->status, ['cancelled', 'completed', 'no_show'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This booking can no longer be changed.'], 422);
        }

        $cancelWin = $bookingSettings && property_exists($bookingSettings, 'cancellation_window_hours')
            ? (int) $bookingSettings->cancellation_window_hours
            : 24;
        $tzId      = config('app.timezone');
        $start     = Carbon::parse("{$row->appointment_date} " . substr($row->start_time, 0, 5), $tzId);
        $hoursAway = Carbon::now($tzId)->diffInMinutes($start, false) / 60;

        if ($hoursAway < $cancelWin) {
            tenancy()->end();
            return response()->json([
                'message' => "Cancellations require at least {$cancelWin} hour"
                    . ($cancelWin === 1 ? '' : 's') . " notice.",
            ], 422);
        }

        DB::table('appointments')->where('id', $row->id)->update([
            'status'     => 'cancelled',
            'updated_at' => now(),
        ]);

        // Build the notification payload before ending tenancy.
        $extras = AppointmentMailer::buildExtras(
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
        $notify     = NotificationSettingsService::load();
        $ownerEmail = $tenant->owner?->email;

        tenancy()->end();

        // Mirror PublicManageBookingController: client gets a receipt
        // (gated by their notification preferences), owner ALWAYS gets
        // the heads-up regardless of toggles (operational event).
        AppointmentMailer::sendCancelled($appt, $businessName, $notify);
        AppointmentMailer::sendClientCancelledToOwner($appt, $businessName, $ownerEmail, $notify);

        return response()->json([
            'message' => 'Your booking has been cancelled.',
            'status'  => 'cancelled',
        ]);
    }

    // POST /api/v1/customer/bookings/{tenant_slug}/{id}/reschedule
    public function reschedule(Request $request, string $tenantSlug, int $id): JsonResponse
    {
        $validated = $request->validate([
            'appointment_date' => 'required|date_format:Y-m-d',
            'start_time'       => 'required|date_format:H:i',
        ]);

        $newDate  = $validated['appointment_date'];
        $newStart = substr($validated['start_time'], 0, 5);

        $context = $this->loadContext($request, $tenantSlug, $id);
        if ($context instanceof JsonResponse) return $context;

        [$tenant, $row, $businessName, $bookingSettings] = $context;

        if (in_array($row->status, ['cancelled', 'completed', 'no_show'], true)) {
            tenancy()->end();
            return response()->json(['message' => 'This booking can no longer be changed.'], 422);
        }

        $reschedWin = $bookingSettings && property_exists($bookingSettings, 'reschedule_window_hours')
            ? (int) $bookingSettings->reschedule_window_hours
            : 24;
        $tzId       = config('app.timezone');
        $start      = Carbon::parse("{$row->appointment_date} " . substr($row->start_time, 0, 5), $tzId);
        $hoursAway  = Carbon::now($tzId)->diffInMinutes($start, false) / 60;

        if ($hoursAway < $reschedWin) {
            tenancy()->end();
            return response()->json([
                'message' => "Reschedules require at least {$reschedWin} hour"
                    . ($reschedWin === 1 ? '' : 's') . " notice.",
            ], 422);
        }

        // Compute new end_time using existing duration. Naive Carbon
        // add is fine — services don't span days here.
        $durationMins = $row->service_duration_minutes !== null
            ? (int) $row->service_duration_minutes
            : Carbon::parse($row->end_time)->diffInMinutes(Carbon::parse($row->start_time));
        $newEnd = Carbon::parse("{$newDate} {$newStart}", $tzId)
            ->addMinutes($durationMins)
            ->format('H:i');

        DB::table('appointments')->where('id', $row->id)->update([
            'appointment_date' => $newDate,
            'start_time'       => $newStart,
            'end_time'         => $newEnd,
            'updated_at'       => now(),
        ]);

        $extras = AppointmentMailer::buildExtras(
            (int) $row->id,
            property_exists($row, 'staff_id') ? $row->staff_id : null,
        );
        $appt = [
            'id'               => (int) $row->id,
            'customer_name'    => $row->customer_name,
            'customer_email'   => $row->customer_email,
            'customer_phone'   => $row->customer_phone,
            'service_name'     => $row->service_name,
            'appointment_date' => $newDate,
            'start_time'       => $newStart,
            'end_time'         => $newEnd,
            'status'           => $row->status,
            'notes'            => $row->notes,
            'staff_name'       => $extras['staff_name'],
            'addons'           => $extras['addons'],
            // Original date/time, so the reschedule email can show "from → to"
            'previous_appointment_date' => $row->appointment_date,
            'previous_start_time'       => substr($row->start_time, 0, 5),
        ];
        $notify     = NotificationSettingsService::load();
        $ownerEmail = $tenant->owner?->email;

        // "Before" snapshot for the from→to email layout. The customer
        // self-serve reschedule path embeds previous_* fields inside
        // $appt but the mailers want a parallel $oldAppt array.
        $oldAppt = array_merge($appt, [
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr($row->start_time, 0, 5),
            'end_time'         => substr($row->end_time,   0, 5),
        ]);

        tenancy()->end();

        AppointmentMailer::sendRescheduled($appt, $oldAppt, $businessName, 'client', $notify);
        AppointmentMailer::sendClientRescheduledToOwner($appt, $oldAppt, $businessName, $ownerEmail, $notify);

        return response()->json([
            'message'          => 'Your booking has been rescheduled.',
            'appointment_date' => $newDate,
            'start_time'       => $newStart,
            'end_time'         => $newEnd,
        ]);
    }

    /**
     * Shared loader for /show, /cancel, /reschedule — resolves the
     * tenant, initializes tenancy, fetches the appointment row,
     * enforces the IDOR check (customer_user_id match on clients),
     * and returns [$tenant, $appointmentRow, $businessName, $bookingSettings].
     *
     * Returns a JsonResponse on any failure so the caller can early-return.
     */
    private function loadContext(Request $request, string $tenantSlug, int $id): array|JsonResponse
    {
        $customer = $request->user();

        $tenantSlug = strtolower($tenantSlug);
        if (! preg_match('/^[a-z0-9]+$/', $tenantSlug)) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $tenant = Tenant::find($tenantSlug);
        if (! $tenant) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        try {
            tenancy()->initialize($tenant);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        if (! Schema::hasColumn('clients', 'customer_user_id')) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $row = DB::table('appointments')->where('id', $id)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        // IDOR check — the appointment's client row must belong to
        // this customer, either by direct customer_user_id stamp OR
        // (matching the broader index match) by email or phone.
        // Without this an authed customer could enumerate other
        // customers' booking IDs.
        //
        // When we match by email/phone we ALSO self-heal the stamp
        // so subsequent requests can take the fast path AND so the
        // owner-side /editor/customers Account badge lights up.
        $client = DB::table('clients')
            ->where('id', $row->client_id)
            ->first(['id', 'customer_user_id', 'email', 'phone']);

        if (! $client) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $email = $customer->email ? strtolower(trim((string) $customer->email)) : null;
        $phone = $customer->phone ? trim((string) $customer->phone) : null;
        $clientEmail = $client->email ? strtolower(trim((string) $client->email)) : null;
        $clientPhone = $client->phone ? trim((string) $client->phone) : null;

        $belongs =
            ((int) $client->customer_user_id === (int) $customer->id) ||
            ($email !== null && $clientEmail === $email) ||
            ($phone !== null && $phone !== '' && $clientPhone === $phone);

        if (! $belongs) {
            tenancy()->end();
            return response()->json(['message' => 'Booking not found'], 404);
        }

        // Self-heal the stamp when we matched by email/phone.
        if ($client->customer_user_id === null) {
            DB::table('clients')
                ->where('id', $client->id)
                ->update([
                    'customer_user_id' => $customer->id,
                    'updated_at'       => now(),
                ]);
        }

        $bookingSettings = Schema::hasTable('booking_settings')
            ? DB::table('booking_settings')->first()
            : null;

        $businessName = (string) (
            DB::table('business_profiles')->value('business_name')
            ?: $tenant->id
        );

        return [$tenant, $row, $businessName, $bookingSettings];
    }

    /**
     * Listing-row shape — narrow enough to render a card without
     * a second round-trip per row.
     */
    private function formatBookingRow(object $row, string $tenantId, string $businessName): array
    {
        return [
            'tenant_id'                => $tenantId,
            'business_name'            => $businessName,
            'id'                       => (int) $row->id,
            'service_name'             => $row->service_name,
            'service_duration_minutes' => $row->service_duration_minutes !== null
                ? (int) $row->service_duration_minutes
                : null,
            'service_price'            => $row->service_price !== null
                ? (float) $row->service_price
                : null,
            'appointment_date'         => $row->appointment_date,
            'start_time'               => substr($row->start_time, 0, 5),
            'end_time'                 => substr($row->end_time,   0, 5),
            'status'                   => $row->status,
            'created_at'               => $row->created_at,
        ];
    }

    /**
     * Detail shape — list shape plus window-eligibility derived
     * fields so the frontend can render Cancel / Reschedule buttons
     * correctly. Mirrors the shape PublicManageBookingController returns.
     */
    private function formatBookingDetail(object $row, string $tenantId, string $businessName, ?object $bs): array
    {
        $tzId  = config('app.timezone');
        $now   = Carbon::now($tzId);
        $start = Carbon::parse("{$row->appointment_date} " . substr($row->start_time, 0, 5), $tzId);
        $hoursAway = $now->diffInMinutes($start, false) / 60;

        $cancelWin  = $bs && property_exists($bs, 'cancellation_window_hours') ? (int) $bs->cancellation_window_hours : 24;
        $reschedWin = $bs && property_exists($bs, 'reschedule_window_hours')   ? (int) $bs->reschedule_window_hours   : 24;
        $terminal   = in_array($row->status, ['cancelled', 'completed', 'no_show'], true);

        return array_merge($this->formatBookingRow($row, $tenantId, $businessName), [
            'customer_name'             => $row->customer_name,
            'customer_email'            => $row->customer_email,
            'customer_phone'            => $row->customer_phone,
            'notes'                     => $row->notes,
            'is_terminal'               => $terminal,
            'hours_until_appointment'   => round($hoursAway, 1),
            'can_cancel'                => ! $terminal && $hoursAway >= $cancelWin,
            'can_reschedule'            => ! $terminal && $hoursAway >= $reschedWin,
            'cancellation_window_hours' => $cancelWin,
            'reschedule_window_hours'   => $reschedWin,
        ]);
    }
}
