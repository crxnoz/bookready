<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Owner-facing CRUD for customer booking coupons. Follows the canonical
 * tenancy-safe pattern (StaffController): findOrFail → initialize →
 * format to plain array → end. Never return an Eloquent model after
 * tenancy()->end() (serialize-after-end bug).
 *
 * The list endpoint joins coupon_redemptions to surface "uses" and
 * "total discount given" inline — the stats are the most useful glanceable
 * metric for owners deciding whether a code is working.
 */
class CouponsController extends Controller
{
    private function format(object $row, ?array $stats = null): array
    {
        $serviceIds = [];
        if (! empty($row->applicable_service_ids)) {
            $decoded = json_decode($row->applicable_service_ids, true);
            if (is_array($decoded)) $serviceIds = array_values(array_filter(array_map('intval', $decoded)));
        }

        return [
            'id'                     => (int)    $row->id,
            'code'                   => (string) $row->code,
            'description'            => $row->description,
            'discount_type'          => (string) $row->discount_type,
            'discount_value'         => (float)  $row->discount_value,
            'is_active'              => (bool)   $row->is_active,
            'max_uses'               => $row->max_uses !== null ? (int) $row->max_uses : null,
            'uses_count'             => (int)    $row->uses_count,
            'expires_at'             => $row->expires_at,
            'minimum_amount'         => $row->minimum_amount !== null ? (float) $row->minimum_amount : null,
            'applicable_service_ids' => $serviceIds,
            'created_at'             => $row->created_at,
            'updated_at'             => $row->updated_at,
            // Optional stats payload (only on list/show, not on writes).
            'total_discount_given'   => $stats['total_discount_given'] ?? null,
        ];
    }

    private function rules(bool $creating): array
    {
        return [
            // Code: enforce a sane character set + length so we don't end
            // up with awkward whitespace or emoji codes that customers
            // can't type. Always uppercased on write.
            'code'                     => ($creating ? 'required|' : 'sometimes|') . 'string|min:3|max:64|regex:/^[A-Za-z0-9_\\-]+$/',
            'description'              => 'nullable|string|max:255',
            'discount_type'            => ($creating ? 'required|' : 'sometimes|') . 'in:percent,flat',
            'discount_value'           => ($creating ? 'required|' : 'sometimes|') . 'numeric|min:0',
            'is_active'                => 'sometimes|boolean',
            'max_uses'                 => 'nullable|integer|min:1',
            'expires_at'               => 'nullable|date',
            'minimum_amount'           => 'nullable|numeric|min:0',
            'applicable_service_ids'   => 'nullable|array',
            'applicable_service_ids.*' => 'integer|min:1',
        ];
    }

    /**
     * GET /editor/coupons — list with redemption stats joined in.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $rows = DB::table('coupons')
            ->orderByDesc('created_at')
            ->get();

        // Sum discount per coupon in one query rather than N+1.
        $stats = DB::table('coupon_redemptions')
            ->select('coupon_id', DB::raw('SUM(discount_amount) AS total'))
            ->groupBy('coupon_id')
            ->pluck('total', 'coupon_id')
            ->toArray();

        $out = $rows->map(fn ($r) => $this->format($r, [
            'total_discount_given' => isset($stats[$r->id]) ? round((float) $stats[$r->id], 2) : 0.0,
        ]))->values()->all();

        tenancy()->end();
        return response()->json($out);
    }

    /**
     * POST /editor/coupons
     */
    public function store(Request $request): JsonResponse
    {
        $v = $request->validate($this->rules(true));

        // Percent caps at 100; flat has no upper bound (we cap at order
        // size at redemption time).
        if (($v['discount_type'] ?? null) === 'percent' && (float) $v['discount_value'] > 100) {
            return response()->json(['message' => 'Percent discount can’t exceed 100.'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $code = strtoupper(trim($v['code']));

        // Duplicate-code guard — better UX than a SQL unique-constraint 500.
        if (DB::table('coupons')->where('code', $code)->exists()) {
            tenancy()->end();
            return response()->json(['message' => 'That code is already in use.'], 422);
        }

        $id = DB::table('coupons')->insertGetId([
            'code'                   => $code,
            'description'            => $v['description']    ?? null,
            'discount_type'          => $v['discount_type'],
            'discount_value'         => $v['discount_value'],
            'is_active'              => $v['is_active']      ?? true,
            'max_uses'               => $v['max_uses']       ?? null,
            'uses_count'             => 0,
            'expires_at'             => $v['expires_at']     ?? null,
            'minimum_amount'         => $v['minimum_amount'] ?? null,
            'applicable_service_ids' => isset($v['applicable_service_ids'])
                ? json_encode(array_values($v['applicable_service_ids']))
                : null,
            'created_at'             => now(),
            'updated_at'             => now(),
        ]);

        $row = DB::table('coupons')->find($id);
        $out = $this->format($row, ['total_discount_given' => 0.0]);

        tenancy()->end();
        return response()->json($out, 201);
    }

    /**
     * PATCH /editor/coupons/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $v = $request->validate($this->rules(false));

        if (($v['discount_type'] ?? null) === 'percent' && isset($v['discount_value']) && (float) $v['discount_value'] > 100) {
            return response()->json(['message' => 'Percent discount can’t exceed 100.'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $existing = DB::table('coupons')->where('id', $id)->first();
        if (! $existing) {
            tenancy()->end();
            return response()->json(['message' => 'Coupon not found.'], 404);
        }

        $patch = ['updated_at' => now()];
        if (array_key_exists('code', $v)) {
            $newCode = strtoupper(trim($v['code']));
            if ($newCode !== $existing->code
                && DB::table('coupons')->where('code', $newCode)->where('id', '!=', $id)->exists()) {
                tenancy()->end();
                return response()->json(['message' => 'That code is already in use.'], 422);
            }
            $patch['code'] = $newCode;
        }
        foreach (['description','discount_type','discount_value','is_active','max_uses','expires_at','minimum_amount'] as $k) {
            if (array_key_exists($k, $v)) $patch[$k] = $v[$k];
        }
        if (array_key_exists('applicable_service_ids', $v)) {
            $patch['applicable_service_ids'] = $v['applicable_service_ids']
                ? json_encode(array_values($v['applicable_service_ids']))
                : null;
        }

        DB::table('coupons')->where('id', $id)->update($patch);

        $row = DB::table('coupons')->find($id);
        $total = DB::table('coupon_redemptions')->where('coupon_id', $id)->sum('discount_amount');
        $out = $this->format($row, ['total_discount_given' => round((float) $total, 2)]);

        tenancy()->end();
        return response()->json($out);
    }

    /**
     * DELETE /editor/coupons/{id} — soft-protected: if any redemptions
     * exist, refuse a hard delete and 422 with a hint to disable instead.
     * Keeps the historical ledger intact for receipts / reporting.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $hasRedemptions = DB::table('coupon_redemptions')->where('coupon_id', $id)->exists();
        if ($hasRedemptions) {
            tenancy()->end();
            return response()->json([
                'message' => 'This coupon has been redeemed. Disable it instead of deleting so past records stay intact.',
            ], 422);
        }

        DB::table('coupons')->where('id', $id)->delete();
        tenancy()->end();
        return response()->json(['deleted' => true]);
    }
}
