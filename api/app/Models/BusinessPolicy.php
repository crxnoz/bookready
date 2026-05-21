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
    ];
}
