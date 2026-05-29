<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Append-mostly log of outbound notifications across channels and
 * tenants. See migration for the status lifecycle. Updates by ID
 * happen on webhook callbacks (status flips, terminal_at stamps);
 * everything else is insert-only.
 */
class NotificationSendLog extends Model
{
    protected $table = 'notification_send_log';

    protected $fillable = [
        'tenant_id', 'channel', 'template_key', 'recipient',
        'provider', 'provider_id', 'status', 'cost_cents',
        'error', 'context', 'terminal_at',
    ];

    protected $casts = [
        'context'     => 'array',
        'terminal_at' => 'datetime',
    ];
}
