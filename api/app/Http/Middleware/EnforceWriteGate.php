<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Support\BillingInternal;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\HttpFoundation\Response;

/**
 * #155 — Read-only gate for tenants whose subscription has expired.
 *
 * Applied to /editor/* WRITE endpoints (POST/PATCH/PUT/DELETE). When
 * the authed owner's tenant is in trial_expired or cancelled state,
 * returns HTTP 402 Payment Required with a clear "add payment to
 * restore" message the frontend surfaces.
 *
 * Reads stay open in all states — owners need to see their data even
 * after the trial ends, so they can confirm what they're paying to
 * restore before adding a card.
 *
 * past_due is INTENTIONALLY treated as alive: Stripe is still retrying
 * the card, and the right UX is to let them log in and fix the card
 * from inside the editor. A banner nudges them; the gate does not.
 *
 * Backward compat: if subscription_state column doesn't exist on the
 * row (e.g. fresh provision before migration ran, or a tenant from
 * before the column was added), we treat it as alive and let the
 * request through. The migration backfills 'active' for everything
 * that existed pre-#155, so this fallback should be unreachable in
 * practice but guards against migration-order surprises.
 *
 * Alias: 'write_gate'. Apply alongside the existing auth chain on
 * editor write routes.
 */
class EnforceWriteGate
{
    public function handle(Request $request, Closure $next): Response
    {
        // Only gate writes. GETs are read-only by definition.
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        $user = $request->user();
        if (! $user || ! $user->tenant_id) {
            // Other middleware (auth:sanctum, tenant_owner) handle the
            // un-authed / no-tenant cases. If we somehow reach here
            // without those, let the downstream auth chain produce
            // its standard 401/403.
            return $next($request);
        }

        // Internal allowlist — founder / QA accounts bypass the gate
        // entirely so they can edit freely without a real card on
        // file. See App\Support\BillingInternal + BILLING_INTERNAL_EMAILS.
        if (BillingInternal::isInternal($user->email)) {
            return $next($request);
        }

        // Defensive: if the column hasn't been migrated yet, treat as
        // alive. This middleware ships before its migration runs in
        // deploy order on rare days, and we don't want to lock owners
        // out due to a transient state.
        if (! Schema::hasColumn('tenants', 'subscription_state')) {
            return $next($request);
        }

        $tenant = Tenant::find($user->tenant_id);
        if (! $tenant) {
            return $next($request);
        }

        if ($tenant->canWrite()) {
            return $next($request);
        }

        // 402 Payment Required — semantically correct for "your sub
        // expired, pay to restore." Frontend interceptor in lib/api.ts
        // can recognize this and route the owner to /billing.
        return response()->json([
            'message' => $this->messageFor($tenant->subscription_state),
            'errors'  => [
                'subscription' => [
                    'Your BookReady site is paused. Add a payment method to restore editing and bring your site back online.',
                ],
            ],
            'subscription_state' => $tenant->subscription_state,
            'restore_url'        => '/editor/billing',
        ], 402);
    }

    private function messageFor(string $state): string
    {
        return match ($state) {
            Tenant::STATE_TRIAL_EXPIRED => 'Your free trial has ended. Add a payment method to restore your site.',
            Tenant::STATE_CANCELLED     => 'Your subscription was cancelled. Reactivate to keep editing.',
            default                     => 'Your subscription needs attention before you can make changes.',
        };
    }
}
