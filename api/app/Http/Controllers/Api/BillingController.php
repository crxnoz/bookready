<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Cashier;

class BillingController extends Controller
{
    /**
     * Return the BookReady plan catalog to the editor / checkout pages.
     * Pulled straight from config/plans.php (single source of truth).
     * Public so the marketing site + editor can both consume the same
     * shape; nothing sensitive is exposed.
     *
     * GET /api/v1/billing/plans
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            'plans'                  => config('plans.plans', []),
            'sms_multipliers'        => config('plans.sms_multipliers', []),
            'cycles'                 => config('plans.cycles', []),
            'sms_overage_cents'      => config('plans.sms_overage_cents', 3),
            'per_sms_uplift_dollars' => (float) config('plans.per_sms_uplift_dollars', 0),
        ]);
    }

    /**
     * Create a Stripe Checkout Session in subscription mode.
     *
     * Accepts a plan + billing_cycle + sms_mult and looks up the Stripe
     * price via lookup_key (br_{plan}_{cycle}_{mult}x). Falls back to
     * the legacy single-tier env-var path when only billing_cycle is
     * provided so old /checkout flows keep working during the transition.
     */
    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan'           => ['nullable', 'string', 'in:solo,studio,salon'],
            'billing_cycle'  => ['required', 'string', 'in:monthly,annual,quarterly'],
            'sms_mult'       => ['nullable', 'integer', 'in:1,2,3'],
            'template_slug'  => ['required', 'string', 'regex:/^[a-z0-9]+$/'],
        ]);

        // Salon is currently waitlist-only on the marketing site; do not
        // accept it for paid signup until the gate is lifted.
        if (($data['plan'] ?? null) === 'salon') {
            return response()->json([
                'message' => 'Salon plan is currently waitlist-only. Email us to be onboarded.',
            ], 422);
        }

        // ── Resolve the Stripe price ──────────────────────────────
        // New path: plan + sms_mult → look up by lookup_key.
        // Legacy path: just billing_cycle → fall back to env var so the
        // older /checkout page still works during the transition.
        $priceId = null;
        $plan    = $data['plan']     ?? null;
        $cycle   = $data['billing_cycle'];
        $mult    = $data['sms_mult'] ?? 1;

        if ($plan !== null && in_array($cycle, ['monthly', 'annual'], true)) {
            $lookupKey = "br_{$plan}_{$cycle}_{$mult}x";
            try {
                $list = Cashier::stripe()->prices->all([
                    'lookup_keys' => [$lookupKey],
                    'limit'       => 1,
                    'active'      => true,
                ]);
                if (count($list->data) > 0) {
                    $priceId = $list->data[0]->id;
                }
            } catch (\Throwable $e) {
                Log::error('Billing: Stripe price lookup failed', [
                    'lookup_key' => $lookupKey,
                    'error'      => $e->getMessage(),
                ]);
            }
        }

        // Legacy fallback — single-tier env vars. Kept so the existing
        // /checkout flow doesn't break during rollout; remove once the
        // marketing site is the only entry point.
        if ($priceId === null) {
            $priceMap = [
                'monthly'   => env('STRIPE_PRICE_MONTHLY'),
                'quarterly' => env('STRIPE_PRICE_QUARTERLY'),
                'annual'    => env('STRIPE_PRICE_ANNUAL'),
            ];
            $priceId = $priceMap[$cycle] ?? null;
        }

        if (! $priceId) {
            return response()->json([
                'message' => "No Stripe price configured for plan='{$plan}' cycle='{$cycle}' mult='{$mult}'.",
            ], 500);
        }

        $user   = $request->user();
        // Phase S5++ — users.tenant_id is nullable; gracefully handle the
        // post-tenant-delete case.
        $tenant = $user->tenant_id ? Tenant::find($user->tenant_id) : null;
        if (! $tenant) {
            return response()->json([
                'message' => 'No active workspace for this account. Please contact support.',
            ], 400);
        }

        $frontendUrl = rtrim(env('FRONTEND_URL', 'http://app.daysbookings.site'), '/');
        $successUrl  = "{$frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}";
        $cancelUrl   = "{$frontendUrl}/checkout?cancelled=1";

        $session = $tenant->newSubscription('default', $priceId)
            ->checkout([
                'success_url' => $successUrl,
                'cancel_url'  => $cancelUrl,
                'metadata'    => [
                    'user_id'         => (string) $user->id,
                    'tenant_id'       => $tenant->id,
                    'template_slug'   => $data['template_slug'],
                    'billing_cycle'   => $cycle,
                    'bookready_plan'  => $plan ?? 'legacy',
                    'bookready_mult'  => (string) $mult,
                ],
            ]);

        return response()->json(['checkout_url' => $session->url]);
    }

    /**
     * Retrieve a Stripe Checkout Session by ID.
     * Used on the success page to confirm payment status.
     */
    public function checkoutSession(Request $request, string $sessionId): JsonResponse
    {
        $stripe = Cashier::stripe();

        try {
            $session = $stripe->checkout->sessions->retrieve($sessionId);
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        // Ownership check — see comment in original.
        $sessionTenantId = $session->metadata->tenant_id ?? null;
        $userTenantId    = $request->user()->tenant_id;
        if (! $sessionTenantId || $sessionTenantId !== $userTenantId) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        return response()->json([
            'id'             => $session->id,
            'status'         => $session->status,
            'payment_status' => $session->payment_status,
            'customer'       => $session->customer,
            'subscription'   => $session->subscription,
        ]);
    }

    /**
     * Return a Stripe Customer Portal URL so the tenant can manage billing.
     */
    public function portal(Request $request): JsonResponse
    {
        $userTenantId = $request->user()->tenant_id;
        $tenant       = $userTenantId ? Tenant::find($userTenantId) : null;
        if (! $tenant) {
            return response()->json([
                'message' => 'No active workspace for this account.',
            ], 400);
        }
        $portalUrl = $tenant->billingPortalUrl(config('app.url'));

        return response()->json(['url' => $portalUrl]);
    }

    /**
     * Subscription status — used by the editor to drive the billing UI.
     * Returns the active plan + cycle + sms_mult + included SMS quota,
     * pulled from Stripe metadata stamped at checkout time so it's
     * authoritative even after a plan change via the customer portal.
     */
    public function subscription(Request $request): JsonResponse
    {
        $userTenantId = $request->user()->tenant_id;
        $tenant       = $userTenantId ? Tenant::find($userTenantId) : null;
        if (! $tenant) {
            return response()->json([
                'subscribed'     => false,
                'on_trial'       => false,
                'trial_ends'     => null,
                'subscription'   => null,
                'plan'           => null,
                'sms_mult'       => null,
                'sms_included'   => 0,
                'billing_cycle'  => null,
            ]);
        }

        $subscribed = $tenant->subscribed('default');
        $sub        = $tenant->subscription('default');

        // Resolve plan + multiplier from the Stripe subscription's price
        // lookup_key — that's br_{plan}_{cycle}_{mult}x by construction
        // (see config/plans.php). Cheaper than re-fetching the price.
        $plan         = null;
        $cycle        = null;
        $mult         = 1;
        $smsIncluded  = 0;

        if ($subscribed && $sub) {
            try {
                $stripeSub = Cashier::stripe()->subscriptions->retrieve(
                    $sub->stripe_id,
                    ['expand' => ['items.data.price']],
                );
                $price = $stripeSub->items->data[0]->price ?? null;
                $lookup = $price->lookup_key ?? null;

                // Parse br_{plan}_{cycle}_{mult}x — anchor the plan keys
                // so an unrelated lookup_key with a similar prefix never
                // matches accidentally.
                if ($lookup && preg_match('/^br_(solo|studio|salon)_(monthly|annual)_(1|2|3)x$/', $lookup, $m)) {
                    $plan  = $m[1];
                    $cycle = $m[2];
                    $mult  = (int) $m[3];
                    $smsIncluded = (int) (config("plans.plans.{$plan}.sms_base", 0) * $mult);
                }
            } catch (\Throwable $e) {
                Log::warning('Billing: subscription lookup failed', [
                    'tenant_id' => $tenant->id,
                    'error'     => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'subscribed'     => $subscribed,
            'on_trial'       => $tenant->onTrial(),
            'trial_ends'     => $tenant->trial_ends_at,
            'subscription'   => $sub,
            'plan'           => $plan,
            'sms_mult'       => $mult,
            'sms_included'   => $smsIncluded,
            'billing_cycle'  => $cycle,
        ]);
    }
}
