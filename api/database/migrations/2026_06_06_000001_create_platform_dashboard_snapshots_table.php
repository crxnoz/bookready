<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Central table for the admin dashboard's cross-tenant snapshots (Phase 2).
 *
 * Each tenant lives in its own MySQL DB, so platform-wide booking
 * aggregates can't be computed live without N connection switches per
 * page load. The `admin:snapshot` command runs nightly, walks every
 * tenant DB once, and writes ONE row here with all the cross-tenant
 * numbers as JSON. The /admin/dashboard/trends endpoint reads the
 * latest row — cheap, single central query.
 *
 * One row per calendar day (snapshot_date unique → upsert on re-run).
 * The payload already contains a full 90-day daily booking series
 * (rebuilt from appointment timestamps each run), so a single fresh
 * snapshot is enough to chart history — we don't wait for rows to
 * accumulate. Older rows are pruned to ~90 days by the command.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('platform_dashboard_snapshots', function (Blueprint $table) {
            $table->id();
            $table->date('snapshot_date')->unique();
            $table->json('payload');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_dashboard_snapshots');
    }
};
