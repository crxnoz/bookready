<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PublicBookingController extends Controller
{
    /**
     * POST /api/v1/public/sites/{slug}/appointments
     * No auth required. Creates a pending appointment in the tenant DB.
     */
    public function store(Request $request, string $slug): JsonResponse
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
            'service_id'       => 'required|integer',
            'appointment_date' => 'required|date_format:Y-m-d',
            'start_time'       => 'required|date_format:H:i',
            'customer_name'    => 'required|string|max:255',
            'customer_email'   => 'nullable|email|max:255',
            'customer_phone'   => 'nullable|string|max:50',
            'notes'            => 'nullable|string|max:5000',
        ]);

        tenancy()->initialize($tenant);

        // Only allow booking active services
        $service = DB::table('services')
            ->where('id', (int) $validated['service_id'])
            ->where('is_active', true)
            ->first();

        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found or unavailable'], 422);
        }

        $duration = (int) $service->duration;
        $endTime  = Carbon::createFromFormat('H:i', substr($validated['start_time'], 0, 5))
            ->addMinutes($duration)
            ->format('H:i');

        $clientId = $this->findOrCreateClient(
            $validated['customer_name'],
            $validated['customer_email'] ?? null,
            $validated['customer_phone'] ?? null,
        );

        // TODO: validate against business hours
        // TODO: enforce minimum_notice_minutes
        // TODO: apply buffer_before / buffer_after minutes
        // TODO: check for appointment conflicts
        // TODO: enforce max_appointments_per_day
        // TODO: check blocked dates
        // TODO: apply slot_release rules
        // TODO: check staff availability

        $id = DB::table('appointments')->insertGetId([
            'client_id'                => $clientId,
            'service_id'               => (int) $service->id,
            'customer_name'            => $validated['customer_name'],
            'customer_email'           => $validated['customer_email'] ?? null,
            'customer_phone'           => $validated['customer_phone'] ?? null,
            'service_name'             => $service->name,
            'service_price'            => $service->price,
            'service_duration_minutes' => $duration,
            'appointment_date'         => $validated['appointment_date'],
            'start_time'               => $validated['start_time'],
            'end_time'                 => $endTime,
            'status'                   => 'pending',
            'notes'                    => $validated['notes'] ?? null,
            'internal_notes'           => null,
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        $row = DB::table('appointments')->find($id);

        // Serialize to plain array before ending tenancy
        $appointment = [
            'id'               => (int) $row->id,
            'service_name'     => $row->service_name,
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr($row->start_time, 0, 5),
            'end_time'         => substr($row->end_time, 0, 5),
            'status'           => $row->status,
            'customer_name'    => $row->customer_name,
        ];

        tenancy()->end();

        return response()->json([
            'message'     => 'Booking request received',
            'appointment' => $appointment,
        ], 201);
    }

    private function findOrCreateClient(string $name, ?string $email, ?string $phone): ?int
    {
        if ($email) {
            $client = DB::table('clients')->where('email', $email)->first();
            if ($client) {
                DB::table('clients')->where('id', $client->id)->update([
                    'last_booked_at' => now(),
                    'updated_at'     => now(),
                ]);
                return (int) $client->id;
            }
        } elseif ($phone) {
            $client = DB::table('clients')->where('phone', $phone)->first();
            if ($client) {
                DB::table('clients')->where('id', $client->id)->update([
                    'last_booked_at' => now(),
                    'updated_at'     => now(),
                ]);
                return (int) $client->id;
            }
        }

        if ($email || $phone) {
            return DB::table('clients')->insertGetId([
                'name'           => $name,
                'email'          => $email,
                'phone'          => $phone,
                'last_booked_at' => now(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
        }

        return null;
    }
}
