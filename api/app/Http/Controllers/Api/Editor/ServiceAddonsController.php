<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 5: service add-ons catalog.
 *
 * Each add-on is a tenant-defined extra that can be linked to one or
 * more services via service_addon_links. The same add-on can be marked
 * required for one service and optional for another — the per-link
 * `is_required` flag is owned by the ServicesController which manages
 * the linking pivot.
 *
 * Prices land on the wire as float dollars (`extra_price`) for editor
 * convenience but are stored as integer cents.
 */
class ServiceAddonsController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'                     => (int)   $row->id,
            'name'                   =>         $row->name,
            'description'            =>         $row->description ?? null,
            'image_url'              =>         $row->image_url   ?? null,
            'extra_price'            => (float) ($row->extra_price_cents / 100),
            'extra_price_cents'      => (int)   $row->extra_price_cents,
            'extra_duration_minutes' => (int)   $row->extra_duration_minutes,
            'is_active'              => (bool)  $row->is_active,
            'sort_order'             => (int)   $row->sort_order,
            'created_at'             =>         $row->created_at  ?? null,
            'updated_at'             =>         $row->updated_at  ?? null,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_addons')) {
            tenancy()->end();
            return response()->json([]);
        }

        $rows = DB::table('service_addons')
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
            'name'                   => 'required|string|max:200',
            'description'            => 'sometimes|nullable|string|max:2000',
            'image_url'              => 'sometimes|nullable|string|max:1000',
            // Accept dollars from the editor, convert to cents on write.
            'extra_price'            => 'sometimes|nullable|numeric|min:0|max:99999',
            'extra_duration_minutes' => 'sometimes|integer|min:0|max:480',
            'is_active'              => 'sometimes|boolean',
            'sort_order'             => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_addons')) {
            tenancy()->end();
            return response()->json(['message' => 'Add-ons not supported yet.'], 409);
        }

        $nextOrder = (int) DB::table('service_addons')->max('sort_order') + 1;

        $cents = isset($validated['extra_price'])
            ? (int) round(((float) $validated['extra_price']) * 100)
            : 0;

        $id = DB::table('service_addons')->insertGetId([
            'name'                   => trim($validated['name']),
            'description'            => $validated['description']            ?? null,
            'image_url'              => $validated['image_url']              ?? null,
            'extra_price_cents'      => $cents,
            'extra_duration_minutes' => $validated['extra_duration_minutes'] ?? 0,
            'is_active'              => $validated['is_active']              ?? true,
            'sort_order'             => $validated['sort_order']             ?? $nextOrder,
            'created_at'             => now(),
            'updated_at'             => now(),
        ]);

        $row = DB::table('service_addons')->find($id);

        tenancy()->end();

        return response()->json($this->format($row), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'name'                   => 'sometimes|required|string|max:200',
            'description'            => 'sometimes|nullable|string|max:2000',
            'image_url'              => 'sometimes|nullable|string|max:1000',
            'extra_price'            => 'sometimes|nullable|numeric|min:0|max:99999',
            'extra_duration_minutes' => 'sometimes|integer|min:0|max:480',
            'is_active'              => 'sometimes|boolean',
            'sort_order'             => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_addons')) {
            tenancy()->end();
            return response()->json(['message' => 'Add-on not found'], 404);
        }

        $row = DB::table('service_addons')->find($id);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Add-on not found'], 404);
        }

        $data = ['updated_at' => now()];
        if (isset($validated['name']))                                  $data['name']        = trim($validated['name']);
        if (array_key_exists('description', $validated))                $data['description'] = $validated['description'];
        if (array_key_exists('image_url',   $validated))                $data['image_url']   = $validated['image_url'];
        if (array_key_exists('extra_price', $validated))                $data['extra_price_cents'] = $validated['extra_price'] !== null
                                                                            ? (int) round(((float) $validated['extra_price']) * 100)
                                                                            : 0;
        if (array_key_exists('extra_duration_minutes', $validated))     $data['extra_duration_minutes'] = $validated['extra_duration_minutes'];
        if (array_key_exists('is_active', $validated))                  $data['is_active']   = $validated['is_active'];
        if (array_key_exists('sort_order', $validated))                 $data['sort_order']  = $validated['sort_order'];

        DB::table('service_addons')->where('id', $id)->update($data);
        $updated = DB::table('service_addons')->find($id);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        if (! Schema::hasTable('service_addons')) {
            tenancy()->end();
            return response()->json(['message' => 'Add-on not found'], 404);
        }

        $row = DB::table('service_addons')->find($id);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Add-on not found'], 404);
        }

        // Clean the per-service link pivot first. No CASCADE FK so we
        // own the cleanup. appointment_addons rows are intentionally
        // preserved — they hold a price+duration snapshot for history.
        if (Schema::hasTable('service_addon_links')) {
            DB::table('service_addon_links')->where('addon_id', $id)->delete();
        }
        DB::table('service_addons')->where('id', $id)->delete();

        tenancy()->end();

        return response()->json(['message' => 'Add-on deleted', 'deleted' => true]);
    }
}
