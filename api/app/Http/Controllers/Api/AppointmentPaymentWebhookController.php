<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\AppointmentPaymentService;
use App\Services\NotificationSettingsService;
use App\Services\StripeConnectService;
use Stripe\Account as StripeAccount;
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

        // ── account.updated: auto-sync the local Connect status when Stripe
        //    flags a requirements/capability change on a connected account ──
        if ($event->type === 'account.updated') {
            return $this->handleAccountUpdated($event);
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

            // Honor auto_confirm_bookings: when the deposit clears, if the
            // tenant has auto-confirm on, jump the appointment straight to
            // 'confirmed'. Otherwise keep 'pending' for the owner to review.
            $autoConfirm = false;
            if (Schema::hasTable('booking_settings')) {
                $bs = DB::table('booking_settings')->first();
                $autoConfirm = (bool) ($bs->auto_confirm_bookings ?? false);
            }

            $update = [
                'payment_status'           => 'deposit_paid',
                'deposit_paid_amount'      => $amountTotal ?? $row->deposit_amount,
                'stripe_payment_intent_id' => $paymentIntent,
                'paid_at'                  => now(),
                'updated_at'               => now(),
            ];
            if ($autoConfirm && $row->status === 'pending') {
                $update['status'] = 'confirmed';
            }

            DB::table('appointments')->where('id', $appointmentId)->update($update);

            $updated = DB::table('appointments')->find($appointmentId);

            $manageToken = property_exists($updated, 'manage_token') ? $updated->manage_token : null;
            $manageUrl   = $manageToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $manageToken) : null;
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
                'manage_url'       => $manageUrl,
            ];

            $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
            $notify       = NotificationSettingsService::load();

            tenancy()->end();

            // Now that deposit is paid, send the booking-request emails that we
            // intentionally held back when the booking was created.
            AppointmentMailer::sendBookingRequest($appt, $businessName, $ownerEmail, $notify);
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

    /**
     * Handle Stripe `account.updated` events for connected accounts.
     * Stripe fires these when capabilities or requirements change. We
     * locate the matching tenant via the metadata we set on account
     * creation (bookready_tenant_id), then run the same status sync the
     * manual Refresh button uses.
     */
    private function handleAccountUpdated($event): JsonResponse
    {
        /** @var StripeAccount $account */
        $account = $event->data->object;

        $accountId = $account->id ?? null;
        $metadata  = $account->metadata?->toArray() ?? [];
        $tenantId  = $metadata['bookready_tenant_id'] ?? null;

        if (! $accountId || ! $tenantId) {
            // Account isn't one we created. Ignore quietly.
            return response()->json(['received' => true]);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            Log::warning('Connect account.updated: tenant not found', [
                'account_id' => $accountId,
                'tenant_id'  => $tenantId,
            ]);
            return response()->json(['received' => true]);
        }

        try {
            tenancy()->initialize($tenant);

            if (! Schema::hasTable('payment_settings')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $row = DB::table('payment_settings')->first();
            // If our local record doesn't match the account on this event,
            // ack and bail — it's not the account we're managing for this tenant.
            if (! $row || ($row->stripe_connect_account_id ?? null) !== $accountId) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $charges = (bool) ($account->charges_enabled   ?? false);
            $payouts = (bool) ($account->payouts_enabled   ?? false);
            $details = (bool) ($account->details_submitted ?? false);
            $status  = StripeConnectService::deriveStatus($account);

            $update = [
                'stripe_charges_enabled'         => $charges,
                'stripe_payouts_enabled'         => $payouts,
                'stripe_details_submitted'       => $details,
                'stripe_connect_status'          => $status,
                'stripe_connect_last_checked_at' => now(),
                'updated_at'                     => now(),
            ];
            if ($details && empty($row->stripe_connect_onboarding_completed_at)) {
                $update['stripe_connect_onboarding_completed_at'] = now();
            }

            DB::table('payment_settings')->where('id', $row->id)->update($update);

            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('Connect account.updated sync failed', [
                'tenant_id'  => $tenantId,
                'account_id' => $accountId,
                'error'      => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
            // 200 so Stripe doesn't retry; failure is logged.
            return response()->json(['received' => true, 'note' => 'logged']);
        }

        return response()->json(['received' => true]);
    }
}
