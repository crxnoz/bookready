<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Results items (formerly "before & after").
 *
 * M3 rename: the user-facing tab label has always been "Results"; the
 * underlying table + controller now match. The pair of images per item
 * still represents a before/after transformation — that's the content
 * shape, not the label.
 */
class ResultsItemsController extends Controller
{
    private function format(object $row): array
    {
        $get = static fn(string $k, $default = null) =>
            property_exists($row, $k) ? $row->{$k} : $default;
        return [
            'id'                => (int)  $row->id,
            'group_id'          => $get('group_id') !== null ? (int) $get('group_id') : null,
            'title'             =>         $row->title,
            'caption'           =>         $row->caption,
            'before_image_url'  =>         $row->before_image_url,
            'after_image_url'   =>         $row->after_image_url,
            'before_alt_text'   =>         $row->before_alt_text,
            'after_alt_text'    =>         $row->after_alt_text,
            'category'          =>         $row->category,
            'is_active'         => (bool)  $row->is_active,
            'sort_order'        => (int)   $row->sort_order,
            'created_at'        =>         $row->created_at,
            'updated_at'        =>         $row->updated_at,
        ];
    }

    // GET /editor/results
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $query = DB::table('results_items')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        if ($request->boolean('active'))            $query->where('is_active', true);
        if ($category = $request->query('category')) $query->where('category', $category);
        if ($limit    = (int) $request->query('limit')) $query->limit($limit);

        $items = $query->get()->map(fn ($r) => $this->format($r))->values()->all();

        tenancy()->end();

        return response()->json($items);
    }

    // POST /editor/results
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'group_id'          => 'nullable|integer',
            'title'             => 'nullable|string|max:255',
            'caption'           => 'nullable|string|max:5000',
            'before_image_url'  => 'required|url|max:2000',
            'after_image_url'   => 'required|url|max:2000',
            'before_alt_text'   => 'nullable|string|max:255',
            'after_alt_text'    => 'nullable|string|max:255',
            'category'          => 'nullable|string|max:255',
            'is_active'         => 'nullable|boolean',
            'sort_order'        => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $nextOrder = (int) DB::table('results_items')->max('sort_order') + 1;
        $payload = [
            'title'             => $validated['title']             ?? null,
            'caption'           => $validated['caption']           ?? null,
            'before_image_url'  => $validated['before_image_url'],
            'after_image_url'   => $validated['after_image_url'],
            'before_alt_text'   => $validated['before_alt_text']   ?? null,
            'after_alt_text'    => $validated['after_alt_text']    ?? null,
            'category'          => $validated['category']          ?? null,
            'is_active'         => $validated['is_active']         ?? true,
            'sort_order'        => $validated['sort_order']        ?? $nextOrder,
            'created_at'        => now(),
            'updated_at'        => now(),
        ];
        if (Schema::hasColumn('results_items', 'group_id')) {
            $payload['group_id'] = $validated['group_id'] ?? null;
        }

        $id = DB::table('results_items')->insertGetId($payload);

        $row    = DB::table('results_items')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    // PATCH /editor/results/{item}
    public function update(Request $request, int $item): JsonResponse
    {
        $validated = $request->validate([
            'group_id'          => 'sometimes|nullable|integer',
            'title'             => 'nullable|string|max:255',
            'caption'           => 'nullable|string|max:5000',
            'before_image_url'  => 'sometimes|required|url|max:2000',
            'after_image_url'   => 'sometimes|required|url|max:2000',
            'before_alt_text'   => 'nullable|string|max:255',
            'after_alt_text'    => 'nullable|string|max:255',
            'category'          => 'nullable|string|max:255',
            'is_active'         => 'sometimes|boolean',
            'sort_order'        => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('results_items')->find($item);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Results item not found'], 404);
        }

        $data = ['updated_at' => now()];
        foreach (['title', 'caption', 'before_alt_text', 'after_alt_text', 'category'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }
        if (array_key_exists('before_image_url', $validated)) $data['before_image_url'] = $validated['before_image_url'];
        if (array_key_exists('after_image_url',  $validated)) $data['after_image_url']  = $validated['after_image_url'];
        if (array_key_exists('is_active',        $validated)) $data['is_active']        = $validated['is_active'];
        if (array_key_exists('sort_order',       $validated)) $data['sort_order']       = $validated['sort_order'];
        if (array_key_exists('group_id', $validated)
            && Schema::hasColumn('results_items', 'group_id')) {
            $data['group_id'] = $validated['group_id'];
        }

        DB::table('results_items')->where('id', $item)->update($data);
        $updated = DB::table('results_items')->find($item);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    // DELETE /editor/results/{item}
    // Hard delete — results items hold no booking history.
    public function destroy(Request $request, int $item): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('results_items')->find($item);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Results item not found'], 404);
        }

        DB::table('results_items')->where('id', $item)->delete();

        tenancy()->end();

        return response()->json(['message' => 'Results item deleted', 'deleted' => true]);
    }
}
