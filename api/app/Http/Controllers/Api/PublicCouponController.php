<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentPaymentService;
use App\Services\CouponService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PublicCouponController extends Controller
{
    /**
     * POST /api/v1/public/sites/{slug}/coupons/preview
     *
     * Validates a code against the same rules the booking POST will use,
     * and previews the discount + final amount the customer would see.
     * No side effects (no redemption insert, no uses_count bump).
     *
     * Computes the subtotal using the SAME deposit/full calculator the
     * booking POST uses so a "Have a code?" preview never drifts from
     * the actual charge.
     */
    public function preview(Request $request, string $slug): JsonResponse
    {
        $slug = strtolower($slug);
        if (! preg_match('/^[a-z0-9-]+$/', $slug)) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $v = $request->validate([
            'code'           => 'required|string|max:64',
            'service_id'     => 'required|integer|min:1',
            'payment_choice' => 'nullable|string|in:deposit,full',
            // Add-ons MUST be threaded through so the previewed discount
            // matches what the booking POST will charge — otherwise a
            // $5 add-on changes the deposit subtotal and the previewed
            // percent-off coupon drifts from the real one.
            'addon_ids'      => 'sometimes|array|max:50',
            'addon_ids.*'    => 'integer|min:1',
        ]);

        $tenant = Tenant::find($slug);
        if (! $tenant) return response()->json(['message' => 'Site not found'], 404);

        tenancy()->initialize($tenant);

        $service = Schema::hasTable('services')
            ? DB::table('services')->where('id', $v['service_id'])->first()
            : null;
        if (! $service) {
            tenancy()->end();
            return response()->json([
                'valid'  => false,
                'reason' => 'Service not found.',
            ]);
        }

        $payment = Schema::hasTable('payment_settings')
            ? DB::table('payment_settings')->first()
            : null;

        // Compute the same subtotal the booking POST will charge so the
        // preview never lies: percent on $25 deposit ≠ percent on $100 full,
        // AND a service with $30 in add-ons has a different deposit than
        // the bare service. We mirror the booking POST's "service price +
        // applicable add-ons" sum. After-hours surcharge is intentionally
        // NOT mirrored here (would require resolving the slot/date) — its
        // omission only makes the previewed discount slightly LOW vs the
        // real one, so the customer never gets less than promised. The
        // frontend invalidates the applied coupon whenever add-on choice
        // changes, so the values can't drift between preview and submit.
        $servicePrice = (float) ($service->price ?? 0);

        // Whitelist add-ons against the service's links (identical security
        // posture to PublicBookingController::resolveAddons): a malicious
        // client passing an unrelated addon id can't inflate the subtotal
        // (and thus the discount) for this code.
        if (! empty($v['addon_ids']) && Schema::hasTable('service_addons') && Schema::hasTable('service_addon_links')) {
            $cents = (int) DB::table('service_addons')
                ->join('service_addon_links', 'service_addons.id', '=', 'service_addon_links.addon_id')
                ->where('service_addon_links.service_id', $v['service_id'])
                ->whereIn('service_addons.id', $v['addon_ids'])
                ->where('service_addons.is_active', true)
                ->sum('service_addons.extra_price_cents');
            $servicePrice += $cents / 100;
        }

        $paymentArr   = $payment ? (array) $payment : [];
        $choice       = $v['payment_choice'] ?? 'deposit';

        $subtotal = $choice === 'full'
            ? AppointmentPaymentService::calculateFullPayment($paymentArr, $servicePrice)
            : AppointmentPaymentService::calculateDeposit($paymentArr,     $servicePrice);

        // Fall back to the service price when payments aren't configured —
        // customer still sees the discount magnitude they'd get.
        if ($subtotal === null || $subtotal <= 0) $subtotal = $servicePrice;

        $result = CouponService::validate($v['code'], (float) $subtotal, (int) $v['service_id']);

        tenancy()->end();

        // Whitelist the public response so we don't leak coupon
        // configuration (discount_type, discount_value, coupon_id) to
        // anonymous callers — enumeration on the throttled endpoint
        // would otherwise expose every active percent / flat code. The
        // UI only needs to render "$X off" given the chosen service.
        return response()->json([
            'valid'           => (bool)  $result['valid'],
            'reason'          =>          $result['reason'],
            'code'            =>          $result['code'],
            'discount_amount' => (float) ($result['discount_amount'] ?? 0),
            'final_amount'    => (float) ($result['final_amount']    ?? $subtotal),
        ]);
    }
}
