<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'tenant_id',
        'is_owner',
        'is_admin',
        // #159 — FK to identities. Null for unmigrated legacy rows; the
        // create-identities migration backfills every existing user.
        'identity_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_owner' => 'boolean',
        'is_admin' => 'boolean',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    /**
     * #159 — Link to the unified Identity that owns the password.
     * Same identity can also have a customer_users row (the customer
     * sibling) via Identity::customerUser().
     */
    public function identity()
    {
        return $this->belongsTo(Identity::class);
    }
}
