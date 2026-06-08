<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 4 · After-hours config.
 *
 *   GET   /editor/after-hours
 *   PATCH /editor/after-hours
 *
 * Single tenant-wide config row. Follows the canonical "flatten before
 * tenancy()->end()" pattern.
 */
class AfterHoursController extends Controller
{
    private function format(?object $row): array
    {
        return [
            'enabled'               => (bool) ($row->enabled ?? false),
            'fee'                   => round((int) ($row->fee_cents ?? 2500) / 100, 2),
            'max_extension_minutes' => (int)  ($row->max_extension_minutes ?? 120),
            'latest_booking_time'   => ($row && $row->latest_booking_time) ? substr((string) $row->latest_booking_time, 0, 5) : null,
            'access_tier'           => (string) ($row->access_tier ?? 'everyone'),
            'daily_capacity'        => ($row && $row->daily_capacity !== null) ? (int) $row->daily_capacity : null,
        ];
    }

    private function ensureRow(): object
    {
        $row = DB::table('after_hours_config')->first();
        if ($row) return $row;
        $id = DB::table('after_hours_config')->insertGetId([
            'enabled'               => false,
            'fee_cents'             => 2500,
            'max_extension_minutes' => 120,
            'access_tier'           => 'everyone',
            'created_at'            => now(),
            'updated_at'            => now(),
        ]);
        return DB::table('after_hours_config')->where('id', $id)->first();
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('after_hours_config')) {
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
            'enabled'               => 'sometimes|boolean',
            'fee'                   => 'sometimes|numeric|min:0|max:10000',
            'max_extension_minutes' => 'sometimes|integer|min:15|max:480',
            'latest_booking_time'   => 'sometimes|nullable|date_format:H:i',
            'access_tier'           => 'sometimes|in:everyone,existing,vip',
            'daily_capacity'        => 'sometimes|nullable|integer|min:1|max:1000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $this->ensureRow();

        $patch = ['updated_at' => now()];
        if (array_key_exists('enabled', $validated))               $patch['enabled'] = (bool) $validated['enabled'];
        if (array_key_exists('fee', $validated))                   $patch['fee_cents'] = (int) round($validated['fee'] * 100);
        if (array_key_exists('max_extension_minutes', $validated)) $patch['max_extension_minutes'] = (int) $validated['max_extension_minutes'];
        if (array_key_exists('latest_booking_time', $validated))   $patch['latest_booking_time'] = $validated['latest_booking_time'];
        if (array_key_exists('access_tier', $validated))           $patch['access_tier'] = $validated['access_tier'];
        if (array_key_exists('daily_capacity', $validated))        $patch['daily_capacity'] = $validated['daily_capacity'] !== null ? (int) $validated['daily_capacity'] : null;

        DB::table('after_hours_config')->update($patch);

        $result = $this->format(DB::table('after_hours_config')->first());

        tenancy()->end();
        return response()->json($result);
    }
}
