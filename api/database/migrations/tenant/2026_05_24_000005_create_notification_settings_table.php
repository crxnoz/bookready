<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('owner_booking_email_enabled')->default(true);
            $table->boolean('client_booking_email_enabled')->default(true);
            $table->boolean('appointment_confirmed_email_enabled')->default(true);
            $table->boolean('appointment_cancelled_email_enabled')->default(true);
            $table->boolean('reminder_email_enabled')->default(false);
            $table->unsignedSmallInteger('reminder_hours_before')->default(24);
            $table->string('reply_to_email', 255)->nullable();
            $table->string('sender_name', 120)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_settings');
    }
};
