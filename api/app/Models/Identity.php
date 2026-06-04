<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * #159 — Unified-identity record.
 *
 * One row per email. Owns the password + canonical email_verified_at.
 * Has-one to User (owner role) and CustomerUser (customer role); either,
 * both, or neither can exist. The dashboard "Switch to Business/Customer"
 * picker reads availableRoles() to decide what's clickable.
 *
 * Identities aren't directly authenticatable — Sanctum tokens still
 * live on User or CustomerUser (their existing tokenable_type).
 * Login/switch-role flips which tokenable mints the cookie.
 */
class Identity extends Model
{
    protected $table = 'identities';

    protected $fillable = [
        'email',
        'password',
        'name',
        'phone',
        'email_verified_at',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password'          => 'hashed',
    ];

    /**
     * Owner-role link. Eager-fetch in auth flow to avoid an N+1 when
     * computing available_roles for the login response.
     */
    public function user(): HasOne
    {
        return $this->hasOne(User::class, 'identity_id');
    }

    /**
     * Customer-role link.
     */
    public function customerUser(): HasOne
    {
        return $this->hasOne(CustomerUser::class, 'identity_id');
    }

    /**
     * List the roles this identity currently holds. Order matters —
     * frontend uses the first entry as the suggested default when
     * only one role is present and no preferred-role hint is supplied.
     */
    public function availableRoles(): array
    {
        $roles = [];
        if ($this->user) $roles[] = 'owner';
        if ($this->customerUser) $roles[] = 'customer';
        return $roles;
    }

    public function hasRole(string $role): bool
    {
        return in_array($role, $this->availableRoles(), true);
    }
}
