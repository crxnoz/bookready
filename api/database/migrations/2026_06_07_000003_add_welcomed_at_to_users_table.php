<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds users.welcomed_at — set when the operator dismisses the
 * /editor first-run welcome tour. Powers the "show this tour once,
 * never again" gate without needing per-user feature flags.
 *
 * Backfill: every EXISTING user is stamped with NOW() so they DON'T
 * see the tour. Only fresh signups (post-deploy) hit the null state
 * that triggers the overlay. Otherwise we'd interrupt every active
 * owner with a tour they don't need.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('welcomed_at')->nullable()->after('created_at');
        });

        DB::table('users')->whereNull('welcomed_at')->update(['welcomed_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('welcomed_at');
        });
    }
};
