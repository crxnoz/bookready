<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\NotificationSettingsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AppointmentsController extends Controller
{
    private function format(object $row): array
    {
        // Payment columns are nullable in the model row when the tenant
        // migration hasn't run yet — guard each access with property_exists
        // so old appointments and un-migrated tenants stay safe.
        $get = static fn(string $k, $default = null) =>
            property_exists($row, $k) ? $row->{$k} : $default;

        return [
            'id'                       => (int) $row->id,
            'customer_id'              => $row->client_id !== null ? (int) $row->client_id : null,
            'service_id'               => $row->service_id !== null ? (int) $row->service_id : null,
            'customer_name'            => $row->customer_name,
            'customer_email'           => $row->customer_email,
            'customer_phone'           => $row->customer_phone,
            'service_name'             => $row->service_name,
            'service_price'            => $row->service_price !== null ? (float) $row->service_price : null,
            'service_duration_minutes' => $row->service_duration_minutes !== null ? (int) $row->service_duration_minutes : null,
            'appointment_date'         => $row->appointment_date,
            'start_time'               => substr($row->start_time, 0, 5),
            'end_time'                 => substr($row->end_time, 0, 5),
            'status'                   => $row->status,
            'notes'                    => $row->notes,
            'internal_notes'           => $row->internal_notes,
            'created_at'               => $row->created_at,
            'updated_at'               => $row->updated_at,

            // ── Payment snapshot (nullable for old rows / un-migrated tenants) ──
            'payment_status'           => $get('payment_status', 'none'),
            'deposit_required'         => (bool) $get('deposit_required', false),
            'deposit_amount'           => $get('deposit_amount') !== null ? (float) $get('deposit_amount') : null,
            'deposit_paid_amount'      => $get('deposit_paid_amount') !== null ? (float) $get('deposit_paid_amount') : null,
            'amount_due'               => $get('amount_due') !== null ? (float) $get('amount_due') : null,
            'currency'                 => $get('currency', 'USD'),
            'paid_at'                  => $get('paid_at'),
        ];
    }

    private function calcEndTime(string $startTime, int $durationMinutes): string
    {
        return Carbon::createFromFormat('H:i', substr($startTime, 0, 5))
            ->addMinutes($durationMinutes)
            ->format('H:i');
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

        // No existing client found — create one if we have any identifier
        if ($email || $phone) {
            $id = DB::table('clients')->insertGetId([
                'name'           => $name,
                'email'          => $email,
                'phone'          => $phone,
                'last_booked_at' => now(),
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);
            return $id;
        }

        return null;
    }

    // GET /editor/appointments
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $query = DB::table('appointments')
            ->orderBy('appointment_date', 'asc')
            ->orderBy('start_time', 'asc');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->where('appointment_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('appointment_date', '<=', $request->date_to);
        }

        $limit = min((int) ($request->limit ?? 100), 500);

        $appointments = $query->limit($limit)
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->all();

        tenancy()->end();

        return response()->json($appointments);
    }

    // POST /editor/appointments
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'    => 'required|string|max:255',
            'customer_email'   => 'nullable|email|max:255',
            'customer_phone'   => 'nullable|string|max:50',
            'service_id'       => 'required|integer',
            'appointment_date' => 'required|date_format:Y-m-d',
            'start_time'       => 'required|date_format:H:i',
            'status'           => 'nullable|in:pending,confirmed,cancelled,completed,no_show',
            'notes'            => 'nullable|string|max:5000',
            'internal_notes'   => 'nullable|string|max:5000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $service = DB::table('services')->find((int) $validated['service_id']);
        if (! $service) {
            tenancy()->end();
            return response()->json(['message' => 'Service not found'], 422);
        }

        $duration  = (int) $service->duration;
        $endTime   = $this->calcEndTime($validated['start_time'], $duration);
        $clientId  = $this->findOrCreateClient(
            $validated['customer_name'],
            $validated['customer_email'] ?? null,
            $validated['customer_phone'] ?? null,
        );

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
            'status'                   => $validated['status'] ?? 'pending',
            'notes'                    => $validated['notes'] ?? null,
            'internal_notes'           => $validated['internal_notes'] ?? null,
            'created_at'               => now(),
            'updated_at'               => now(),
        ]);

        $row = DB::table('appointments')->find($id);
        $formatted = $this->format($row);

        tenancy()->end();

        return response()->json($formatted, 201);
    }

    // GET /editor/appointments/{appointment}
    public function show(Request $request, int $appointment): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('appointments')->find($appointment);

        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        $formatted = $this->format($row);
        tenancy()->end();

        return response()->json($formatted);
    }

    // PATCH /editor/appointments/{appointment}
    public function update(Request $request, int $appointment): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'    => 'sometimes|string|max:255',
            'customer_email'   => 'nullable|email|max:255',
            'customer_phone'   => 'nullable|string|max:50',
            'service_id'       => 'sometimes|integer',
            'appointment_date' => 'sometimes|date_format:Y-m-d',
            'start_time'       => 'sometimes|date_format:H:i',
            'status'           => 'sometimes|in:pending,confirmed,cancelled,completed,no_show',
            'notes'            => 'nullable|string|max:5000',
            'internal_notes'   => 'nullable|string|max:5000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $appt = DB::table('appointments')->find($appointment);
        if (! $appt) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        $oldStatus = $appt->status;
        $data      = ['updated_at' => now()];
        $duration  = (int) ($appt->service_duration_minutes ?? 30);

        // If service_id is changing, update snapshot and recalculate duration
        if (isset($validated['service_id'])) {
            $service = DB::table('services')->find((int) $validated['service_id']);
            if (! $service) {
                tenancy()->end();
                return response()->json(['message' => 'Service not found'], 422);
            }
            $duration                         = (int) $service->duration;
            $data['service_id']               = (int) $service->id;
            $data['service_name']             = $service->name;
            $data['service_price']            = $service->price;
            $data['service_duration_minutes'] = $duration;
        }

        // Recalculate end_time if start_time or service changed
        if (isset($validated['start_time']) || isset($validated['service_id'])) {
            $startTime          = $validated['start_time'] ?? substr($appt->start_time, 0, 5);
            $data['start_time'] = $startTime;
            $data['end_time']   = $this->calcEndTime($startTime, $duration);
        }

        // Scalar fields
        foreach (['customer_name', 'customer_email', 'customer_phone', 'appointment_date', 'status', 'notes', 'internal_notes'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }

        DB::table('appointments')->where('id', $appointment)->update($data);
        $row       = DB::table('appointments')->find($appointment);
        $formatted = $this->format($row);

        // Collect email payload before ending tenancy if status changed to confirmed/cancelled
        $newStatus    = $row->status;
        $statusChanged = isset($validated['status']) && $newStatus !== $oldStatus;

        $emailAppt     = null;
        $emailBusiness = null;
        $emailNotify   = null;

        if ($statusChanged && in_array($newStatus, ['confirmed', 'cancelled']) && ! empty($row->customer_email)) {
            $emailAppt = [
                'id'               => (int) $row->id,
                'customer_name'    => $row->customer_name,
                'customer_email'   => $row->customer_email,
                'service_name'     => $row->service_name,
                'appointment_date' => $row->appointment_date,
                'start_time'       => substr($row->start_time, 0, 5),
                'end_time'         => substr($row->end_time, 0, 5),
                'status'           => $row->status,
                'notes'            => $row->notes,
            ];
            $emailBusiness = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
            $emailNotify   = NotificationSettingsService::load();
        }

        tenancy()->end();

        // Send email outside tenancy with plain-array data
        if ($emailAppt !== null && $emailBusiness !== null) {
            if ($newStatus === 'confirmed') {
                AppointmentMailer::sendConfirmed($emailAppt, $emailBusiness, $emailNotify);
            } elseif ($newStatus === 'cancelled') {
                AppointmentMailer::sendCancelled($emailAppt, $emailBusiness, $emailNotify);
            }
        }

        return response()->json($formatted);
    }

    // DELETE /editor/appointments/{appointment}
    // Soft cancel rather than hard delete — preserves audit history
    public function destroy(Request $request, int $appointment): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $appt = DB::table('appointments')->find($appointment);
        if (! $appt) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        DB::table('appointments')->where('id', $appointment)->update([
            'status'     => 'cancelled',
            'updated_at' => now(),
        ]);

        // Collect email payload before ending tenancy
        $emailAppt     = null;
        $emailBusiness = null;
        $emailNotify   = null;

        if (! empty($appt->customer_email) && $appt->status !== 'cancelled') {
            $emailAppt = [
                'id'               => (int) $appt->id,
                'customer_name'    => $appt->customer_name,
                'customer_email'   => $appt->customer_email,
                'service_name'     => $appt->service_name,
                'appointment_date' => $appt->appointment_date,
                'start_time'       => substr($appt->start_time, 0, 5),
                'end_time'         => substr($appt->end_time, 0, 5),
                'status'           => 'cancelled',
                'notes'            => $appt->notes,
            ];
            $emailBusiness = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
            $emailNotify   = NotificationSettingsService::load();
        }

        tenancy()->end();

        if ($emailAppt !== null && $emailBusiness !== null) {
            AppointmentMailer::sendCancelled($emailAppt, $emailBusiness, $emailNotify);
        }

        return response()->json(null, 204);
    }
}
