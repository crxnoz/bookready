<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Mail\BalanceDueClientMail;
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
            'stripe_payment_intent_id' => $get('stripe_payment_intent_id'),
            // Balance-charge snapshot (null until owner clicks Charge balance)
            'balance_checkout_session_id' => $get('balance_checkout_session_id'),
            'balance_paid_amount'         => $get('balance_paid_amount') !== null ? (float) $get('balance_paid_amount') : null,
            'balance_paid_at'             => $get('balance_paid_at'),
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

        $paymentIntent = $row->stripe_payment_intent_id ?? null;
        if (! $paymentIntent) {
            tenancy()->end();
            return response()->json([
                'message' => 'This appointment has no payment to refund.',
            ], 422);
        }

        $paid           = (float) ($row->deposit_paid_amount ?? 0);
        $alreadyRefunded= (float) ($row->refunded_amount ?? 0);
        $remaining      = max(0.0, $paid - $alreadyRefunded);
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

        // Snapshot values we need for the optimistic update + response.
        // We do the actual Stripe call OUTSIDE the tenancy scope so a slow
        // network round-trip doesn't pin a tenant DB connection.
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
            \Illuminate\Support\Facades\Log::error('Refund failed', [
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

    // ── Charge remaining balance ─────────────────────────────────────────

    /**
     * Owner-initiated: sends the customer a Stripe Checkout link for the
     * remaining balance on an appointment that has a deposit paid. We
     * store the new session id on the row so a second click "resends"
     * by overwriting (Stripe sessions auto-expire in 24h).
     *
     * No body required. Optionally `resend: true` is accepted but treated
     * the same — every call mints a fresh session.
     */
    public function chargeBalance(Request $request, int $appointment): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasColumn('appointments', 'balance_checkout_session_id')) {
            tenancy()->end();
            return response()->json([
                'message' => 'Balance charging is not available for this workspace yet.',
            ], 409);
        }

        $row = DB::table('appointments')->where('id', $appointment)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Appointment not found.'], 404);
        }

        // Pre-conditions for charging a balance.
        if (empty($row->customer_email)) {
            tenancy()->end();
            return response()->json([
                'message' => 'This customer has no email on file — add one before sending a payment link.',
            ], 422);
        }
        if (! in_array($row->payment_status, ['deposit_paid'], true)) {
            tenancy()->end();
            return response()->json([
                'message' => 'Balance can only be charged on appointments with a paid deposit.',
            ], 422);
        }
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
            'payment_type'              => AppointmentPaymentService::TYPE_BALANCE,
            'amount'                    => (float)  $balance,
            'currency'                  => $row->currency ?? 'USD',
            'customer_email'            => $row->customer_email,
            'stripe_connect_account_id' => $payment['stripe_connect_account_id'] ?? null,
            'stripe_connect_ready'      => true,
            'success_url' => sprintf(
                'https://%s.bkrdy.me/?booking=balance_paid&appointment=%d&session_id={CHECKOUT_SESSION_ID}',
                $tenant->id, $appointment,
            ),
            'cancel_url'  => sprintf(
                'https://%s.bkrdy.me/?booking=balance_cancelled&appointment=%d',
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
            Log::error('Charge-balance: Stripe session creation failed', [
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointment,
                'error'          => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Could not create payment link. Try again in a moment.',
            ], 502);
        }

        // Record the new session id so the webhook can correlate. Overwrite
        // any prior balance_checkout_session_id from a previous "resend".
        tenancy()->initialize($tenant);
        DB::table('appointments')->where('id', $appointment)->update([
            'balance_checkout_session_id' => $session['id'],
            'updated_at'                  => now(),
        ]);
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
                amount:          $balance,
                currency:        $currency,
                checkoutUrl:     $session['url'],
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
}
