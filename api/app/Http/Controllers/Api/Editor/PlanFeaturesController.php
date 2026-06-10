<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Services\PlanFeatures;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Editor-side plan + feature snapshot.
 *
 * The editor frontend's `PlanProvider` fetches this once on mount and
 * caches the result for the session. Every gated component
 * (StaffEditor, Dashboard, etc.) consumes it via `usePlan()` and
 * branches on the values inside.
 *
 * No tenancy initialization needed — the plan + plan-features are
 * resolved entirely from the central `tenants.plan` column.
 *
 * GET /api/v1/editor/plan/features
 *   → PlanFeatures::snapshot() shape
 */
class PlanFeaturesController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id ?? null;
        if (! $tenantId) {
            return response()->json(['message' => 'No tenant on this account.'], 422);
        }

        $tenant = Tenant::find($tenantId);
        if (! $tenant) {
            return response()->json(['message' => 'Tenant not found.'], 404);
        }

        return response()->json(PlanFeatures::snapshot($tenant));
    }
}
