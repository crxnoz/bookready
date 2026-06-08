<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Domain;
use App\Models\Tenant;
use App\Services\WaitlistService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 7 · Public waitlist surface.
 *
 *   POST /api/v1/public/sites/{slug}/waitlist
 *     Customer joins the waitlist for a tenant. No login required —
 *     standard public booking pattern (token-gated claim later).
 *
 *   POST /api/v1/public/sites/{slug}/waitlist/claim/{token}
 *     Customer accepts an offered spot — creates an appointment and
 *     marks the waitlist entry claimed.
 *
 * Tenant resolution follows the same pattern as PublicBookingController
 * (subdomain → tenant_id → initialize).
 */
class PublicWaitlistController extends Controller
{
    public function join(Request $request, string $slug): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'  => 'required|string|max:200',
            'customer_email' => 'required|email|max:200',
            'customer_phone' => 'nullable|string|max:32',
            'service_id'     => 'required|integer|min:1',
            'staff_id'       => 'nullable|integer|min:1',
            'preferred_date' => 'nullable|date_format:Y-m-d',
            'earliest_date'  => 'required|date_format:Y-m-d',
            'latest_date'    => 'required|date_format:Y-m-d',
            'notes'          => 'nullable|string|max:1000',
        ]);
        if ($validated['latest_date'] < $validated['earliest_date']) {
            return response()->json(['message' => 'Latest date must be on or after earliest date.'], 422);
        }

        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Site not found.'], 404);

        tenancy()->initialize($tenant);

        // Validate the service exists + is active.
        $service = Schema::hasTable('services')
            ? DB::table('services')->where('id', $validated['service_id'])->where('is_active', true)->first()
            : null;
        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found or unavailable.'], 422);
        }

        // De-dup: same email + service + overlapping date range still
        // pending → return the existing entry instead of stacking duplicates.
        $existing = DB::table('waitlist_entries')
            ->where('customer_email', $validated['customer_email'])
            ->where('service_id', $validated['service_id'])
            ->whereIn('status', ['pending', 'notified'])
            ->where('earliest_date', '<=', $validated['latest_date'])
            ->where('latest_date',   '>=', $validated['earliest_date'])
            ->first();

        if ($existing) {
            tenancy()->end();
            return response()->json([
                'id'      => (int) $existing->id,
                'message' => 'You are already on the waitlist for this service in that date range.',
                'duplicate' => true,
            ]);
        }

        $id = DB::table('waitlist_entries')->insertGetId([
            'customer_name'  => $validated['customer_name'],
            'customer_email' => $validated['customer_email'],
            'customer_phone' => $validated['customer_phone'] ?? null,
            'service_id'     => $validated['service_id'],
            'staff_id'       => $validated['staff_id']       ?? null,
            'preferred_date' => $validated['preferred_date'] ?? null,
            'earliest_date'  => $validated['earliest_date'],
            'latest_date'    => $validated['latest_date'],
            'notes'          => $validated['notes'] ?? null,
            'status'         => 'pending',
            'created_at'     => Carbon::now(),
            'updated_at'     => Carbon::now(),
        ]);

        $businessName = $this->businessName();
        WaitlistService::onJoin($id, $businessName, $slug);

        tenancy()->end();

        return response()->json([
            'id'      => $id,
            'message' => 'You\'re on the waitlist. We\'ll email you when a matching spot opens.',
        ], 201);
    }

    /**
     * Token-gated claim. The customer clicked the link from a
     * spot-opened email; we verify the token, create the appointment,
     * and mark the entry claimed.
     */
    public function claim(Request $request, string $slug, string $token): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Site not found.'], 404);

        tenancy()->initialize($tenant);

        $entry = DB::table('waitlist_entries')
            ->where('claim_token', $token)
            ->where('status', 'notified')
            ->first();
        if (! $entry) {
            tenancy()->end();
            return response()->json(['message' => 'This claim link is invalid or already used.'], 404);
        }
        if ($entry->notification_expires_at && Carbon::parse($entry->notification_expires_at)->lt(Carbon::now())) {
            // Flip back to expired so the next cancellation re-offers.
            DB::table('waitlist_entries')->where('id', $entry->id)->update([
                'status'     => 'expired',
                'updated_at' => Carbon::now(),
            ]);
            tenancy()->end();
            return response()->json(['message' => 'This claim link has expired. You\'re still on the waitlist for the next opening.'], 410);
        }

        // The cancelled appointment that triggered this notification —
        // use its date + time as the slot we're claiming.
        $apptRow = $entry->notified_appointment_id
            ? DB::table('appointments')->where('id', $entry->notified_appointment_id)->first()
            : null;
        if (! $apptRow) {
            tenancy()->end();
            return response()->json(['message' => 'The original slot is no longer available.'], 410);
        }

        // Make sure nobody else booked it in the meantime.
        $conflict = DB::table('appointments')
            ->where('appointment_date', $apptRow->appointment_date)
            ->where('start_time', $apptRow->start_time)
            ->whereNotIn('status', ['cancelled'])
            ->exists();
        if ($conflict) {
            tenancy()->end();
            return response()->json(['message' => 'Someone else took this slot first. You\'re still on the waitlist.'], 409);
        }

        // Create the appointment. Status follows the tenant's
        // auto-confirm setting; deposit handling skipped intentionally
        // for the waitlist v1 (owner can charge later via Stripe Connect
        // tools). This is documented in docs/availability-2.0.md.
        $settings = DB::table('booking_settings')->first();
        $autoConfirm = (bool) ($settings->auto_confirm_bookings ?? false);

        $service = DB::table('services')->where('id', $entry->service_id)->first();

        $appointmentId = DB::table('appointments')->insertGetId([
            'service_id'              => $entry->service_id,
            'staff_id'                => $entry->staff_id ?? ($apptRow->staff_id ?? null),
            'customer_name'           => $entry->customer_name,
            'customer_email'          => $entry->customer_email,
            'customer_phone'          => $entry->customer_phone,
            'service_name'            => $service?->name ?? 'Service',
            'service_price'           => $service?->price ?? 0,
            'service_duration_minutes'=> $service?->duration ?? 60,
            'appointment_date'        => $apptRow->appointment_date,
            'start_time'              => $apptRow->start_time,
            'end_time'                => $apptRow->end_time,
            'status'                  => $autoConfirm ? 'confirmed' : 'pending',
            'payment_status'          => 'unpaid',
            'currency'                => $apptRow->currency ?? 'usd',
            'amount_due'              => $service?->price ?? 0,
            'reschedule_count'        => 0,
            'notes'                   => 'Booked via waitlist claim',
            'created_at'              => Carbon::now(),
            'updated_at'              => Carbon::now(),
        ]);

        DB::table('waitlist_entries')->where('id', $entry->id)->update([
            'status'                 => 'claimed',
            'claimed_appointment_id' => $appointmentId,
            'updated_at'             => Carbon::now(),
        ]);

        tenancy()->end();

        return response()->json([
            'appointment_id'   => $appointmentId,
            'appointment_date' => substr((string) $apptRow->appointment_date, 0, 10),
            'start_time'       => substr((string) $apptRow->start_time, 0, 5),
            'message'          => 'Spot claimed. See you then!',
        ], 201);
    }

    private function resolveTenant(string $slug): ?Tenant
    {
        $domain = Domain::where('domain', $slug . '.bkrdy.me')->first()
            ?: Domain::where('domain', $slug)->first();
        if (! $domain) return null;
        return Tenant::find($domain->tenant_id);
    }

    private function businessName(): string
    {
        $bp = Schema::hasTable('business_profiles')
            ? DB::table('business_profiles')->first()
            : null;
        return (string) ($bp->business_name ?? 'Our team');
    }
}
