<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Gallery groups: owners want to organize gallery items under up to 3
 * named sections (e.g. "Hair", "Color", "Updos"). Each group has a
 * heading; items reference a group via nullable group_id (NULL = legacy
 * ungrouped item, rendered under a fallback "Other" group on the public
 * site).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_groups', function (Blueprint $table) {
            $table->id();
            $table->string('heading', 80);
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->timestamps();
        });

        Schema::table('gallery_items', function (Blueprint $table) {
            // FK kept lightweight (no cascading) — controller handles
            // unsetting items when a group is deleted.
            $table->unsignedBigInteger('group_id')->nullable()->after('id');
            $table->index('group_id');
        });
    }

    public function down(): void
    {
        Schema::table('gallery_items', function (Blueprint $table) {
            $table->dropIndex(['group_id']);
            $table->dropColumn('group_id');
        });
        Schema::dropIfExists('gallery_groups');
    }
};
