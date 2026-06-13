<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Central signup draft — see migration
 * 2026_06_13_000002_create_signup_drafts_table for the lifecycle.
 *
 * Read by AuthController::redirectFor to decide whether the user
 * should be at /signup/business, /signup/website, or already past
 * provisioning. Written by SignupController on each step submit.
 */
class SignupDraft extends Model
{
    protected $table = 'signup_drafts';

    public const STEP_BUSINESS    = 'business';
    public const STEP_WEBSITE     = 'website';
    public const STEP_PROVISIONED = 'provisioned';

    protected $fillable = [
        'user_id',
        'business_name',
        'tagline',
        'business_type',
        'services',
        'selected_subdomain',
        'selected_template',
        'selected_plan',
        'selected_cycle',
        'step_completed',
        'tenant_id',
        'provisioned_at',
    ];

    protected $casts = [
        'services'       => 'array',
        'provisioned_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** Step 3 finished — business_name + tagline + business_type set. */
    public function hasBusinessSetup(): bool
    {
        return in_array($this->step_completed, [self::STEP_BUSINESS, self::STEP_WEBSITE, self::STEP_PROVISIONED], true);
    }

    /** Step 4 finished — tenant provisioned. */
    public function hasWebsiteSetup(): bool
    {
        return in_array($this->step_completed, [self::STEP_WEBSITE, self::STEP_PROVISIONED], true);
    }
}
