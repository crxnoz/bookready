<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ServicesController extends Controller
{
    /**
     * Flatten a service row. Phase 4: also emits override/inherit fields
     * + the staff pivot. The pivot is loaded eagerly per call — fine for
     * single rows; the index() method bulk-loads it to avoid N+1.
     */
    private function format(object $row, array $assignedStaffIds = []): array
    {
        $availableDays = null;
        if (property_exists($row, 'available_days') && $row->available_days !== null) {
            $decoded = is_string($row->available_days) ? json_decode($row->available_days, true) : $row->available_days;
            if (is_array($decoded)) {
                $availableDays = array_values(array_filter(array_map('intval', $decoded), fn ($d) => $d >= 0 && $d <= 6));
            }
        }

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
            // Phase 4 overrides — null means inherit-from-global, integer
            // (including 0) means "use this exact value".
            'buffer_before_override_minutes' => property_exists($row, 'buffer_before_override_minutes') && $row->buffer_before_override_minutes !== null
                ? (int) $row->buffer_before_override_minutes : null,
            'buffer_after_override_minutes'  => property_exists($row, 'buffer_after_override_minutes') && $row->buffer_after_override_minutes !== null
                ? (int) $row->buffer_after_override_minutes : null,
            'available_days'                 => $availableDays,
            'assigned_staff_ids'             => array_values(array_map('intval', $assignedStaffIds)),
            'is_active'        => (bool)   $row->is_active,
            'sort_order'       => (int)    $row->sort_order,
        ];
    }

    /**
     * Bulk-load service_staff for a set of service ids. Returns a map
     * {service_id => [staff_id, …]}. Used in index() to avoid N+1.
     */
    private function pivotMap(array $serviceIds): array
    {
        if (empty($serviceIds) || ! Schema::hasTable('service_staff')) return [];
        $rows = DB::table('service_staff')
            ->whereIn('service_id', $serviceIds)
            ->get(['service_id', 'staff_id']);
        $map = [];
        foreach ($rows as $r) {
            $map[(int) $r->service_id] ??= [];
            $map[(int) $r->service_id][] = (int) $r->staff_id;
        }
        return $map;
    }

    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $rows  = DB::table('services')->orderBy('sort_order')->orderBy('id')->get();
        $ids   = $rows->pluck('id')->map(fn ($i) => (int) $i)->all();
        $pivot = $this->pivotMap($ids);

        $services = $rows
            ->map(fn ($r) => $this->format($r, $pivot[(int) $r->id] ?? []))
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
            // Phase 4 overrides
            'buffer_before_override_minutes' => 'nullable|integer|min:0|max:240',
            'buffer_after_override_minutes'  => 'nullable|integer|min:0|max:240',
            'available_days'                 => 'nullable|array|max:7',
            'available_days.*'               => 'integer|min:0|max:6',
            'assigned_staff_ids'             => 'nullable|array',
            'assigned_staff_ids.*'           => 'integer',
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

        // Whitelist staff ids against this tenant's staff so an attacker
        // can't seed a pivot row pointing at someone else's staff id.
        $validStaffIds = [];
        if (! empty($validated['assigned_staff_ids'])) {
            $validStaffIds = DB::table('staff')
                ->whereIn('id', $validated['assigned_staff_ids'])
                ->pluck('id')
                ->map(fn ($i) => (int) $i)
                ->all();
        }

        $nextOrder = (int) DB::table('services')->max('sort_order') + 1;

        // Normalize available_days: dedupe + sort. Empty array becomes null
        // so SlotGenerator can treat "no restriction" and "never set"
        // identically.
        $days = $validated['available_days'] ?? null;
        if (is_array($days)) {
            $days = array_values(array_unique(array_map('intval', $days)));
            sort($days);
            if (empty($days)) $days = null;
        }

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
            'buffer_before_override_minutes' => $validated['buffer_before_override_minutes'] ?? null,
            'buffer_after_override_minutes'  => $validated['buffer_after_override_minutes']  ?? null,
            'available_days'                 => $days !== null ? json_encode($days) : null,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);

        // Mirror assigned staff into the pivot if the request supplied any.
        if (! empty($validStaffIds) && Schema::hasTable('service_staff')) {
            $rows = array_map(fn ($sid) => [
                'service_id' => $id,
                'staff_id'   => $sid,
                'created_at' => now(),
                'updated_at' => now(),
            ], $validStaffIds);
            DB::table('service_staff')->insert($rows);
        }

        $row = DB::table('services')->find($id);
        $result = $this->format($row, $validStaffIds);
        tenancy()->end();

        return response()->json($result, 201);
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
            // Phase 4 overrides
            'buffer_before_override_minutes' => 'sometimes|nullable|integer|min:0|max:240',
            'buffer_after_override_minutes'  => 'sometimes|nullable|integer|min:0|max:240',
            'available_days'                 => 'sometimes|nullable|array|max:7',
            'available_days.*'               => 'integer|min:0|max:6',
            'assigned_staff_ids'             => 'sometimes|array',
            'assigned_staff_ids.*'           => 'integer',
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

        if (array_key_exists('buffer_before_override_minutes', $validated)) {
            $data['buffer_before_override_minutes'] = $validated['buffer_before_override_minutes'];
        }
        if (array_key_exists('buffer_after_override_minutes', $validated)) {
            $data['buffer_after_override_minutes']  = $validated['buffer_after_override_minutes'];
        }
        if (array_key_exists('available_days', $validated)) {
            $days = $validated['available_days'];
            if (is_array($days)) {
                $days = array_values(array_unique(array_map('intval', $days)));
                sort($days);
                if (empty($days)) $days = null;
            }
            $data['available_days'] = $days !== null ? json_encode($days) : null;
        }

        DB::table('services')->where('id', $service)->update($data);

        // Replace pivot atomically when assigned_staff_ids is in the
        // payload. Absence = leave the existing assignments alone.
        $pivot = $this->pivotMap([$service])[$service] ?? [];
        if (array_key_exists('assigned_staff_ids', $validated) && Schema::hasTable('service_staff')) {
            $next = $validated['assigned_staff_ids'] ?? [];
            $validStaffIds = DB::table('staff')
                ->whereIn('id', $next)
                ->pluck('id')
                ->map(fn ($i) => (int) $i)
                ->all();
            DB::table('service_staff')->where('service_id', $service)->delete();
            if (! empty($validStaffIds)) {
                $rows = array_map(fn ($sid) => [
                    'service_id' => $service,
                    'staff_id'   => $sid,
                    'created_at' => now(),
                    'updated_at' => now(),
                ], $validStaffIds);
                DB::table('service_staff')->insert($rows);
            }
            $pivot = $validStaffIds;
        }

        $row = DB::table('services')->find($service);

        tenancy()->end();

        if (! $row) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        return response()->json($this->format($row, $pivot));
    }

    public function destroy(Request $request, int $service): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Clean the pivot first — there's no ON DELETE CASCADE on the
        // service_staff FK so orphaned rows would otherwise linger.
        if (Schema::hasTable('service_staff')) {
            DB::table('service_staff')->where('service_id', $service)->delete();
        }
        DB::table('services')->where('id', $service)->delete();

        tenancy()->end();

        return response()->json(null, 204);
    }
}
