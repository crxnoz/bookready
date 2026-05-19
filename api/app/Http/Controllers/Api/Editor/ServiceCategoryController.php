<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ServiceCategoryController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('service_categories')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);

        $id = DB::table('service_categories')->insertGetId(array_merge($data, [
            'sort_order' => DB::table('service_categories')->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json(DB::table('service_categories')->find($id), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:100']]);
        DB::table('service_categories')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        $this->bustCache();

        return response()->json(DB::table('service_categories')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        // Null out category on orphaned services
        DB::table('services')->where('category_id', $id)->update(['category_id' => null]);
        DB::table('service_categories')->delete($id);
        $this->bustCache();

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array']]);
        foreach ($request->ids as $order => $id) {
            DB::table('service_categories')->where('id', $id)->update(['sort_order' => $order]);
        }
        $this->bustCache();

        return response()->json(['ok' => true]);
    }

    private function bustCache(): void
    {
        Cache::forget('template:' . tenancy()->tenant->id);
    }
}
