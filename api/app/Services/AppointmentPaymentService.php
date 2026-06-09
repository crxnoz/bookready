<?php

namespace App\Services;

use App\Exceptions\StripeConnectNotReadyException;
use Stripe\Checkout\Session;
use Stripe\Customer as StripeCustomer;
use Stripe\Stripe;

/**
 * Customer appointment payments (deposits AND full-payment-up-front).
 *
 * IMPORTANT: This is intentionally separate from the BookReady SaaS
 * subscription billing that lives in App\Http\Controllers\Api\WebhookController
 * + Cashier. Do not call Cashier from here, and do not let SaaS code call this.
 *
 * Uses Stripe Connect destination charges — funds settle directly into the
 * tenant's connected account on the same charge.
 */
class AppointmentPaymentService
{
    public const PURPOSE = 'appointment_deposit';

    public const TYPE_DEPOSIT = 'deposit';
    public const TYPE_FULL    = 'full';
    public const TYPE_BALANCE = 'balance';
    public const TYPE_TIP     = 'tip';
    public const TYPE_LATE_FEE = 'late_fee';

    /**
     * Compute the deposit amount in major units (e.g. dollars) given the
     * tenant's payment_settings and a service price.
     *
     * Returns null when no valid deposit can be charged (settings invalid,
     * deposit configured at 0, percent deposit on a free service, etc.).
     */
    public static function calculateDeposit(array $paymentSettings, ?float $servicePrice): ?float
    {
        if (! ($paymentSettings['payments_enabled'] ?? false))   return null;
        if (! ($paymentSettings['deposits_enabled'] ?? false))   return null;

        $type   =          $paymentSettings['deposit_type']   ?? null;
        $amount = isset($paymentSettings['deposit_amount']) && $paymentSettings['deposit_amount'] !== null
            ? (float) $paymentSettings['deposit_amount']
            : null;

        if ($amount === null || $amount <= 0)                   return null;
        if (! in_array($type, ['flat', 'percent'], true))       return null;

        if ($type === 'flat') {
            $deposit = $amount;
        } else {
            if ($servicePrice === null || $servicePrice <= 0)   return null;
            $percent = min(100.0, max(0.0, $amount));
            $deposit = ($servicePrice * $percent) / 100.0;
        }

        // Cap by service price when known.
        if ($servicePrice !== null && $servicePrice > 0) {
            $deposit = min($deposit, $servicePrice);
        }

        $deposit = round($deposit, 2);
        return $deposit > 0 ? $deposit : null;
    }

    /**
     * Compute the full-payment amount in major units. Returns null when
     * allow_full_payment isn't enabled, or when the service has no price.
     */
    public static function calculateFullPayment(array $paymentSettings, ?float $servicePrice): ?float
    {
        if (! ($paymentSettings['payments_enabled']   ?? false)) return null;
        if (! ($paymentSettings['allow_full_payment'] ?? false)) return null;
        if ($servicePrice === null || $servicePrice <= 0)         return null;

        return round($servicePrice, 2);
    }

