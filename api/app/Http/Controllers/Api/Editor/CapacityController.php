<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Availability 2.0 · Phase 3 (capacity) · §8 capacity management surface.
 *
 *   GET   /editor/capacity   — tenant default + per-staff daily caps
 *   PATCH /editor/capacity   — update either layer
 *
 * Three capacity layers exist (see App\Services\CapacityResolver):
 *   1. Per-staff  — staff.default_daily_capacity        (this controller)
 *   2. Per-date   — calendar_overrides.max_appointments (Smart Calendar modal)
 *   3. Global     — booking_settings.max_appointments_per_day (this controller)
 *
 * The per-date layer is edited from the calendar; this endpoint owns the
 * other two so the Capacity tab is a single round-trip. Follows the
 * canonical "flatten before tenancy()->end()" pattern.
 */
class CapacityController extends Controller
{
    // GET /editor/capacity
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $settings = DB::table('booking_settings')->first();
        $default  = ($settings && isset($settings->max_appointments_per_day) && $settings->max_appointments_per_day !== null)
            ? (int) $settings->max_appointments_per_day
            : null;

        $staff = [];
        if (Schema::hasTable('staff')) {
            $hasCol = Schema::hasColumn('staff', 'default_daily_capacity');
            $rows = DB::table('staff')
                ->where('is_active', true)
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get();
            foreach ($rows as $r) {
                $staff[] = [
                    'id'                    => (int) $r->id,
                    'name'                  => (string) $r->name,
                    'default_daily_capacity'=> ($hasCol && $r->default_daily_capacity !== null)
                                                ? (int) $r->default_daily_capacity
                                                : null,
                ];
            }
        }

        tenancy()->end();

        return response()->json([
            'default_capacity' => $default,
            'staff'            => $staff,
        ]);
    }

    // PATCH /editor/capacity
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // null clears the cap (= unlimited). 0 is not a valid cap.
            'default_capacity'        => 'sometimes|nullable|integer|min:1|max:1000',
            'staff_caps'              => 'sometimes|array',
            'staff_caps.*'            => 'nullable|integer|min:1|max:1000',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Global default lives on booking_settings.
        if (array_key_exists('default_capacity', $validated)) {
            $exists = DB::table('booking_settings')->first();
            if (! $exists) {
                DB::table('booking_settings')->insert([
                    'minimum_notice_minutes'   => 120,
                    'booking_interval_minutes' => 30,
                    'max_days_ahead'           => 30,
                    'auto_confirm_bookings'    => false,
                    'created_at'               => now(),
                    'updated_at'               => now(),
                ]);
            }
            if (Schema::hasColumn('booking_settings', 'max_appointments_per_day')) {
                DB::table('booking_settings')->update([
                    'max_appointments_per_day' => $validated['default_capacity'],
                    'updated_at'               => now(),
                ]);
            }
        }

        // Per-staff caps. Keys are staff ids; value null clears.
        if (array_key_exists('staff_caps', $validated)
            && Schema::hasTable('staff')
            && Schema::hasColumn('staff', 'default_daily_capacity')) {
            foreach ($validated['staff_caps'] as $staffId => $cap) {
                DB::table('staff')->where('id', (int) $staffId)->update([
                    'default_daily_capacity' => $cap !== null ? (int) $cap : null,
                    'updated_at'             => now(),
                ]);
            }
        }

        tenancy()->end();

        // Re-read through show() for a single source of truth.
        return $this->show($request);
    }
}
