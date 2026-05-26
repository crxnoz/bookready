<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\DisputeClosedOwnerMail;
use App\Mail\DisputeOpenedOwnerMail;
use App\Mail\PaymentRefundedClientMail;
use App\Mail\PayoutFailedOwnerMail;
use App\Mail\StripeConnectRestrictedMail;
use App\Mail\StripeConnectVerifiedMail;
use App\Models\Tenant;
use App\Services\AppointmentMailer;
use App\Services\AppointmentPaymentService;
use App\Services\NotificationSettingsService;
use App\Services\PlatformMailer;
use App\Services\StripeConnectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Stripe\Account as StripeAccount;
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
 *   Events:
 *     checkout.session.completed   — deposit/full payment landed
 *     checkout.session.expired     — customer abandoned checkout, free the slot
 *     charge.refunded              — refund issued (full or partial)
 *     charge.dispute.created       — chargeback opened against a Connect charge
 *     charge.dispute.closed        — dispute resolved (won/lost/warning)
 *     payment_intent.payment_failed — customer's card actually declined
 *     payout.failed                — Stripe couldn't deposit to owner's bank
 *     account.updated              — Connect account capability/requirement change
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

        // Dispatch by event type. Anything we don't recognize gets a 200
        // ack so Stripe doesn't retry uselessly.
        switch ($event->type) {
            case 'account.updated':
                return $this->handleAccountUpdated($event);
            case 'checkout.session.expired':
                return $this->handleCheckoutExpired($event);
            case 'charge.refunded':
                return $this->handleChargeRefunded($event);
            case 'charge.dispute.created':
                return $this->handleDisputeOpened($event);
            case 'charge.dispute.closed':
                return $this->handleDisputeClosed($event);
            case 'payment_intent.payment_failed':
                return $this->handlePaymentFailed($event);
            case 'payout.failed':
                return $this->handlePayoutFailed($event);
            case 'checkout.session.completed':
                break; // fall through to the checkout-completed handling below
            default:
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

        // Balance payments take a fundamentally different path — they update
        // the balance_* columns and never re-fire booking-request emails
        // (those went out when the deposit cleared). Route early.
        if (($metadata['payment_type'] ?? null) === AppointmentPaymentService::TYPE_BALANCE) {
            return $this->handleBalancePaid(
                tenant:        $tenant,
                appointmentId: $appointmentId,
                sessionId:     $sessionId,
                paymentIntent: $paymentIntent,
                amountTotal:   $amountTotal,
            );
        }

        // Tip payments update tip_* columns only — no status flip, no emails
        // (Stripe Checkout sends its own thanks; the owner sees the update
        // in the editor).
        if (($metadata['payment_type'] ?? null) === AppointmentPaymentService::TYPE_TIP) {
            return $this->handleTipPaid(
                tenant:        $tenant,
                appointmentId: $appointmentId,
                sessionId:     $sessionId,
                amountTotal:   $amountTotal,
            );
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

            // Honor auto_confirm_bookings: when payment clears, if the
            // tenant has auto-confirm on, jump the appointment straight to
            // 'confirmed'. Otherwise keep 'pending' for the owner to review.
            $autoConfirm = false;
            if (Schema::hasTable('booking_settings')) {
                $bs = DB::table('booking_settings')->first();
                $autoConfirm = (bool) ($bs->auto_confirm_bookings ?? false);
            }

            // Was this a full payment or just a deposit? Use the metadata
            // we set on the Checkout session; default to 'deposit' for
            // backwards-compat with sessions created before this field shipped.
            $paymentType = $metadata['payment_type'] ?? AppointmentPaymentService::TYPE_DEPOSIT;

            $update = [
                'payment_status'           => $paymentType === AppointmentPaymentService::TYPE_FULL
                                                ? 'paid'
                                                : 'deposit_paid',
                'deposit_paid_amount'      => $amountTotal ?? $row->deposit_amount,
                'stripe_payment_intent_id' => $paymentIntent,
                'paid_at'                  => now(),
                'updated_at'               => now(),
            ];
            // Full payment means no balance is owed at the appointment.
            if ($paymentType === AppointmentPaymentService::TYPE_FULL) {
                $update['amount_due'] = 0;
            }
            if ($autoConfirm && $row->status === 'pending') {
                $update['status'] = 'confirmed';
            }

            // If save_cards_for_reuse was on for this session, Stripe ran
            // through customer_creation='always' or attached to an existing
            // customer. Stash the customer + payment_method ids on the row
            // so future late-fee charges can use them off_session.
            if (Schema::hasColumn('appointments', 'stripe_customer_id')) {
                $stripeCustomerId = $session->customer ?? null;
                if ($stripeCustomerId) {
                    $update['stripe_customer_id'] = $stripeCustomerId;
                    // PaymentMethod id lives on the PaymentIntent. Fetch it
                    // best-effort; if it fails we just don't store the PM
                    // and late-fee charging will be unavailable for this row.
                    if ($paymentIntent) {
                        try {
                            \Stripe\Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));
                            $pi = \Stripe\PaymentIntent::retrieve($paymentIntent);
                            if (! empty($pi->payment_method)) {
                                $update['saved_payment_method_id'] = $pi->payment_method;
                            }
                        } catch (\Throwable) { /* swallow — saving is best-effort */ }
                    }
                }
            }

            DB::table('appointments')->where('id', $appointmentId)->update($update);

            $updated = DB::table('appointments')->find($appointmentId);

            $manageToken = property_exists($updated, 'manage_token') ? $updated->manage_token : null;
            $manageUrl   = $manageToken ? sprintf('https://%s.bkrdy.me/manage/%s', $tenant->id, $manageToken) : null;

            // Phase 7 — staff name + add-on snapshot for email templates.
            $apptStaffName = null;
            if (property_exists($updated, 'staff_id') && $updated->staff_id && \Illuminate\Support\Facades\Schema::hasTable('staff')) {
                $apptStaffName = DB::table('staff')->where('id', $updated->staff_id)->value('name');
            }
            $apptAddons = [];
            if (\Illuminate\Support\Facades\Schema::hasTable('appointment_addons')) {
                $apptAddons = DB::table('appointment_addons')
                    ->where('appointment_id', $updated->id)
                    ->get(['name_snapshot', 'price_snapshot_cents', 'duration_snapshot_minutes'])
                    ->map(fn ($a) => [
                        'name'                   => $a->name_snapshot,
                        'extra_price'            => round($a->price_snapshot_cents / 100, 2),
                        'extra_duration_minutes' => (int) $a->duration_snapshot_minutes,
                    ])
                    ->all();
            }

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
                'staff_name'       => $apptStaffName,
                'addons'           => $apptAddons,
                // Payment receipt fields — blades render a receipt block when these are present.
                'payment_amount'   => $amountTotal,
                'payment_type'     => $paymentType, // 'deposit' | 'full'
                'amount_due'       => $updated->amount_due !== null ? (float) $updated->amount_due : null,
                'currency'         => strtoupper((string) ($updated->currency ?? 'USD')),
            ];

            $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
            $notify       = NotificationSettingsService::load();

            // Is this the tenant's first-ever real booking? (best-effort —
            // counts non-cancelled including the one we just paid for.)
            $isFirstBooking = DB::table('appointments')
                ->whereNotIn('status', ['cancelled'])
                ->count() === 1;
            $ownerName = $tenant->owner?->name ?? 'there';

            tenancy()->end();

            // Now that deposit is paid, send the booking-request emails that we
            // intentionally held back when the booking was created.
            AppointmentMailer::sendBookingRequest($appt, $businessName, $ownerEmail, $notify);

            // Celebrate the first booking (deposit just cleared, so it's real).
            if ($isFirstBooking) {
                PlatformMailer::sendFirstBookingCelebration(
                    $ownerEmail, $ownerName, $businessName, $appt,
                );
            }
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

        $shouldAlertRestricted = false;
        $shouldCelebrateActive = false;
        $ownerEmail            = $tenant->owner?->email;
        $ownerName             = $tenant->owner?->name ?? 'there';

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

            $previousStatus = $row->stripe_connect_status ?? null;

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

            // Detect transition INTO 'restricted'. We don't want to spam the
            // owner with one email per webhook — only when status actually
            // flips from non-restricted to restricted.
            if ($status === StripeConnectService::STATUS_RESTRICTED
                && $previousStatus !== StripeConnectService::STATUS_RESTRICTED) {
                $shouldAlertRestricted = true;
            }

            // Detect transition INTO 'active' — celebratory email, fires
            // once when onboarding completes (or when Stripe lifts a
            // previous restriction).
            if ($status === StripeConnectService::STATUS_ACTIVE
                && $previousStatus !== StripeConnectService::STATUS_ACTIVE) {
                $shouldCelebrateActive = true;
            }

            // Snapshot business name now (we can't read tenant DB after end()).
            $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);

            tenancy()->end();

            if ($shouldAlertRestricted && $ownerEmail) {
                try {
                    Mail::to($ownerEmail)->send(new StripeConnectRestrictedMail(
                        ownerName:    $ownerName,
                        businessName: $businessName,
                    ));
                } catch (\Throwable $e) {
                    Log::error('[BookReady] StripeConnectRestrictedMail failed', [
                        'tenant_id'   => $tenantId,
                        'owner_email' => $ownerEmail,
                        'error'       => $e->getMessage(),
                    ]);
                }
            }

            if ($shouldCelebrateActive && $ownerEmail) {
                try {
                    Mail::to($ownerEmail)->send(new StripeConnectVerifiedMail(
                        ownerName:    $ownerName,
                        businessName: $businessName,
                    ));
                } catch (\Throwable $e) {
                    Log::error('[BookReady] StripeConnectVerifiedMail failed', [
                        'tenant_id'   => $tenantId,
                        'owner_email' => $ownerEmail,
                        'error'       => $e->getMessage(),
                    ]);
                }
            }
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

    // ── Balance payments (remaining-balance Checkout sessions) ───────────

    /**
     * The customer just paid the remaining balance on an appointment that
     * had a deposit. Updates the balance_* columns, flips payment_status
     * to 'paid', zeros amount_due, and sends a "balance received" client
     * receipt. Idempotent: re-firing this webhook is a no-op.
     */
    private function handleBalancePaid(
        Tenant   $tenant,
        int      $appointmentId,
        string   $sessionId,
        ?string  $paymentIntent,
        ?float   $amountTotal,
    ): JsonResponse {
        $shouldEmail  = false;
        $emailCtx     = [];
        $businessName = $tenant->id;

        try {
            tenancy()->initialize($tenant);
            if (! Schema::hasColumn('appointments', 'balance_paid_at')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            // Look up by appointment_id AND the balance session we kicked off.
            $row = DB::table('appointments')
                ->where('id', $appointmentId)
                ->where('balance_checkout_session_id', $sessionId)
                ->first();

            // Idempotency: balance already recorded — ack and bail.
            if ($row && $row->balance_paid_at !== null) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            if (! $row) {
                Log::warning('Balance webhook: appointment not found', [
                    'tenant_id'      => $tenant->id,
                    'appointment_id' => $appointmentId,
                    'session_id'     => $sessionId,
                ]);
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            DB::table('appointments')->where('id', $appointmentId)->update([
                'payment_status'             => 'paid',
                'amount_due'                 => 0,
                'balance_paid_amount'        => $amountTotal,
                'balance_payment_intent_id'  => $paymentIntent,
                'balance_paid_at'            => now(),
                'updated_at'                 => now(),
            ]);

            if (! empty($row->customer_email)) {
                $shouldEmail  = true;
                $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
                $emailCtx     = [
                    'customer_email'  => $row->customer_email,
                    'customer_name'   => $row->customer_name,
                    'service_name'    => $row->service_name,
                    'appointment_date'=> $row->appointment_date,
                    'start_time'      => substr((string) $row->start_time, 0, 5),
                    'amount'          => $amountTotal,
                    'currency'        => $row->currency ?? 'USD',
                ];
            }

            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('Balance webhook processing error', [
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
            return response()->json(['received' => true, 'note' => 'logged']);
        }

        if ($shouldEmail) {
            try {
                Mail::to($emailCtx['customer_email'])->send(new \App\Mail\BalancePaidClientMail(
                    customerName:    (string) $emailCtx['customer_name'],
                    businessName:    $businessName,
                    serviceName:     (string) $emailCtx['service_name'],
                    appointmentDate: (string) $emailCtx['appointment_date'],
                    startTime:       (string) $emailCtx['start_time'],
                    amount:          (float)  $emailCtx['amount'],
                    currency:        (string) $emailCtx['currency'],
                ));
            } catch (\Throwable $e) {
                Log::error('[BookReady] BalancePaidClientMail failed', [
                    'tenant_id'      => $tenant->id,
                    'appointment_id' => $appointmentId,
                    'error'          => $e->getMessage(),
                ]);
            }
        }

        return response()->json(['received' => true]);
    }

    // ── Tip payments ─────────────────────────────────────────────────────

    /**
     * Customer paid a tip via the public tip page. Idempotent on tip_paid_at.
     */
    private function handleTipPaid(
        Tenant   $tenant,
        int      $appointmentId,
        string   $sessionId,
        ?float   $amountTotal,
    ): JsonResponse {
        try {
            tenancy()->initialize($tenant);
            if (! Schema::hasColumn('appointments', 'tip_paid_at')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }
            $row = DB::table('appointments')
                ->where('id', $appointmentId)
                ->where('tip_checkout_session_id', $sessionId)
                ->first();
            if (! $row || $row->tip_paid_at !== null) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }
            DB::table('appointments')->where('id', $appointmentId)->update([
                'tip_amount'  => $amountTotal,
                'tip_paid_at' => now(),
                'updated_at'  => now(),
            ]);
            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('Tip webhook processing error', [
                'tenant_id'      => $tenant->id,
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
        }
        return response()->json(['received' => true]);
    }

    // ── Expired checkout sessions ────────────────────────────────────────

    /**
     * Customer hit our booking form, got the Stripe Checkout URL, then
     * never paid (closed the tab, bailed). Stripe expires the session
     * ~24 hours later. We tear down the speculative appointment so the
     * slot is released. Quiet — no emails fire; the customer never finished.
     */
    private function handleCheckoutExpired($event): JsonResponse
    {
        $session   = $event->data->object;
        $metadata  = $session->metadata?->toArray() ?? [];
        $sessionId = $session->id ?? null;

        if (($metadata['purpose'] ?? null) !== AppointmentPaymentService::PURPOSE) {
            return response()->json(['received' => true]);
        }

        $tenantId      = $metadata['tenant_id']      ?? null;
        $appointmentId = isset($metadata['appointment_id']) ? (int) $metadata['appointment_id'] : null;
        if (! $tenantId || ! $appointmentId || ! $sessionId) {
            return response()->json(['received' => true]);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) return response()->json(['received' => true]);

        try {
            tenancy()->initialize($tenant);

            if (! Schema::hasColumn('appointments', 'payment_status')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $row = DB::table('appointments')
                ->where('id', $appointmentId)
                ->where('stripe_checkout_session_id', $sessionId)
                ->first();

            // Only cancel if still waiting on payment — the customer might
            // have completed payment on a second try with a different session.
            if ($row && $row->payment_status === 'pending_payment') {
                $update = [
                    'status'      => 'cancelled',
                    'updated_at'  => now(),
                ];
                if (Schema::hasColumn('appointments', 'cancellation_reason')) {
                    $update['cancellation_reason'] = 'Payment not completed';
                }
                DB::table('appointments')->where('id', $appointmentId)->update($update);
            }

            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('Checkout-expired processing error', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointmentId,
                'session_id'     => $sessionId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
        }

        return response()->json(['received' => true]);
    }

    // ── Payment failed (card declined after attempting checkout) ─────────

    /**
     * payment_intent.payment_failed fires when a Checkout customer's card
     * genuinely fails (declined, expired, insufficient funds) after they
     * tried to pay — distinct from checkout.session.expired which fires
     * for tab-close abandonment. Stripe Checkout has its own retry UX so
     * we don't email the customer; we just mark the local row 'failed'
     * (if still pending) for owner visibility.
     */
    private function handlePaymentFailed($event): JsonResponse
    {
        $pi       = $event->data->object;
        $metadata = $pi->metadata?->toArray() ?? [];
        $piId     = $pi->id ?? null;

        if (($metadata['purpose'] ?? null) !== AppointmentPaymentService::PURPOSE) {
            return response()->json(['received' => true]);
        }

        $tenantId      = $metadata['tenant_id']      ?? null;
        $appointmentId = isset($metadata['appointment_id']) ? (int) $metadata['appointment_id'] : null;
        if (! $tenantId || ! $appointmentId) {
            return response()->json(['received' => true]);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) return response()->json(['received' => true]);

        try {
            tenancy()->initialize($tenant);
            if (! Schema::hasColumn('appointments', 'payment_status')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $row = DB::table('appointments')->where('id', $appointmentId)->first();
            if (! $row) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            // Only transition pending_payment → failed. If the customer
            // already retried and succeeded, don't clobber that.
            if ($row->payment_status === 'pending_payment') {
                DB::table('appointments')->where('id', $appointmentId)->update([
                    'payment_status' => 'failed',
                    'updated_at'     => now(),
                ]);
                Log::info('Appointment payment failed', [
                    'tenant_id'      => $tenantId,
                    'appointment_id' => $appointmentId,
                    'payment_intent' => $piId,
                ]);
            }

            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('payment_intent.payment_failed processing error', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
        }

        return response()->json(['received' => true]);
    }

    // ── Payout failed (bank rejected the deposit) ────────────────────────

    /**
     * payout.failed fires on a connected account when Stripe attempted to
     * deposit funds to the owner's bank but the bank rejected (closed
     * account, wrong routing, name mismatch, etc). Owner needs to know
     * because there's now money stuck in Stripe that they can't access.
     */
    private function handlePayoutFailed($event): JsonResponse
    {
        $payout    = $event->data->object;
        $accountId = $event->account ?? null; // Connect events include this at the event level
        $amountCts = (int)    ($payout->amount   ?? 0);
        $currency  = strtoupper((string) ($payout->currency ?? 'usd'));
        $reason    = (string) ($payout->failure_message ?? $payout->failure_code ?? 'unknown reason');

        if (! $accountId) return response()->json(['received' => true]);

        // Find which of our tenants owns this connected account. Scan all
        // tenants — cheap (we have <20) and avoids storing a reverse index.
        $tenantId   = null;
        $ownerEmail = null;
        $ownerName  = 'there';
        $businessName = '';

        foreach (Tenant::all() as $t) {
            try {
                tenancy()->initialize($t);
                if (! Schema::hasTable('payment_settings')) {
                    tenancy()->end();
                    continue;
                }
                $ps = DB::table('payment_settings')->first();
                if ($ps && ($ps->stripe_connect_account_id ?? null) === $accountId) {
                    $tenantId     = $t->id;
                    $ownerEmail   = $t->owner?->email;
                    $ownerName    = $t->owner?->name ?? 'there';
                    $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $t->id);
                    tenancy()->end();
                    break;
                }
                tenancy()->end();
            } catch (\Throwable $e) {
                try { tenancy()->end(); } catch (\Throwable) {}
            }
        }

        if (! $tenantId || ! $ownerEmail) {
            Log::warning('payout.failed: tenant or owner email not found', [
                'account_id' => $accountId,
                'tenant_id'  => $tenantId,
            ]);
            return response()->json(['received' => true]);
        }

        try {
            Mail::to($ownerEmail)->send(new PayoutFailedOwnerMail(
                ownerName:     $ownerName,
                businessName:  $businessName,
                amount:        $amountCts / 100,
                currency:      $currency,
                failureReason: $reason,
            ));
        } catch (\Throwable $e) {
            Log::error('[BookReady] PayoutFailedOwnerMail failed', [
                'tenant_id'   => $tenantId,
                'owner_email' => $ownerEmail,
                'error'       => $e->getMessage(),
            ]);
        }

        return response()->json(['received' => true]);
    }

    // ── Refunds ──────────────────────────────────────────────────────────

    /**
     * charge.refunded fires for every refund (full or partial). We mark
     * the appointment refunded with the total-refunded amount and email
     * the customer. Idempotent: same total-refunded amount on a second
     * webhook just no-ops the email.
     */
    private function handleChargeRefunded($event): JsonResponse
    {
        $charge       = $event->data->object;
        $metadata     = $charge->metadata?->toArray() ?? [];
        $paymentIntent = $charge->payment_intent ?? null;

        if (($metadata['purpose'] ?? null) !== AppointmentPaymentService::PURPOSE) {
            return response()->json(['received' => true]);
        }

        $tenantId      = $metadata['tenant_id']      ?? null;
        $appointmentId = isset($metadata['appointment_id']) ? (int) $metadata['appointment_id'] : null;
        if (! $tenantId || ! $appointmentId || ! $paymentIntent) {
            return response()->json(['received' => true]);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) return response()->json(['received' => true]);

        // Stripe reports the cumulative `amount_refunded` across all refunds
        // on the charge, plus the latest refund's id on the refunds array.
        $amountRefundedCents = (int) ($charge->amount_refunded ?? 0);
        $amountChargedCents  = (int) ($charge->amount          ?? 0);
        $amountRefunded      = $amountRefundedCents / 100;
        $isFullRefund        = $amountChargedCents > 0 && $amountRefundedCents >= $amountChargedCents;
        $latestRefund        = $charge->refunds?->data[0] ?? null;
        $refundId            = $latestRefund?->id ?? null;

        $shouldEmail   = false;
        $emailContext  = [];
        $businessName  = $tenant->id;

        try {
            tenancy()->initialize($tenant);
            if (! Schema::hasColumn('appointments', 'refunded_amount')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $row = DB::table('appointments')->where('id', $appointmentId)->first();
            if (! $row) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $previouslyRefunded = (float) ($row->refunded_amount ?? 0);
            $isNewerRefund      = $amountRefunded > $previouslyRefunded + 0.001;

            $update = [
                'payment_status'   => $isFullRefund ? 'refunded' : 'partially_refunded',
                'refunded_amount'  => $amountRefunded,
                'refunded_at'      => now(),
                'updated_at'       => now(),
            ];
            if ($refundId) $update['stripe_refund_id'] = $refundId;

            DB::table('appointments')->where('id', $appointmentId)->update($update);

            // Only email when refunded_amount actually moved — guards
            // against webhook retries firing duplicate customer emails.
            if ($isNewerRefund && ! empty($row->customer_email)) {
                $shouldEmail = true;
                $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
                $emailContext = [
                    'customer_email'  => $row->customer_email,
                    'customer_name'   => $row->customer_name,
                    'service_name'    => $row->service_name,
                    'appointment_date'=> $row->appointment_date,
                    'start_time'      => substr((string) $row->start_time, 0, 5),
                    'refund_amount'   => $amountRefunded - $previouslyRefunded,
                    'is_full_refund'  => $isFullRefund,
                    'currency'        => $row->currency ?? 'USD',
                ];
            }

            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('charge.refunded processing error', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointmentId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
            return response()->json(['received' => true, 'note' => 'logged']);
        }

        if ($shouldEmail) {
            try {
                Mail::to($emailContext['customer_email'])->send(new PaymentRefundedClientMail(
                    customerName:    (string) $emailContext['customer_name'],
                    businessName:    $businessName,
                    serviceName:     (string) $emailContext['service_name'],
                    appointmentDate: (string) $emailContext['appointment_date'],
                    startTime:       (string) $emailContext['start_time'],
                    refundAmount:    (float)  $emailContext['refund_amount'],
                    isFullRefund:    (bool)   $emailContext['is_full_refund'],
                    currency:        (string) $emailContext['currency'],
                ));
            } catch (\Throwable $e) {
                Log::error('[BookReady] PaymentRefundedClientMail failed', [
                    'tenant_id'      => $tenantId,
                    'appointment_id' => $appointmentId,
                    'error'          => $e->getMessage(),
                ]);
            }
        }

        return response()->json(['received' => true]);
    }

    // ── Disputes / chargebacks ───────────────────────────────────────────

    /**
     * A dispute (chargeback) was opened against one of our Connect charges.
     * Stamp the appointment with the dispute info and alert the owner —
     * they typically have ~7 days to respond in Stripe.
     */
    private function handleDisputeOpened($event): JsonResponse
    {
        return $this->upsertDispute($event, isOpened: true);
    }

    /**
     * Dispute was resolved. Update local status to whatever Stripe says
     * (won/lost/warning_closed) and email the owner the outcome.
     */
    private function handleDisputeClosed($event): JsonResponse
    {
        return $this->upsertDispute($event, isOpened: false);
    }

    private function upsertDispute($event, bool $isOpened): JsonResponse
    {
        $dispute   = $event->data->object;
        $charge    = $dispute->charge ?? null;
        $disputeId = $dispute->id ?? null;
        $reason    = (string) ($dispute->reason ?? '');
        $status    = (string) ($dispute->status ?? 'open');
        $amountCts = (int)    ($dispute->amount ?? 0);

        // We need the charge's metadata to find the appointment. Dispute
        // events don't include charge metadata directly — we fetch the
        // charge from Stripe to get it.
        if (! $charge || ! $disputeId) return response()->json(['received' => true]);

        try {
            \Stripe\Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $chargeObj = \Stripe\Charge::retrieve($charge);
        } catch (\Throwable $e) {
            Log::error('Dispute webhook: charge retrieve failed', [
                'dispute_id' => $disputeId,
                'charge_id'  => $charge,
                'error'      => $e->getMessage(),
            ]);
            return response()->json(['received' => true, 'note' => 'logged']);
        }

        $metadata = $chargeObj->metadata?->toArray() ?? [];
        if (($metadata['purpose'] ?? null) !== AppointmentPaymentService::PURPOSE) {
            return response()->json(['received' => true]);
        }

        $tenantId      = $metadata['tenant_id']      ?? null;
        $appointmentId = isset($metadata['appointment_id']) ? (int) $metadata['appointment_id'] : null;
        if (! $tenantId || ! $appointmentId) {
            return response()->json(['received' => true]);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) return response()->json(['received' => true]);

        $ownerEmail   = $tenant->owner?->email;
        $ownerName    = $tenant->owner?->name ?? 'there';
        $businessName = $tenant->id;

        $shouldEmail = false;

        try {
            tenancy()->initialize($tenant);
            if (! Schema::hasColumn('appointments', 'dispute_status')) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $row = DB::table('appointments')->where('id', $appointmentId)->first();
            if (! $row) {
                tenancy()->end();
                return response()->json(['received' => true]);
            }

            $previousStatus = $row->dispute_status ?? null;

            $update = [
                'dispute_status'    => $status,
                'stripe_dispute_id' => $disputeId,
                'dispute_reason'    => $reason ?: null,
                'dispute_amount'    => $amountCts / 100,
                'updated_at'        => now(),
            ];
            if ($isOpened) {
                $update['dispute_opened_at'] = now();
                $shouldEmail = $previousStatus !== $status; // first time we see it
            } else {
                $update['dispute_closed_at'] = now();
                $shouldEmail = $previousStatus !== $status;
            }

            DB::table('appointments')->where('id', $appointmentId)->update($update);
            $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);

            tenancy()->end();
        } catch (\Throwable $e) {
            Log::error('Dispute webhook processing error', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $appointmentId,
                'dispute_id'     => $disputeId,
                'error'          => $e->getMessage(),
            ]);
            try { tenancy()->end(); } catch (\Throwable) {}
            return response()->json(['received' => true, 'note' => 'logged']);
        }

        if ($shouldEmail && $ownerEmail) {
            try {
                if ($isOpened) {
                    Mail::to($ownerEmail)->send(new DisputeOpenedOwnerMail(
                        ownerName:       $ownerName,
                        businessName:    $businessName,
                        disputeAmount:   $amountCts / 100,
                        currency:        strtoupper((string) ($dispute->currency ?? 'usd')),
                        reason:          $reason ?: 'unspecified',
                        evidenceDueBy:   isset($dispute->evidence_details?->due_by)
                                            ? (int) $dispute->evidence_details->due_by
                                            : null,
                    ));
                } else {
                    Mail::to($ownerEmail)->send(new DisputeClosedOwnerMail(
                        ownerName:    $ownerName,
                        businessName: $businessName,
                        disputeAmount:$amountCts / 100,
                        currency:     strtoupper((string) ($dispute->currency ?? 'usd')),
                        outcome:      $status,
                    ));
                }
            } catch (\Throwable $e) {
                Log::error('[BookReady] Dispute owner email failed', [
                    'tenant_id' => $tenantId,
                    'isOpened'  => $isOpened,
                    'error'     => $e->getMessage(),
                ]);
            }
        }

        return response()->json(['received' => true]);
    }
}
