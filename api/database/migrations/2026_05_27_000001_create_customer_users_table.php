<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 1 of the customer-accounts feature — central identity store for
 * end-clients who book appointments via tenant public sites.
 *
 * Lives in the CENTRAL database (bookready_central) alongside `users`,
 * NOT in tenant DBs. The cross-tenant booking view in /customer/* is
 * the entire point of having an account; per-tenant identity wouldn't
 * deliver that. Per-tenant clients rows continue to exist and now carry
 * an optional `customer_user_id` FK pointing at this table (see the
 * paired tenant migration).
 *
 * Reuses the existing `personal_access_tokens` table for Sanctum — the
 * `tokenable_type` morph column distinguishes owner tokens
 * (App\Models\User) from customer tokens (App\Models\CustomerUser).
 * No second tokens table needed.
 *
 * Owner accounts (`users`) and customer accounts (`customer_users`)
 * share the email keyspace by accident only — a single human can be
 * both an owner of one business AND a customer of another. The two
 * tables are intentionally independent: same email in both is fine,
 * different passwords are fine, separate cookies (bookready_token vs
 * bookready_customer_token) keep the sessions isolated in-browser.
 *
 * NULL columns:
 *   - password   — reserved for future Google-OAuth-only signups where
 *                  no password is ever set. NOT NULL would require us
 *                  to invent a fake password for those users.
 *   - phone      — optional at signup; many customers only have email.
 *   - email_verified_at — set after the customer clicks the verify
 *                  link (Phase 2). NULL means unverified.
 *   - last_login_at — bookkeeping for "stale account" reporting later.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('customer_users')) return;

        Schema::create('customer_users', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('password')->nullable();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->rememberToken();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_users');
    }
};
