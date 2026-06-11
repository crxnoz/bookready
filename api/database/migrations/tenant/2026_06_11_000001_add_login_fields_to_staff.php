<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Wave D (D1) — tenant-DB foundation for staff logins.
 *
 * Runs via `php artisan tenants:migrate`. INERT: only adds columns; no
 * invite is issued and no user is linked until later D-phases.
 *
 *  staff.user_id                 — soft pointer to the central users.id
 *                                  for the logged-in identity. NO FK
 *                                  (cross-DB: staff is tenant-local, users
 *                                  is central). UNIQUE so one staff row
 *                                  maps to at most one login.
 *  staff.invite_token            — hash of the single-use accept-invite
 *                                  token. Null when no invite is pending.
 *  staff.invite_token_expires_at — TTL for the pending invite token.
 *  staff.invited_at              — when the invite was last sent.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            if (! Schema::hasColumn('staff', 'user_id')) {
                $table->unsignedBigInteger('user_id')
                      ->nullable()
                      ->unique()
                      ->after('id');
            }
            if (! Schema::hasColumn('staff', 'invite_token')) {
                $table->string('invite_token', 128)
                      ->nullable()
                      ->after('user_id');
            }
            if (! Schema::hasColumn('staff', 'invite_token_expires_at')) {
                $table->timestamp('invite_token_expires_at')
                      ->nullable()
                      ->after('invite_token');
            }
            if (! Schema::hasColumn('staff', 'invited_at')) {
                $table->timestamp('invited_at')
                      ->nullable()
                      ->after('invite_token_expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            if (Schema::hasColumn('staff', 'user_id')) {
                $table->dropUnique(['user_id']);
                $table->dropColumn('user_id');
            }
            foreach (['invite_token', 'invite_token_expires_at', 'invited_at'] as $col) {
                if (Schema::hasColumn('staff', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
