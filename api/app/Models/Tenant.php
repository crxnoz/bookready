<?php

namespace App\Models;

use Laravel\Cashier\Billable;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains, Billable;

    /**
     * #155 — subscription_state values.
     * Keep this enum here as one canonical source of truth used by the
     * EnforceWriteGate middleware, the BillingController, the webhook
     * handlers, and PublicSiteController's parked-page check.
     */
    public const STATE_TRIALING      = 'trialing';
    public const STATE_ACTIVE        = 'active';
    public const STATE_PAST_DUE      = 'past_due';
    public const STATE_TRIAL_EXPIRED = 'trial_expired';
    public const STATE_CANCELLED     = 'cancelled';

    /**
     * States that LET the tenant continue using the product (read +
     * write + public site live). past_due is included on purpose:
     * Stripe is still retrying the card and we want the owner to
     * fix it from inside the editor.
     */
    public const STATES_ALIVE = [
        self::STATE_TRIALING,
        self::STATE_ACTIVE,
        self::STATE_PAST_DUE,
    ];

    /**
     * Extra data stored in the tenants.data JSON column.
     * Cast these so they behave like normal attributes.
     */
    public static function getCustomColumns(): array
    {
        // A5 refinement — trial_acknowledged_at gates the post-login
        // redirect; without it, signing back in after closing Stripe
        // mid-flow would bypass the trial-info page.
        return ['id', 'plan', 'subscription_state', 'stripe_id', 'trial_ends_at', 'trial_acknowledged_at', 'created_at', 'updated_at'];
    }

    protected $casts = [
        'trial_ends_at'         => 'datetime',
        'trial_acknowledged_at' => 'datetime',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function owner()
    {
        return $this->hasOne(User::class)->where('is_owner', true);
    }

    // ── #155 subscription-state helpers ─────────────────────────────

    public function isTrialing(): bool
    {
        return $this->subscription_state === self::STATE_TRIALING;
    }

    public function isActive(): bool
    {
        return $this->subscription_state === self::STATE_ACTIVE;
    }

    public function isPastDue(): bool
    {
        return $this->subscription_state === self::STATE_PAST_DUE;
    }

    /**
     * Tenant is "alive" — editor read+write, public site live.
     * Anything outside STATES_ALIVE locks writes + parks the site.
     */
    public function canWrite(): bool
    {
        return in_array($this->subscription_state, self::STATES_ALIVE, true);
    }

    /**
     * Public site stays live in any "alive" state. Trial expired or
     * cancelled tenants serve the parked page instead.
     */
    public function publicSiteLive(): bool
    {
        return $this->canWrite();
    }

    /**
     * Trial countdown for the editor banner. Returns null when not
     * trialing or when trial_ends_at isn't set.
     */
    public function trialDaysRemaining(): ?int
    {
        if (! $this->isTrialing() || ! $this->trial_ends_at) {
            return null;
        }
        return max(0, (int) now()->diffInDays($this->trial_ends_at, false));
    }
}
