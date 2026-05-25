<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            // ── Refunds ──────────────────────────────────────────────────
            // payment_status already has 'refunded' / 'partially_refunded'
            // baked into its semantic enum; these columns let us record the
            // amount and provider reference. Set by both the owner-initiated
            // refund endpoint and the charge.refunded webhook (idempotent).
            $table->decimal('refunded_amount', 10, 2)->nullable()->after('paid_at');
            $table->timestamp('refunded_at')->nullable()->after('refunded_amount');
            $table->string('stripe_refund_id')->nullable()->after('refunded_at');

            // ── Disputes / chargebacks ──────────────────────────────────
            // dispute_status null when no dispute. Populated by Stripe's
            // charge.dispute.created (status='open') and updated by
            // charge.dispute.closed (status='won'|'lost'|'warning_*').
            $table->string('dispute_status',  24)->nullable()->after('stripe_refund_id');
            $table->string('stripe_dispute_id')->nullable()->after('dispute_status');
            $table->string('dispute_reason',  80)->nullable()->after('stripe_dispute_id');
            $table->decimal('dispute_amount', 10, 2)->nullable()->after('dispute_reason');
            $table->timestamp('dispute_opened_at')->nullable()->after('dispute_amount');
            $table->timestamp('dispute_closed_at')->nullable()->after('dispute_opened_at');

            $table->index('dispute_status');
            $table->index('stripe_refund_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropIndex(['dispute_status']);
            $table->dropIndex(['stripe_refund_id']);
            $table->dropColumn([
                'refunded_amount',
                'refunded_at',
                'stripe_refund_id',
                'dispute_status',
                'stripe_dispute_id',
                'dispute_reason',
                'dispute_amount',
                'dispute_opened_at',
                'dispute_closed_at',
            ]);
        });
    }
};
