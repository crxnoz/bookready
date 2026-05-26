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

        // custom_groups is a JSON column on business_policies (migration #10).
        // Eloquent's $casts handles decoding; we still normalize the shape so
        // the frontend never has to defend against half-built groups.
        $rawGroups = $p ? $p->getAttribute('custom_groups') : null;
        $customGroups = is_array($rawGroups)
            ? array_values(array_filter(array_map(function ($g) {
                if (! is_array($g)) return null;
                $items = is_array($g['items'] ?? null) ? $g['items'] : [];
                return [
                    'heading' => (string) ($g['heading'] ?? ''),
                    'items'   => array_values(array_filter(array_map(function ($it) {
                        if (! is_array($it)) return null;
                        return [
                            'title'   => (string) ($it['title']   ?? ''),
                            'content' => (string) ($it['content'] ?? ''),
                        ];
                    }, $items))),
                ];
            }, $rawGroups)))
            : [];

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
            // Custom groups (migration #10) — owner-defined sections of
            // additional policies, shown on the public site after the 6 named ones.
            'custom_groups'                  => $customGroups,
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
            // Custom groups — free-form, JSON-shaped. Each group has a
            // heading + a list of {title, content} items. Capped at 2x3
            // to keep the policies tab readable.
            'custom_groups'                       => 'sometimes|array|max:2',
            'custom_groups.*.heading'             => 'required_with:custom_groups|string|max:120',
            'custom_groups.*.items'               => 'sometimes|array|max:3',
            'custom_groups.*.items.*.title'       => 'required_with:custom_groups.*.items|string|max:120',
            'custom_groups.*.items.*.content'     => 'sometimes|nullable|string|max:5000',
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
