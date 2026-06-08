<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Availability 2.0 · Phase 1
 *
 * Per-date override that layers on top of the weekly schedule in the
 * `hours` table. Used by the public availability resolver: when a row
 * exists for a date, it wins. Otherwise the weekly hours apply.
 *
 * See docs/availability-2.0.md for the broader roadmap. SlotGenerator
 * itself is NOT modified — the merge happens in the caller.
 */
class CalendarOverride extends Model
{
    protected $fillable = [
        'date',
        'is_available',
        'open_time',
        'close_time',
        'break_start',
        'break_end',
        'max_appointments',
        'staff_ids',
        'service_ids',
        'notes',
    ];

    protected $casts = [
        'date'             => 'date',
        'is_available'     => 'boolean',
        'max_appointments' => 'integer',
        'staff_ids'        => 'array',
        'service_ids'      => 'array',
    ];
}
