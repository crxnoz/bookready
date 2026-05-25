<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Final payments batch: BNPL, tax, saved cards, tip + late-fee flows.
 *
 * payment_settings gets a handful of toggles + fee amounts. appointments
 * gets columns to track tips, the Stripe customer + saved payment method
 * (used for off_session late-fee charges), and the late-fee record itself.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            // Enable Klarna / Afterpay / Affirm in Checkout for eligible amounts.
            $table->boolean('allow_split_pay')->default(false)->after('allow_full_payment');
            // Stripe Tax must also be enabled in the connected account's Stripe dashboard.
            $table->boolean('collect_tax')->default(false)->after('allow_split_pay');
            // Save customer card on file for future bookings + no-show / late-cancel fees.
            $table->boolean('save_cards_for_reuse')->default(false)->after('collect_tax');
            // Manual late-fee amounts (null = button hidden in UI).
            $table->decimal('no_show_fee_amount',     10, 2)->nullable()->after('save_cards_for_reuse');
            $table->decimal('late_cancel_fee_amount', 10, 2)->nullable()->after('no_show_fee_amount');
            // Treated as informational/display; UI shows it on cancel confirmation.
            $table->unsignedSmallInteger('late_cancel_window_hours')->default(24)->after('late_cancel_fee_amount');
        });

        Schema::table('appointments', function (Blueprint $table) {
            // Tips collected via post-appointment email flow.
            $table->decimal('tip_amount', 10, 2)->nullable()->after('balance_paid_at');
            $table->timestamp('tip_paid_at')->nullable()->after('tip_amount');
            $table->string('tip_checkout_session_id')->nullable()->after('tip_paid_at');

            // Saved card infra (populated by Checkout when save_cards_for_reuse=true).
            $table->string('stripe_customer_id')->nullable()->after('tip_checkout_session_id');
            $table->string('saved_payment_method_id')->nullable()->after('stripe_customer_id');

            // Owner-triggered late fees charged off_session against the saved PM.
            $table->decimal('late_fee_amount', 10, 2)->nullable()->after('saved_payment_method_id');
            $table->string('late_fee_type', 24)->nullable()->after('late_fee_amount'); // 'no_show' | 'late_cancel'
            $table->timestamp('late_fee_paid_at')->nullable()->after('late_fee_type');
            $table->string('late_fee_payment_intent_id')->nullable()->after('late_fee_paid_at');

            $table->index('tip_checkout_session_id');
            $table->index('stripe_customer_id');
        });
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->dropColumn([
                'allow_split_pay',
                'collect_tax',
                'save_cards_for_reuse',
                'no_show_fee_amount',
                'late_cancel_fee_amount',
                'late_cancel_window_hours',
            ]);
        });
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['tip_checkout_session_id']);
            $table->dropIndex(['stripe_customer_id']);
            $table->dropColumn([
                'tip_amount',
                'tip_paid_at',
                'tip_checkout_session_id',
                'stripe_customer_id',
                'saved_payment_method_id',
                'late_fee_amount',
                'late_fee_type',
                'late_fee_paid_at',
                'late_fee_payment_intent_id',
            ]);
        });
    }
};
