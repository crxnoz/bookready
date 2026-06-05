<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A6 — code-based email verification.
 *
 * Adds a short-lived 6-digit code (hashed) to users + customer_users so
 * the verify-email flow can offer code entry as the PRIMARY UX instead
 * of "click the link in the email". The link path stays alive as a
 * fallback (already-deployed verify() endpoints unchanged).
 *
 * Columns:
 *   email_verification_code              CHAR(60) hashed (bcrypt-style)
 *   email_verification_code_expires_at   TTL stamp (15 min by default)
 *
 * Both are nullable + cleared when verification succeeds. No state
 * lives on identities — codes are per-role because the user might
 * have an owner email verified but a customer one unverified (or
 * vice versa) at the same identity.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('email_verification_code', 100)->nullable()->after('email_verified_at');
            $table->timestamp('email_verification_code_expires_at')->nullable()->after('email_verification_code');
        });

        Schema::table('customer_users', function (Blueprint $table) {
            $table->string('email_verification_code', 100)->nullable()->after('email_verified_at');
            $table->timestamp('email_verification_code_expires_at')->nullable()->after('email_verification_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['email_verification_code', 'email_verification_code_expires_at']);
        });

        Schema::table('customer_users', function (Blueprint $table) {
            $table->dropColumn(['email_verification_code', 'email_verification_code_expires_at']);
        });
    }
};
