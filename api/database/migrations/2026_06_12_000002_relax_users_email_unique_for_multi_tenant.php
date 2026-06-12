<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * v2 Theme 1 hotfix (2026-06-12) — multi-tenant identity broke on the
 * accept-invite flow because users.email had a global UNIQUE constraint,
 * which made the design impossible by definition: the chair-renter case
 * wants the same email to exist as a User row at two separate tenants,
 * and the constraint refused it. Caught by daysgraphicnyc@gmail.com
 * trying to accept an invite from the editor sidebar inbox.
 *
 * The right model is "one User per tenant per identity," not "one User
 * per email globally." Replacing the global unique with a composite
 * unique on (tenant_id, email) keeps the in-tenant duplicate guard
 * (you still can't sign up two owners with the same email at the same
 * tenant) while unblocking the cross-tenant case (same email at
 * Studio A and Studio B = OK).
 *
 * Application-level guards in RegisterController already refuse owner
 * signup when an email is already a central user (the pre-check at
 * the top of store() routes them to /login instead). So loosening the
 * DB constraint doesn't open a new abuse path.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! self::indexExists('users', 'users_tenant_id_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique(['tenant_id', 'email'], 'users_tenant_id_email_unique');
            });
        }

        if (self::indexExists('users', 'users_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_email_unique');
            });
        }
    }

    public function down(): void
    {
        if (self::indexExists('users', 'users_tenant_id_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropUnique('users_tenant_id_email_unique');
            });
        }

        if (! self::indexExists('users', 'users_email_unique')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unique('email', 'users_email_unique');
            });
        }
    }

    /**
     * Check if an index exists on a MySQL table without needing doctrine/dbal.
     * Uses INFORMATION_SCHEMA so the read is portable across MySQL/MariaDB.
     */
    private static function indexExists(string $table, string $indexName): bool
    {
        $rows = DB::select(
            'SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = ?
               AND INDEX_NAME = ? LIMIT 1',
            [$table, $indexName]
        );
        return count($rows) > 0;
    }
};
