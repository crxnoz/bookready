<?php

namespace Tests\Stubs;

use App\Models\User;

/**
 * Test stub for App\Models\User that disables the datetime cast on
 * email_verified_at + the password hash cast. Eloquent's cast pipeline
 * resolves the date format through a live database connection
 * (HasAttributes::asDateTime calls Connection::getQueryGrammar), so a
 * real User model can't be read in a test without a database driver
 * loaded — which would force every contributor to install pdo_sqlite
 * just to run a middleware test.
 *
 * The middleware code only checks truthiness of email_verified_at and
 * the value of is_admin / is_owner / tenant_id, so stripping casts is
 * harmless for the assertions we care about.
 */
class StubUser extends User
{
    protected $casts = [
        // Intentionally minimal — drop datetime + hashed casts so the
        // cast pipeline never touches the DB connection during tests.
        'is_owner' => 'boolean',
        'is_admin' => 'boolean',
    ];
}
