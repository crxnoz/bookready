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
        // Preferences (migration #5)
        'time_zone',
        'week_start_day',
        'time_format',
        'default_appointment_duration_minutes',
        'post_booking_message',
        'email_signature',
        'site_visibility',
        'site_password_hash',
    ];

    protected $casts = [
        'booking_enabled' => 'boolean',
        'week_start_day'  => 'integer',
        'default_appointment_duration_minutes' => 'integer',
    ];
}
