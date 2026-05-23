<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('template_settings', function (Blueprint $table) {
            $table->id();
            $table->string('template_slug')->unique();
            $table->json('settings_json')->nullable();
            $table->timestamps();
        });

        Schema::create('website_sections', function (Blueprint $table) {
            $table->id();
            $table->string('template_slug');
            $table->string('section_key');
            $table->string('section_type');
            $table->string('title')->nullable();
            $table->string('subtitle')->nullable();
            $table->json('content_json')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->boolean('is_locked')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['template_slug', 'sort_order']);
            $table->unique(['template_slug', 'section_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('website_sections');
        Schema::dropIfExists('template_settings');
    }
};
