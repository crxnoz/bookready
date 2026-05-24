<?php

namespace App\Services;

use Stripe\Account;
use Stripe\AccountLink;
use Stripe\Stripe;

/**
 * Stripe Connect (Express) onboarding for customer appointment payments.
 *
 * This is INTENTIONALLY separate from BookReady's SaaS subscription billing.
 * SaaS subscriptions live in App\Http\Controllers\Api\WebhookController +
 * Cashier. Do not call into Cashier from here.
 *
 * Each tenant opens its own Stripe Express connected account. Customer
 * deposits on the public booking site then use destination charges so
 * funds settle into the tenant's account (minus optional platform fees,
 * which we don't take in MVP).
 */
class StripeConnectService
{
    public const STATUS_NOT_CONNECTED      = 'not_connected';
    public const STATUS_ONBOARDING_STARTED = 'onboarding_started';
    public const STATUS_PENDING            = 'pending';
    public const STATUS_ACTIVE             = 'active';
    public const STATUS_RESTRICTED         = 'restricted';

    private const APP_BASE = 'https://app.bkrdy.me';

    public static function isReady(?array $paymentSettings): bool
    {
        if (! $paymentSettings) return false;
        if (empty($paymentSettings['stripe_connect_account_id'])) return false;
        if (! ($paymentSettings['stripe_charges_enabled']  ?? false)) return false;
        // payouts not strictly required to accept payments, but require it
        // for a clean "active" experience.
        return ($paymentSettings['stripe_connect_status'] ?? null) === self::STATUS_ACTIVE;
    }

    public static function createExpressAccount(string $tenantId, ?string $email = null): Account
    {
        self::initStripe();

        return Account::create([
            'type'    => 'express',
            'country' => 'US',
            'email'   => $email,
            'capabilities' => [
                'card_payments' => ['requested' => true],
                'transfers'     => ['requested' => true],
            ],
            'business_type' => 'individual',
            'metadata' => [
                'bookready_tenant_id' => $tenantId,
            ],
        ]);
    }

    public static function createOnboardingLink(string $accountId): AccountLink
    {
        self::initStripe();

        return AccountLink::create([
            'account'     => $accountId,
            'type'        => 'account_onboarding',
            'return_url'  => self::APP_BASE . '/editor/settings?tab=payments&stripe_connect=return',
            'refresh_url' => self::APP_BASE . '/editor/settings?tab=payments&stripe_connect=refresh',
        ]);
    }

    public static function fetchAccount(string $accountId): Account
    {
        self::initStripe();
        return Account::retrieve($accountId);
    }

    /**
     * Derive our local status from a Stripe Account object.
     */
    public static function deriveStatus(Account $account): string
    {
        $details   = (bool) ($account->details_submitted ?? false);
        $charges   = (bool) ($account->charges_enabled   ?? false);
        $payouts   = (bool) ($account->payouts_enabled   ?? false);

        $requirements = $account->requirements ?? null;
        $disabled = $requirements?->disabled_reason ?? null;

        if ($disabled) return self::STATUS_RESTRICTED;
        if ($details && $charges && $payouts) return self::STATUS_ACTIVE;
        if ($details) return self::STATUS_PENDING;
        return self::STATUS_ONBOARDING_STARTED;
    }

    private static function initStripe(): void
    {
        Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));
    }
}
