<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GalleryItemsController extends Controller
{
    private function format(object $row): array
    {
        $get = static fn(string $k, $default = null) =>
            property_exists($row, $k) ? $row->{$k} : $default;
        return [
            'id'         => (int)  $row->id,
            'group_id'   => $get('group_id') !== null ? (int) $get('group_id') : null,
            'title'      =>         $row->title,
            'caption'    =>         $row->caption,
            'alt_text'   =>         $row->alt_text,
            'image_url' =>          $row->image_url,
            'category'   =>         $row->category,
            'is_active'  => (bool)  $row->is_active,
            'sort_order' => (int)   $row->sort_order,
            'created_at' =>         $row->created_at,
            'updated_at' =>         $row->updated_at,
        ];
    }

    // GET /editor/gallery
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $query = DB::table('gallery_items')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($limit = (int) $request->query('limit')) {
            $query->limit($limit);
        }

        $items = $query->get()->map(fn ($r) => $this->format($r))->values()->all();

        tenancy()->end();

        return response()->json($items);
    }

    // POST /editor/gallery
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group_id'   => 'nullable|integer',
            'title'      => 'nullable|string|max:255',
            'caption'    => 'nullable|string|max:5000',
            'alt_text'   => 'nullable|string|max:255',
            'image_url'  => 'required|url|max:2000',
            'category'   => 'nullable|string|max:255',
            'is_active'  => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $nextOrder = (int) DB::table('gallery_items')->max('sort_order') + 1;
        $payload = [
            'title'      => $validated['title']      ?? null,
            'caption'    => $validated['caption']    ?? null,
            'alt_text'   => $validated['alt_text']   ?? null,
            'image_url'  => $validated['image_url'],
            'category'   => $validated['category']   ?? null,
            'is_active'  => $validated['is_active']  ?? true,
            'sort_order' => $validated['sort_order'] ?? $nextOrder,
            'created_at' => now(),
            'updated_at' => now(),
        ];
        if (\Illuminate\Support\Facades\Schema::hasColumn('gallery_items', 'group_id')) {
            $payload['group_id'] = $validated['group_id'] ?? null;
        }

        $id = DB::table('gallery_items')->insertGetId($payload);

        $row    = DB::table('gallery_items')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    // PATCH /editor/gallery/{item}
    public function update(Request $request, int $item): JsonResponse
    {
        $validated = $request->validate([
            'group_id'   => 'sometimes|nullable|integer',
            'title'      => 'nullable|string|max:255',
            'caption'    => 'nullable|string|max:5000',
            'alt_text'   => 'nullable|string|max:255',
            'image_url'  => 'sometimes|required|url|max:2000',
            'category'   => 'nullable|string|max:255',
            'is_active'  => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('gallery_items')->find($item);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery item not found'], 404);
        }

        $data = ['updated_at' => now()];
        foreach (['title', 'caption', 'alt_text', 'category'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }
        if (array_key_exists('image_url', $validated))  $data['image_url']  = $validated['image_url'];
        if (array_key_exists('is_active', $validated))  $data['is_active']  = $validated['is_active'];
        if (array_key_exists('sort_order', $validated)) $data['sort_order'] = $validated['sort_order'];
        if (array_key_exists('group_id', $validated)
            && \Illuminate\Support\Facades\Schema::hasColumn('gallery_items', 'group_id')) {
            $data['group_id'] = $validated['group_id'];
        }

        DB::table('gallery_items')->where('id', $item)->update($data);
        $updated = DB::table('gallery_items')->find($item);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    // DELETE /editor/gallery/{item}
    // Hard delete — gallery items hold no booking history.
    public function destroy(Request $request, int $item): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('gallery_items')->find($item);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Gallery item not found'], 404);
        }

        DB::table('gallery_items')->where('id', $item)->delete();

        tenancy()->end();

        return response()->json(['message' => 'Gallery item deleted', 'deleted' => true]);
    }
}
