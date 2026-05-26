<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\StripeConnectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Stripe\Payout;
use Stripe\Stripe;

/**
 * Phase 15 — Payouts feed.
 *
 * Proxies Stripe's payouts endpoint on the tenant's Connect account.
 * No persistence here — payouts are authoritative on Stripe's side
 * and we don't want to drift.
 *
 * Defensive when Connect isn't ready: returns an empty list + a
 * `connect_status` field so the UI can render a helpful empty state
 * pointing the owner at Settings.
 */
class PaymentsPayoutsController extends Controller
{
    private const DEFAULT_LIMIT = 25;
    private const MAX_LIMIT     = 100;

    // GET /editor/payments/payouts
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $limit = max(1, min(self::MAX_LIMIT, (int) $request->input('limit', self::DEFAULT_LIMIT)));

        $payment = (array) (DB::table('payment_settings')->first() ?: []);
        tenancy()->end();

        $acctId = $payment['stripe_connect_account_id'] ?? null;
        $ready  = StripeConnectService::isReady($payment);

        // No account or Connect not active → empty list + status hint.
        if (! $acctId) {
            return response()->json([
                'payouts'        => [],
                'connect_status' => 'not_connected',
                'count'          => 0,
            ]);
        }

        if (! $ready) {
            return response()->json([
                'payouts'        => [],
                'connect_status' => $payment['stripe_connect_status'] ?? 'pending',
                'count'          => 0,
            ]);
        }

        try {
            Stripe::setApiKey(config('cashier.secret') ?: env('STRIPE_SECRET'));
            $list = Payout::all(
                ['limit' => $limit],
                ['stripe_account' => $acctId],
            );

            $payouts = collect($list->data)->map(fn ($p) => $this->format($p))->all();

            return response()->json([
                'payouts'        => $payouts,
                'connect_status' => 'active',
                'count'          => count($payouts),
            ]);
        } catch (\Throwable $e) {
            Log::warning('[BookReady] Payouts fetch failed', [
                'tenant_id' => $tenant->id,
                'account'   => $acctId,
                'error'     => $e->getMessage(),
            ]);
            return response()->json([
                'payouts'        => [],
                'connect_status' => 'error',
                'message'        => 'Could not load payouts from Stripe.',
                'count'          => 0,
            ], 200);
        }
    }

    private function format(Payout $p): array
    {
        return [
            'id'            => $p->id,
            // Stripe ships amount in the smallest currency unit (cents).
            'amount'        => $p->amount / 100,
            'currency'      => strtoupper($p->currency ?? 'usd'),
            'status'        => $p->status,            // paid / pending / in_transit / canceled / failed
            'method'        => $p->method,            // standard / instant
            // Both are unix timestamps — frontend renders friendlier.
            'created_at'    => $p->created,
            'arrival_date'  => $p->arrival_date,
            'description'   => $p->description ?? null,
            'failure_code'  => $p->failure_code ?? null,
            'failure_message' => $p->failure_message ?? null,
        ];
    }
}
