<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentSettingsController extends Controller
{
    private const ALLOWED_DEPOSIT_TYPES = ['flat', 'percent'];

    private function format(object $row): array
    {
        // Defensive reader — Connect columns won't exist on tenants that
        // haven't migrated yet. Return safe defaults instead of crashing.
        $get = static fn(string $k, $default = null) =>
            property_exists($row, $k) ? $row->{$k} : $default;

        return [
            'id'                  => (int)    $row->id,
            'payments_enabled'    => (bool)   $row->payments_enabled,
            'deposits_enabled'    => (bool)   $row->deposits_enabled,
            'deposit_type'        =>          $row->deposit_type,
            'deposit_amount'      => $row->deposit_amount !== null ? (float) $row->deposit_amount : null,
            'allow_full_payment'  => (bool)   $row->allow_full_payment,
            'currency'            =>          $row->currency ?? 'USD',
            'created_at'          =>          $row->created_at,
            'updated_at'          =>          $row->updated_at,

            // ── Stripe Connect (read-only via this endpoint; managed by
            //    the StripeConnectController routes). PATCH validation
            //    rules below do NOT include these so they can't be spoofed. ──
            'stripe_connect_account_id'             => $get('stripe_connect_account_id'),
            'stripe_connect_status'                 => $get('stripe_connect_status', 'not_connected'),
            'stripe_charges_enabled'                => (bool) $get('stripe_charges_enabled', false),
            'stripe_payouts_enabled'                => (bool) $get('stripe_payouts_enabled', false),
            'stripe_details_submitted'              => (bool) $get('stripe_details_submitted', false),
            'stripe_connect_onboarding_completed_at'=>        $get('stripe_connect_onboarding_completed_at'),
            'stripe_connect_last_checked_at'        =>        $get('stripe_connect_last_checked_at'),
        ];
    }

    private function ensureRowExists(): object
    {
        $row = DB::table('payment_settings')->first();
        if ($row) return $row;

        $id = DB::table('payment_settings')->insertGetId([
            'payments_enabled'   => false,
            'deposits_enabled'   => false,
            'deposit_type'       => null,
            'deposit_amount'     => null,
            'allow_full_payment' => false,
            'currency'           => 'USD',
            'created_at'         => now(),
            'updated_at'         => now(),
        ]);

        return DB::table('payment_settings')->where('id', $id)->first();
    }

    // GET /editor/settings/payments
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row    = $this->ensureRowExists();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }

    // PATCH /editor/settings/payments
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payments_enabled'   => 'sometimes|boolean',
            'deposits_enabled'   => 'sometimes|boolean',
            'deposit_type'       => 'sometimes|nullable|in:flat,percent',
            'deposit_amount'     => 'sometimes|nullable|numeric|min:0|max:999999.99',
            'allow_full_payment' => 'sometimes|boolean',
            'currency'           => 'sometimes|string|size:3',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureRowExists();

        $data = ['updated_at' => now()];

        foreach (['payments_enabled', 'deposits_enabled', 'allow_full_payment'] as $bool) {
            if (array_key_exists($bool, $validated)) {
                $data[$bool] = (bool) $validated[$bool];
            }
        }
        if (array_key_exists('deposit_type', $validated)) {
            $data['deposit_type'] = $validated['deposit_type'] !== null
                && in_array($validated['deposit_type'], self::ALLOWED_DEPOSIT_TYPES, true)
                ? $validated['deposit_type']
                : null;
        }
        if (array_key_exists('deposit_amount', $validated)) {
            $data['deposit_amount'] = $validated['deposit_amount'] !== null
                ? (float) $validated['deposit_amount']
                : null;
        }
        if (array_key_exists('currency', $validated)) {
            $data['currency'] = strtoupper($validated['currency']);
        }

        DB::table('payment_settings')->update($data);

        $row    = DB::table('payment_settings')->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result);
    }
}
