<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Platform-wide announcements shown on every tenant's dashboard.
 * Central table — not per-tenant. Edited by users.is_admin only.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('platform_announcements')) return;

        Schema::create('platform_announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255);
            $table->text('body');
            $table->string('cta_label', 100)->nullable();
            $table->string('cta_href', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index('is_active');
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_announcements');
    }
};
