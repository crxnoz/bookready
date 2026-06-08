<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Availability 2.0 · Phase 2 · Custom drops CRUD.
 *
 * Each row is one explicit drop: "on release_date, dates available_from
 * … available_to become bookable." Only consulted when
 * booking_settings.slot_release_frequency = 'custom'.
 *
 * Multiple drops are supported so owners can stack them — a holiday week,
 * back-to-school week, summer block, etc. The ReleaseWindowResolver picks
 * the latest available_to whose release_date has already passed.
 */
class SlotReleaseDropsController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'             => (int) $row->id,
            'release_date'   => substr((string) $row->release_date, 0, 10),
            'available_from' => substr((string) $row->available_from, 0, 10),
            'available_to'   => substr((string) $row->available_to, 0, 10),
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $rows = DB::table('slot_release_drops')
            ->orderBy('release_date')
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->all();

        tenancy()->end();

        return response()->json(['drops' => $rows]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'release_date'   => 'required|date_format:Y-m-d',
            'available_from' => 'required|date_format:Y-m-d',
            'available_to'   => 'required|date_format:Y-m-d',
        ]);
        if ($validated['available_to'] < $validated['available_from']) {
            return response()->json(['message' => 'Available-to date must be on or after available-from date.'], 422);
        }
        if ($validated['release_date'] > $validated['available_from']) {
            return response()->json(['message' => 'Release date cannot be after the available-from date.'], 422);
        }

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $id = DB::table('slot_release_drops')->insertGetId([
            'release_date'   => $validated['release_date'],
            'available_from' => $validated['available_from'],
            'available_to'   => $validated['available_to'],
            'created_at'     => now(),
            'updated_at'     => now(),
        ]);
        $row = DB::table('slot_release_drops')->where('id', $id)->first();
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'release_date'   => 'sometimes|date_format:Y-m-d',
            'available_from' => 'sometimes|date_format:Y-m-d',
            'available_to'   => 'sometimes|date_format:Y-m-d',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('slot_release_drops')->where('id', $id)->first();
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Drop not found.'], 404);
        }

        $merged = [
            'release_date'   => $validated['release_date']   ?? substr((string) $row->release_date, 0, 10),
            'available_from' => $validated['available_from'] ?? substr((string) $row->available_from, 0, 10),
            'available_to'   => $validated['available_to']   ?? substr((string) $row->available_to, 0, 10),
        ];
        if ($merged['available_to'] < $merged['available_from']) {
            tenancy()->end();
            return response()->json(['message' => 'Available-to date must be on or after available-from date.'], 422);
        }
        if ($merged['release_date'] > $merged['available_from']) {
            tenancy()->end();
            return response()->json(['message' => 'Release date cannot be after the available-from date.'], 422);
        }

        DB::table('slot_release_drops')->where('id', $id)->update(array_merge($merged, ['updated_at' => now()]));
        $updated = DB::table('slot_release_drops')->where('id', $id)->first();
        $result = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $deleted = DB::table('slot_release_drops')->where('id', $id)->delete();

        tenancy()->end();

        return response()->json(['id' => $id, 'deleted' => (bool) $deleted]);
    }
}
