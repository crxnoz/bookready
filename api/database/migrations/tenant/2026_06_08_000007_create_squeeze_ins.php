<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 6 · Squeeze-Ins.
 *
 * A squeeze-in is a premium "fit me in" request shown when a day is
 * FULLY BOOKED (vs §5 availability requests, shown when a day is simply
 * not open). The owner-decision lifecycle is identical to §5, so rather
 * than clone availability_requests we add a `kind` discriminator + a
 * per-request `fee_cents`, and give squeeze-ins their own small config row.
 *
 * Config: enabled, fee, daily_limit (independent of normal capacity),
 * access_tier (everyone / existing / vip).
 */
return new class extends Migration {
    public function up(): void
    {
        // Discriminate the two request kinds on the shared table.
        if (Schema::hasTable('availability_requests')) {
            Schema::table('availability_requests', function (Blueprint $table) {
                if (! Schema::hasColumn('availability_requests', 'kind')) {
                    $table->enum('kind', ['standard', 'squeeze_in'])->default('standard')->after('id');
                    $table->index('kind');
                }
                if (! Schema::hasColumn('availability_requests', 'fee_cents')) {
                    $table->unsignedInteger('fee_cents')->default(0)->after('status');
                }
            });
        }

        if (! Schema::hasTable('squeeze_in_config')) {
            Schema::create('squeeze_in_config', function (Blueprint $table) {
                $table->id();
                $table->boolean('enabled')->default(false);
                $table->unsignedInteger('fee_cents')->default(2500); // +$25 default
                $table->unsignedInteger('daily_limit')->default(2);  // max squeeze-ins per day
                $table->enum('access_tier', ['everyone', 'existing', 'vip'])->default('existing');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('squeeze_in_config');
        if (Schema::hasTable('availability_requests')) {
            Schema::table('availability_requests', function (Blueprint $table) {
                foreach (['kind', 'fee_cents'] as $c) {
                    if (Schema::hasColumn('availability_requests', $c)) $table->dropColumn($c);
                }
            });
        }
    }
};
