<?php

namespace App\Http\Controllers\Api;

use App\Models\Tenant;
use App\Models\TenantSubscription;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Laravel\Cashier\Http\Controllers\WebhookController as CashierWebhookController;
use Symfony\Component\HttpFoundation\Response;

class WebhookController extends CashierWebhookController
{
    /**
     * Stripe sends this event after a Checkout Session is completed and payment succeeds.
     * This is our primary trigger for activating a tenant's subscription record.
     *
     * Metadata set on the Checkout Session:
     *   user_id, tenant_id, template_slug, billing_cycle, flow (optional)
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
        $flow           = $metadata['flow'] ?? null;

        // Upsert our subscription record from the checkout metadata.
        // #155 — for the trial flow, the row is created in 'trialing'
        // status. Stripe will fire customer.subscription.updated when
        // the trial converts (or fails) and we'll mirror that there.
        TenantSubscription::updateOrCreate(
            ['tenant_id' => $tenantId],
            [
                'user_id'                    => $metadata['user_id'] ?? null,
                'stripe_customer_id'         => $customerId,
                'stripe_subscription_id'     => $subscriptionId,
                'stripe_checkout_session_id' => $session['id'],
                'billing_cycle'              => $metadata['billing_cycle'] ?? null,
                'template_slug'              => $metadata['template_slug'] ?? null,
                'status'                     => $flow === 'trial' ? 'trialing' : 'active',
            ]
        );

        // Keep Cashier's stripe_id (customer ID) on the Tenant for its Billable methods.
        if ($customerId) {
            Tenant::where('id', $tenantId)->update(['stripe_id' => $customerId]);
        }

        // #155 — flip tenants.subscription_state. For the trial flow
        // the startTrial endpoint already set 'trialing' optimistically;
        // this is a no-op in that case. For the non-trial checkout path
        // it's the activation we needed.
        $this->setTenantState($tenantId, $flow === 'trial' ? Tenant::STATE_TRIALING : Tenant::STATE_ACTIVE);

        Log::info("checkout.session.completed processed for tenant {$tenantId}", ['flow' => $flow]);

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
     * (e.g. renewal, payment failure → past_due, plan change, trial end).
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

        // #155 — flip tenant to cancelled (public site parks, editor
        // goes read-only). Look up the tenant via TenantSubscription
        // since Stripe's subscription payload doesn't carry our tenant_id.
        $sub = TenantSubscription::where('stripe_subscription_id', $subscription['id'])->first();
        if ($sub) {
            $this->setTenantState($sub->tenant_id, Tenant::STATE_CANCELLED);
        }

        Log::info("customer.subscription.deleted: {$subscription['id']}");

        return $this->successMethod();
    }

    /**
     * #155 — invoice.payment_failed. Fires when Stripe can't charge
     * (no payment method, declined, expired card). For a trial that
     * just ended → trial_expired (we know it was trialing because the
     * subscription status will still say 'trialing' on the local row).
     * For an active subscription → past_due (Stripe is still retrying
     * and the owner can fix the card without losing access).
     */
    public function handleInvoicePaymentFailed(array $payload): Response
    {
        $invoice = $payload['data']['object'];
        $subscriptionId = $invoice['subscription'] ?? null;

        if (! $subscriptionId) {
            return $this->successMethod();
        }

        $sub = TenantSubscription::where('stripe_subscription_id', $subscriptionId)->first();
        if (! $sub) {
            Log::warning("invoice.payment_failed: no TenantSubscription for {$subscriptionId}");
            return $this->successMethod();
        }

        // If the sub was trialing locally, treat this as the trial-end
        // charge failure → trial_expired. Otherwise it's a regular
        // renewal failure → past_due.
        $newState = $sub->status === 'trialing'
            ? Tenant::STATE_TRIAL_EXPIRED
            : Tenant::STATE_PAST_DUE;

        $sub->update(['status' => $newState]);
        $this->setTenantState($sub->tenant_id, $newState);

        Log::info("invoice.payment_failed → {$newState} for tenant {$sub->tenant_id}");

        return $this->successMethod();
    }

    /**
     * #155 — invoice.payment_succeeded. Fires when Stripe successfully
     * charges (first-charge at trial end, renewal, retry recovery).
     * Flip tenant + subscription to 'active'.
     */
    public function handleInvoicePaymentSucceeded(array $payload): Response
    {
        $invoice = $payload['data']['object'];
        $subscriptionId = $invoice['subscription'] ?? null;

        if (! $subscriptionId) {
            return $this->successMethod();
        }

        $sub = TenantSubscription::where('stripe_subscription_id', $subscriptionId)->first();
        if (! $sub) {
            return $this->successMethod();
        }

        $sub->update(['status' => 'active']);
        $this->setTenantState($sub->tenant_id, Tenant::STATE_ACTIVE);

        Log::info("invoice.payment_succeeded → active for tenant {$sub->tenant_id}");

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

        // #155 — mirror Stripe's subscription status into the central
        // tenants.subscription_state so the read-only gate can answer
        // without a join. Stripe statuses: incomplete, incomplete_expired,
        // trialing, active, past_due, canceled, unpaid, paused.
        $sub = TenantSubscription::where('stripe_subscription_id', $subscription['id'])->first();
        if ($sub) {
            $state = match ($subscription['status'] ?? '') {
                'trialing'              => Tenant::STATE_TRIALING,
                'active'                => Tenant::STATE_ACTIVE,
                'past_due', 'unpaid'    => Tenant::STATE_PAST_DUE,
                'canceled', 'paused'    => Tenant::STATE_CANCELLED,
                'incomplete_expired'    => Tenant::STATE_TRIAL_EXPIRED,
                default                 => null,
            };
            if ($state !== null) {
                $this->setTenantState($sub->tenant_id, $state);
            }
        }
    }

    /**
     * Centralised writer for tenants.subscription_state. Guards against
     * the schema-missing case (migration not yet run) so a webhook
     * burst during deploy never crashes.
     */
    private function setTenantState(string $tenantId, string $state): void
    {
        if (! Schema::hasColumn('tenants', 'subscription_state')) {
            return;
        }
        Tenant::where('id', $tenantId)->update(['subscription_state' => $state]);
    }
}
