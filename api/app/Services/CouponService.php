<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Customer booking coupons (Connect rail).
 *
 * Two surfaces:
 *   - validate()      — pure, side-effect-free check used by both the
 *                       /public preview endpoint and the booking POST.
 *                       Always returns the SAME shape so the frontend's
 *                       preview matches what redemption will see.
 *   - redeemAtomic()  — wraps the uses_count bump + redemption insert
 *                       in a transaction with SELECT … FOR UPDATE so a
 *                       limited-use code can never be over-redeemed by
 *                       two concurrent booking POSTs.
 *
 * Both methods assume tenancy is already initialized by the caller —
 * coupons lives in the tenant DB.
 */
class CouponService
{
    /**
     * @return array{
     *   valid: bool,
     *   reason: ?string,        // human-readable reason when invalid
     *   code: ?string,          // canonical (uppercased) code
     *   coupon_id: ?int,
     *   discount_type: ?string, // 'percent' | 'flat'
     *   discount_value: ?float,
     *   discount_amount: float, // applied to this subtotal, dollars
     *   final_amount: float,    // subtotal - discount_amount, dollars
     * }
     */
    public static function validate(
        ?string $rawCode,
        float   $subtotal,
        ?int    $serviceId = null,
    ): array {
        $blank = [
            'valid'           => false,
            'reason'          => null,
            'code'            => null,
            'coupon_id'       => null,
            'discount_type'   => null,
            'discount_value'  => null,
            'discount_amount' => 0.0,
            'final_amount'    => round($subtotal, 2),
        ];

        $code = strtoupper(trim((string) $rawCode));
        if ($code === '')                            return $blank + ['reason' => 'Enter a code.'];
        if (! Schema::hasTable('coupons'))           return $blank + ['reason' => 'Coupons are not available.'];

        $coupon = DB::table('coupons')->where('code', $code)->first();
        if (! $coupon)                                return $blank + ['reason' => 'Coupon not found.', 'code' => $code];
        if (! $coupon->is_active)                     return $blank + ['reason' => 'This coupon is no longer active.', 'code' => $code];

        // Expiration. Stored as a timestamp; treat NULL as "no expiry".
        if ($coupon->expires_at && strtotime($coupon->expires_at) <= time()) {
            return $blank + ['reason' => 'This coupon has expired.', 'code' => $code];
        }

        // Max uses. NULL = unlimited. We re-check this inside the lock at
        // redemption time too; the early check here just avoids previewing
        // a discount the customer can't actually claim.
        if ($coupon->max_uses !== null && (int) $coupon->uses_count >= (int) $coupon->max_uses) {
            return $blank + ['reason' => 'This coupon has been fully claimed.', 'code' => $code];
        }

        // Service whitelist. NULL/empty array = applies to any service.
        $allowed = [];
        if ($coupon->applicable_service_ids) {
            $decoded = json_decode($coupon->applicable_service_ids, true);
            if (is_array($decoded)) $allowed = array_values(array_filter(array_map('intval', $decoded)));
        }
        if (! empty($allowed) && $serviceId !== null && ! in_array((int) $serviceId, $allowed, true)) {
            return $blank + ['reason' => 'This coupon doesn’t apply to that service.', 'code' => $code];
        }

        // Minimum amount.
        if ($coupon->minimum_amount !== null && $subtotal < (float) $coupon->minimum_amount) {
            return $blank + [
                'reason' => 'Order doesn’t meet this coupon’s minimum.',
                'code'   => $code,
            ];
        }

        // Compute discount. Cap at subtotal so a $20 flat coupon on a $10
        // deposit charges $0, never negative.
        $discount = $coupon->discount_type === 'percent'
            ? ($subtotal * ((float) $coupon->discount_value)) / 100.0
            : (float) $coupon->discount_value;
        $discount = min($discount, $subtotal);
        $discount = round($discount, 2);
        if ($discount <= 0) {
            return $blank + ['reason' => 'This coupon has no value on this booking.', 'code' => $code];
        }

        return [
            'valid'           => true,
            'reason'          => null,
            'code'            => $code,
            'coupon_id'       => (int) $coupon->id,
            'discount_type'   => $coupon->discount_type,
            'discount_value'  => (float) $coupon->discount_value,
            'discount_amount' => $discount,
            'final_amount'    => round($subtotal - $discount, 2),
        ];
    }

    /**
     * Atomically bump uses_count + record a redemption. Returns true on
     * success; returns false (and writes nothing) when a concurrent
     * redemption raced us to the last available use of a max_uses coupon.
     *
     * The caller MUST have validated the same coupon+subtotal first
     * (passing the validated discount_amount in) — this method only
     * guards the count race; it doesn't re-evaluate eligibility.
     */
    public static function redeemAtomic(
        int    $couponId,
        int    $appointmentId,
        float  $discountAmount,
        string $codeSnapshot,
    ): bool {
        return DB::transaction(function () use ($couponId, $appointmentId, $discountAmount, $codeSnapshot) {
            // SELECT … FOR UPDATE — blocks any other tx trying to bump
            // this same coupon row until we commit/rollback.
            $row = DB::table('coupons')->where('id', $couponId)->lockForUpdate()->first();
            if (! $row) return false;

            // Re-check capacity inside the lock. This is the race-proof
            // guard: between validate() and now, another booker may have
            // claimed the last spot.
            if ($row->max_uses !== null && (int) $row->uses_count >= (int) $row->max_uses) {
                return false;
            }

            DB::table('coupon_redemptions')->insert([
                'coupon_id'       => $couponId,
                'appointment_id'  => $appointmentId,
                'code_snapshot'   => $codeSnapshot,
                'discount_amount' => $discountAmount,
                'redeemed_at'     => now(),
            ]);

            DB::table('coupons')
                ->where('id', $couponId)
                ->update([
                    'uses_count' => DB::raw('uses_count + 1'),
                    'updated_at' => now(),
                ]);

            return true;
        });
    }

    /**
     * Compensate a successful redeemAtomic() when the surrounding booking
     * subsequently fails (e.g. Stripe Checkout session creation throws).
     * Without this, a one-shot `max_uses=1` code would be permanently
     * burned on a hiccup the customer never saw a charge for.
     *
     * Best-effort: a failure here is logged by the caller (we can't
     * rollback the rollback). Idempotent: if no redemption exists for
     * this appointment, it just no-ops.
     */
    public static function releaseRedemption(int $appointmentId): bool
    {
        return DB::transaction(function () use ($appointmentId) {
            $redemption = DB::table('coupon_redemptions')
                ->where('appointment_id', $appointmentId)
                ->first();
            if (! $redemption) return false;

            DB::table('coupons')
                ->where('id', $redemption->coupon_id)
                // Floor at zero — defense in depth. Should never trigger
                // since redeemAtomic always increments before any release.
                ->update([
                    'uses_count' => DB::raw('GREATEST(uses_count - 1, 0)'),
                    'updated_at' => now(),
                ]);

            DB::table('coupon_redemptions')
                ->where('appointment_id', $appointmentId)
                ->delete();

            return true;
        });
    }
}
