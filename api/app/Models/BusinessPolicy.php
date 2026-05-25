<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessPolicy extends Model
{
    protected $fillable = [
        'cancellation_policy',
        'late_policy',
        'no_show_policy',
        'deposit_policy',
        'reschedule_policy',
        'extra_notes',
        // Enforcement rules (migration #5)
        'late_grace_period_minutes',
        'forfeit_deposit_on_late_cancel',
        'max_reschedules_per_booking',
        'require_policy_agreement',
    ];

    protected $casts = [
        'forfeit_deposit_on_late_cancel' => 'boolean',
        'require_policy_agreement'       => 'boolean',
        'late_grace_period_minutes'      => 'integer',
        'max_reschedules_per_booking'    => 'integer',
    ];
}
