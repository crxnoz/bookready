<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 3: service categories (rich resource, not just a string).
 *
 * Each category has an optional image + description so the public site
 * can render category cards. Capped at MAX so the booking widget stays
 * scannable. Deleting a category null-points the services that
 * referenced it (handled by the ON DELETE SET NULL FK from the 2024
 * services migration) — items aren't lost.
 */
class ServiceCategoriesController extends Controller
{
    private const MAX_CATEGORIES = 8;

    private function format(object $row): array
    {
        return [
            'id'          => (int)  $row->id,
            'name'        =>        $row->name,
            'description' =>        $row->description ?? null,
            // Owner-set hex tag for visual organization in the services
            // editor. Matches the customer_tags.color shape (#RRGGBB).
            'color'       =>        $row->color       ?? null,
            'image_url'   =>        $row->image_url   ?? null,
            'is_active'   => (bool) ($row->is_active ?? true),
            'sort_order'  => (int)  $row->sort_order,
            'created_at'  =>        $row->created_at  ?? null,
            'updated_at'  =>        $row->updated_at  ?? null,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_categories')) {
            tenancy()->end();
            return response()->json([]);
        }

        $rows = DB::table('service_categories')
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
            'name'        => 'required|string|max:120',
            'description' => 'sometimes|nullable|string|max:2000',
            'color'       => 'sometimes|nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'image_url'   => 'sometimes|nullable|string|max:1000',
            'is_active'   => 'sometimes|boolean',
            'sort_order'  => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_categories')) {
            tenancy()->end();
            return response()->json(['message' => 'Categories not supported yet.'], 409);
        }

        if (DB::table('service_categories')->count() >= self::MAX_CATEGORIES) {
            tenancy()->end();
            return response()->json([
                'message' => 'You can have at most ' . self::MAX_CATEGORIES . ' categories.',
            ], 422);
        }

        $nextOrder = (int) DB::table('service_categories')->max('sort_order') + 1;
        $insert = [
            'name'        => trim($validated['name']),
            'description' => $validated['description'] ?? null,
            'image_url'   => $validated['image_url']   ?? null,
            'is_active'   => $validated['is_active']   ?? true,
            'sort_order'  => $validated['sort_order']  ?? $nextOrder,
            'created_at'  => now(),
            'updated_at'  => now(),
        ];
        // Only set color when the column exists, in case a tenant predates
        // the 2026_06_09 migration (Schema::hasTable / hasColumn pattern).
        if (Schema::hasColumn('service_categories', 'color')) {
            $insert['color'] = $validated['color'] ?? null;
        }
        $id = DB::table('service_categories')->insertGetId($insert);

        $row = DB::table('service_categories')->find($id);

        tenancy()->end();

        return response()->json($this->format($row), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:120',
            'description' => 'sometimes|nullable|string|max:2000',
            'color'       => 'sometimes|nullable|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'image_url'   => 'sometimes|nullable|string|max:1000',
            'is_active'   => 'sometimes|boolean',
            'sort_order'  => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_categories')) {
            tenancy()->end();
            return response()->json(['message' => 'Category not found'], 404);
        }

        $row = DB::table('service_categories')->find($id);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Category not found'], 404);
        }

        $data = ['updated_at' => now()];
        if (isset($validated['name']))                            $data['name']        = trim($validated['name']);
        if (array_key_exists('description', $validated))          $data['description'] = $validated['description'];
        if (array_key_exists('image_url',   $validated))          $data['image_url']   = $validated['image_url'];
        if (array_key_exists('is_active',   $validated))          $data['is_active']   = $validated['is_active'];
        if (array_key_exists('sort_order',  $validated))          $data['sort_order']  = $validated['sort_order'];
        if (array_key_exists('color',       $validated) && Schema::hasColumn('service_categories', 'color')) {
            $data['color'] = $validated['color'];
        }

        DB::table('service_categories')->where('id', $id)->update($data);
        $updated = DB::table('service_categories')->find($id);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_categories')) {
            tenancy()->end();
            return response()->json(['message' => 'Category not found'], 404);
        }

        $row = DB::table('service_categories')->find($id);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Category not found'], 404);
        }

        // Defensive: also null out services.category_id even though the FK
        // is ON DELETE SET NULL on tenants whose schema went through the
        // 2024 migration. Doing it explicitly keeps timestamps current.
        if (Schema::hasColumn('services', 'category_id')) {
            DB::table('services')->where('category_id', $id)->update([
                'category_id' => null,
                'updated_at'  => now(),
            ]);
        }

        DB::table('service_categories')->where('id', $id)->delete();

        tenancy()->end();

        return response()->json(['message' => 'Category deleted', 'deleted' => true]);
    }
}
