<?php

namespace Tests\Stubs;

use App\Models\CustomerUser;

/**
 * Test stub for App\Models\CustomerUser, same rationale as StubUser:
 * skip Eloquent's datetime + password casts so the test doesn't need
 * a database driver loaded.
 *
 * CRITICAL: extends CustomerUser so the `$user instanceof CustomerUser`
 * check in EnsureCustomerEmailVerified still passes — the whole point
 * of that middleware is to reject anything that isn't a CustomerUser,
 * and we want the test to exercise the real type guard.
 */
class StubCustomerUser extends CustomerUser
{
    protected $casts = [];
}
