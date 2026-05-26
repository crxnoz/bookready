<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Cashier\Cashier;

class BillingController extends Controller
{
    /**
     * Create a Stripe Checkout Session in subscription mode.
     *
     * TODO: Stripe webhooks must become the source of truth for activating subscriptions.
     * Wire these events later in a dedicated WebhookController:
     *   - checkout.session.completed
     *   - customer.subscription.created
     *   - customer.subscription.updated
     *   - customer.subscription.deleted
     */
    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'billing_cycle'  => ['required', 'string', 'in:monthly,quarterly,annual'],
            'template_slug'  => ['required', 'string', 'regex:/^[a-z0-9]+$/'],
        ]);

        $priceMap = [
            'monthly'   => env('STRIPE_PRICE_MONTHLY'),
            'quarterly' => env('STRIPE_PRICE_QUARTERLY'),
            'annual'    => env('STRIPE_PRICE_ANNUAL'),
        ];

        $priceId = $priceMap[$data['billing_cycle']] ?? null;

        if (! $priceId) {
            return response()->json([
                'message' => "Stripe price not configured for billing_cycle '{$data['billing_cycle']}'.",
            ], 500);
        }

        $user   = $request->user();
        // Phase S5++ — users.tenant_id is nullable and SET NULL on tenant
        // deletion, so a still-authed user can reach this method after their
        // tenant was wiped (e.g. via the danger-zone self-delete). Treat
        // that as "no billing context" rather than fataling on a null
        // dereference at $tenant->newSubscription(...).
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
                    'user_id'       => (string) $user->id,
                    'tenant_id'     => $tenant->id,
                    'template_slug' => $data['template_slug'],
                    'billing_cycle' => $data['billing_cycle'],
                ],
            ]);

        return response()->json(['checkout_url' => $session->url]);
    }

    /**
     * Retrieve a Stripe Checkout Session by ID.
     * Used on the success page to confirm payment status.
     *
     * TODO: Do not use this as the subscription activation trigger.
     * Webhook events are the reliable source of truth.
     */
    public function checkoutSession(Request $request, string $sessionId): JsonResponse
    {
        $stripe = Cashier::stripe();

        try {
            $session = $stripe->checkout->sessions->retrieve($sessionId);
        } catch (\Throwable $e) {
            // Don't leak whether the session exists or not — same response
            // as the ownership-mismatch path below.
            return response()->json(['message' => 'Session not found'], 404);
        }

        // Phase S1 — ownership check. The Checkout Session metadata is
        // stamped with tenant_id at creation (see checkout() above). Reject
        // when the signed-in user's tenant doesn't match — prevents any
        // authed user from peeking at another tenant's Stripe state.
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
        // Phase S5++ — null-guard, same reasoning as checkout().
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

    public function subscription(Request $request): JsonResponse
    {
        // Phase S5++ — null-guard, same reasoning as checkout(). Return a
        // neutral "not subscribed" shape rather than 400 here because the
        // frontend polls this on every page load and a 4xx would surface
        // as an error banner; for a tenant-less account it's accurate to
        // say there's nothing to subscribe to.
        $userTenantId = $request->user()->tenant_id;
        $tenant       = $userTenantId ? Tenant::find($userTenantId) : null;
        if (! $tenant) {
            return response()->json([
                'subscribed'   => false,
                'on_trial'     => false,
                'trial_ends'   => null,
                'subscription' => null,
            ]);
        }

        return response()->json([
            'subscribed'   => $tenant->subscribed('default'),
            'on_trial'     => $tenant->onTrial(),
            'trial_ends'   => $tenant->trial_ends_at,
            'subscription' => $tenant->subscription('default'),
        ]);
    }
}
