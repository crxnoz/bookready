<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 14 — tenant-defined customer tags ("Allergy: latex", "Birthday
 * May", "Walk-in", etc) + the pivot linking them to clients.
 *
 * Tags are owned per-tenant (this is a tenant migration), so two
 * tenants can use the same tag name independently. Color is a flat
 * hex so the UI can render chips without a separate palette table.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('customer_tags')) {
            Schema::create('customer_tags', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('name', 60);
                // 7-char hex (#RRGGBB) — null = default chip styling.
                $table->string('color', 7)->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();

                $table->unique('name');
                $table->index('sort_order');
            });
        }

        if (! Schema::hasTable('client_tag_links')) {
            Schema::create('client_tag_links', function (Blueprint $table) {
                $table->unsignedBigInteger('client_id');
                $table->unsignedBigInteger('tag_id');
                $table->timestamp('created_at')->nullable();

                $table->primary(['client_id', 'tag_id']);
                $table->index('tag_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('client_tag_links');
        Schema::dropIfExists('customer_tags');
    }
};
