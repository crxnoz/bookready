<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    /**
     * Available subscription plans.
     * Keep in sync with your Stripe product/price IDs.
     */
    public function plans(): JsonResponse
    {
        return response()->json([
            [
                'id'          => 'starter',
                'name'        => 'Starter',
                'price'       => 29,
                'interval'    => 'month',
                'stripe_price' => config('services.stripe.prices.starter'),
                'features'    => ['1 template', 'Unlimited bookings', 'Custom domain'],
            ],
            [
                'id'          => 'pro',
                'name'        => 'Pro',
                'price'       => 59,
                'interval'    => 'month',
                'stripe_price' => config('services.stripe.prices.pro'),
                'features'    => ['All templates', 'Priority support', 'Analytics'],
            ],
        ]);
    }

    /**
     * Create a Stripe Checkout session for the authenticated tenant.
     */
    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'price_id'    => ['required', 'string'],
            'success_url' => ['required', 'url'],
            'cancel_url'  => ['required', 'url'],
        ]);

        $tenant = Tenant::find($request->user()->tenant_id);

        $session = $tenant->newSubscription('default', $request->price_id)
            ->checkout([
                'success_url' => $request->success_url,
                'cancel_url'  => $request->cancel_url,
            ]);

        return response()->json(['checkout_url' => $session->url]);
    }

    /**
     * Return a Stripe Customer Portal URL so the tenant can manage billing.
     */
    public function portal(Request $request): JsonResponse
    {
        $tenant     = Tenant::find($request->user()->tenant_id);
        $portalUrl  = $tenant->billingPortalUrl(config('app.url'));

        return response()->json(['url' => $portalUrl]);
    }

    public function subscription(Request $request): JsonResponse
    {
        $tenant = Tenant::find($request->user()->tenant_id);

        return response()->json([
            'subscribed'   => $tenant->subscribed('default'),
            'on_trial'     => $tenant->onTrial(),
            'trial_ends'   => $tenant->trial_ends_at,
            'subscription' => $tenant->subscription('default'),
        ]);
    }

}
