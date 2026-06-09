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
        // A6 — never expose the hashed code or its TTL via API. They
        // live on the user row purely for backend validation.
        'email_verification_code',
        'email_verification_code_expires_at',
        // T1.1 — the iCalendar feed URL is the capability; leaking the
        // token via any future raw-model JSON would let anyone read the
        // owner's bookings. Defense in depth on top of the explicit
        // allowlist projections every controller already uses today.
        'ics_feed_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_owner' => 'boolean',
        'is_admin' => 'boolean',
        // A6 — datetime cast so Carbon::parse + isPast() in verifyCode
        // works directly off the attribute.
        'email_verification_code_expires_at' => 'datetime',
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
