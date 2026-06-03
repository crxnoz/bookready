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

    // ── SMS bundle uplift ────────────────────────────────────────────
    // Single source of truth for the additional-SMS bundle pricing.
    // Twilio A2P send cost is ~$0.0083/SMS. We charge $0.01/SMS for the
    // bundle uplift — a deliberately gentle launch price (~17% gross
    // margin, still above cost so never underwater) to keep add-on SMS
    // approachable for brand-new businesses. NOTE: only ~$0.0017 headroom
    // per SMS, so watch the Twilio cost — if it climbs much past $0.0083
    // this gets thin. Easy to raise later (existing subscribers keep their
    // locked-in Stripe price; only new checkouts get the new rate).
    // $0.01 is a $0.0025-step rate, so every bundle lands on a whole
    // dollar (no rounding drift). Scales per plan automatically:
    // uplift_cents = (sms_factor - 1) × plan.sms_base × per_sms_uplift × 100.
    //
    // Same value used by: CreateStripeProducts command (when creating
    // prices), BillingController::plans (returned to frontend), and
    // bookready-marketing/pricing.js (kept in lock-step manually).
    // If you change this, re-run `php artisan stripe:create-products`
    // to drift-detect and recreate the affected Stripe prices.
    'per_sms_uplift_dollars' => 0.01,

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
    // Uplift used to be a flat per-mult value here (2x = +$5, 3x = +$10
    // across plans). That over-charged Solo and lost money on Salon
    // because Salon's SMS delta is 5x Solo's. Now uplift is computed
    // from per_sms_uplift_dollars (above) × sms_delta, so each plan
    // pays in proportion to how many added SMS the upgrade includes.
    'sms_multipliers' => [
        1 => ['sms_factor' => 1, 'label' => '1×'],
        2 => ['sms_factor' => 2, 'label' => '2×'],
        3 => ['sms_factor' => 3, 'label' => '3×'],
    ],

    // ── Billing cycles ───────────────────────────────────────────────
    'cycles' => [
        'monthly' => ['interval' => 'month', 'interval_count' => 1, 'label' => 'Monthly'],
        'annual'  => ['interval' => 'year',  'interval_count' => 1, 'label' => 'Annual'],
    ],
];
