<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Central time-series table for the System Health sparklines.
 *
 * admin:health-tick writes one row per trendable probe every 15 minutes
 * (so 96 rows/probe/day × 8 trendable probes ≈ 770 rows/day ≈ ~40KB).
 * Pruned to the last 90 days so it stays a couple MB max forever.
 *
 * The composite (probe_key, snapshot_at) index makes the sparkline query
 * one indexed range scan per probe — fast even after years of data.
 *
 * Distinct from platform_dashboard_snapshots (Phase 2 tenant booking
 * aggregates) — different domain, different shape, intentionally
 * separate.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('system_health_snapshots', function (Blueprint $table) {
            $table->id();
            $table->timestamp('snapshot_at')->useCurrent();
            $table->string('probe_key', 64);
            $table->string('status', 16);
            // Probe-specific trended value (error count / disk %% / queue
            // depth / ms / etc). Nullable because untrendable probes
            // (mailer, last_deploy) aren't written here at all.
            $table->double('numeric_value')->nullable();

            $table->index(['probe_key', 'snapshot_at'], 'idx_probe_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_health_snapshots');
    }
};
