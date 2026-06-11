<?php

namespace App\Services;

use App\Models\Tenant;

/**
 * Plan-tier feature gates — single source of truth for "what can this
 * tenant do based on their plan?"
 *
 * Why this exists: pricing tiers in config/plans.php declare values
 * like `staff_seats => 1/5/25` and `allow_custom_domain => false/true`,
 * but until this service existed, no controller checked them. A tenant
 * paying $24/mo for Solo could create 5 staff and use a Studio-only
 * custom domain — the catalog was decorative. This service makes the
 * tiers real.
 *
 * Adding a new gated feature:
 *   1. Add the column to config/plans.php under each plan
 *   2. Add a method here that reads it via config() with a safe default
 *   3. Add the value to snapshot() so the editor frontend sees it
 *   4. Enforce it in the relevant controller (return 422 with
 *      { code: 'plan_limit_reached', upgrade_to: '...' })
 *   5. Gate the UI in the relevant frontend component via usePlan()
 *
 * Defaults: every method returns the MOST RESTRICTIVE value (Solo's
 * limit) when the plan is missing or unrecognized. This is a security
 * default — a misconfigured tenant must NEVER accidentally get Studio
 * features for free.
 */
class PlanFeatures
{
    /**
     * Effective plan slug for the tenant. tenants.plan is set at signup
     * (BillingController::checkoutTrial) and updated by the Stripe
     * subscription webhook on plan changes. Returns 'solo' for any
     * unrecognized or missing value — the safest default.
     */
    public static function planOf(Tenant $tenant): string
    {
        $plan = (string) ($tenant->plan ?? '');
        if ($plan === '' || ! array_key_exists($plan, (array) config('plans.plans', []))) {
            return 'solo';
        }
        return $plan;
    }

    /** Max staff seats the tenant can have. */
    public static function staffSeatsFor(Tenant $tenant): int
    {
        $plan = self::planOf($tenant);
        return (int) (config("plans.plans.{$plan}.staff_seats") ?? 1);
    }

    /**
     * Which dashboard surface to render. Solo gets the "your day"
     * vertical-timeline surface; Studio + Salon get the team grid.
     * Decoupled from `plan` so a future plan ("solo-plus"?) can opt
     * into either surface without renaming things.
     */
    public static function dashboardSurface(Tenant $tenant): string
    {
        return self::planOf($tenant) === 'solo' ? 'solo' : 'team';
    }

    /** Custom domain support — Studio + Salon only. */
    public static function allowsCustomDomain(Tenant $tenant): bool
    {
        $plan = self::planOf($tenant);
        return (bool) (config("plans.plans.{$plan}.allow_custom_domain") ?? false);
    }

    /**
     * Plan snapshot the frontend consumes. Keep keys stable — the
     * editor's PlanContext binds against this shape exactly. Adding a
     * new key here is safe (frontend ignores unknown keys); renaming
     * or removing one is a coordinated change with PlanContext.
     */
    public static function snapshot(Tenant $tenant): array
    {
        $plan    = self::planOf($tenant);
        $catalog = (array) config("plans.plans.{$plan}", []);

        return [
            'plan'                 => $plan,
            'plan_label'           => (string) ($catalog['label'] ?? ucfirst($plan)),
            'staff_seats'          => self::staffSeatsFor($tenant),
            'dashboard_surface'    => self::dashboardSurface($tenant),
            'allows_custom_domain' => self::allowsCustomDomain($tenant),
            // Wave D — per-tenant staff-login master switch (NOT a plan
            // gate; it's a tenants column). Surfaced here so the editor's
            // PlanContext can hide the StaffEditor login affordances when
            // the feature is off. Defaults to false so a tenant that
            // predates the column never accidentally shows the UI.
            'staff_login_enabled'  => (bool) ($tenant->staff_login_enabled ?? false),
        ];
    }
}
