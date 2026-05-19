<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    public function index(): JsonResponse
    {
        $services = DB::table('services')
            ->leftJoin('service_categories', 'services.category_id', '=', 'service_categories.id')
            ->orderBy('service_categories.sort_order')
            ->orderBy('services.sort_order')
            ->select('services.*', 'service_categories.name as category_name')
            ->get();

        return response()->json($services);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id' => ['nullable', 'integer'],
            'name'        => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'duration'    => ['required', 'integer', 'min:5', 'max:480'],
            'price'       => ['required', 'numeric', 'min:0'],
            'deposit'     => ['nullable', 'numeric', 'min:0'],
            'is_active'   => ['boolean'],
        ]);

        $id = DB::table('services')->insertGetId(array_merge($data, [
            'sort_order' => DB::table('services')->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->bustCache();

        return response()->json(DB::table('services')->find($id), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'category_id' => ['nullable', 'integer'],
            'name'        => ['sometimes', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'duration'    => ['sometimes', 'integer', 'min:5', 'max:480'],
            'price'       => ['sometimes', 'numeric', 'min:0'],
            'deposit'     => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        DB::table('services')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        $this->bustCache();

        return response()->json(DB::table('services')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        DB::table('services')->delete($id);
        $this->bustCache();

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array']]);

        foreach ($request->ids as $order => $id) {
            DB::table('services')->where('id', $id)->update(['sort_order' => $order]);
        }

        $this->bustCache();

        return response()->json(['ok' => true]);
    }

    private function bustCache(): void
    {
        Cache::forget('template:' . tenancy()->tenant->id);
    }
}
