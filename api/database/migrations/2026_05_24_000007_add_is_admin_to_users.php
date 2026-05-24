<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Central-DB migration: BookReady super-admin flag on the users table.
 *
 * Distinct from is_owner (which marks a user as the OWNER of a tenant).
 * is_admin is the platform-level capability: it lets the user open the
 * BookReady operator admin area and manage tenants.
 *
 * Flip on manually after deploy with:
 *   UPDATE users SET is_admin = 1 WHERE email = 'you@example.com';
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('is_owner');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });
    }
};
