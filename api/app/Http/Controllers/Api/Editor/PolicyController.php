<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PolicyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('policies')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'       => ['required', 'in:cancellation,booking,deposit,late,custom'],
            'title'      => ['required', 'string', 'max:150'],
            'content'    => ['required', 'string'],
            'is_visible' => ['boolean'],
        ]);

        $id = DB::table('policies')->insertGetId(array_merge($data, [
            'sort_order' => DB::table('policies')->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->bustCache();

        return response()->json(DB::table('policies')->find($id), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'title'      => ['sometimes', 'string', 'max:150'],
            'content'    => ['sometimes', 'string'],
            'is_visible' => ['sometimes', 'boolean'],
        ]);

        DB::table('policies')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        $this->bustCache();

        return response()->json(DB::table('policies')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        DB::table('policies')->delete($id);
        $this->bustCache();

        return response()->json(null, 204);
    }

    private function bustCache(): void
    {
        Cache::forget('template:' . tenancy()->tenant->id);
    }
}
