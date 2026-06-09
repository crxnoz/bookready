<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customer booking coupons (tenant DB).
 *
 *   coupons             — owner-managed codes. Atomic redemption counter
 *                         lives on this row (uses_count) and is bumped
 *                         under a SELECT … FOR UPDATE row lock at booking
 *                         time, so two concurrent redemptions of a
 *                         max_uses=1 code can never both succeed.
 *
 *   coupon_redemptions  — append-only ledger keyed by appointment. One
 *                         redemption per appointment is enforced by the
 *                         unique key on appointment_id; this also gives
 *                         us "what was applied at booking time" forever
 *                         (the coupon row may later be edited/disabled).
 *
 * Service whitelist is stored as a JSON array of service ids on the
 * coupon row (`applicable_service_ids`); empty/null = applies to any
 * service. Small (handful of services per tenant typically) and avoids
 * a third pivot table for the v1 footprint.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('coupons')) {
            Schema::create('coupons', function (Blueprint $table) {
                $table->id();
                // Stored uppercased — the public lookup uses the same
                // normalization so case never matters at redemption.
                $table->string('code', 64);
                $table->string('description', 255)->nullable();

                $table->enum('discount_type', ['percent', 'flat']);
                // Percent: 0-100. Flat: dollars (e.g. 20.00 = $20 off).
                // The booking flow caps the discount at the order amount
                // so a $20 flat coupon on a $10 deposit can't go negative.
                $table->decimal('discount_value', 10, 2);

                $table->boolean('is_active')->default(true);

                // Optional limits — all nullable; null = "no limit".
                $table->unsignedInteger('max_uses')->nullable();
                $table->unsignedInteger('uses_count')->default(0);
                $table->timestamp('expires_at')->nullable();
                $table->decimal('minimum_amount', 10, 2)->nullable();

                // JSON array of service ids the coupon applies to.
                // Null / empty array → applies to any service.
                $table->json('applicable_service_ids')->nullable();

                $table->timestamps();

                // One code per tenant. Case-insensitive match is handled
                // by always uppercasing on write + lookup; MySQL utf8mb4
                // default collation is case-insensitive anyway, but the
                // uppercase write keeps the displayed code consistent.
                $table->unique('code');
                // Quick "list active" scans.
                $table->index(['is_active', 'expires_at']);
            });
        }

        if (! Schema::hasTable('coupon_redemptions')) {
            Schema::create('coupon_redemptions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('coupon_id');
                $table->unsignedBigInteger('appointment_id');

                // Snapshot — survives edits / disablement / deletion of
                // the coupon. /editor/coupons reads from here to total
                // "discount given by this code" without relying on the
                // live discount_value.
                $table->string('code_snapshot', 64);
                $table->decimal('discount_amount', 10, 2);

                $table->timestamp('redeemed_at')->useCurrent();

                // One coupon per appointment — prevents a client racing
                // two POSTs from stacking the same code twice. The unique
                // also makes "did this appointment use a coupon?" an O(1)
                // lookup for the receipt / refund flow later.
                $table->unique('appointment_id');
                $table->index('coupon_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('coupon_redemptions');
        Schema::dropIfExists('coupons');
    }
};
