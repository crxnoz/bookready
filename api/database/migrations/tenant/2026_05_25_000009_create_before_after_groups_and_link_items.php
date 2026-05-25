<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Before & After groups — mirrors the gallery shape. The existing
 * before_after_items.title column stays for backwards-compat but the
 * editor + public template stop displaying it (per request).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('before_after_groups', function (Blueprint $table) {
            $table->id();
            $table->string('heading', 80);
            $table->unsignedInteger('sort_order')->default(0)->index();
            $table->timestamps();
        });

        Schema::table('before_after_items', function (Blueprint $table) {
            $table->unsignedBigInteger('group_id')->nullable()->after('id');
            $table->index('group_id');
        });
    }

    public function down(): void
    {
        Schema::table('before_after_items', function (Blueprint $table) {
            $table->dropIndex(['group_id']);
            $table->dropColumn('group_id');
        });
        Schema::dropIfExists('before_after_groups');
    }
};
