<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            // Soft references — no FK constraints so deleted services/clients don't break history
            $table->unsignedBigInteger('client_id')->nullable();
            $table->unsignedBigInteger('service_id')->nullable();

            // Customer snapshot
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('customer_phone', 50)->nullable();

            // Service snapshot — stored so edits to service don't change old appointments
            $table->string('service_name');
            $table->decimal('service_price', 10, 2)->nullable();
            $table->unsignedSmallInteger('service_duration_minutes')->nullable();

            // Scheduling
            $table->date('appointment_date');
            $table->time('start_time');
            $table->time('end_time');

            // Status
            $table->string('status', 20)->default('pending');
            // Values: pending | confirmed | cancelled | completed | no_show

            // Notes
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable();

            $table->timestamps();

            $table->index(['appointment_date', 'status']);
            $table->index('client_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
