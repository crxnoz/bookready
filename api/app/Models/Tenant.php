<?php

namespace App\Models;

use Laravel\Cashier\Billable;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;

class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains, Billable;

    /**
     * Extra data stored in the tenants.data JSON column.
     * Cast these so they behave like normal attributes.
     */
    public static function getCustomColumns(): array
    {
        return ['id', 'plan', 'stripe_id', 'trial_ends_at', 'created_at', 'updated_at'];
    }

    protected $casts = [
        'trial_ends_at' => 'datetime',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function owner()
    {
        return $this->hasOne(User::class)->where('is_owner', true);
    }
}
