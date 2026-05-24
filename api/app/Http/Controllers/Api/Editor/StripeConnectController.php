<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\StripeConnectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class StripeConnectController extends Controller
{
    /**
     * POST /editor/settings/payments/connect/start
     * Creates an Express account if one doesn't exist, then returns a
     * fresh onboarding URL the owner can be redirected to.
     */
    public function start(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        $ownerEmail = $tenant->owner?->email;

        tenancy()->initialize($tenant);

        if (! Schema::hasTable('payment_settings')) {
            tenancy()->end();
            return response()->json(['message' => 'Payment settings not initialized'], 422);
        }

        $row = DB::table('payment_settings')->first();
        $accountId = $row->stripe_connect_account_id ?? null;

        try {
            if (! $accountId) {
                $account   = StripeConnectService::createExpressAccount((string) $tenant->id, $ownerEmail);
                $accountId = $account->id;

                // Upsert account id + initial status. ensureRowExists could be
                // unnecessary here because PaymentSettingsController guarantees
                // the row, but be defensive.
                if ($row) {
                    DB::table('payment_settings')->where('id', $row->id)->update([
                        'stripe_connect_account_id' => $accountId,
                        'stripe_connect_status'     => StripeConnectService::STATUS_ONBOARDING_STARTED,
                        'updated_at'                => now(),
                    ]);
                } else {
                    DB::table('payment_settings')->insert([
                        'stripe_connect_account_id' => $accountId,
                        'stripe_connect_status'     => StripeConnectService::STATUS_ONBOARDING_STARTED,
                        'created_at'                => now(),
                        'updated_at'                => now(),
                    ]);
                }
            }

            $link = StripeConnectService::createOnboardingLink($accountId);
        } catch (\Throwable $e) {
            Log::error('Stripe Connect start failed', [
                'tenant'  => $tenant->id,
                'account' => $accountId,
                'error'   => $e->getMessage(),
            ]);
            tenancy()->end();
            return response()->json(['message' => 'Could not start Stripe Connect. Please try again.'], 502);
        }

        tenancy()->end();

        return response()->json([
            'onboarding_url'             => $link->url,
            'stripe_connect_account_id'  => $accountId,
        ]);
    }

    /**
     * GET /editor/settings/payments/connect/status
     * Pulls the connected account from Stripe and reconciles our local
     * payment_settings row.
     */
    public function status(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('payment_settings')) {
            tenancy()->end();
            return response()->json(['stripe_connect_status' => StripeConnectService::STATUS_NOT_CONNECTED]);
        }

        $row = DB::table('payment_settings')->first();
        $accountId = $row->stripe_connect_account_id ?? null;

        if (! $accountId) {
            tenancy()->end();
            return response()->json([
                'stripe_connect_status'         => StripeConnectService::STATUS_NOT_CONNECTED,
                'stripe_connect_account_id'     => null,
                'stripe_charges_enabled'        => false,
                'stripe_payouts_enabled'        => false,
                'stripe_details_submitted'      => false,
                'stripe_connect_last_checked_at' => null,
            ]);
        }

        try {
            $account = StripeConnectService::fetchAccount($accountId);
        } catch (\Throwable $e) {
            Log::error('Stripe Connect status fetch failed', [
                'tenant'  => $tenant->id,
                'account' => $accountId,
                'error'   => $e->getMessage(),
            ]);
            tenancy()->end();
            return response()->json(['message' => 'Could not reach Stripe right now.'], 502);
        }

        $charges  = (bool) ($account->charges_enabled   ?? false);
        $payouts  = (bool) ($account->payouts_enabled   ?? false);
        $details  = (bool) ($account->details_submitted ?? false);
        $status   = StripeConnectService::deriveStatus($account);

        $update = [
            'stripe_charges_enabled'         => $charges,
            'stripe_payouts_enabled'         => $payouts,
            'stripe_details_submitted'       => $details,
            'stripe_connect_status'          => $status,
            'stripe_connect_last_checked_at' => now(),
            'updated_at'                     => now(),
        ];

        // Record completion timestamp the first time we see details_submitted.
        if ($details && empty($row->stripe_connect_onboarding_completed_at)) {
            $update['stripe_connect_onboarding_completed_at'] = now();
        }

        DB::table('payment_settings')->where('id', $row->id)->update($update);

        $result = [
            'stripe_connect_account_id'             => $accountId,
            'stripe_connect_status'                 => $status,
            'stripe_charges_enabled'                => $charges,
            'stripe_payouts_enabled'                => $payouts,
            'stripe_details_submitted'              => $details,
            'stripe_connect_onboarding_completed_at'=> $update['stripe_connect_onboarding_completed_at']
                                                       ?? $row->stripe_connect_onboarding_completed_at ?? null,
            'stripe_connect_last_checked_at'        => now()->toIso8601String(),
        ];

        tenancy()->end();

        return response()->json($result);
    }

    /**
     * POST /editor/settings/payments/connect/refresh
     * Returns a fresh onboarding link for the existing connected account.
     */
    public function refresh(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('payment_settings')) {
            tenancy()->end();
            return response()->json(['message' => 'No Stripe Connect account on file'], 422);
        }

        $row = DB::table('payment_settings')->first();
        $accountId = $row->stripe_connect_account_id ?? null;

        if (! $accountId) {
            tenancy()->end();
            return response()->json(['message' => 'No Stripe Connect account on file'], 422);
        }

        try {
            $link = StripeConnectService::createOnboardingLink($accountId);
        } catch (\Throwable $e) {
            Log::error('Stripe Connect refresh failed', [
                'tenant'  => $tenant->id,
                'account' => $accountId,
                'error'   => $e->getMessage(),
            ]);
            tenancy()->end();
            return response()->json(['message' => 'Could not refresh onboarding link.'], 502);
        }

        tenancy()->end();

        return response()->json(['onboarding_url' => $link->url]);
    }
}
