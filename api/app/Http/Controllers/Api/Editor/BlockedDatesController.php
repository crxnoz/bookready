<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant-wide blocked dates (holidays, closures, vacations that take
 * the whole studio offline). Per-staff blocks live in a separate table
 * (staff_blocked_dates) from Phase 2.
 */
class BlockedDatesController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'         => (int) $row->id,
            'start_date' => $row->start_date,
            'end_date'   => $row->end_date,
            'reason'     => $row->reason,
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('blocked_dates')) {
            tenancy()->end();
            return response()->json([]);
        }

        $rows = DB::table('blocked_dates')
            ->orderBy('start_date', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date'   => 'nullable|date_format:Y-m-d|after_or_equal:start_date',
            'reason'     => 'nullable|string|max:200',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('blocked_dates')) {
            tenancy()->end();
            return response()->json(['message' => 'Blocked dates not supported yet.'], 409);
        }

        $id = DB::table('blocked_dates')->insertGetId([
            'start_date' => $validated['start_date'],
            'end_date'   => $validated['end_date'] ?? null,
            'reason'     => $validated['reason']   ?? null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row    = DB::table('blocked_dates')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('blocked_dates')) {
            tenancy()->end();
            return response()->json(['message' => 'Blocked date not found'], 404);
        }

        $deleted = DB::table('blocked_dates')->where('id', $id)->delete();

        tenancy()->end();

        if (! $deleted) {
            return response()->json(['message' => 'Blocked date not found'], 404);
        }

        return response()->json(['message' => 'Blocked date deleted', 'deleted' => true]);
    }
}
