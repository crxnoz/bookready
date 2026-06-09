<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Support\TemplateDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
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
            // Validate against the set of templates that actually exist
            // (single source of truth) rather than any lowercase string —
            // so a bad/stale slug can't be stored in Stripe metadata.
            'template_slug'  => ['required', 'string', Rule::in(TemplateDefaults::KNOWN_SLUGS)],
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
                // Rail 2 — surface BookReady's own promo-code input on the
                // hosted Checkout page. Codes are created in the Stripe
                // Dashboard (Products → Coupons → Promotion Codes); Stripe
                // applies them server-side, so there's no validation work
                // to mirror locally.
                'allow_promotion_codes' => true,
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
     * #155 — Start a 14-day free trial.
     *
     * Differences from checkout(): we wrap the same subscription
     * creation with trialDays() so Stripe collects the card via
     * Setup mode but does NOT charge for the first 14 days. On day 14
     * Stripe auto-charges; success → invoice.payment_succeeded fires +
     * subscription status moves to active. Failure → invoice.payment_failed
     * fires + the webhook flips tenants.subscription_state to
     * trial_expired (gated by EnforceWriteGate + the parked-page check
     * in PublicSiteController).
     *
     * Body shape mirrors checkout() so the frontend can call this
     * instead during the trial-aware signup flow. The tenant is also
     * flipped to subscription_state='trialing' + trial_ends_at set
     * locally so the read-only gate has an immediate answer (we don't
     * have to wait for the webhook).
     */
    public function startTrial(Request $request): JsonResponse
    {
        $data = $request->validate([
            'plan'           => ['nullable', 'string', 'in:solo,studio,salon'],
            'billing_cycle'  => ['required', 'string', 'in:monthly,annual'],
            'sms_mult'       => ['nullable', 'integer', 'in:1,2,3'],
            'template_slug'  => ['required', 'string', 'regex:/^[a-z0-9]+$/'],
        ]);

        if (($data['plan'] ?? null) === 'salon') {
            return response()->json([
                'message' => 'Salon plan is currently waitlist-only.',
            ], 422);
        }

        $plan  = $data['plan'] ?? 'studio'; // sensible default for missing plan
        $cycle = $data['billing_cycle'];
        $mult  = $data['sms_mult'] ?? 1;

        $lookupKey = "br_{$plan}_{$cycle}_{$mult}x";
        $priceId   = null;
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
            Log::error('Billing/startTrial: Stripe price lookup failed', [
                'lookup_key' => $lookupKey,
                'error'      => $e->getMessage(),
            ]);
        }

        if (! $priceId) {
            return response()->json([
                'message' => "No Stripe price configured for plan='{$plan}' cycle='{$cycle}' mult='{$mult}'.",
            ], 500);
        }

        $user   = $request->user();
        $tenant = $user->tenant_id ? Tenant::find($user->tenant_id) : null;
        if (! $tenant) {
            return response()->json([
                'message' => 'No active workspace for this account. Please contact support.',
            ], 400);
        }

        $trialDays = (int) config('plans.trial_days', 14);

        $frontendUrl = rtrim(env('FRONTEND_URL', 'https://app.bkrdy.me'), '/');
        $successUrl  = "{$frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&trial=1";
        $cancelUrl   = "{$frontendUrl}/checkout/trial?cancelled=1";

        // Cashier's trialDays() on the subscription builder threads
        // trial_period_days through to the Stripe Checkout session.
        // Stripe collects payment method without charging now.
        try {
            $session = $tenant->newSubscription('default', $priceId)
                ->trialDays($trialDays)
                ->checkout([
                    'success_url'        => $successUrl,
                    'cancel_url'         => $cancelUrl,
                    'payment_method_collection' => 'always',
                    // Rail 2 — promo codes on the trial flow too, so a code
                    // like "FRIEND25" can apply once the trial converts.
                    'allow_promotion_codes' => true,
                    'metadata'           => [
                        'user_id'         => (string) $user->id,
                        'tenant_id'       => $tenant->id,
                        'template_slug'   => $data['template_slug'],
                        'billing_cycle'   => $cycle,
                        'bookready_plan'  => $plan,
                        'bookready_mult'  => (string) $mult,
                        'flow'            => 'trial',
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::error('Billing/startTrial: Stripe checkout creation failed', [
                'tenant_id' => $tenant->id,
                'error'     => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'Could not start your trial. Try again or contact support.',
            ], 500);
        }

        // Optimistically flip the tenant to trialing locally so the
        // read-only gate doesn't lock them out between checkout creation
        // and the webhook landing. Stripe is the source of truth long-
        // term; the webhook will overwrite if anything diverges.
        if (\Illuminate\Support\Facades\Schema::hasColumn('tenants', 'subscription_state')) {
            $tenant->subscription_state = Tenant::STATE_TRIALING;
            $tenant->trial_ends_at      = now()->addDays($trialDays);
            $tenant->save();
        }

        // A5 refinement — stamp trial_acknowledged_at so the post-login
        // redirect can let this tenant through to /editor even if they
        // bail on Stripe before completing checkout. The "Skip for now"
        // button does the same thing via the skipTrial endpoint below.
        if (\Illuminate\Support\Facades\Schema::hasColumn('tenants', 'trial_acknowledged_at')) {
            $tenant->trial_acknowledged_at = now();
            $tenant->save();
        }

        return response()->json([
            'checkout_url'   => $session->url,
            'trial_ends_at'  => now()->addDays($trialDays)->toIso8601String(),
        ]);
    }

    /**
     * A5 refinement — POST /billing/skip-trial.
     *
     * "Skip for now" button on /checkout/trial. Card capture is
     * optional but the trial-info page is mandatory; clicking this
     * stamps trial_acknowledged_at so the post-login redirect lets
     * the tenant through to /editor.
     *
     * Trial countdown still starts on subscription_state for the
     * existing EnforceWriteGate / parked-page machinery — same 14-day
     * window, same eventual force-add-card path.
     */
    public function skipTrial(Request $request): JsonResponse
    {
        $user   = $request->user();
        $tenant = $user->tenant_id ? Tenant::find($user->tenant_id) : null;
        if (! $tenant) {
            return response()->json([
                'message' => 'No active workspace for this account.',
            ], 400);
        }

        $trialDays = (int) config('plans.trial_days', 14);

        if (\Illuminate\Support\Facades\Schema::hasColumn('tenants', 'trial_acknowledged_at')) {
            $tenant->trial_acknowledged_at = now();
        }
        // Start the trial clock so the existing gating still kicks in
        // at day 14 — without subscription_state set, EnforceWriteGate
        // wouldn't ever lock the tenant out and free use would never end.
        if (\Illuminate\Support\Facades\Schema::hasColumn('tenants', 'subscription_state')) {
            // Only set if not already trialing/active — don't downgrade
            // a tenant who already converted to paid by hitting skip.
            if (! in_array($tenant->subscription_state, Tenant::STATES_ALIVE, true)) {
                $tenant->subscription_state = Tenant::STATE_TRIALING;
                $tenant->trial_ends_at      = now()->addDays($trialDays);
            }
        }
        $tenant->save();

        return response()->json([
            'message'       => 'Trial started. Add a card any time from billing settings.',
            'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
        ]);
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

        // Read the subscription straight from Stripe (the local Cashier
        // mirror isn't reliable for the Tenant billable), keyed off the
        // tenant's Stripe customer id.
        $stripeSub  = $this->findStripeSubscription($tenant);
        $subscribed = $stripeSub && in_array($stripeSub->status, ['active', 'trialing', 'past_due'], true);

        // Resolve plan + multiplier from the Stripe subscription's price
        // lookup_key — that's br_{plan}_{cycle}_{mult}x by construction
        // (see config/plans.php). Cheaper than re-fetching the price.
        $plan         = null;
        $cycle        = null;
        $mult         = 1;
        $smsIncluded  = 0;

        // Renewal / lifecycle + card-on-file. Safe defaults so the not-
        // subscribed path (and any Stripe error) returns a stable shape.
        $currentPeriodEnd   = null;
        $currentPeriodStart = null;
        $cancelAtPeriodEnd  = false;
        $paused             = false;
        $card               = null;

        if ($stripeSub) {
            $price  = $stripeSub->items->data[0]->price ?? null;
            $lookup = $price->lookup_key ?? null;

            // Parse br_{plan}_{cycle}_{mult}x — anchor the plan keys so an
            // unrelated lookup_key with a similar prefix never matches.
            if ($lookup && preg_match('/^br_(solo|studio|salon)_(monthly|annual)_(1|2|3)x$/', $lookup, $m)) {
                $plan  = $m[1];
                $cycle = $m[2];
                $mult  = (int) $m[3];
                $smsIncluded = (int) (config("plans.plans.{$plan}.sms_base", 0) * $mult);
            }

            // Renewal window + cancel/pause flags straight off Stripe.
            $currentPeriodEnd   = isset($stripeSub->current_period_end) ? date('c', $stripeSub->current_period_end) : null;
            $currentPeriodStart = isset($stripeSub->current_period_start) ? date('c', $stripeSub->current_period_start) : null;
            $cancelAtPeriodEnd  = (bool) ($stripeSub->cancel_at_period_end ?? false);
            $paused             = ($stripeSub->pause_collection ?? null) !== null;

            // Card on file — only when the default payment method is an
            // expanded object carrying a card.
            $pm = $stripeSub->default_payment_method ?? null;
            if ($pm && is_object($pm) && isset($pm->card)) {
                $card = [
                    'brand'     => $pm->card->brand,
                    'last4'     => $pm->card->last4,
                    'exp_month' => (int) $pm->card->exp_month,
                    'exp_year'  => (int) $pm->card->exp_year,
                ];
            }
        }

        // #155 — canonical state + countdown for the editor banner /
        // trial-end nudges. Read straight off the central tenants
        // row (cheap; no Stripe call needed every page load).
        $state              = $tenant->subscription_state ?? Tenant::STATE_ACTIVE;
        $trialDaysRemaining = $tenant->trialDaysRemaining();

        return response()->json([
            'subscribed'         => $subscribed,
            'on_trial'           => $tenant->onTrial(),
            'trial_ends'         => $tenant->trial_ends_at,
            'subscription'       => $stripeSub?->id,
            'plan'               => $plan,
            'sms_mult'           => $mult,
            'sms_included'       => $smsIncluded,
            'billing_cycle'      => $cycle,
            // #155 additions:
            'subscription_state' => $state,
            'is_trialing'        => $state === Tenant::STATE_TRIALING,
            'is_alive'           => in_array($state, Tenant::STATES_ALIVE, true),
            'trial_days_remaining' => $trialDaysRemaining,
            // Renewal / lifecycle + card-on-file (derived from Stripe above).
            'current_period_end'   => $currentPeriodEnd,
            'current_period_start' => $currentPeriodStart,
            'cancel_at_period_end' => $cancelAtPeriodEnd,
            'paused'               => $paused,
            'card'                 => $card,
        ]);
    }

    /**
     * Resolve the central tenant for the authed owner, or null.
     * Mirrors subscription()/portal() so the lifecycle endpoints share
     * one path. Callers 400 when this returns null.
     */
    private function resolveTenant(Request $request): ?Tenant
    {
        $userTenantId = $request->user()->tenant_id;

        return $userTenantId ? Tenant::find($userTenantId) : null;
    }

    /**
     * Find the tenant's subscription directly on Stripe, keyed off the
     * Cashier customer id stored on the tenant. The local Cashier mirror
     * isn't reliable for the Tenant billable, so the billing screen and the
     * cancel/pause lifecycle actions read + operate on Stripe as the source
     * of truth. Prefers a live subscription; falls back to the most recent.
     */
    private function findStripeSubscription(Tenant $tenant): ?\Stripe\Subscription
    {
        $stripeId = $tenant->hasStripeId() ? $tenant->stripeId() : null;
        if (! $stripeId) {
            return null;
        }

        try {
            $list = Cashier::stripe()->subscriptions->all([
                'customer' => $stripeId,
                'status'   => 'all',
                'limit'    => 20,
                'expand'   => ['data.default_payment_method', 'data.items.data.price'],
            ]);
        } catch (\Throwable $e) {
            Log::warning('Billing: Stripe subscription list failed', [
                'tenant_id' => $tenant->id,
                'error'     => $e->getMessage(),
            ]);
            return null;
        }

        $subs = $list->data ?? [];
        if (! $subs) {
            return null;
        }

        $live = ['active', 'trialing', 'past_due', 'unpaid'];
        foreach ($subs as $s) {
            if (in_array($s->status, $live, true)) {
                return $s;
            }
        }

        usort($subs, fn ($a, $b) => ($b->created ?? 0) <=> ($a->created ?? 0));

        return $subs[0] ?? null;
    }

    /**
     * Cancel the subscription at period end (grace period). Resume-able
     * during grace via resume(). Deliberately NOT cancelNow() — the owner
     * keeps access until the current period ends.
     *
     * POST /api/v1/billing/cancel
     */
    public function cancel(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        if (! $tenant) {
            return response()->json(['message' => 'No active workspace for this account.'], 400);
        }

        $stripeSub = $this->findStripeSubscription($tenant);
        if (! $stripeSub || ! in_array($stripeSub->status, ['active', 'trialing', 'past_due'], true)) {
            return response()->json(['message' => 'No active subscription.'], 422);
        }

        try {
            // Cancel at period end (grace period) — resume-able via resume().
            Cashier::stripe()->subscriptions->update($stripeSub->id, ['cancel_at_period_end' => true]);
        } catch (\Throwable $e) {
            Log::error('Billing: cancel failed', ['tenant_id' => $tenant->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not cancel your subscription. Try again or contact support.'], 500);
        }

        return $this->subscription($request);
    }

    /**
     * Un-cancel a subscription during its grace period.
     *
     * POST /api/v1/billing/resume
     */
    public function resume(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        if (! $tenant) {
            return response()->json(['message' => 'No active workspace for this account.'], 400);
        }

        $stripeSub = $this->findStripeSubscription($tenant);
        if (! $stripeSub) {
            return response()->json(['message' => 'No active subscription.'], 422);
        }

        try {
            // Un-cancel during the grace period.
            Cashier::stripe()->subscriptions->update($stripeSub->id, ['cancel_at_period_end' => false]);
        } catch (\Throwable $e) {
            Log::error('Billing: resume failed', ['tenant_id' => $tenant->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not resume your subscription. Try again or contact support.'], 500);
        }

        return $this->subscription($request);
    }

    /**
     * Pause billing — Stripe voids invoices while paused, so the owner
     * isn't charged until they unpause. Resume-able via unpause().
     *
     * POST /api/v1/billing/pause
     */
    public function pause(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        if (! $tenant) {
            return response()->json(['message' => 'No active workspace for this account.'], 400);
        }

        $stripeSub = $this->findStripeSubscription($tenant);
        if (! $stripeSub || ! in_array($stripeSub->status, ['active', 'trialing', 'past_due'], true)) {
            return response()->json(['message' => 'No active subscription.'], 422);
        }

        try {
            Cashier::stripe()->subscriptions->update($stripeSub->id, ['pause_collection' => ['behavior' => 'void']]);
        } catch (\Throwable $e) {
            Log::error('Billing: pause failed', ['tenant_id' => $tenant->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not pause your subscription. Try again or contact support.'], 500);
        }

        return $this->subscription($request);
    }

    /**
     * Unpause billing — clears Stripe's pause_collection so invoices
     * resume on the normal schedule.
     *
     * POST /api/v1/billing/unpause
     */
    public function unpause(Request $request): JsonResponse
    {
        $tenant = $this->resolveTenant($request);
        if (! $tenant) {
            return response()->json(['message' => 'No active workspace for this account.'], 400);
        }

        $stripeSub = $this->findStripeSubscription($tenant);
        if (! $stripeSub) {
            return response()->json(['message' => 'No active subscription.'], 422);
        }

        try {
            // Empty string unsets pause_collection in Stripe.
            Cashier::stripe()->subscriptions->update($stripeSub->id, ['pause_collection' => '']);
        } catch (\Throwable $e) {
            Log::error('Billing: unpause failed', ['tenant_id' => $tenant->id, 'error' => $e->getMessage()]);
            return response()->json(['message' => 'Could not resume billing. Try again or contact support.'], 500);
        }

        return $this->subscription($request);
    }
}
