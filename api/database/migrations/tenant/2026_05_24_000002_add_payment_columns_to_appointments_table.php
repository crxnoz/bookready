<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // 'none' | 'pending_payment' | 'deposit_paid' | 'paid' | 'failed' | 'refunded'
            $table->string('payment_status', 24)->default('none')->after('status');
            $table->boolean('deposit_required')->default(false)->after('payment_status');
            $table->decimal('deposit_amount',      10, 2)->nullable()->after('deposit_required');
            $table->decimal('deposit_paid_amount', 10, 2)->nullable()->after('deposit_amount');
            $table->decimal('amount_due',          10, 2)->nullable()->after('deposit_paid_amount');
            $table->string('currency', 8)->default('USD')->after('amount_due');
            $table->string('stripe_checkout_session_id')->nullable()->after('currency');
            $table->string('stripe_payment_intent_id')->nullable()->after('stripe_checkout_session_id');
            $table->timestamp('paid_at')->nullable()->after('stripe_payment_intent_id');

            $table->index('payment_status');
            $table->index('stripe_checkout_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['payment_status']);
            $table->dropIndex(['stripe_checkout_session_id']);
            $table->dropColumn([
                'payment_status',
                'deposit_required',
                'deposit_amount',
                'deposit_paid_amount',
                'amount_due',
                'currency',
                'stripe_checkout_session_id',
                'stripe_payment_intent_id',
                'paid_at',
            ]);
        });
    }
};
