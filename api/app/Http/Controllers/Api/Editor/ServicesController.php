<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServicesController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'               => (int)   $row->id,
            'name'             =>          $row->name,
            'description'      =>          $row->description,
            'price'            => (float)  $row->price,
            'duration_minutes' => (int)    $row->duration,
            // Legacy free-text category — kept on the payload for one release
            // so older frontends still render. New UI reads category_id.
            'category'         =>          $row->category    ?? null,
            'category_id'      => $row->category_id !== null ? (int) $row->category_id : null,
            'image_url'        =>          $row->image_url   ?? null,
            'is_active'        => (bool)   $row->is_active,
            'sort_order'       => (int)    $row->sort_order,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $services = DB::table('services')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => $this->format($r))
            ->values();

        tenancy()->end();

        return response()->json($services);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'price'            => 'required|numeric|min:0',
            'duration_minutes' => 'required|integer|min:5',
            'description'      => 'nullable|string',
            'category'         => 'nullable|string|max:100',
            'category_id'      => 'nullable|integer',
            'image_url'        => 'nullable|string|max:1000',
            'is_active'        => 'nullable|boolean',
            'sort_order'       => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Verify category_id exists in this tenant so we never persist a
        // dangling FK reference (and so clients can't probe other tenants).
        if (isset($validated['category_id'])) {
            $exists = DB::table('service_categories')->where('id', $validated['category_id'])->exists();
            if (! $exists) {
                tenancy()->end();
                return response()->json(['message' => 'Category not found'], 422);
            }
        }

        $nextOrder = (int) DB::table('services')->max('sort_order') + 1;

        $id = DB::table('services')->insertGetId([
            'name'        => $validated['name'],
            'price'       => $validated['price'],
            'duration'    => $validated['duration_minutes'],
            'description' => $validated['description'] ?? null,
            'category'    => $validated['category']    ?? null,
            'category_id' => $validated['category_id'] ?? null,
            'image_url'   => $validated['image_url']   ?? null,
            'is_active'   => $validated['is_active']   ?? true,
            'sort_order'  => $validated['sort_order']  ?? $nextOrder,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        $row = DB::table('services')->find($id);
        tenancy()->end();

        return response()->json($this->format($row), 201);
    }

    public function update(Request $request, int $service): JsonResponse
    {
        $validated = $request->validate([
            'name'             => 'sometimes|string|max:255',
            'price'            => 'sometimes|numeric|min:0',
            'duration_minutes' => 'sometimes|integer|min:5',
            'description'      => 'nullable|string',
            'category'         => 'nullable|string|max:100',
            'category_id'      => 'nullable|integer',
            'image_url'        => 'nullable|string|max:1000',
            'is_active'        => 'sometimes|boolean',
            'sort_order'       => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (array_key_exists('category_id', $validated) && $validated['category_id'] !== null) {
            $exists = DB::table('service_categories')->where('id', $validated['category_id'])->exists();
            if (! $exists) {
                tenancy()->end();
                return response()->json(['message' => 'Category not found'], 422);
            }
        }

        $data = ['updated_at' => now()];
        if (isset($validated['name']))             $data['name']        = $validated['name'];
        if (isset($validated['price']))            $data['price']       = $validated['price'];
        if (isset($validated['duration_minutes'])) $data['duration']    = $validated['duration_minutes'];
        if (array_key_exists('description', $validated)) $data['description'] = $validated['description'];
        if (array_key_exists('category', $validated))    $data['category']    = $validated['category'];
        if (array_key_exists('category_id', $validated)) $data['category_id'] = $validated['category_id'];
        if (array_key_exists('image_url', $validated))   $data['image_url']   = $validated['image_url'];
        if (isset($validated['is_active']))        $data['is_active']   = $validated['is_active'];
        if (isset($validated['sort_order']))       $data['sort_order']  = $validated['sort_order'];

        DB::table('services')->where('id', $service)->update($data);
        $row = DB::table('services')->find($service);

        tenancy()->end();

        if (! $row) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        return response()->json($this->format($row));
    }

    public function destroy(Request $request, int $service): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        DB::table('services')->where('id', $service)->delete();

        tenancy()->end();

        return response()->json(null, 204);
    }
}
