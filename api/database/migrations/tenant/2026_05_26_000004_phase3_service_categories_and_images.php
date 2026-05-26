<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3 — Service categories upgrade + service images.
 *
 * service_categories already exists from the 2024 schema (id, name,
 * sort_order, timestamps) and services.category_id is already a nullable
 * FK. This migration:
 *
 *   1. Adds description / image_url / is_active to service_categories so
 *      the editor can manage them as rich resources.
 *   2. Adds image_url to services.
 *   3. Backfills services.category_id from the legacy free-text
 *      services.category column. Distinct strings become category rows;
 *      services pointing at the same string share the new id. The legacy
 *      column is left in place for one release as a safety net — a later
 *      migration can drop it once the editor stops reading it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('service_categories')) {
            Schema::table('service_categories', function (Blueprint $table) {
                if (! Schema::hasColumn('service_categories', 'description')) {
                    $table->text('description')->nullable()->after('name');
                }
                if (! Schema::hasColumn('service_categories', 'image_url')) {
                    $table->string('image_url', 1000)->nullable()->after('description');
                }
                if (! Schema::hasColumn('service_categories', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('sort_order');
                }
            });
        }

        if (Schema::hasTable('services') && ! Schema::hasColumn('services', 'image_url')) {
            Schema::table('services', function (Blueprint $table) {
                $table->string('image_url', 1000)->nullable()->after('description');
            });
        }

        // Backfill: promote distinct legacy `category` strings → rows, then
        // point each service at the matching id. Idempotent — runs harmlessly
        // when there are no rows or the legacy column was never used.
        if (
            Schema::hasTable('services') &&
            Schema::hasColumn('services', 'category') &&
            Schema::hasColumn('services', 'category_id') &&
            Schema::hasTable('service_categories')
        ) {
            $distinct = DB::table('services')
                ->whereNull('category_id')
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->pluck('category')
                ->unique()
                ->values();

            foreach ($distinct as $name) {
                $existing = DB::table('service_categories')->where('name', $name)->first();
                $catId = $existing
                    ? $existing->id
                    : DB::table('service_categories')->insertGetId([
                        'name'       => $name,
                        'sort_order' => 0,
                        'is_active'  => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                DB::table('services')
                    ->where('category', $name)
                    ->whereNull('category_id')
                    ->update([
                        'category_id' => $catId,
                        'updated_at'  => now(),
                    ]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('services') && Schema::hasColumn('services', 'image_url')) {
            Schema::table('services', function (Blueprint $table) {
                $table->dropColumn('image_url');
            });
        }
        if (Schema::hasTable('service_categories')) {
            Schema::table('service_categories', function (Blueprint $table) {
                foreach (['description', 'image_url', 'is_active'] as $col) {
                    if (Schema::hasColumn('service_categories', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
