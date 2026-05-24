<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\AppointmentPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Stripe\Webhook;

/**
 * Isolated Stripe webhook for CUSTOMER appointment payments.
 *
 * This is INTENTIONALLY a separate endpoint and a separate webhook secret
 * from the BookReady SaaS subscription webhook (App\Http\Controllers\Api\WebhookController).
 * Do not combine — keeping them isolated means Cashier's subscription flow
 * cannot accidentally be impacted by appointment-payment code.
 *
 * Stripe webhook endpoint (to configure in dashboard):
 *   POST https://api.bkrdy.me/api/v1/webhooks/stripe/appointments
 *   Events: checkout.session.completed
 *   Secret: STRIPE_APPOINTMENT_WEBHOOK_SECRET in the .env on the server
 */
class AppointmentPaymentWebhookController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $payload   = $request->getContent();
        $signature = $request->header('Stripe-Signature');
        $secret    = env('STRIPE_APPOINTMENT_WEBHOOK_SECRET');

        if (! $secret) {
            Log::error('Appointment webhook hit but STRIPE_APPOINTMENT_WEBHOOK_SECRET is not set');
            return response()->json(['message' => 'Webhook misconfigured'], 500);
        }

        try {
            $event = Webhook::constructEvent($payload, $signature ?? '', $secret);
        } catch (\Throwable $e) {
            Log::warning('Appointment webhook signature verification failed', [
                'error' => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Invalid signature'], 400);
        }

        if ($event->type !== 'checkout.session.completed') {
            // Acknowledge so Stripe doesn't retry; we don't care about other events on this endpoint.
            return response()->json(['received' => true]);
        }

        $session  = $event->data->object;
        $metadata = $session->metadata?->toArray() ?? [];

        // Only act on our appointment-deposit sessions. Anything else (e.g. a SaaS
        // session that for some reason landed here) is silently acknowledged.
        if (($metadata['purpose'] ?? null) !== AppointmentPaymentService::PURPOSE) {
            return response()->json(['received' => true]);
        }

        $tenantId       = $metadata['tenant_id']      ?? null;
        $appointmentId  = isset($metadata['appointment_id']) ? (int) $metadata['appointment_id'] : null;
        $sessionId      = $session->id ?? null;
        $paymentIntent  = $session->payment_intent ?? null;
        $amountTotal    = isset($session->amount_total) ? ((int) $session->amount_total) / 100 : null;

        if (! $tenantId || ! $appointmentId || ! $sessionId) {
            Log::warning('Appointment webhook: missing metadata', [
                'session_id' => $sessionId,
                'metadata'   => $metadata,
            ]);
            return response()->json(['received' => true]);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            Log::warning('Appointment webhook: tenant not found', [
                'tenant_id'  => $tenantId,
                'session_id' => $sessionId,
            ]);
            return response()->json(['received' => true]);
        }

        $ownerEmail = $tenant->owner?->email;

        tenancy()->initialize($tenant);

        try {
            // Defensive: skip if column set doesn't exist (migration not run on this tenant).
            if (! Schema::hasColumn('appointments', 'payment_status')) {
                Log::warning('Appointment webhook: payment columns missing on tenant', [
                    'tenant_id' => $tenantId,
                ]);
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $row = DB::table('appointments')
                ->where('id', $appointmentId)
                ->where('stripe_checkout_session_id', $sessionId)
                ->first();

            // Idempotency: if already marked paid, just ack and bail.
            if ($row && $row->payment_status === 'deposit_paid') {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            if (! $row) {
                Log::warning('Appointment webhook: appointment not found', [
                    'tenant_id'      => $tenantId,
                    'appointment_id' => $appointmentId,
                    'session_id'     => $sessionId,
                ]);
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            DB::table('appointments')->where('id', $appointmentId)->update([
                'payment_status'           => 'deposit_paid',
                'deposit_paid_amount'      => $amountTotal ?? $row->deposit_amount,
                'stripe_payment_intent_id' => $paymentIntent,
                'paid_at'                  => now(),
                // Keep status as 'pending' so the owner still confirms manually
                // (matches existing behavior for non-payment bookings).
                'updated_at'               => now(),
            ]);

            $updated = DB::table('appointments')->find($appointmentId);

            $appt = [
                'id'               => (int) $updated->id,
                'customer_name'    => $updated->customer_name,
                'customer_email'   => $updated->customer_email,
                'customer_phone'   => $updated->customer_phone,
                'service_name'     => $updated->service_name,
                'appointment_date' => $updated->appointment_date,
                'start_time'       => substr($updated->start_time, 0, 5),
                'end_time'         => substr($updated->end_time,   0, 5),
                'status'           => $updated->status,
                'notes'            => $updated->notes,
            ];

            $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);

            tenancy()->end();

            // Now that deposit is paid, send the booking-request emails that we
            // intentionally held back when the booking was created.
            AppointmentMailer::sendBookingRequest($appt, $businessName, $ownerEmail);
        } catch (\Throwable $e) {
            Log::error('Appointment webhook processing error', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
            // 200 so Stripe doesn't retry endlessly; we logged it.
            return response()->json(['received' => true, 'note' => 'logged']);
        }

        return response()->json(['received' => true]);
    }
}
