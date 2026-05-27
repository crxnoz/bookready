<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Phase 3 of the customer-accounts feature — pivot recording which
 * tenants a given CustomerUser has bookings in.
 *
 * Composite PK (customer_user_id + tenant_id) means we don't have a
 * single-id PK; Laravel's defaults assume one — disable
 * incrementing + primaryKey to keep mass-update safe.
 *
 * Most maintenance goes through raw query builder upserts in the
 * controllers (cheaper than instantiating Eloquent on a hot path).
 * The model is mostly here for relationship convenience + readability.
 */
class CustomerUserTenant extends Model
{
    public $incrementing = false;
    protected $primaryKey = null;
    protected $keyType    = 'string';

    protected $fillable = [
        'customer_user_id',
        'tenant_id',
        'first_booked_at',
        'last_booked_at',
    ];

    protected $casts = [
        'first_booked_at' => 'datetime',
        'last_booked_at'  => 'datetime',
    ];
}
