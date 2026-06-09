<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * T1.3 — customer ICS calendar feed token (central `customer_users` table).
 *
 * Mirror of the owner-side token added to `users` (T1.1). Lets a customer
 * subscribe to a single calendar URL that aggregates every appointment
 * they have across every BookReady business they've booked at — one of
 * the strongest reasons to stay signed in across visits.
 *
 * Stored on central `customer_users` (not per-tenant) — the public-feed
 * handler resolves the customer FROM the token, then walks the
 * `customer_user_tenants` pivot to find which tenant DBs to query.
 *
 * Nullable + unique:
 *   - nullable: minted lazily on first read so existing customers don't
 *     need a backfill — token appears the first time they open the
 *     calendar card on /account.
 *   - unique: `where('ics_feed_token', ...)` lookup at the public-feed
 *     endpoint hits the index AND prevents a re-roll collision.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('customer_users')) return;
        if (Schema::hasColumn('customer_users', 'ics_feed_token')) return;

        Schema::table('customer_users', function (Blueprint $table) {
            $table->string('ics_feed_token', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('customer_users')) return;
        if (! Schema::hasColumn('customer_users', 'ics_feed_token')) return;

        Schema::table('customer_users', function (Blueprint $table) {
            $table->dropUnique(['ics_feed_token']);
            $table->dropColumn('ics_feed_token');
        });
    }
};
