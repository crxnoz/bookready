<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('services')->restrictOnDelete();
            $table->foreignId('staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'])
                  ->default('pending');
            $table->dateTime('booked_at');
            $table->unsignedSmallInteger('duration')->nullable();   // override from service
            $table->decimal('price', 8, 2)->nullable();             // override from service
            $table->decimal('deposit_paid', 8, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('stripe_payment_intent_id')->nullable();
            $table->timestamps();

            $table->index(['booked_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
