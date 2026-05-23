<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('before_after_items', function (Blueprint $table) {
            $table->id();
            $table->string('title', 255)->nullable();
            $table->text('caption')->nullable();
            $table->string('before_image_url', 2000);
            $table->string('after_image_url', 2000);
            $table->string('before_alt_text', 255)->nullable();
            $table->string('after_alt_text', 255)->nullable();
            $table->string('category', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
            $table->index('sort_order');
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('before_after_items');
    }
};
