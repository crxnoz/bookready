<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * template_settings should hold exactly one row per tenant — its
 * template_slug names the active template. The original migration
 * put a unique index on template_slug and the editor write path
 * filtered/inserted by slug, which meant changing a tenant's slug
 * out-of-band silently spawned a second row on the next save
 * (lusheststudio hit this; row 1 = lushstudio, row 2 = thefaderoom).
 *
 * Fix: collapse to one row (newest survives), drop the unique index.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('template_settings')) {
            return;
        }

        $rows = DB::table('template_settings')
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get();

        if ($rows->count() > 1) {
            $keepId = $rows->first()->id;
            DB::table('template_settings')->where('id', '!=', $keepId)->delete();
        }

        Schema::table('template_settings', function (Blueprint $table) {
            $table->dropUnique(['template_slug']);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('template_settings')) {
            return;
        }

        Schema::table('template_settings', function (Blueprint $table) {
            $table->unique('template_slug');
        });
    }
};
