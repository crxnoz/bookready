<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class PublicTemplateController extends Controller
{
    /**
     * Return the full template payload for the current tenant.
     * Called by Next.js SSR — cached aggressively, purged on editor saves.
     */
    public function show(): JsonResponse
    {
        $tenantId = tenancy()->tenant->id;

        $data = Cache::remember("template:{$tenantId}", 3600, function () {
            return [
                'business'        => DB::table('businesses')->first(),
                'services'        => $this->services(),
                'gallery'         => $this->gallery(),
                'hours'           => DB::table('hours')->orderBy('day_of_week')->get(),
                'policies'        => DB::table('policies')->where('is_visible', true)->orderBy('sort_order')->get(),
                'contact_buttons' => DB::table('contact_buttons')->where('is_active', true)->orderBy('sort_order')->get(),
                'staff'           => DB::table('staff')->where('is_active', true)->orderBy('sort_order')->get(),
            ];
        });

        return response()->json($data);
    }

    private function services(): array
    {
        $categories = DB::table('service_categories')
            ->orderBy('sort_order')
            ->get();

        $services = DB::table('services')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->groupBy('category_id');

        return $categories->map(fn ($cat) => [
            'id'       => $cat->id,
            'name'     => $cat->name,
            'services' => $services->get($cat->id, collect())->values(),
        ])->values()->all();
    }

    private function gallery(): array
    {
        $sections = DB::table('gallery_sections')->orderBy('sort_order')->get();
        $images   = DB::table('gallery_images')->orderBy('sort_order')->get()->groupBy('section_id');

        return $sections->map(fn ($sec) => [
            'id'     => $sec->id,
            'title'  => $sec->title,
            'images' => $images->get($sec->id, collect())->values(),
        ])->values()->all();
    }
}
