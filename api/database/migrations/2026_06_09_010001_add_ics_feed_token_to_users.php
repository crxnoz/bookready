<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * T1.1 — owner ICS calendar feed token (central `users` table).
 *
 * Each owner gets a single opaque token; the public feed URL embeds it.
 * Rotating the token = "I lost my calendar subscription link / want to
 * revoke it." Done in the editor UI via the regenerate endpoint.
 *
 * Stored on central `users` (not per-tenant) because owners are central
 * and the lookup at the public-feed endpoint resolves tenant FROM the
 * token-owning user, not the other way around.
 *
 * Nullable + unique:
 *   - nullable: minted lazily on first read of the feed URL — pre-existing
 *     owners don't need a backfill, they just see "Calendar feed" first
 *     and the token appears on first click.
 *   - unique: the public feed handler does `where('ics_feed_token', $tok)`;
 *     the unique index makes this an O(log n) lookup AND prevents the
 *     (astronomically unlikely) collision from a re-roll.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('users')) return;
        if (Schema::hasColumn('users', 'ics_feed_token')) return;

        Schema::table('users', function (Blueprint $table) {
            $table->string('ics_feed_token', 64)->nullable()->unique();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('users')) return;
        if (! Schema::hasColumn('users', 'ics_feed_token')) return;

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['ics_feed_token']);
            $table->dropColumn('ics_feed_token');
        });
    }
};
