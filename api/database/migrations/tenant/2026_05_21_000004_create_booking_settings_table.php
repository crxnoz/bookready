<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('buffer_before_minutes')->default(0);
            $table->unsignedSmallInteger('buffer_after_minutes')->default(15);
            $table->unsignedSmallInteger('minimum_notice_minutes')->default(720);
            $table->unsignedSmallInteger('booking_interval_minutes')->default(30);
            $table->unsignedSmallInteger('max_days_ahead')->default(30);
            $table->unsignedSmallInteger('max_appointments_per_day')->nullable();
            $table->boolean('auto_confirm_bookings')->default(false);
            $table->boolean('slot_release_enabled')->default(false);
            $table->string('slot_release_frequency', 20)->nullable(); // weekly|biweekly|monthly|custom
            $table->unsignedTinyInteger('slot_release_day_of_week')->nullable();  // 0–6
            $table->unsignedTinyInteger('slot_release_day_of_month')->nullable(); // 1–31
            $table->time('slot_release_time')->nullable();
            $table->unsignedSmallInteger('slot_release_window_days')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_settings');
    }
};
