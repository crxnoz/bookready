<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'         => (int)  $row->id,
            'name'       =>         $row->name,
            'role'       =>         $row->role,
            'bio'        =>         $row->bio,
            'email'      =>         $row->email      ?? null,
            'phone'      =>         $row->phone      ?? null,
            'photo_url'  =>         $row->avatar_url ?? null,
            'is_active'  => (bool)  $row->is_active,
            'sort_order' => (int)   $row->sort_order,
            'created_at' =>         $row->created_at,
            'updated_at' =>         $row->updated_at,
        ];
    }

    // GET /editor/staff
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $query = DB::table('staff')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        $staff = $query->get()->map(fn ($r) => $this->format($r))->values()->all();

        tenancy()->end();

        return response()->json($staff);
    }

    // POST /editor/staff
    public function store(Request $request): JsonResponse
    {
        // Phase 2: email is now required on create (column is NOT NULL).
        // Existing legacy rows that were backfilled with a placeholder are
        // updated through the PATCH path, which keeps the email rule loose
        // enough to accept a real email replacement without forcing a
        // simultaneous edit of every other field.
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'role'       => 'nullable|string|max:255',
            'bio'        => 'nullable|string|max:5000',
            'email'      => 'required|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'photo_url'  => 'nullable|string|max:1000',
            'is_active'  => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);

        // Plan gate: refuse if the tenant is at their staff seats cap.
        // Counts only ACTIVE staff so deactivating frees a seat without
        // a hard delete. PlanFeatures returns the most-restrictive
        // default (Solo's 1) when the plan is missing or unrecognized,
        // so this never accidentally lets a misconfigured tenant past
        // the gate. Frontend reads `code` + `limit` + `upgrade_to` to
        // render the "Upgrade to Studio" CTA in place of the add button.
        $seatLimit = \App\Services\PlanFeatures::staffSeatsFor($tenant);

        tenancy()->initialize($tenant);

        $activeCount = (int) DB::table('staff')->where('is_active', 1)->count();
        if ($activeCount >= $seatLimit) {
            tenancy()->end();
            $currentPlan = \App\Services\PlanFeatures::planOf($tenant);
            return response()->json([
                'message'    => 'Your plan includes ' . $seatLimit . ' staff seat' . ($seatLimit === 1 ? '' : 's') . '. Upgrade your plan to add more.',
                'code'       => 'plan_limit_reached',
                'limit'      => $seatLimit,
                'current'    => $activeCount,
                'upgrade_to' => $currentPlan === 'solo' ? 'studio' : 'salon',
            ], 422);
        }

        $nextOrder = (int) DB::table('staff')->max('sort_order') + 1;

        $id = DB::table('staff')->insertGetId([
            'name'       => $validated['name'],
            'role'       => $validated['role']       ?? null,
            'bio'        => $validated['bio']        ?? null,
            'email'      => $validated['email']      ?? null,
            'phone'      => $validated['phone']      ?? null,
            'avatar_url' => $validated['photo_url']  ?? null,
            'is_active'  => $validated['is_active']  ?? true,
            'sort_order' => $validated['sort_order'] ?? $nextOrder,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row    = DB::table('staff')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    // PATCH /editor/staff/{staff}
    public function update(Request $request, int $staff): JsonResponse
    {
        // Same shape as store(), but email can be omitted to leave the
        // current value untouched. When present it still has to be valid.
        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'role'       => 'nullable|string|max:255',
            'bio'        => 'nullable|string|max:5000',
            'email'      => 'sometimes|required|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'photo_url'  => 'nullable|string|max:1000',
            'is_active'  => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $data = ['updated_at' => now()];

        foreach (['name', 'role', 'bio', 'email', 'phone'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }

        if (array_key_exists('photo_url', $validated)) {
            $data['avatar_url'] = $validated['photo_url'];
        }

        if (array_key_exists('is_active', $validated)) {
            $data['is_active'] = $validated['is_active'];
        }

        if (array_key_exists('sort_order', $validated)) {
            $data['sort_order'] = $validated['sort_order'];
        }

        DB::table('staff')->where('id', $staff)->update($data);
        $updated = DB::table('staff')->find($staff);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    // DELETE /editor/staff/{staff}
    // Soft archive: sets is_active = false, preserves the record.
    public function destroy(Request $request, int $staff): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        DB::table('staff')->where('id', $staff)->update([
            'is_active'  => false,
            'updated_at' => now(),
        ]);

        $updated = DB::table('staff')->find($staff);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }
}
