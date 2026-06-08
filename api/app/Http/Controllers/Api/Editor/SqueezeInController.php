<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 6 · Squeeze-in config.
 *
 *   GET   /editor/squeeze-ins
 *   PATCH /editor/squeeze-ins
 *
 * Single tenant-wide config row. The request queue itself is served by
 * AvailabilityRequestsController (filtered to kind=squeeze_in).
 */
class SqueezeInController extends Controller
{
    private function format(?object $row): array
    {
        return [
            'enabled'     => (bool) ($row->enabled ?? false),
            'fee'         => round((int) ($row->fee_cents ?? 2500) / 100, 2),
            'daily_limit' => (int)  ($row->daily_limit ?? 2),
            'access_tier' => (string) ($row->access_tier ?? 'existing'),
        ];
    }

    private function ensureRow(): object
    {
        $row = DB::table('squeeze_in_config')->first();
        if ($row) return $row;
        $id = DB::table('squeeze_in_config')->insertGetId([
            'enabled'     => false,
            'fee_cents'   => 2500,
            'daily_limit' => 2,
            'access_tier' => 'existing',
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        return DB::table('squeeze_in_config')->where('id', $id)->first();
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('squeeze_in_config')) {
            tenancy()->end();
            return response()->json($this->format(null));
        }

        $result = $this->format($this->ensureRow());

        tenancy()->end();
        return response()->json($result);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'enabled'     => 'sometimes|boolean',
            'fee'         => 'sometimes|numeric|min:0|max:10000',
            'daily_limit' => 'sometimes|integer|min:1|max:100',
            'access_tier' => 'sometimes|in:everyone,existing,vip',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureRow();

        $patch = ['updated_at' => now()];
        if (array_key_exists('enabled', $validated))     $patch['enabled'] = (bool) $validated['enabled'];
        if (array_key_exists('fee', $validated))         $patch['fee_cents'] = (int) round($validated['fee'] * 100);
        if (array_key_exists('daily_limit', $validated)) $patch['daily_limit'] = (int) $validated['daily_limit'];
        if (array_key_exists('access_tier', $validated)) $patch['access_tier'] = $validated['access_tier'];

        DB::table('squeeze_in_config')->update($patch);

        $result = $this->format(DB::table('squeeze_in_config')->first());

        tenancy()->end();
        return response()->json($result);
    }
}
