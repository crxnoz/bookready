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
    public const STATE_PRE_TRIAL     = 'pre_trial';   // signup → onboarding → plan-pick window
    public const STATE_TRIALING      = 'trialing';
    public const STATE_ACTIVE        = 'active';
    public const STATE_PAST_DUE      = 'past_due';
    public const STATE_TRIAL_EXPIRED = 'trial_expired';
    public const STATE_CANCELLED     = 'cancelled';

    /**
     * States where the owner can WRITE to /editor/*. Includes
     * STATE_PRE_TRIAL so the onboarding wizard can save before any
     * payment method is on file. EnforceWriteGate consults this.
     */
    public const STATES_CAN_WRITE = [
        self::STATE_PRE_TRIAL,
        self::STATE_TRIALING,
        self::STATE_ACTIVE,
        self::STATE_PAST_DUE,
    ];

    /**
     * States where the PUBLIC site at {slug}.bkrdy.me is live. Excludes
     * STATE_PRE_TRIAL — pre-trial tenants get the parked "coming soon"
     * payload from PublicSiteController so the subdomain isn't squatted
     * with a half-finished site before billing is set up.
     */
    public const STATES_PUBLIC_LIVE = [
        self::STATE_TRIALING,
        self::STATE_ACTIVE,
        self::STATE_PAST_DUE,
    ];

    /** @deprecated kept for back-compat with any out-of-tree caller. Use STATES_CAN_WRITE. */
    public const STATES_ALIVE = self::STATES_CAN_WRITE;

    /**
     * Extra data stored in the tenants.data JSON column.
     * Cast these so they behave like normal attributes.
     */
    public static function getCustomColumns(): array
    {
        // A5 refinement — trial_acknowledged_at gates the post-login
        // redirect; without it, signing back in after closing Stripe
        // mid-flow would bypass the trial-info page.
        // Wave D — staff_login_enabled is a real tenants column (the
        // master kill switch for staff logins), so it must be listed
        // here or stancl/tenancy would treat it as a virtual data-JSON
        // attribute and fail to read/write the actual column.
        return [
            'id', 'plan', 'subscription_state', 'stripe_id', 'trial_ends_at', 'trial_acknowledged_at',
            'onboarding_completed_at', 'plan_selected_at', 'selected_plan', 'selected_cycle',
            'staff_login_enabled', 'created_at', 'updated_at',
        ];
    }

    protected $casts = [
        'trial_ends_at'           => 'datetime',
        'trial_acknowledged_at'   => 'datetime',
        'onboarding_completed_at' => 'datetime',
        'plan_selected_at'        => 'datetime',
        // Wave D — master kill switch for staff logins. Default FALSE;
        // when false the feature is entirely off for the tenant.
        'staff_login_enabled'     => 'boolean',
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
     * Owner can write to /editor/*. Includes STATE_PRE_TRIAL so the
     * onboarding wizard can save before billing setup. EnforceWriteGate
     * consults this.
     */
    public function canWrite(): bool
    {
        return in_array($this->subscription_state, self::STATES_CAN_WRITE, true);
    }

    /**
     * Public booking site at {slug}.bkrdy.me is live. NARROWER than
     * canWrite — pre-trial tenants can build their site privately in
     * the editor but the public URL serves a parked "coming soon"
     * payload until billing is set up.
     */
    public function publicSiteLive(): bool
    {
        return in_array($this->subscription_state, self::STATES_PUBLIC_LIVE, true);
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
