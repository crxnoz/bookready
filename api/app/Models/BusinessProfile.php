<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessProfile extends Model
{
    protected $fillable = [
        'business_name',
        'tagline',
        'business_type',
        'public_email',
        'public_phone',
        'address_line',
        'city',
        'state',
        'zip',
        'instagram_url',
        'booking_enabled',
        'site_status',
    ];

    protected $casts = [
        'booking_enabled' => 'boolean',
    ];
}
