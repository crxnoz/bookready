<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

/**
 * Phase 1 of the customer-accounts feature — central identity for an
 * end-client (the person who books an appointment on a tenant site).
 *
 * Distinct from App\Models\User (which represents the business owner
 * who pays for BookReady). Both share the personal_access_tokens table
 * via Sanctum's polymorphic tokenable, but they otherwise have nothing
 * in common — different cookies, different routes, different middleware,
 * different mail templates.
 *
 * Lives on the default (central) connection. Per-tenant clients rows
 * reference this via `clients.customer_user_id` but the linkage is
 * application-enforced (no DB FK across connections).
 *
 * No `tenant_id`, `is_owner`, or `is_admin` columns — customers don't
 * belong to a single tenant (they may book at many), and they have no
 * administrative role.
 *
 * `email` mutator forces lowercase so logins are case-insensitive
 * regardless of how the user typed it at signup.
 */
class CustomerUser extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at'     => 'datetime',
        'password'          => 'hashed',
    ];

    /**
     * Lowercase the email on assignment so a customer who typed
     * `Foo@Example.com` at signup can sign in with `foo@example.com`.
     * Matches the lookup pattern in PasswordResetController + the
     * unique index, both of which already lowercase before query.
     */
    public function setEmailAttribute(string $value): void
    {
        $this->attributes['email'] = strtolower(trim($value));
    }
}
