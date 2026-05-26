<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 14 — tenant-defined customer tags.
 *
 * Owners create tags like "Allergy: latex", "Walk-in", or "Birthday May"
 * and assign them to customers from the detail drawer. The CRUD here
 * powers the inline picker AND the dedicated "Manage tags" modal
 * (rename / delete). Assignment lives on CustomersController (PATCH
 * with tag_ids[]).
 */
class CustomerTagsController extends Controller
{
    // GET /editor/customer-tags
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $rows = Schema::hasTable('customer_tags')
            ? DB::table('customer_tags')
                ->orderBy('sort_order')
                ->orderBy('name')
                ->get()
            : collect();

        $result = $rows->map(fn ($r) => $this->format($r))->all();

        tenancy()->end();

        return response()->json($result);
    }

    // POST /editor/customer-tags
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:60',
            // 7-char hex (#RRGGBB) — UI passes a preset palette pick.
            'color'      => 'nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $name = trim($validated['name']);
        if ($name === '') {
            tenancy()->end();
            return response()->json(['message' => 'Tag name cannot be blank.'], 422);
        }

        // Case-insensitive uniqueness check so "VIP" + "vip" don't both stick.
        $existing = DB::table('customer_tags')->whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($existing) {
            tenancy()->end();
            return response()->json(['message' => 'A tag with that name already exists.'], 422);
        }

        $id = DB::table('customer_tags')->insertGetId([
            'name'       => $name,
            'color'      => $validated['color']      ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row = DB::table('customer_tags')->find($id);
        $out = $this->format($row);

        tenancy()->end();

        return response()->json($out, 201);
    }

    // PATCH /editor/customer-tags/{tag}
    public function update(Request $request, int $tag): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'sometimes|string|max:60',
            'color'      => 'sometimes|nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'sort_order' => 'sometimes|integer|min:0',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('customer_tags')->find($tag);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Tag not found.'], 404);
        }

        $update = ['updated_at' => now()];

        if (array_key_exists('name', $validated)) {
            $name = trim((string) $validated['name']);
            if ($name === '') {
                tenancy()->end();
                return response()->json(['message' => 'Tag name cannot be blank.'], 422);
            }
            $dupe = DB::table('customer_tags')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->where('id', '!=', $tag)
                ->first();
            if ($dupe) {
                tenancy()->end();
                return response()->json(['message' => 'Another tag already uses that name.'], 422);
            }
            $update['name'] = $name;
        }

        if (array_key_exists('color', $validated))      $update['color']      = $validated['color'];
        if (array_key_exists('sort_order', $validated)) $update['sort_order'] = $validated['sort_order'];

        DB::table('customer_tags')->where('id', $tag)->update($update);

        $updated = DB::table('customer_tags')->find($tag);
        $out = $this->format($updated);

        tenancy()->end();

        return response()->json($out);
    }

    // DELETE /editor/customer-tags/{tag}
    public function destroy(Request $request, int $tag): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! DB::table('customer_tags')->where('id', $tag)->exists()) {
            tenancy()->end();
            return response()->json(['message' => 'Tag not found.'], 404);
        }

        // Cascading: remove every link first, then the tag row.
        if (Schema::hasTable('client_tag_links')) {
            DB::table('client_tag_links')->where('tag_id', $tag)->delete();
        }
        DB::table('customer_tags')->where('id', $tag)->delete();

        tenancy()->end();

        return response()->json(['deleted' => true]);
    }

    private function format(object $r): array
    {
        return [
            'id'         => (int) $r->id,
            'name'       => $r->name,
            'color'      => $r->color,
            'sort_order' => (int) $r->sort_order,
            'created_at' => $r->created_at,
            'updated_at' => $r->updated_at,
        ];
    }
}
