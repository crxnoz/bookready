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

    /**
     * Phase S5+ — never surface the site-unlock password hash through any
     * serialization path (toArray, toJson, API responses). The public site
     * lookup also strips it defensively in the controller, but hiding it
     * on the model is the catch-all: any future caller that forgets to
     * project columns still won't leak the hash.
     */
    protected $hidden = [
        'site_password_hash',
    ];
}
