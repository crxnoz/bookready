<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->string('stripe_connect_account_id')->nullable()->after('payments_enabled');
            // 'not_connected' | 'onboarding_started' | 'pending' | 'active' | 'restricted'
            $table->string('stripe_connect_status', 24)->default('not_connected')->after('stripe_connect_account_id');
            $table->boolean('stripe_charges_enabled')->default(false)->after('stripe_connect_status');
            $table->boolean('stripe_payouts_enabled')->default(false)->after('stripe_charges_enabled');
            $table->boolean('stripe_details_submitted')->default(false)->after('stripe_payouts_enabled');
            $table->timestamp('stripe_connect_onboarding_completed_at')->nullable()->after('stripe_details_submitted');
            $table->timestamp('stripe_connect_last_checked_at')->nullable()->after('stripe_connect_onboarding_completed_at');

            $table->index('stripe_connect_account_id');
            $table->index('stripe_connect_status');
        });
    }

    public function down(): void
    {
        Schema::table('payment_settings', function (Blueprint $table) {
            $table->dropIndex(['stripe_connect_account_id']);
            $table->dropIndex(['stripe_connect_status']);
            $table->dropColumn([
                'stripe_connect_account_id',
                'stripe_connect_status',
                'stripe_charges_enabled',
                'stripe_payouts_enabled',
                'stripe_details_submitted',
                'stripe_connect_onboarding_completed_at',
                'stripe_connect_last_checked_at',
            ]);
        });
    }
};
