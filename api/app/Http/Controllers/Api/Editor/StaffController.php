<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    private function format(object $row): array
    {
        return [
            'id'         => (int)  $row->id,
            'name'       =>         $row->name,
            'role'       =>         $row->role,
            'bio'        =>         $row->bio,
            'email'      =>         $row->email      ?? null,
            'phone'      =>         $row->phone      ?? null,
            'photo_url'  =>         $row->avatar_url ?? null,
            'is_active'  => (bool)  $row->is_active,
            'sort_order' => (int)   $row->sort_order,
            'created_at' =>         $row->created_at,
            'updated_at' =>         $row->updated_at,
        ];
    }

    // GET /editor/staff
    public function index(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $query = DB::table('staff')
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc');

        if ($request->boolean('active')) {
            $query->where('is_active', true);
        }

        $staff = $query->get()->map(fn ($r) => $this->format($r))->values()->all();

        tenancy()->end();

        return response()->json($staff);
    }

    // POST /editor/staff
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'required|string|max:255',
            'role'       => 'nullable|string|max:255',
            'bio'        => 'nullable|string|max:5000',
            'email'      => 'nullable|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'photo_url'  => 'nullable|string|max:1000',
            'is_active'  => 'nullable|boolean',
            'sort_order' => 'nullable|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $nextOrder = (int) DB::table('staff')->max('sort_order') + 1;

        $id = DB::table('staff')->insertGetId([
            'name'       => $validated['name'],
            'role'       => $validated['role']       ?? null,
            'bio'        => $validated['bio']        ?? null,
            'email'      => $validated['email']      ?? null,
            'phone'      => $validated['phone']      ?? null,
            'avatar_url' => $validated['photo_url']  ?? null,
            'is_active'  => $validated['is_active']  ?? true,
            'sort_order' => $validated['sort_order'] ?? $nextOrder,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $row    = DB::table('staff')->find($id);
        $result = $this->format($row);

        tenancy()->end();

        return response()->json($result, 201);
    }

    // PATCH /editor/staff/{staff}
    public function update(Request $request, int $staff): JsonResponse
    {
        $validated = $request->validate([
            'name'       => 'sometimes|required|string|max:255',
            'role'       => 'nullable|string|max:255',
            'bio'        => 'nullable|string|max:5000',
            'email'      => 'nullable|email|max:255',
            'phone'      => 'nullable|string|max:50',
            'photo_url'  => 'nullable|string|max:1000',
            'is_active'  => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        $data = ['updated_at' => now()];

        foreach (['name', 'role', 'bio', 'email', 'phone'] as $field) {
            if (array_key_exists($field, $validated)) {
                $data[$field] = $validated[$field];
            }
        }

        if (array_key_exists('photo_url', $validated)) {
            $data['avatar_url'] = $validated['photo_url'];
        }

        if (array_key_exists('is_active', $validated)) {
            $data['is_active'] = $validated['is_active'];
        }

        if (array_key_exists('sort_order', $validated)) {
            $data['sort_order'] = $validated['sort_order'];
        }

        DB::table('staff')->where('id', $staff)->update($data);
        $updated = DB::table('staff')->find($staff);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }

    // DELETE /editor/staff/{staff}
    // Soft archive: sets is_active = false, preserves the record.
    public function destroy(Request $request, int $staff): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $row = DB::table('staff')->find($staff);
        if (! $row) {
            tenancy()->end();
            return response()->json(['message' => 'Staff member not found'], 404);
        }

        DB::table('staff')->where('id', $staff)->update([
            'is_active'  => false,
            'updated_at' => now(),
        ]);

        $updated = DB::table('staff')->find($staff);
        $result  = $this->format($updated);

        tenancy()->end();

        return response()->json($result);
    }
}
