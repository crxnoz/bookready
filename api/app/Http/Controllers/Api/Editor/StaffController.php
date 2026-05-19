<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('staff')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['required', 'string', 'max:100'],
            'role'             => ['nullable', 'string', 'max:100'],
            'bio'              => ['nullable', 'string', 'max:1000'],
            'avatar_url'       => ['nullable', 'url'],
            'instagram_handle' => ['nullable', 'string', 'max:60'],
        ]);

        $id = DB::table('staff')->insertGetId(array_merge($data, [
            'sort_order' => DB::table('staff')->max('sort_order') + 1,
            'is_active'  => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->bustCache();

        return response()->json(DB::table('staff')->find($id), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name'             => ['sometimes', 'string', 'max:100'],
            'role'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'bio'              => ['sometimes', 'nullable', 'string', 'max:1000'],
            'avatar_url'       => ['sometimes', 'nullable', 'url'],
            'instagram_handle' => ['sometimes', 'nullable', 'string', 'max:60'],
            'is_active'        => ['sometimes', 'boolean'],
        ]);

        DB::table('staff')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        $this->bustCache();

        return response()->json(DB::table('staff')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        DB::table('staff')->delete($id);
        $this->bustCache();

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array']]);
        foreach ($request->ids as $order => $id) {
            DB::table('staff')->where('id', $id)->update(['sort_order' => $order]);
        }
        $this->bustCache();

        return response()->json(['ok' => true]);
    }

    private function bustCache(): void
    {
        Cache::forget('template:' . tenancy()->tenant->id);
    }
}
