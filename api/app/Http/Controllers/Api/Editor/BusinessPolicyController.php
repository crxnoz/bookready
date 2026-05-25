<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\BusinessPolicy;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessPolicyController extends Controller
{
    private function format(?BusinessPolicy $p): array
    {
        $get = static fn(?BusinessPolicy $p, string $k, $default = null) =>
            $p && $p->getAttribute($k) !== null ? $p->{$k} : $default;

        return [
            'id'                  => $p?->id,
            'cancellation_policy' => $p?->cancellation_policy,
            'late_policy'         => $p?->late_policy,
            'no_show_policy'      => $p?->no_show_policy,
            'deposit_policy'      => $p?->deposit_policy,
            'reschedule_policy'   => $p?->reschedule_policy,
            'extra_notes'         => $p?->extra_notes,
            // Enforcement rules (migration #5)
            'late_grace_period_minutes'      => (int)  $get($p, 'late_grace_period_minutes', 0),
            'forfeit_deposit_on_late_cancel' => (bool) $get($p, 'forfeit_deposit_on_late_cancel', false),
            'max_reschedules_per_booking'    =>        $get($p, 'max_reschedules_per_booking'), // null = unlimited
            'require_policy_agreement'       => (bool) $get($p, 'require_policy_agreement', false),
        ];
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $policy = BusinessPolicy::first();
        $data   = $this->format($policy);

        tenancy()->end();

        return response()->json($data);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancellation_policy' => 'sometimes|nullable|string|max:5000',
            'late_policy'         => 'sometimes|nullable|string|max:5000',
            'no_show_policy'      => 'sometimes|nullable|string|max:5000',
            'deposit_policy'      => 'sometimes|nullable|string|max:5000',
            'reschedule_policy'   => 'sometimes|nullable|string|max:5000',
            'extra_notes'         => 'sometimes|nullable|string|max:5000',
            // Enforcement rules
            'late_grace_period_minutes'      => 'sometimes|integer|min:0|max:240',
            'forfeit_deposit_on_late_cancel' => 'sometimes|boolean',
            'max_reschedules_per_booking'    => 'sometimes|nullable|integer|min:0|max:50',
            'require_policy_agreement'       => 'sometimes|boolean',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Strip any enforcement keys for un-migrated tenants.
        $cols = \Illuminate\Support\Facades\Schema::getColumnListing('business_policies');
        foreach (array_keys($validated) as $key) {
            if (! in_array($key, $cols, true)) {
                unset($validated[$key]);
            }
        }

        $policy = BusinessPolicy::first();
        if ($policy) {
            $policy->update($validated);
        } else {
            $policy = BusinessPolicy::create($validated);
        }

        $data = $this->format($policy);

        tenancy()->end();

        return response()->json($data);
    }
}
