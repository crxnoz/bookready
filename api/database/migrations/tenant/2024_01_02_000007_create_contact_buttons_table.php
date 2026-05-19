<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_buttons', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['phone', 'instagram', 'email', 'booking_link', 'whatsapp', 'tiktok', 'facebook', 'custom']);
            $table->string('label');
            $table->string('value');            // phone number, handle, URL, etc.
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_buttons');
    }
};
