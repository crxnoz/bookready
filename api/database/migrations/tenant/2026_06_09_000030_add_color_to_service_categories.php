<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add a color tag to service categories.
 *
 * Mirrors the customer_tags.color shape (string(7), nullable, owner-set
 * hex code). Used purely for visual organization in the editor so owners
 * can scan their service list and recognize categories at a glance.
 *
 * No backfill: existing categories stay color-less until the owner picks
 * one in the editor.
 */
return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasTable('service_categories')) return;
        if (Schema::hasColumn('service_categories', 'color')) return;

        Schema::table('service_categories', function (Blueprint $table) {
            $table->string('color', 7)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('service_categories')) return;
        if (! Schema::hasColumn('service_categories', 'color')) return;

        Schema::table('service_categories', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
