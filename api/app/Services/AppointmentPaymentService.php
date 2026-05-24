<?php

namespace App\Services;

use Stripe\Checkout\Session;
use Stripe\Stripe;

/**
 * Customer appointment payments (deposits and full-payment).
 *
 * IMPORTANT: This is intentionally separate from the BookReady SaaS subscription
 * billing that lives in App\Http\Controllers\Api\WebhookController + Cashier.
 * Do not call Cashier from here, and do not let SaaS code call this.
 *
 * For MVP we use the platform Stripe account directly. When we add Stripe Connect
 * later, the Session::create() call here is the seam to swap (stripe_account header).
 */
class AppointmentPaymentService
{
    public const PURPOSE = 'appointment_deposit';

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
     * Create a Stripe Checkout Session for a deposit.
     *
     * @param array $context [
     *   'tenant_id'      => string,
     *   'tenant_slug'    => string,
     *   'appointment_id' => int,
     *   'service_name'   => string,
     *   'deposit_amount' => float (major units),
     *   'currency'       => 'USD',
     *   'customer_email' => ?string,
     *   'success_url'    => string,
     *   'cancel_url'     => string,
     * ]
     *
     * @return array{id:string,url:string}
     */
    public static function createDepositCheckoutSession(array $context): array
    {
        Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));

        $currency = strtolower($context['currency'] ?? 'usd');
        $amount   = (int) round(((float) $context['deposit_amount']) * 100); // minor units (cents)

        $sessionParams = [
            'mode'              => 'payment',
            'payment_method_types' => ['card'],
            'success_url'       => $context['success_url'],
            'cancel_url'        => $context['cancel_url'],
            'line_items'        => [[
                'quantity'   => 1,
                'price_data' => [
                    'currency'     => $currency,
                    'unit_amount'  => $amount,
                    'product_data' => [
                        'name'        => 'Deposit · ' . ($context['service_name'] ?? 'Appointment'),
                        'description' => 'Booking deposit',
                    ],
                ],
            ]],
            'metadata' => [
                'purpose'        => self::PURPOSE,
                'tenant_id'      => (string) $context['tenant_id'],
                'tenant_slug'    => (string) $context['tenant_slug'],
                'appointment_id' => (string) $context['appointment_id'],
            ],
            // Mirror metadata onto the resulting PaymentIntent so we can audit
            // straight from the PI dashboard view if needed.
            'payment_intent_data' => [
                'metadata' => [
                    'purpose'        => self::PURPOSE,
                    'tenant_id'      => (string) $context['tenant_id'],
                    'tenant_slug'    => (string) $context['tenant_slug'],
                    'appointment_id' => (string) $context['appointment_id'],
                ],
            ],
        ];

        if (! empty($context['customer_email'])) {
            $sessionParams['customer_email'] = $context['customer_email'];
        }

        $session = Session::create($sessionParams);

        return [
            'id'  => $session->id,
            'url' => $session->url,
        ];
    }
}
