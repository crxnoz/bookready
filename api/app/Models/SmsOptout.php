<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One row per phone number that has opted out of all BookReady SMS.
 * Platform-wide scope — when a customer texts STOP after a booking at
 * tenant A, we don't send them appointment SMS for tenant B either.
 *
 * Phone is canonical E.164 (+13125551234). Use
 * SmsService::normalizePhone() before any lookup.
 */
class SmsOptout extends Model
{
    protected $fillable = [
        'phone', 'opted_out_at', 'source', 'tenant_id', 'note',
    ];

    protected $casts = [
        'opted_out_at' => 'datetime',
    ];
}
