<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\BusinessPolicy;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessPolicyController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $policy = BusinessPolicy::first();
        $data = $policy ? $policy->toArray() : array_fill_keys([
            'cancellation_policy',
            'late_policy',
            'no_show_policy',
            'deposit_policy',
            'reschedule_policy',
            'extra_notes',
        ], null);

        tenancy()->end();

        return response()->json($data);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cancellation_policy' => 'nullable|string|max:5000',
            'late_policy'         => 'nullable|string|max:5000',
            'no_show_policy'      => 'nullable|string|max:5000',
            'deposit_policy'      => 'nullable|string|max:5000',
            'reschedule_policy'   => 'nullable|string|max:5000',
            'extra_notes'         => 'nullable|string|max:5000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $policy = BusinessPolicy::first();
        if ($policy) {
            $policy->update($validated);
        } else {
            $policy = BusinessPolicy::create($validated);
        }

        $data = $policy->toArray();

        tenancy()->end();

        return response()->json($data);
    }
}
