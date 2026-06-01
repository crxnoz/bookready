<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Results groups (formerly "before & after groups") — mirrors
 * GalleryGroupController. Same MAX cap and same orphan-on-delete
 * behavior so the UX is consistent.
 *
 * M3 rename: same controller as before, pointing at results_groups +
 * results_items.
 */
class ResultsGroupController extends Controller
{
    private const MAX_GROUPS = 3;

    private function format(object $row): array
    {
        return [
            'id'         => (int) $row->id,
            'heading'    =>       $row->heading,
            'sort_order' => (int) $row->sort_order,
            'created_at' =>       $row->created_at,
            'updated_at' =>       $row->updated_at,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('results_groups')) {
            tenancy()->end();
            return response()->json([]);
        }

        $rows = DB::table('results_groups')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values()
            ->all();

        tenancy()->end();

        return response()->json($rows);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'heading'    => 'required|string|max:80',
            'sort_order' => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('results_groups')) {
            tenancy()->end();
            return response()->json(['message' => 'Results groups not supported yet.'], 409);
        }

        if (DB::table('results_groups')->count() >= self::MAX_GROUPS) {
            tenancy()->end();
            return response()->json([
                'message' => 'You can have at most ' . self::MAX_GROUPS . ' results groups.',
            ], 422);
        }

        $nextOrder = (int) DB::table('results_groups')->max('sort_order') + 1;
        $id = DB::table('results_groups')->insertGetId([
            'heading'    => trim($validated['heading']),
            'sort_order' => $validated['sort_order'] ?? $nextOrder,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('results_groups')->find($id);
        $result = $this->format($row);
        tenancy()->end();

        return response()->json($result, 201);
    }

    public function update(Request $request, int $group): JsonResponse
    {
        $validated = $request->validate([
            'heading'    => 'sometimes|required|string|max:80',
            'sort_order' => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('results_groups')) {
            tenancy()->end();
            return response()->json(['message' => 'Group not found'], 404);
        }

        $row = DB::table('results_groups')->find($group);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Group not found'], 404);
        }

        $data = ['updated_at' => now()];
        if (array_key_exists('heading', $validated))    $data['heading']    = trim($validated['heading']);
        if (array_key_exists('sort_order', $validated)) $data['sort_order'] = $validated['sort_order'];

        DB::table('results_groups')->where('id', $group)->update($data);
        $updated = DB::table('results_groups')->find($group);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    public function destroy(Request $request, int $group): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('results_groups')) {
            tenancy()->end();
            return response()->json(['message' => 'Group not found'], 404);
        }

        $row = DB::table('results_groups')->find($group);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Group not found'], 404);
        }

        if (Schema::hasColumn('results_items', 'group_id')) {
            DB::table('results_items')->where('group_id', $group)->update([
                'group_id'   => null,
                'updated_at' => now(),
            ]);
        }
        DB::table('results_groups')->where('id', $group)->delete();

        tenancy()->end();

        return response()->json(['message' => 'Results group deleted', 'deleted' => true]);
    }
}
