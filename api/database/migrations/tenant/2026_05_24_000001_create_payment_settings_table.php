<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('deposits_enabled')->default(false);
            $table->string('deposit_type', 16)->nullable();        // 'flat' | 'percent'
            $table->decimal('deposit_amount', 10, 2)->nullable();
            $table->boolean('allow_full_payment')->default(false);
            $table->string('currency', 8)->default('USD');
            $table->boolean('payments_enabled')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_settings');
    }
};
