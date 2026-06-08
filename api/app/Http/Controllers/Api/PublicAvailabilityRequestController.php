<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\Tenant;
use App\Services\AvailabilityRequestService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Availability 2.0 · Public availability-request surface.
 *
 *   GET  /public/sites/{slug}/availability-requests/{token}
 *     View request status + any owner suggestion (token-gated, no login).
 *
 *   POST /public/sites/{slug}/availability-requests/{token}/accept
 *     Accept an owner-suggested alternative → creates the appointment.
 *
 *   POST /public/sites/{slug}/squeeze-ins
 *     Submit a squeeze-in request on a fully-booked day (kind=squeeze_in).
 *
 * Standard "request a closed date" capture was retired; squeeze-ins remain.
 * Tenant resolution mirrors PublicWaitlistController.
 */
class PublicAvailabilityRequestController extends Controller
{
    /**
     * §6 — squeeze-in request (shown when a day is fully booked). Same
     * lifecycle as a standard request, but carries a fee + is gated by
     * the squeeze_in_config (enabled / access tier / daily limit).
     */
    public function submitSqueezeIn(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'  => 'required|string|max:200',
            'customer_email' => 'required|email|max:200',
            'customer_phone' => 'nullable|string|max:32',
            'service_id'     => 'required|integer|min:1',
            'staff_id'       => 'nullable|integer|min:1',
            'preferred_date' => 'required|date_format:Y-m-d',
            'preferred_time' => 'nullable|date_format:H:i',
            'notes'          => 'nullable|string|max:1000',
        ]);

        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Site not found.'], 404);

        $ownerEmail   = $tenant->owner?->email;
        $businessName = $tenant->name ?? 'Our team';

        tenancy()->initialize($tenant);

        if (! Schema::hasTable('squeeze_in_config')) {
            tenancy()->end();
            return response()->json(['message' => 'Squeeze-ins are not available.'], 422);
        }
        $config = DB::table('squeeze_in_config')->first();
        if (! $config || ! $config->enabled) {
            tenancy()->end();
            return response()->json(['message' => 'Squeeze-ins are not available.'], 422);
        }

        $service = DB::table('services')->where('id', $validated['service_id'])->where('is_active', true)->first();
        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found or unavailable.'], 422);
        }

        // Access tier.
        $client = Schema::hasTable('clients')
            ? DB::table('clients')->where('email', $validated['customer_email'])->first()
            : null;
        if (! \App\Services\AfterHoursResolver::accessAllowed((string) ($config->access_tier ?? 'existing'), $client)) {
            tenancy()->end();
            return response()->json(['message' => 'Squeeze-ins are only available to select customers.'], 422);
        }

        // Daily limit — count squeeze-in requests already pending/approved
        // for the date (independent of normal capacity).
        $used = (int) DB::table('availability_requests')
            ->where('kind', 'squeeze_in')
            ->where('preferred_date', $validated['preferred_date'])
            ->whereIn('status', ['pending', 'suggested', 'approved', 'accepted'])
            ->count();
        if ($config->daily_limit !== null && $used >= (int) $config->daily_limit) {
            tenancy()->end();
            return response()->json(['message' => 'Squeeze-ins are full for that day.'], 422);
        }

        if (Schema::hasTable('business_profiles')) {
            $bp = DB::table('business_profiles')->first();
            if ($bp && ! empty($bp->business_name)) $businessName = $bp->business_name;
        }

        $id = DB::table('availability_requests')->insertGetId([
            'kind'           => 'squeeze_in',
            'customer_name'  => $validated['customer_name'],
            'customer_email' => $validated['customer_email'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'service_id'     => $validated['service_id'],
            'staff_id'       => $validated['staff_id'] ?? null,
            'preferred_date' => $validated['preferred_date'],
            'preferred_time' => $validated['preferred_time'] ?? null,
            'notes'          => $validated['notes'] ?? null,
            'status'         => 'pending',
            'fee_cents'      => (int) ($config->fee_cents ?? 0),
            'action_token'   => Str::random(48),
            'created_at'     => Carbon::now(),
            'updated_at'     => Carbon::now(),
        ]);

        $row = DB::table('availability_requests')->find($id);
        AvailabilityRequestService::notifyOwner($row, $businessName, $ownerEmail, (string) $tenant->id);

        tenancy()->end();

        return response()->json([
            'id'      => $id,
            'message' => 'Squeeze-in request sent! ' . $businessName . ' will let you know if they can fit you in.',
        ], 201);
    }

    public function show(Request $request, string $slug, string $token): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Site not found.'], 404);

        tenancy()->initialize($tenant);

        $req = DB::table('availability_requests')->where('action_token', $token)->first();
        if (! $req) {
            tenancy()->end();
            return response()->json(['message' => 'Request not found.'], 404);
        }

        $service = DB::table('services')->where('id', $req->service_id)->first();

        $payload = [
            'status'         => (string) $req->status,
            'customer_name'  => (string) $req->customer_name,
            'service_name'   => $service?->name ?? 'Service',
            'preferred_date' => substr((string) $req->preferred_date, 0, 10),
            'preferred_time' => $req->preferred_time ? substr((string) $req->preferred_time, 0, 5) : null,
            'suggested_date' => $req->suggested_date ? substr((string) $req->suggested_date, 0, 10) : null,
            'suggested_time' => $req->suggested_time ? substr((string) $req->suggested_time, 0, 5) : null,
            'owner_note'     => $req->owner_note,
        ];

        tenancy()->end();

        return response()->json($payload);
    }

    public function accept(Request $request, string $slug, string $token): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Site not found.'], 404);

        $businessName = $tenant->name ?? 'Our team';

        tenancy()->initialize($tenant);

        $req = DB::table('availability_requests')->where('action_token', $token)->first();
        if (! $req) {
            tenancy()->end();
            return response()->json(['message' => 'Request not found.'], 404);
        }
        if ($req->status !== 'suggested' || ! $req->suggested_date || ! $req->suggested_time) {
            tenancy()->end();
            return response()->json(['message' => 'There is no pending time offer to accept.'], 409);
        }

        if (Schema::hasTable('business_profiles')) {
            $bp = DB::table('business_profiles')->first();
            if ($bp && ! empty($bp->business_name)) $businessName = $bp->business_name;
        }

        $settings    = DB::table('booking_settings')->first();
        $autoConfirm = (bool) ($settings->auto_confirm_bookings ?? false);

        $isSqueezeIn = ($req->kind ?? 'standard') === 'squeeze_in';
        $surcharge   = $isSqueezeIn ? (int) ($req->fee_cents ?? 0) : 0;

        $apptId = AvailabilityRequestService::createAppointment(
            $req,
            substr((string) $req->suggested_date, 0, 10),
            substr((string) $req->suggested_time, 0, 5),
            $autoConfirm,
            $surcharge,
            $isSqueezeIn ? 'squeeze_in' : null,
        );

        DB::table('availability_requests')->where('id', $req->id)->update([
            'status'         => 'accepted',
            'appointment_id' => $apptId,
            'updated_at'     => Carbon::now(),
        ]);

        tenancy()->end();

        return response()->json([
            'appointment_id'   => $apptId,
            'appointment_date' => substr((string) $req->suggested_date, 0, 10),
            'start_time'       => substr((string) $req->suggested_time, 0, 5),
            'message'          => 'Booked! See you then.',
        ], 201);
    }

    private function resolveTenant(string $slug): ?Tenant
    {
        $domain = Domain::where('domain', $slug . '.bkrdy.me')->first()
            ?: Domain::where('domain', $slug)->first();
        if (! $domain) return null;
        return Tenant::find($domain->tenant_id);
    }
}
