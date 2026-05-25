<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Mail\BalanceDueClientMail;
use App\Mail\LateFeeChargedClientMail;
use App\Mail\TipRequestClientMail;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\AppointmentPaymentService;
use App\Services\NotificationSettingsService;
use App\Services\StripeConnectService;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
            // Manual / cash payment metadata (null when paid via Stripe)
            'payment_method'           => $get('payment_method'),
            'payment_note'             => $get('payment_note'),
            // Stripe payment intent (presence = Stripe-eligible for refund)
            'stripe_payment_intent_id'    => $get('stripe_payment_intent_id'),
            'stripe_checkout_session_id'  => $get('stripe_checkout_session_id'),
            // Balance-charge snapshot (null until owner clicks Charge balance)
            'balance_checkout_session_id' => $get('balance_checkout_session_id'),
            'balance_paid_amount'         => $get('balance_paid_amount') !== null ? (float) $get('balance_paid_amount') : null,
            'balance_paid_at'             => $get('balance_paid_at'),
            // Tip snapshot
            'tip_amount'                  => $get('tip_amount') !== null ? (float) $get('tip_amount') : null,
            'tip_paid_at'                 => $get('tip_paid_at'),
            // Saved card (presence = late fees available)
            'stripe_customer_id'          => $get('stripe_customer_id'),
            'saved_payment_method_id'     => $get('saved_payment_method_id'),
            // Late fee snapshot
            'late_fee_amount'             => $get('late_fee_amount') !== null ? (float) $get('late_fee_amount') : null,
            'late_fee_type'               => $get('late_fee_type'),
            'late_fee_paid_at'            => $get('late_fee_paid_at'),
            // Refund snapshot
            'refunded_amount'          => $get('refunded_amount') !== null ? (float) $get('refunded_amount') : null,
            'refunded_at'              => $get('refunded_at'),
            // Dispute snapshot (null when no active dispute)
            'dispute_status'           => $get('dispute_status'),
            'dispute_reason'           => $get('dispute_reason'),
            'dispute_amount'           => $get('dispute_amount') !== null ? (float) $get('dispute_amount') : null,
            'dispute_opened_at'        => $get('dispute_opened_at'),
            'dispute_closed_at'        => $get('dispute_closed_at'),
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

        $insertData = [
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
        ];
        if (Schema::hasColumn('appointments', 'manage_token')) {
            $insertData['manage_token'] = Str::random(40);
        }
        $id = DB::table('appointments')->insertGetId($insertData);

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

        $oldStatus    = $appt->status;
        $oldDate      = $appt->appointment_date;
        $oldStartTime = substr($appt->start_time, 0, 5);
        $oldEndTime   = substr($appt->end_time,   0, 5);
        $data         = ['updated_at' => now()];
        $duration     = (int) ($appt->service_duration_minutes ?? 30);

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

        // Collect email payload before ending tenancy if status changed
        // to confirmed/cancelled OR if date/time was rescheduled.
        $newStatus     = $row->status;
        $newDate       = $row->appointment_date;
        $newStartTime  = substr($row->start_time, 0, 5);
        $statusChanged = isset($validated['status']) && $newStatus !== $oldStatus;
        $dateChanged   = $newDate      !== $oldDate;
        $timeChanged   = $newStartTime !== $oldStartTime;
        $rescheduled   = ($dateChanged || $timeChanged) && $newStatus !== 'cancelled';

        $emailAppt          = null;
        $emailBusiness      = null;
        $emailNotify        = null;
        $oldApptSnapshot    = null;
        $shouldSendRescheduled = false;

        if (! empty($row->customer_email) && ($statusChanged || $rescheduled)) {
            $manageToken = property_exists($row, 'manage_token') ? $row->manage_token : null;
            $manageUrl   = $manageToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $manageToken) : null;
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
                'manage_url'       => $manageUrl,
            ];
            $emailBusiness = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
            $emailNotify   = NotificationSettingsService::load();

            if ($rescheduled) {
                $oldApptSnapshot       = [
                    'appointment_date' => $oldDate,
                    'start_time'       => $oldStartTime,
                    'end_time'         => $oldEndTime,
                ];
                $shouldSendRescheduled = true;
            }
        }

        tenancy()->end();

        // Send email outside tenancy with plain-array data
        if ($emailAppt !== null && $emailBusiness !== null) {
            if ($shouldSendRescheduled) {
                AppointmentMailer::sendRescheduled(
                    $emailAppt, $oldApptSnapshot, $emailBusiness, 'owner', $emailNotify,
                );
            }
            if ($statusChanged && $newStatus === 'confirmed') {
                AppointmentMailer::sendConfirmed($emailAppt, $emailBusiness, $emailNotify);
            } elseif ($statusChanged && $newStatus === 'cancelled') {
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
            $manageToken = property_exists($appt, 'manage_token') ? $appt->manage_token : null;
            $manageUrl   = $manageToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $manageToken) : null;
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
                'manage_url'       => $manageUrl,
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

    // ── Refunds ──────────────────────────────────────────────────────────

    /**
     * Owner-initiated refund for an appointment that was paid through
     * BookReady (deposit or full). Calls Stripe synchronously so the
     * owner gets immediate success/failure feedback. The local row is
     * also updated optimistically here; the charge.refunded webhook will
     * subsequently reconcile (idempotent — refunded_amount only moves
     * forward).
     *
     * Body: { amount?: float, reason?: string }
     *  - amount omitted or null → full refund of remaining refundable balance
     *  - reason maps to one of Stripe's refund reasons
     *    (duplicate|fraudulent|requested_by_customer); free-text is ignored
     */
    public function refund(Request $request, int $appointment): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'sometimes|nullable|numeric|min:0.01',
            'reason' => 'sometimes|nullable|string|max:80',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'refunded_amount')) {
            tenancy()->end();
            return response()->json([
                'message' => 'Refund support is not available for this workspace yet. Please contact support.',
            ], 409);
        }

        $row = DB::table('appointments')->where('id', $appointment)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        $paymentIntent  = $row->stripe_payment_intent_id ?? null;
        $manualMethod   = $row->payment_method ?? null;
        $isStripePayment = ! empty($paymentIntent);
        $isManualPayment = ! $isStripePayment && ! empty($manualMethod);

        if (! $isStripePayment && ! $isManualPayment) {
            tenancy()->end();
            return response()->json([
                'message' => 'This appointment has no payment to refund.',
            ], 422);
        }

        // Total paid is deposit_paid_amount + any balance that was paid.
        $depositPaid = (float) ($row->deposit_paid_amount ?? 0);
        $balancePaid = (float) ($row->balance_paid_amount ?? 0);
        $paid        = $depositPaid + $balancePaid;
        $alreadyRefunded = (float) ($row->refunded_amount ?? 0);
        $remaining   = max(0.0, $paid - $alreadyRefunded);
        if ($remaining <= 0.0) {
            tenancy()->end();
            return response()->json([
                'message' => 'This payment has already been fully refunded.',
            ], 422);
        }

        $requested = isset($validated['amount']) && $validated['amount'] !== null
            ? round((float) $validated['amount'], 2)
            : $remaining;

        if ($requested > $remaining + 0.001) {
            tenancy()->end();
            return response()->json([
                'message' => "Refund amount exceeds the refundable balance ({$remaining}).",
            ], 422);
        }

        $cents       = (int) round($requested * 100);
        $isFull      = abs($requested - $remaining) < 0.005 && $alreadyRefunded <= 0.001;
        $stripeReason = in_array($validated['reason'] ?? null, ['duplicate', 'fraudulent', 'requested_by_customer'], true)
            ? $validated['reason']
            : null;

        // Manual payments skip Stripe — record the refund locally only.
        // The owner already gave the cash back; we just track that we did it.
        if ($isManualPayment) {
            $newRefunded = $alreadyRefunded + $requested;
            $newStatus   = ($newRefunded + 0.001) >= $paid ? 'refunded' : 'partially_refunded';
            DB::table('appointments')->where('id', $appointment)->update([
                'payment_status'  => $newStatus,
                'refunded_amount' => $newRefunded,
                'refunded_at'     => now(),
                'updated_at'      => now(),
            ]);
            $fresh = DB::table('appointments')->where('id', $appointment)->first();
            $result = $this->format($fresh);
            tenancy()->end();
            return response()->json([
                'message'     => $isFull ? 'Refund recorded.' : 'Partial refund recorded.',
                'appointment' => $result,
            ]);
        }

        // Stripe path: do the network call OUTSIDE the tenancy scope so a slow
        // round-trip doesn't pin a tenant DB connection.
        $tenantId = $tenant->id;
        tenancy()->end();

        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $params = [
                'payment_intent'    => $paymentIntent,
                'amount'            => $cents,
                'reverse_transfer'  => true, // destination charge → also reverse the transfer
                'metadata'          => [
                    'purpose'         => 'appointment_deposit',
                    'tenant_id'       => $tenantId,
                    'appointment_id'  => (string) $appointment,
                    'initiated_by'    => 'owner',
                ],
            ];
            if ($stripeReason) $params['reason'] = $stripeReason;

            $refund = \Stripe\Refund::create($params);
        } catch (\Stripe\Exception\ApiErrorException $e) {
            return response()->json([
                'message' => 'Stripe refund failed: ' . $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Refund failed', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Could not issue refund.'], 500);
        }

        // Optimistic local update so the UI reflects state without waiting
        // for the webhook round-trip. The webhook will reconcile in case
        // someone partial-refunds twice.
        $newRefunded = $alreadyRefunded + $requested;
        $newStatus   = ($newRefunded + 0.001) >= $paid ? 'refunded' : 'partially_refunded';

        tenancy()->initialize($tenant);
        DB::table('appointments')->where('id', $appointment)->update([
            'payment_status'    => $newStatus,
            'refunded_amount'   => $newRefunded,
            'refunded_at'       => now(),
            'stripe_refund_id'  => $refund->id ?? null,
            'updated_at'        => now(),
        ]);
        $fresh = DB::table('appointments')->where('id', $appointment)->first();
        $result = $this->format($fresh);
        tenancy()->end();

        return response()->json([
            'message'     => $isFull ? 'Refund issued.' : 'Partial refund issued.',
            'appointment' => $result,
        ]);
    }

    // ── Manual (non-Stripe) payments ─────────────────────────────────────

    /**
     * Owner records a cash/Venmo/Zelle/etc. payment against an appointment.
     * Updates payment_status to 'paid' (or 'deposit_paid' if the recorded
     * amount is less than the service price). Does NOT touch Stripe — these
     * appointments will never have a stripe_payment_intent_id, which is
     * how the refund UI hides itself for non-refundable payments.
     *
     * Body: { amount: float, method: 'cash'|'venmo'|'zelle'|'other', note?: string }
     */
    public function markPaid(Request $request, int $appointment): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'method' => 'required|string|in:cash,venmo,zelle,other',
            'note'   => 'sometimes|nullable|string|max:500',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'payment_method')) {
            tenancy()->end();
            return response()->json([
                'message' => 'Manual payment recording is not available for this workspace yet.',
            ], 409);
        }

        $row = DB::table('appointments')->where('id', $appointment)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        // Refuse if this appointment already has a Stripe payment — don't
        // let owners mix tender types on a single row. They can refund the
        // Stripe charge first, then mark as cash if needed.
        if (! empty($row->stripe_payment_intent_id)) {
            tenancy()->end();
            return response()->json([
                'message' => 'This appointment already has a Stripe payment. Refund it first to record a manual payment.',
            ], 422);
        }

        $amount       = round((float) $validated['amount'], 2);
        $servicePrice = $row->service_price !== null ? (float) $row->service_price : null;
        $isPaidInFull = $servicePrice === null || $amount + 0.001 >= $servicePrice;

        $update = [
            'payment_status'      => $isPaidInFull ? 'paid' : 'deposit_paid',
            'deposit_required'    => true,
            'deposit_paid_amount' => $amount,
            'amount_due'          => $isPaidInFull
                                        ? 0
                                        : (($servicePrice !== null) ? max(0, $servicePrice - $amount) : null),
            'currency'            => $row->currency ?? 'USD',
            'paid_at'             => now(),
            'payment_method'      => $validated['method'],
            'payment_note'        => $validated['note'] ?? null,
            'updated_at'          => now(),
        ];

        DB::table('appointments')->where('id', $appointment)->update($update);
        $fresh  = DB::table('appointments')->where('id', $appointment)->first();
        $result = $this->format($fresh);
        tenancy()->end();

        return response()->json([
            'message'     => $isPaidInFull ? 'Marked as paid.' : 'Deposit recorded.',
            'appointment' => $result,
        ]);
    }

    // ── Send payment link (balance OR full service price) ────────────────

    /**
     * Owner-initiated: sends the customer a Stripe Checkout link covering
     * whatever they owe on this appointment.
     *
     * Two cases:
     *   1. payment_status='deposit_paid' → charges amount_due (the
     *      remaining balance after the deposit)
     *   2. payment_status='none' (manually-created appointment, no payment
     *      taken yet) → charges the full service_price as a TYPE_FULL
     *      payment, marking the row paid in full when the customer pays.
     *
     * Each call mints a fresh Checkout session — clicking again "resends"
     * by overwriting balance_checkout_session_id (Stripe sessions auto-
     * expire in 24h).
     */
    public function chargeBalance(Request $request, int $appointment): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'balance_checkout_session_id')) {
            tenancy()->end();
            return response()->json([
                'message' => 'Payment links are not available for this workspace yet.',
            ], 409);
        }

        $row = DB::table('appointments')->where('id', $appointment)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        // Pre-conditions.
        if (empty($row->customer_email)) {
            tenancy()->end();
            return response()->json([
                'message' => 'This customer has no email on file — add one before sending a payment link.',
            ], 422);
        }

        // Decide what we're charging: balance vs full upfront.
        $isBalanceCharge = false;
        $amount          = 0.0;
        $paymentType     = AppointmentPaymentService::TYPE_FULL;

        if ($row->payment_status === 'deposit_paid') {
            $balance = $row->amount_due !== null ? (float) $row->amount_due : null;
            if ($balance === null || $balance <= 0) {
                tenancy()->end();
                return response()->json([
                    'message' => 'There is no outstanding balance on this appointment.',
                ], 422);
            }
            if ($row->balance_paid_at !== null) {
                tenancy()->end();
                return response()->json([
                    'message' => 'The balance on this appointment has already been paid.',
                ], 422);
            }
            $isBalanceCharge = true;
            $amount          = $balance;
            $paymentType     = AppointmentPaymentService::TYPE_BALANCE;
        } elseif (! $row->payment_status || $row->payment_status === 'none' || $row->payment_status === 'failed') {
            $price = $row->service_price !== null ? (float) $row->service_price : null;
            if ($price === null || $price <= 0) {
                tenancy()->end();
                return response()->json([
                    'message' => 'This service has no price set — add one before sending a payment link.',
                ], 422);
            }
            $isBalanceCharge = false;
            $amount          = $price;
            $paymentType     = AppointmentPaymentService::TYPE_FULL;
        } else {
            tenancy()->end();
            return response()->json([
                'message' => 'A payment link can only be sent for unpaid appointments or those with an outstanding balance.',
            ], 422);
        }

        // Need Connect ready to charge anything new.
        if (! Schema::hasTable('payment_settings')) {
            tenancy()->end();
            return response()->json(['message' => 'Payment settings not initialized.'], 422);
        }
        $payment = (array) (DB::table('payment_settings')->first() ?: []);
        if (! StripeConnectService::isReady($payment)) {
            tenancy()->end();
            return response()->json([
                'message' => 'Connect your Stripe account before charging customer payments.',
            ], 422);
        }

        // Snapshot what we need for the Stripe call, then exit tenancy
        // before the network round-trip.
        $context = [
            'tenant_id'                 => (string) $tenant->id,
            'tenant_slug'               => (string) $tenant->id,
            'appointment_id'            => (int)    $appointment,
            'service_name'              => (string) $row->service_name,
            'payment_type'              => $paymentType,
            'amount'                    => $amount,
            'currency'                  => $row->currency ?? 'USD',
            'customer_email'            => $row->customer_email,
            'stripe_connect_account_id' => $payment['stripe_connect_account_id'] ?? null,
            'stripe_connect_ready'      => true,
            'allow_split_pay'           => (bool) ($payment['allow_split_pay']      ?? false),
            'collect_tax'               => (bool) ($payment['collect_tax']          ?? false),
            'save_cards_for_reuse'      => (bool) ($payment['save_cards_for_reuse'] ?? false),
            'success_url' => sprintf(
                'https://%s.bkrdy.me/?booking=%s&appointment=%d&session_id={CHECKOUT_SESSION_ID}',
                $tenant->id,
                $isBalanceCharge ? 'balance_paid' : 'paid',
                $appointment,
            ),
            'cancel_url'  => sprintf(
                'https://%s.bkrdy.me/?booking=cancelled&appointment=%d',
                $tenant->id, $appointment,
            ),
        ];

        $customerEmail = $row->customer_email;
        $customerName  = $row->customer_name;
        $serviceName   = $row->service_name;
        $apptDate      = $row->appointment_date;
        $startTime     = substr((string) $row->start_time, 0, 5);
        $currency      = strtoupper((string) ($row->currency ?? 'USD'));
        tenancy()->end();

        try {
            $session = AppointmentPaymentService::createCheckoutSession($context);
        } catch (\Throwable $e) {
            Log::error('Payment-link: Stripe session creation failed', [
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Could not create payment link. Try again in a moment.',
            ], 502);
        }

        // Record the session. For balance charges this goes on the dedicated
        // balance_checkout_session_id column; for full upfront we reuse the
        // existing stripe_checkout_session_id (same column the public booking
        // flow uses) so the webhook treats it like any other deposit/full
        // payment when it lands.
        tenancy()->initialize($tenant);
        $update = ['updated_at' => now()];
        if ($isBalanceCharge) {
            $update['balance_checkout_session_id'] = $session['id'];
        } else {
            $update['stripe_checkout_session_id'] = $session['id'];
            $update['payment_status']             = 'pending_payment';
            $update['deposit_required']           = true;
            // amount_due defaults to 0 because TYPE_FULL means no balance later.
            $update['amount_due']                 = 0;
        }
        DB::table('appointments')->where('id', $appointment)->update($update);
        $fresh  = DB::table('appointments')->where('id', $appointment)->first();
        $result = $this->format($fresh);
        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        tenancy()->end();

        $emailSent = false;
        try {
            Mail::to($customerEmail)->send(new BalanceDueClientMail(
                customerName:    (string) $customerName,
                businessName:    $businessName,
                serviceName:     (string) $serviceName,
                appointmentDate: (string) $apptDate,
                startTime:       $startTime,
                amount:          $amount,
                currency:        $currency,
                checkoutUrl:     $session['url'],
                isBalance:       $isBalanceCharge,
            ));
            $emailSent = true;
        } catch (\Throwable $e) {
            Log::error('[BookReady] BalanceDueClientMail failed', [
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message'        => $emailSent
                                  ? 'Payment link sent to ' . $customerEmail . '.'
                                  : 'Payment link created. Email delivery failed — copy the link below and send it manually.',
            'email_sent'     => $emailSent,
            'checkout_url'   => $session['url'],
            'appointment'    => $result,
        ]);
    }

    // ── Request tip ──────────────────────────────────────────────────────

    /**
     * Owner-initiated tip request — fires TipRequestClientMail with a
     * link to the public tip page. The customer picks the amount there.
     * Only callable on appointments where a customer email + manage_token
     * exist and a tip hasn't already been received.
     */
    public function requestTip(Request $request, int $appointment): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'tip_paid_at')) {
            tenancy()->end();
            return response()->json(['message' => 'Tips not available for this workspace yet.'], 409);
        }

        $row = DB::table('appointments')->where('id', $appointment)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found.'], 404);
        }
        if (empty($row->customer_email)) {
            tenancy()->end();
            return response()->json(['message' => 'No email on file for this customer.'], 422);
        }
        if (empty($row->manage_token)) {
            tenancy()->end();
            return response()->json(['message' => 'Tip flow needs a manage token on the appointment.'], 422);
        }
        if (! empty($row->tip_paid_at)) {
            tenancy()->end();
            return response()->json(['message' => 'A tip was already received for this appointment.'], 422);
        }

        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        $tipUrl       = sprintf('https://%s.bkrdy.me/tip/%s', $tenant->id, $row->manage_token);
        tenancy()->end();

        $emailSent = false;
        try {
            Mail::to($row->customer_email)->send(new TipRequestClientMail(
                customerName:    (string) $row->customer_name,
                businessName:    $businessName,
                serviceName:     (string) $row->service_name,
                appointmentDate: (string) $row->appointment_date,
                startTime:       substr((string) $row->start_time, 0, 5),
                tipUrl:          $tipUrl,
            ));
            $emailSent = true;
        } catch (\Throwable $e) {
            Log::error('[BookReady] TipRequestClientMail failed', [
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message'     => $emailSent
                                ? 'Tip request sent to ' . $row->customer_email . '.'
                                : 'Could not send the email. Try again, or share the link below.',
            'email_sent'  => $emailSent,
            'tip_url'     => $tipUrl,
        ]);
    }

    // ── Charge late fee (no-show or late-cancel) ─────────────────────────

    /**
     * Charge the customer's saved card off_session for either a no-show
     * or late-cancellation fee. Amount defaults to the per-tenant
     * configured fee for that type but can be overridden per appointment.
     *
     * Body: { type: 'no_show'|'late_cancel', amount?: float }
     */
    public function chargeLateFee(Request $request, int $appointment): JsonResponse
    {
        $validated = $request->validate([
            'type'   => 'required|in:no_show,late_cancel',
            'amount' => 'sometimes|nullable|numeric|min:0.50|max:9999.99',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'late_fee_amount')) {
            tenancy()->end();
            return response()->json(['message' => 'Late fees not available for this workspace yet.'], 409);
        }

        $row = DB::table('appointments')->where('id', $appointment)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found.'], 404);
        }
        if (empty($row->stripe_customer_id) || empty($row->saved_payment_method_id)) {
            tenancy()->end();
            return response()->json([
                'message' => 'No saved card on this booking — late fees require the customer to have paid with card at booking time.',
            ], 422);
        }
        if (! empty($row->late_fee_paid_at)) {
            tenancy()->end();
            return response()->json([
                'message' => 'A late fee has already been charged on this appointment.',
            ], 422);
        }

        // Default amount comes from per-tenant config.
        $payment = (array) (DB::table('payment_settings')->first() ?: []);
        $configured = $validated['type'] === 'no_show'
            ? ($payment['no_show_fee_amount'] ?? null)
            : ($payment['late_cancel_fee_amount'] ?? null);
        $amount = $validated['amount'] ?? ($configured !== null ? (float) $configured : null);

        if ($amount === null || $amount <= 0) {
            tenancy()->end();
            return response()->json([
                'message' => 'No fee amount configured for ' . $validated['type'] . '. Set one in Payment Settings or pass amount in this request.',
            ], 422);
        }

        if (! StripeConnectService::isReady($payment)) {
            tenancy()->end();
            return response()->json(['message' => 'Stripe Connect is not active.'], 422);
        }

        // Snapshot what we need for the off_session charge + email.
        $tenantId      = $tenant->id;
        $stripeCustId  = $row->stripe_customer_id;
        $stripePmId    = $row->saved_payment_method_id;
        $destination   = $payment['stripe_connect_account_id'];
        $currency      = strtolower((string) ($row->currency ?? 'usd'));
        $customerEmail = $row->customer_email;
        $customerName  = $row->customer_name;
        $serviceName   = $row->service_name;
        $apptDate      = $row->appointment_date;
        $startTime     = substr((string) $row->start_time, 0, 5);
        $feeType       = $validated['type'];
        $businessName  = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        tenancy()->end();

        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $pi = \Stripe\PaymentIntent::create([
                'amount'         => (int) round($amount * 100),
                'currency'       => $currency,
                'customer'       => $stripeCustId,
                'payment_method' => $stripePmId,
                'off_session'    => true,
                'confirm'        => true,
                'description'    => ($feeType === 'no_show' ? 'No-show fee · ' : 'Late-cancel fee · ') . $serviceName,
                'metadata' => [
                    'purpose'        => AppointmentPaymentService::PURPOSE,
                    'payment_type'   => AppointmentPaymentService::TYPE_LATE_FEE,
                    'late_fee_type'  => $feeType,
                    'tenant_id'      => (string) $tenantId,
                    'appointment_id' => (string) $appointment,
                ],
                'transfer_data'  => ['destination' => $destination],
            ]);
        } catch (\Stripe\Exception\CardException $e) {
            return response()->json([
                'message' => 'Card was declined: ' . $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Late fee charge failed', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Could not charge the late fee.'], 502);
        }

        // Optimistic local update.
        tenancy()->initialize($tenant);
        DB::table('appointments')->where('id', $appointment)->update([
            'late_fee_amount'             => $amount,
            'late_fee_type'               => $feeType,
            'late_fee_paid_at'            => now(),
            'late_fee_payment_intent_id'  => $pi->id ?? null,
            'updated_at'                  => now(),
        ]);
        $fresh  = DB::table('appointments')->where('id', $appointment)->first();
        $result = $this->format($fresh);
        tenancy()->end();

        // Best-effort customer receipt — never block the response on it.
        try {
            Mail::to($customerEmail)->send(new LateFeeChargedClientMail(
                customerName:    (string) $customerName,
                businessName:    $businessName,
                serviceName:     (string) $serviceName,
                appointmentDate: (string) $apptDate,
                startTime:       $startTime,
                amount:          $amount,
                currency:        strtoupper($currency),
                feeType:         $feeType,
            ));
        } catch (\Throwable $e) {
            Log::error('[BookReady] LateFeeChargedClientMail failed', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
        }

        return response()->json([
            'message'     => $feeType === 'no_show'
                                ? 'No-show fee charged.'
                                : 'Late-cancel fee charged.',
            'appointment' => $result,
        ]);
    }
}
