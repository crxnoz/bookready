<?php

/**
 * BookReady plan catalog — single source of truth for pricing.
 *
 * Mirrors the public pricing page on mybookready.com (which is the
 * source the customer sees first). The schema here drives:
 *   - artisan stripe:create-products (creates / upserts 18 Stripe prices)
 *   - BillingController::checkout (plan + cycle + sms_mult lookup)
 *   - editor /billing page (display of plan + SMS quota)
 *   - SMS quota enforcement (sms_included_per_month)
 *
 * Uplift table is flat across plans:
 *   1× = $0 (base)
 *   2× = +$5/mo
 *   3× = +$10/mo
 * Monthly + annual prices stored separately so we don't compute discounts
 * in PHP and risk drift from the marketing site.
 *
 * Stripe lookup_key convention: br_{plan}_{cycle}_{mult}x
 *   e.g. br_solo_monthly_1x, br_studio_annual_3x.
 * The artisan command uses lookup_key to find existing prices and update
 * them in place, so re-running it never duplicates products in Stripe.
 *
 * Salon is currently waitlist-only on the marketing site, but we still
 * create the prices so we don't have to come back when we open it up.
 */

return [
    // SMS overage charged per-message above the included quota,
    // billed via Stripe metered usage. Mirrors the marketing page
    // ("$0.025 each").
    'sms_overage_cents' => 3,

    // Trial length for new tenants in days. Mirrors what the marketing
    // page promises (currently no trial advertised; set to 0 = no trial
    // in code until we decide).
    'trial_days' => 0,

    // ── Plans ────────────────────────────────────────────────────────
    'plans' => [
        'solo' => [
            'label'         => 'Solo',
            'description'   => 'One calendar. For solo barbers, lash artists, nail techs, and facialists.',
            'sms_base'      => 400,
            'staff_seats'   => 1,
            'allow_custom_domain' => false,
            'monthly_base_cents'  => 2400,   // $24
            'annual_base_cents'   => 22800,  // $228 ($19/mo)
        ],
        'studio' => [
            'label'         => 'Studio',
            'description'   => 'Small studios with two to five staff. Same full feature set as Solo, more seats, more SMS.',
            'sms_base'      => 800,
            'staff_seats'   => 5,
            'allow_custom_domain' => true,
            'monthly_base_cents'  => 4900,   // $49
            'annual_base_cents'   => 46800,  // $468 ($39/mo)
            'featured'      => true,
        ],
        'salon' => [
            'label'         => 'Salon',
            'description'   => 'Multi-location salons and teams of 5 to 25.',
            'sms_base'      => 2000,
            'staff_seats'   => 25,
            'allow_custom_domain' => true,
            'monthly_base_cents'  => 9900,   // $99
            'annual_base_cents'   => 94800,  // $948 ($79/mo)
            'waitlist'      => true,         // marketing page CTA opens waitlist
        ],
    ],

    // ── SMS bundle multipliers ──────────────────────────────────────
    // mult => uplift in cents (added to monthly_base or annual_base / 12
    // for the annual case — see helper computePriceCents below if added).
    'sms_multipliers' => [
        1 => ['uplift_cents' => 0,     'label' => '1×', 'sms_factor' => 1],
        2 => ['uplift_cents' => 500,   'label' => '2×', 'sms_factor' => 2],
        3 => ['uplift_cents' => 1000,  'label' => '3×', 'sms_factor' => 3],
    ],

    // ── Billing cycles ───────────────────────────────────────────────
    'cycles' => [
        'monthly' => ['interval' => 'month', 'interval_count' => 1, 'label' => 'Monthly'],
        'annual'  => ['interval' => 'year',  'interval_count' => 1, 'label' => 'Annual'],
    ],
];