    /**
     * Create a Stripe Checkout Session for either a deposit or a full
     * payment. `payment_type` controls the line-item label and the
     * metadata so the webhook can finalize state correctly.
     *
     * Two presentation modes via `ui_mode`:
     *   - 'hosted'   (default) — Stripe-hosted Checkout page. Requires
     *                            success_url + cancel_url. Returns `url`;
     *                            caller redirects the browser.
     *   - 'embedded'           — Stripe Embedded Checkout mounted on the
     *                            tenant's own booking page. Requires a
     *                            single return_url (no success/cancel).
     *                            Returns `client_secret` for the JS SDK;
     *                            `url` is null.
     *
     * @param array $context [
     *   'tenant_id'                 => string,
     *   'tenant_slug'               => string,
     *   'appointment_id'            => int,
     *   'service_name'              => string,
     *   'payment_type'              => 'deposit'|'full',
     *   'amount'                    => float,                // major units
     *   'currency'                  => 'USD',
     *   'customer_email'            => ?string,
     *   'ui_mode'                   => 'hosted'|'embedded',  // default hosted
     *   'success_url'               => string,               // hosted only
     *   'cancel_url'                => string,               // hosted only
     *   'return_url'                => string,               // embedded only
     *   'stripe_connect_account_id' => ?string,
     *   'stripe_connect_ready'      => bool,
     * ]
     *
     * @throws StripeConnectNotReadyException
     * @return array{id:string,url:?string,client_secret:?string}
     */
    public static function createCheckoutSession(array $context): array
    {
        $destination = $context['stripe_connect_account_id'] ?? null;
        $ready       = (bool) ($context['stripe_connect_ready'] ?? false);

        if (! $destination || ! $ready) {
            throw new StripeConnectNotReadyException();
        }

        $paymentType = $context['payment_type'] ?? self::TYPE_DEPOSIT;
        if (! in_array($paymentType, [self::TYPE_DEPOSIT, self::TYPE_FULL, self::TYPE_BALANCE, self::TYPE_TIP], true)) {
            $paymentType = self::TYPE_DEPOSIT;
        }

        Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));

        $currency = strtolower($context['currency'] ?? 'usd');
        $amount   = (int) round(((float) $context['amount']) * 100); // minor units

        $serviceName = $context['service_name'] ?? 'Appointment';
        $itemName    = match ($paymentType) {
            self::TYPE_FULL    => 'Booking · ' . $serviceName,
            self::TYPE_BALANCE => 'Balance · ' . $serviceName,
            self::TYPE_TIP     => 'Tip · ' . $serviceName,
            default            => 'Deposit · ' . $serviceName,
        };
        $itemDesc    = match ($paymentType) {
            self::TYPE_FULL    => 'Full booking payment',
            self::TYPE_BALANCE => 'Remaining balance for your booking',
            self::TYPE_TIP     => 'Gratuity for your appointment',
            default            => 'Booking deposit',
        };

        $metadata = [
            'purpose'        => self::PURPOSE,
            'payment_type'   => $paymentType,
            'tenant_id'      => (string) $context['tenant_id'],
            'tenant_slug'    => (string) $context['tenant_slug'],
            'appointment_id' => (string) $context['appointment_id'],
        ];

        // BNPL methods piggyback on the same Checkout session — Stripe shows
        // them as additional choices alongside Card when amount/currency
        // are eligible. For ineligible amounts Stripe silently hides them.
        $paymentMethodTypes = ['card'];
        if (! empty($context['allow_split_pay'])) {
            // Klarna covers US/EU, Afterpay/Clearpay covers US/UK/AU,
            // Affirm is US/CA only. Stripe filters by region automatically.
            $paymentMethodTypes = ['card', 'klarna', 'afterpay_clearpay', 'affirm'];
        }

        $embedded = ($context['ui_mode'] ?? 'hosted') === 'embedded';

        $sessionParams = [
            'mode'                 => 'payment',
            'payment_method_types' => $paymentMethodTypes,
            'line_items'           => [[
                'quantity'   => 1,
                'price_data' => [
                    'currency'     => $currency,
                    'unit_amount'  => $amount,
                    'product_data' => [
                        'name'        => $itemName,
                        'description' => $itemDesc,
                    ],
                ],
            ]],
            'metadata' => $metadata,
            'payment_intent_data' => [
                'metadata'      => $metadata,
                // Destination charge — funds settle into the connected
                // tenant account on the same charge. No application_fee
                // in MVP; add later if needed.
                'transfer_data' => [
                    'destination' => $destination,
                ],
            ],
        ];

        // Presentation mode. Embedded mounts Checkout inside the tenant's
        // booking page (single return_url, returns a client_secret for the
        // JS SDK); hosted redirects the browser to Stripe's page (success +
        // cancel URLs, returns a url). The webhook (checkout.session.completed)
        // is identical for both — it never inspects ui_mode.
        if ($embedded) {
            $sessionParams['ui_mode']    = 'embedded';
            $sessionParams['return_url'] = $context['return_url'];
            // Cap the held-slot window. An abandoned embedded checkout
            // otherwise holds the appointment's slot until Stripe's 24h
            // default expiry (the appointment row stays pending until the
            // checkout.session.expired webhook frees it). 30 minutes is the
            // Stripe minimum and is ample for entering card details.
            $sessionParams['expires_at'] = time() + (30 * 60);
        } else {
            $sessionParams['success_url'] = $context['success_url'];
            $sessionParams['cancel_url']  = $context['cancel_url'];
        }

        // Stripe Tax — requires the connected account to have Stripe Tax
        // enabled in their dashboard. If they haven't, Checkout returns a
        // clear error from the API.
        if (! empty($context['collect_tax'])) {
            $sessionParams['automatic_tax'] = ['enabled' => true];
        }

        // Saved-cards flow: create/reuse a Stripe Customer and store the
        // PaymentMethod for off_session charges later (no-show fees, etc).
        // Setup-future-usage isn't compatible with BNPL methods, so when
        // both are on we silently keep card-only for save_cards charges.
        if (! empty($context['save_cards_for_reuse'])) {
            $sessionParams['payment_intent_data']['setup_future_usage'] = 'off_session';
            $sessionParams['payment_method_types'] = ['card']; // BNPL can't save off_session
            // Try to reuse an existing Customer by email so repeat clients
            // can see their saved card in Checkout.
            $existingCustomerId = self::findCustomerIdByEmail(
                (string) ($context['customer_email'] ?? ''),
            );
            if ($existingCustomerId) {
                $sessionParams['customer'] = $existingCustomerId;
            } else {
                $sessionParams['customer_creation'] = 'always';
                if (! empty($context['customer_email'])) {
                    $sessionParams['customer_email'] = $context['customer_email'];
                }
            }
        } elseif (! empty($context['customer_email'])) {
            $sessionParams['customer_email'] = $context['customer_email'];
        }

        $session = Session::create($sessionParams);

        return [
            'id'            => $session->id,
            'url'           => $session->url ?? null,            // hosted only
            'client_secret' => $session->client_secret ?? null,  // embedded only
        ];
    }

    /**
     * Embedded-checkout fallback. Given an existing (embedded) Checkout
     * session that the browser couldn't mount — Stripe.js blocked, offline,
     * etc. — mint an equivalent HOSTED session for the same charge so the
     * customer can be redirected to Stripe's own page instead of stranded.
     *
     * We retrieve the original session and mirror its amount, currency,
     * payment methods, metadata, and Connect destination rather than
     * recomputing from settings — that guarantees the fallback charges
     * exactly what the embedded session would have, with no drift.
     *
     * @return array{id:?string,url:?string,already_paid:bool}
     */
    public static function createHostedFromSession(
        string $sessionId,
        string $successUrl,
        string $cancelUrl,
    ): array {
        Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));

        $old = Session::retrieve([
            'id'     => $sessionId,
            'expand' => ['payment_intent'],
        ]);

        // Already paid (race: payment landed before the fallback fired) —
        // nothing to do; caller treats this as success.
        if (($old->payment_status ?? null) === 'paid') {
            return ['id' => $old->id, 'url' => null, 'already_paid' => true];
        }

        $currency = $old->currency ?? 'usd';
        $amount   = (int) ($old->amount_total ?? 0);
        $metadata = isset($old->metadata) ? $old->metadata->toArray() : [];
        $methods  = (isset($old->payment_method_types) && count($old->payment_method_types) > 0)
            ? $old->payment_method_types
            : ['card'];
        $destination       = $old->payment_intent->transfer_data->destination ?? null;
        $oldSetupFutureUse = $old->payment_intent->setup_future_usage ?? null;
        $oldCustomerId     = $old->customer        ?? null;
        $oldCustomerEmail  = $old->customer_email  ?? null;

        // Save-cards-for-reuse propagation. The original embedded session
        // set setup_future_usage='off_session' AND forced card-only AND
        // attached a Customer (reused by email or customer_creation=always)
        // — that combination is what makes the resulting PaymentMethod
        // chargeable off_session later (no-show / late fee). The webhook's
        // saved-card stash (AppointmentPaymentWebhookController) keys off
        // $session->customer, so without these the fallback would silently
        // skip card-on-file capture even though the deposit itself charges
        // correctly.
        $saveCards = $oldSetupFutureUse === 'off_session' || $oldCustomerId !== null;

        $paymentType = $metadata['payment_type'] ?? self::TYPE_DEPOSIT;
        $itemName = match ($paymentType) {
            self::TYPE_FULL    => 'Booking',
            self::TYPE_BALANCE => 'Balance',
            self::TYPE_TIP     => 'Tip',
            default            => 'Deposit',
        };

        $params = [
            'mode'                 => 'payment',
            // Save-cards is card-only (setup_future_usage is incompatible
            // with BNPL); force ['card'] when on, otherwise mirror the
            // original session's methods exactly.
            'payment_method_types' => $saveCards ? ['card'] : $methods,
            'success_url'          => $successUrl,
            'cancel_url'           => $cancelUrl,
            'line_items'           => [[
                'quantity'   => 1,
                'price_data' => [
                    'currency'     => $currency,
                    'unit_amount'  => $amount,
                    'product_data' => ['name' => $itemName],
                ],
            ]],
            'metadata'            => $metadata,
            'payment_intent_data' => ['metadata' => $metadata],
            // Match the embedded session's short hold window.
            'expires_at'          => time() + (30 * 60),
        ];
        if ($destination) {
            $params['payment_intent_data']['transfer_data'] = ['destination' => $destination];
        }
        if ($saveCards) {
            $params['payment_intent_data']['setup_future_usage'] = 'off_session';
            // Reuse the Customer the embedded session already attached,
            // or — if it was using customer_creation=always (no id yet) —
            // tell Stripe to create one now with the same email.
            if ($oldCustomerId) {
                $params['customer'] = $oldCustomerId;
            } else {
                $params['customer_creation'] = 'always';
                if ($oldCustomerEmail) {
                    $params['customer_email'] = $oldCustomerEmail;
                }
            }
        }

        $new = Session::create($params);

        return ['id' => $new->id, 'url' => $new->url ?? null, 'already_paid' => false];
    }

    /**
     * Look up the most recent Stripe Customer matching an email. Returns
     * null when nothing matches (or on error — Checkout falls back to
     * creating a new customer in that case).
     */
    private static function findCustomerIdByEmail(string $email): ?string
    {
        if ($email === '') return null;
        try {
            $list = StripeCustomer::all(['email' => $email, 'limit' => 1]);
            return $list->data[0]->id ?? null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @deprecated Kept for backwards-compat — prefer createCheckoutSession().
     * Routes a legacy "deposit only" payload through the new method.
     */
    public static function createDepositCheckoutSession(array $context): array
    {
        return self::createCheckoutSession(array_merge($context, [
            'payment_type' => self::TYPE_DEPOSIT,
            'amount'       => $context['amount'] ?? ($context['deposit_amount'] ?? 0),
        ]));
    }
}
