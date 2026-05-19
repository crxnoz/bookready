<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ContactButtonController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(DB::table('contact_buttons')->orderBy('sort_order')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'      => ['required', 'in:phone,instagram,email,booking_link,whatsapp,tiktok,facebook,custom'],
            'label'     => ['required', 'string', 'max:60'],
            'value'     => ['required', 'string', 'max:255'],
            'is_active' => ['boolean'],
        ]);

        $id = DB::table('contact_buttons')->insertGetId(array_merge($data, [
            'sort_order' => DB::table('contact_buttons')->max('sort_order') + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]));

        $this->bustCache();

        return response()->json(DB::table('contact_buttons')->find($id), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'label'     => ['sometimes', 'string', 'max:60'],
            'value'     => ['sometimes', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::table('contact_buttons')->where('id', $id)->update(array_merge($data, ['updated_at' => now()]));
        $this->bustCache();

        return response()->json(DB::table('contact_buttons')->find($id));
    }

    public function destroy(int $id): JsonResponse
    {
        DB::table('contact_buttons')->delete($id);
        $this->bustCache();

        return response()->json(null, 204);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate(['ids' => ['required', 'array']]);
        foreach ($request->ids as $order => $id) {
            DB::table('contact_buttons')->where('id', $id)->update(['sort_order' => $order]);
        }
        $this->bustCache();

        return response()->json(['ok' => true]);
    }

    private function bustCache(): void
    {
        Cache::forget('template:' . tenancy()->tenant->id);
    }
}
