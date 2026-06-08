<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Availability 2.0 · Phase 5 · Availability Request.
 *
 * Customer-submitted "I want this date" demand capture. Lifecycle:
 *   pending → approved | suggested | declined
 *   suggested → accepted (customer took the alternative) | declined
 *
 * See docs/availability-2.0.md and the migration for the broader design.
 */
class AvailabilityRequest extends Model
{
    protected $fillable = [
        'kind',
        'customer_name',
        'customer_email',
        'customer_phone',
        'service_id',
        'staff_id',
        'preferred_date',
        'preferred_time',
        'notes',
        'status',
        'fee_cents',
        'owner_note',
        'suggested_date',
        'suggested_time',
        'action_token',
        'appointment_id',
    ];

    protected $casts = [
        'preferred_date' => 'date',
        'suggested_date' => 'date',
        'service_id'     => 'integer',
        'staff_id'       => 'integer',
        'fee_cents'      => 'integer',
        'appointment_id' => 'integer',
    ];
}
