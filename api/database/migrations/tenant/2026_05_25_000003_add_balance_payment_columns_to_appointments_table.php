<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Second-charge support for collecting the remaining balance after a
     * deposit. We track the balance charge separately from the original
     * deposit (deposit_paid_amount / stripe_payment_intent_id) so future
     * refund logic can distinguish them.
     *
     * balance_checkout_session_id is set the moment the owner clicks
     * "Charge balance" (before the customer pays) — that's our "we sent
     * a link" indicator. The other three fill in once Stripe confirms.
     */
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('balance_checkout_session_id')->nullable()->after('stripe_payment_intent_id');
            $table->string('balance_payment_intent_id')->nullable()->after('balance_checkout_session_id');
            $table->decimal('balance_paid_amount', 10, 2)->nullable()->after('balance_payment_intent_id');
            $table->timestamp('balance_paid_at')->nullable()->after('balance_paid_amount');

            $table->index('balance_checkout_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['balance_checkout_session_id']);
            $table->dropColumn([
                'balance_checkout_session_id',
                'balance_payment_intent_id',
                'balance_paid_amount',
                'balance_paid_at',
            ]);
        });
    }
};
