<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Availability 2.0 · Phase 7 · Waitlist entry.
 *
 * One row per customer waiting for a cancellation slot. Lifecycle:
 *   pending → notified → claimed | expired | removed
 *
 * See docs/availability-2.0.md and the migration for the broader design.
 */
class WaitlistEntry extends Model
{
    protected $fillable = [
        'customer_name',
        'customer_email',
        'customer_phone',
        'service_id',
        'staff_id',
        'preferred_date',
        'earliest_date',
        'latest_date',
        'notes',
        'status',
        'claim_token',
        'notified_at',
        'notification_expires_at',
        'notified_appointment_id',
        'claimed_appointment_id',
    ];

    protected $casts = [
        'preferred_date'          => 'date',
        'earliest_date'           => 'date',
        'latest_date'             => 'date',
        'notified_at'             => 'datetime',
        'notification_expires_at' => 'datetime',
        'service_id'              => 'integer',
        'staff_id'                => 'integer',
        'notified_appointment_id' => 'integer',
        'claimed_appointment_id'  => 'integer',
    ];
}
