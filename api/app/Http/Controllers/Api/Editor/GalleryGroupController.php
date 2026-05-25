<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Gallery groups — owners organize their gallery items under up to 3
 * named sections. Soft cap enforced here; the public site silently
 * folds any orphaned (no group_id) items into an "Other" bucket.
 *
 * Routes:
 *   GET    /editor/gallery/groups
 *   POST   /editor/gallery/groups          { heading, sort_order? }
 *   PATCH  /editor/gallery/groups/{group}  { heading?, sort_order? }
 *   DELETE /editor/gallery/groups/{group}  (orphans items, doesn't delete them)
 */
class GalleryGroupController extends Controller
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

        if (! Schema::hasTable('gallery_groups')) {
            tenancy()->end();
            return response()->json([]);
        }

        $rows = DB::table('gallery_groups')
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

        if (! Schema::hasTable('gallery_groups')) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery groups not supported on this workspace yet.'], 409);
        }

        if (DB::table('gallery_groups')->count() >= self::MAX_GROUPS) {
            tenancy()->end();
            return response()->json([
                'message' => 'You can have at most ' . self::MAX_GROUPS . ' gallery groups.',
            ], 422);
        }

        $nextOrder = (int) DB::table('gallery_groups')->max('sort_order') + 1;
        $id = DB::table('gallery_groups')->insertGetId([
            'heading'    => trim($validated['heading']),
            'sort_order' => $validated['sort_order'] ?? $nextOrder,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('gallery_groups')->find($id);
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

        if (! Schema::hasTable('gallery_groups')) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery group not found'], 404);
        }

        $row = DB::table('gallery_groups')->find($group);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery group not found'], 404);
        }

        $data = ['updated_at' => now()];
        if (array_key_exists('heading', $validated))    $data['heading']    = trim($validated['heading']);
        if (array_key_exists('sort_order', $validated)) $data['sort_order'] = $validated['sort_order'];

        DB::table('gallery_groups')->where('id', $group)->update($data);
        $updated = DB::table('gallery_groups')->find($group);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    public function destroy(Request $request, int $group): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('gallery_groups')) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery group not found'], 404);
        }

        $row = DB::table('gallery_groups')->find($group);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery group not found'], 404);
        }

        // Orphan items in this group (set group_id = null) rather than
        // hard-deleting their photos — the owner can re-assign or delete.
        if (Schema::hasColumn('gallery_items', 'group_id')) {
            DB::table('gallery_items')->where('group_id', $group)->update([
                'group_id'   => null,
                'updated_at' => now(),
            ]);
        }
        DB::table('gallery_groups')->where('id', $group)->delete();

        tenancy()->end();

        return response()->json(['message' => 'Gallery group deleted', 'deleted' => true]);
    }
}
