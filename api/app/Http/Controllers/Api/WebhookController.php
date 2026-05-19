<?php

namespace App\Http\Controllers\Api;

use App\Models\Tenant;
use App\Models\TenantSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;
use Symfony\Component\HttpFoundation\Response;

class WebhookController extends CashierWebhookController
{
    /**
     * Stripe sends this event after a Checkout Session is completed and payment succeeds.
     * This is our primary trigger for activating a tenant's subscription record.
     *
     * Metadata set on the Checkout Session:
     *   user_id, tenant_id, template_slug, billing_cycle
     */
    public function handleCheckoutSessionCompleted(array $payload): Response
    {
        $session  = $payload['data']['object'];
        $metadata = $session['metadata'] ?? [];

        $tenantId = $metadata['tenant_id'] ?? null;

        if (! $tenantId) {
            Log::warning('Webhook checkout.session.completed: missing tenant_id in metadata', [
                'session_id' => $session['id'] ?? null,
            ]);
            return $this->successMethod();
        }

        $customerId     = $session['customer'] ?? null;
        $subscriptionId = $session['subscription'] ?? null;

        // Upsert our subscription record from the checkout metadata
        TenantSubscription::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'user_id'                    => $metadata['user_id'] ?? null,
                'stripe_customer_id'         => $customerId,
                'stripe_subscription_id'     => $subscriptionId,
                'stripe_checkout_session_id' => $session['id'],
                'billing_cycle'              => $metadata['billing_cycle'] ?? null,
                'template_slug'              => $metadata['template_slug'] ?? null,
                'status'                     => 'active',
            ]
        );

        // Keep Cashier's stripe_id (customer ID) on the Tenant for its Billable methods
        if ($customerId) {
            Tenant::where('id', $tenantId)->update(['stripe_id' => $customerId]);
        }

        Log::info("checkout.session.completed processed for tenant {$tenantId}");

        return $this->successMethod();
    }

    /**
     * Sync our tenant_subscriptions record when Stripe confirms the subscription exists.
     *
     * Note: we do NOT call parent:: here. Cashier's parent handler looks up the billable
     * by stripe_id, but checkout.session.completed and customer.subscription.created fire
     * nearly simultaneously — stripe_id may not be written to tenants yet when this runs.
     * Our tenant_subscriptions table is the source of truth; Cashier's subscriptions table
     * is not used for our subscription status checks.
     */
    public function handleCustomerSubscriptionCreated(array $payload): Response
    {
        $subscription = $payload['data']['object'];
        $this->syncSubscriptionStatus($subscription);
        return $this->successMethod();
    }

    /**
     * Sync status and renewal date when Stripe updates the subscription
     * (e.g. renewal, payment failure → past_due, plan change).
     */
    public function handleCustomerSubscriptionUpdated(array $payload): Response
    {
        $subscription = $payload['data']['object'];
        $this->syncSubscriptionStatus($subscription);
        return $this->successMethod();
    }

    /**
     * Mark the subscription as cancelled when Stripe deletes it.
     */
    public function handleCustomerSubscriptionDeleted(array $payload): Response
    {
        $subscription = $payload['data']['object'];

        TenantSubscription::where('stripe_subscription_id', $subscription['id'])
            ->update(['status' => 'cancelled']);

        Log::info("customer.subscription.deleted: {$subscription['id']}");

        return $this->successMethod();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function syncSubscriptionStatus(array $subscription): void
    {
        $periodEnd = isset($subscription['current_period_end'])
            ? Carbon::createFromTimestamp($subscription['current_period_end'])
            : null;

        TenantSubscription::where('stripe_subscription_id', $subscription['id'])
            ->update([
                'status'                 => $subscription['status'],
                'current_period_ends_at' => $periodEnd,
            ]);
    }
}
