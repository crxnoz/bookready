<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Per-staff blocked dates (vacation / personal day / sick).
 *
 * The SlotGenerator (Phase 7) will exclude these ranges when the chosen
 * service has the corresponding staff member assigned. The tenant-wide
 * blocked_dates table that closes the whole shop lives in Phase 6.
 */
class StaffBlockedDatesController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'         => (int) $row->id,
            'staff_id'   => (int) $row->staff_id,
            'start_date' => $row->start_date,
            'end_date'   => $row->end_date,
            'reason'     => $row->reason,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ];
    }

    /**
     * Wave D — force a staff caller to their own staff_id (resolved from
     * the central users row). 404 response when a staff user targets any
     * other row or has a null staff_id; null when allowed. Call BEFORE
     * tenancy init.
     */
    private function selfMatchGuard(Request $request, int $staff): ?JsonResponse
    {
        $user = $request->user();
        if (($user->role ?? null) !== 'staff') return null; // owner — no scope
        $ownStaffId = $user->staff_id !== null ? (int) $user->staff_id : null;
        if ($ownStaffId === null || $ownStaffId !== $staff) {
            return response()->json(['message' => 'Staff member not found'], 404);
        }
        return null;
    }

    public function index(Request $request, int $staff): JsonResponse
    {
        if ($guard = $this->selfMatchGuard($request, $staff)) return $guard;

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('staff_blocked_dates')) {
            tenancy()->end();
            return response()->json([], 200);
        }

        $rows = DB::table('staff_blocked_dates')
            ->where('staff_id', $staff)
            ->orderBy('start_date', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($rows);
    }

    public function store(Request $request, int $staff): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'reason'     => 'nullable|string|max:200',
        ]);

        if ($guard = $this->selfMatchGuard($request, $staff)) return $guard;

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('staff_blocked_dates')) {
            tenancy()->end();
            return response()->json(['message' => 'Staff blocked dates not supported yet.'], 409);
        }

        $exists = DB::table('staff')->where('id', $staff)->exists();
        if (! $exists) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $id = DB::table('staff_blocked_dates')->insertGetId([
            'staff_id'   => $staff,
            'start_date' => $validated['start_date'],
            'end_date'   => $validated['end_date'] ?? null,
            'reason'     => $validated['reason']   ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('staff_blocked_dates')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    public function destroy(Request $request, int $staff, int $id): JsonResponse
    {
        if ($guard = $this->selfMatchGuard($request, $staff)) return $guard;

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('staff_blocked_dates')) {
            tenancy()->end();
            return response()->json(['message' => 'Blocked date not found'], 404);
        }

        $deleted = DB::table('staff_blocked_dates')
            ->where('id', $id)
            ->where('staff_id', $staff)
            ->delete();

        tenancy()->end();

        if (! $deleted) {
            return response()->json(['message' => 'Blocked date not found'], 404);
        }

        return response()->json(['message' => 'Blocked date deleted', 'deleted' => true]);
    }
}
