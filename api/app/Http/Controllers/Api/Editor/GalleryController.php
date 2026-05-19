<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class GalleryController extends Controller
{
    public function index(): JsonResponse
    {
        $sections = DB::table('gallery_sections')->orderBy('sort_order')->get();
        $images   = DB::table('gallery_images')->orderBy('sort_order')->get()->groupBy('section_id');

        $payload = $sections->map(fn ($s) => array_merge((array) $s, [
            'images' => $images->get($s->id, collect())->values(),
        ]));

        return response()->json($payload);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:100']]);
        $id   = DB::table('gallery_sections')->insertGetId(array_merge($data, [
            'sort_order' => DB::table('gallery_sections')->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        return response()->json(DB::table('gallery_sections')->find($id), 201);
    }

    public function update(Request $request, int $section): JsonResponse
    {
        $data = $request->validate(['title' => ['required', 'string', 'max:100']]);
        DB::table('gallery_sections')->where('id', $section)->update(array_merge($data, ['updated_at' => now()]));
        $this->bustCache();

        return response()->json(DB::table('gallery_sections')->find($section));
    }

    public function destroy(int $section): JsonResponse
    {
        DB::table('gallery_sections')->delete($section);
        $this->bustCache();

        return response()->json(null, 204);
    }

    public function storeImage(Request $request, int $section): JsonResponse
    {
        $data = $request->validate([
            'url' => ['required', 'url'],
            'alt' => ['nullable', 'string', 'max:200'],
        ]);

        $id = DB::table('gallery_images')->insertGetId(array_merge($data, [
            'section_id' => $section,
            'sort_order' => DB::table('gallery_images')->where('section_id', $section)->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->bustCache();

        return response()->json(DB::table('gallery_images')->find($id), 201);
    }

    public function destroyImage(int $image): JsonResponse
    {
        DB::table('gallery_images')->delete($image);
        $this->bustCache();

        return response()->json(null, 204);
    }

    public function reorderSections(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array']]);
        foreach ($request->ids as $order => $id) {
            DB::table('gallery_sections')->where('id', $id)->update(['sort_order' => $order]);
        }
        $this->bustCache();

        return response()->json(['ok' => true]);
    }

    public function reorderImages(Request $request, int $section): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array']]);
        foreach ($request->ids as $order => $id) {
            DB::table('gallery_images')->where('id', $id)->where('section_id', $section)->update(['sort_order' => $order]);
        }
        $this->bustCache();

        return response()->json(['ok' => true]);
    }

    private function bustCache(): void
    {
        Cache::forget('template:' . tenancy()->tenant->id);
    }
}
