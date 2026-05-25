<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Adds support for owner-recorded payments that didn't go through Stripe
     * (cash, Venmo, Zelle, etc.). `payment_method` is null for Stripe-driven
     * rows — UI distinguishes by checking stripe_payment_intent_id too.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // 'cash' | 'venmo' | 'zelle' | 'other' — only populated by mark-as-paid path.
            $table->string('payment_method', 16)->nullable()->after('paid_at');
            $table->text('payment_note')->nullable()->after('payment_method');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_note']);
        });
    }
};
