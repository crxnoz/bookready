<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class BusinessController extends Controller
{
    public function show(): JsonResponse
    {
        $business = DB::table('businesses')->first();

        return response()->json($business);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'              => ['sometimes', 'string', 'max:100'],
            'tagline'           => ['sometimes', 'nullable', 'string', 'max:200'],
            'bio'               => ['sometimes', 'nullable', 'string', 'max:2000'],
            'logo_url'          => ['sometimes', 'nullable', 'url'],
            'cover_image_url'   => ['sometimes', 'nullable', 'url'],
            'primary_color'     => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color'      => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'booking_url'       => ['sometimes', 'nullable', 'url'],
            'instagram_handle'  => ['sometimes', 'nullable', 'string', 'max:60'],
            'phone'             => ['sometimes', 'nullable', 'string', 'max:30'],
            'email'             => ['sometimes', 'nullable', 'email'],
            'address'           => ['sometimes', 'nullable', 'string', 'max:200'],
            'city'              => ['sometimes', 'nullable', 'string', 'max:100'],
            'state'             => ['sometimes', 'nullable', 'string', 'max:100'],
            'zip'               => ['sometimes', 'nullable', 'string', 'max:20'],
        ]);

        DB::table('businesses')->update(array_merge($data, ['updated_at' => now()]));

        // Bust the public template cache so Next.js revalidates
        Cache::forget('template:' . tenancy()->tenant->id);

        return response()->json(DB::table('businesses')->first());
    }
}
