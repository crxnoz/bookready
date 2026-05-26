<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 13 — manual VIP override on customers.
 *
 * The auto-status logic (New / Returning / Regular / Inactive) is
 * fully derived from appointment history in the controller, but VIP
 * is owner-set. Stored as a plain boolean here; when true it
 * supersedes whatever the auto rules would produce.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('clients')) return;
        if (Schema::hasColumn('clients', 'is_vip')) return;

        Schema::table('clients', function (Blueprint $table) {
            $table->boolean('is_vip')->default(false)->after('notes');
            $table->index('is_vip');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('clients'))            return;
        if (! Schema::hasColumn('clients', 'is_vip')) return;

        Schema::table('clients', function (Blueprint $table) {
            $table->dropIndex(['is_vip']);
            $table->dropColumn('is_vip');
        });
    }
};
