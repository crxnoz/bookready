<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\SlotGenerator;
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

        $serviceId = (int)    $validated['service_id'];
        $date      =          $validated['appointment_date'];
        $startTime = substr($validated['start_time'], 0, 5);

        // Fetch owner email from central DB before switching tenant connection.
        $ownerEmail = $tenant->owner?->email;

        tenancy()->initialize($tenant);

        // ── Load data ────────────────────────────────────────────────────
        $service = DB::table('services')
            ->where('id', $serviceId)
            ->where('is_active', true)
            ->first();

        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found or unavailable'], 422);
        }

        $dayOfWeek    = (int) Carbon::parse($date)->dayOfWeek;
        $hoursRow     = DB::table('hours')->where('day_of_week', $dayOfWeek)->first();
        $settings     = DB::table('booking_settings')->first();
        $appointments = DB::table('appointments')
            ->where('appointment_date', $date)
            ->whereNotIn('status', ['cancelled'])
            ->get()
            ->map(fn ($r) => [
                'start_time' => substr($r->start_time, 0, 5),
                'end_time'   => substr($r->end_time,   0, 5),
            ])
            ->all();

        // ── Re-verify slot is still available (anti-double-booking) ──────
        $result = SlotGenerator::generate(
            date:         $date,
            service:      $service,
            hoursRow:     $hoursRow,
            settings:     $settings,
            appointments: $appointments,
            appTimezone:  config('app.timezone'),
        );

        if (! SlotGenerator::containsSlot($result['slots'], $startTime)) {
            tenancy()->end();
            return response()->json(['message' => 'This time is no longer available.'], 422);
        }

        // ── Calculate end time ───────────────────────────────────────────
        $duration = (int) $service->duration;
        $endTime  = Carbon::createFromFormat('H:i', $startTime)
            ->addMinutes($duration)
            ->format('H:i');

        // ── Find or create client ────────────────────────────────────────
        $clientId = $this->findOrCreateClient(
            $validated['customer_name'],
            $validated['customer_email'] ?? null,
            $validated['customer_phone'] ?? null,
        );

        // ── Insert appointment ───────────────────────────────────────────
        $id = DB::table('appointments')->insertGetId([
            'client_id'                => $clientId,
            'service_id'               => (int) $service->id,
            'customer_name'            => $validated['customer_name'],
            'customer_email'           => $validated['customer_email'] ?? null,
            'customer_phone'           => $validated['customer_phone'] ?? null,
            'service_name'             => $service->name,
            'service_price'            => $service->price,
            'service_duration_minutes' => $duration,
            'appointment_date'         => $date,
            'start_time'               => $startTime,
            'end_time'                 => $endTime,
            'status'                   => 'pending',
            'notes'                    => $validated['notes'] ?? null,
            'internal_notes'           => null,
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        // ── Collect data for response + emails before ending tenancy ─────
        $row = DB::table('appointments')->find($id);
        $appt = [
            'id'               => (int) $row->id,
            'customer_name'    => $row->customer_name,
            'customer_email'   => $row->customer_email,
            'customer_phone'   => $row->customer_phone,
            'service_name'     => $row->service_name,
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr($row->start_time, 0, 5),
            'end_time'         => substr($row->end_time,   0, 5),
            'status'           => $row->status,
            'notes'            => $row->notes,
        ];

        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);

        tenancy()->end();

        // ── Send emails (outside tenancy, with plain-array data) ─────────
        AppointmentMailer::sendBookingRequest($appt, $businessName, $ownerEmail);

        return response()->json([
            'message'     => 'Booking request received',
            'appointment' => [
                'id'               => $appt['id'],
                'service_name'     => $appt['service_name'],
                'appointment_date' => $appt['appointment_date'],
                'start_time'       => $appt['start_time'],
                'end_time'         => $appt['end_time'],
                'status'           => $appt['status'],
                'customer_name'    => $appt['customer_name'],
            ],
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
