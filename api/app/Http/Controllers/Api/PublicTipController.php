<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\AppointmentPaymentService;
use App\Services\StripeConnectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Public, token-gated tip flow. Client clicks the link in
 * TipRequestClientMail → lands on /site/{slug}/tip/{token} → picks an
 * amount → pays via Stripe Checkout → funds settle in the tenant's
 * connected account.
 *
 * Routes:
 *   GET  /api/v1/public/sites/{slug}/tip/{token}
 *   POST /api/v1/public/sites/{slug}/tip/{token}   { amount: float }
 */
class PublicTipController extends Controller
{
    private function resolveTenant(string $slug): ?Tenant
    {
        $slug = strtolower($slug);
        if (! preg_match('/^[a-z0-9]+$/', $slug)) return null;
        return Tenant::find($slug);
    }

    private function findAppointment(string $token): ?object
    {
        if (! Schema::hasColumn('appointments', 'manage_token')) return null;
        $token = trim($token);
        if ($token === '' || strlen($token) > 80) return null;
        return DB::table('appointments')->where('manage_token', $token)->first();
    }

    // GET /public/sites/{slug}/tip/{token}
    public function show(string $slug, string $token): JsonResponse
    {
        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Not found.'], 404);

        tenancy()->initialize($tenant);

        $row = $this->findAppointment($token);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Not found.'], 404);
        }

        $businessName = (string) (DB::table('business_profiles')->value('business_name') ?: $tenant->id);
        $tipPaidAt    = property_exists($row, 'tip_paid_at')  ? $row->tip_paid_at  : null;
        $tipAmount    = property_exists($row, 'tip_amount')   ? $row->tip_amount   : null;
        $servicePrice = $row->service_price !== null ? (float) $row->service_price : null;

        tenancy()->end();

        return response()->json([
            'business_name'    => $businessName,
            'customer_name'    => $row->customer_name,
            'service_name'     => $row->service_name,
            'service_price'    => $servicePrice,
            'appointment_date' => $row->appointment_date,
            'start_time'       => substr((string) $row->start_time, 0, 5),
            'currency'         => $row->currency ?? 'USD',
            'tip_amount'       => $tipAmount !== null ? (float) $tipAmount : null,
            'tip_paid_at'      => $tipPaidAt,
        ]);
    }

    // POST /public/sites/{slug}/tip/{token}
    public function create(Request $request, string $slug, string $token): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.50|max:9999.99',
        ]);

        $tenant = $this->resolveTenant($slug);
        if (! $tenant) return response()->json(['message' => 'Not found.'], 404);

        tenancy()->initialize($tenant);

        $row = $this->findAppointment($token);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Not found.'], 404);
        }

        if (property_exists($row, 'tip_paid_at') && $row->tip_paid_at !== null) {
            tenancy()->end();
            return response()->json([
                'message' => 'A tip was already received for this appointment. Thank you!',
            ], 409);
        }

        if (! Schema::hasTable('payment_settings')) {
            tenancy()->end();
            return response()->json(['message' => 'Tips are not configured.'], 422);
        }
        $payment = (array) (DB::table('payment_settings')->first() ?: []);
        if (! StripeConnectService::isReady($payment)) {
            tenancy()->end();
            return response()->json(['message' => 'Tips are not available right now.'], 422);
        }

        // Snapshot row fields we need outside the tenancy scope.
        $context = [
            'tenant_id'                 => (string) $tenant->id,
            'tenant_slug'               => (string) $tenant->id,
            'appointment_id'            => (int)    $row->id,
            'service_name'              => (string) $row->service_name,
            'payment_type'              => AppointmentPaymentService::TYPE_TIP,
            'amount'                    => round((float) $validated['amount'], 2),
            'currency'                  => $row->currency ?? 'USD',
            'customer_email'            => $row->customer_email,
            'stripe_connect_account_id' => $payment['stripe_connect_account_id'] ?? null,
            'stripe_connect_ready'      => true,
            // Skip BNPL / saved cards / tax for tips — keep it card-only and simple.
            'allow_split_pay'           => false,
            'collect_tax'               => false,
            'save_cards_for_reuse'      => false,
            'success_url' => sprintf(
                'https://%s.bkrdy.me/tip/%s?paid=1',
                $tenant->id, $token,
            ),
            'cancel_url'  => sprintf(
                'https://%s.bkrdy.me/tip/%s?cancelled=1',
                $tenant->id, $token,
            ),
        ];
        $tenantId = $tenant->id;
        tenancy()->end();

        try {
            $session = AppointmentPaymentService::createCheckoutSession($context);
        } catch (\Throwable $e) {
            Log::error('Tip checkout creation failed', [
                'tenant_id'      => $tenantId,
                'appointment_id' => $row->id,
                'error'          => $e->getMessage(),
            ]);
            return response()->json(['message' => 'Could not start tip checkout.'], 502);
        }

        // Stamp the session id so the webhook can correlate.
        tenancy()->initialize($tenant);
        DB::table('appointments')->where('id', $row->id)->update([
            'tip_checkout_session_id' => $session['id'],
            'updated_at'              => now(),
        ]);
        tenancy()->end();

        return response()->json([
            'checkout_url' => $session['url'],
        ]);
    }
}
