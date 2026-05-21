<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PublicSiteController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        // Accept only lowercase letters and numbers — reject anything else
        $slug = strtolower($slug);
        if (! preg_match('/^[a-z0-9]+$/', $slug)) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $tenant = Tenant::find($slug);

        if (! $tenant) {
            return response()->json(['message' => 'Site not found'], 404);
        }

        $domain = $tenant->domains()->first();

        tenancy()->initialize($tenant);

        $profile  = BusinessProfile::first();
        $services = DB::table('services')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($r) => [
                'id'               => (int)  $r->id,
                'name'             =>         $r->name,
                'description'      =>         $r->description,
                'price'            => (float) $r->price,
                'duration_minutes' => (int)   $r->duration,
                'category'         =>         $r->category ?? null,
                'is_active'        => (bool)  $r->is_active,
                'sort_order'       => (int)   $r->sort_order,
            ])
            ->values();

        tenancy()->end();

        return response()->json([
            'tenant_id'     => $tenant->id,
            'slug'          => $tenant->id,
            'domain'        => $domain?->domain,
            'business_name' => $profile?->business_name ?? $tenant->business_name,
            'plan'          => $tenant->plan,
            'status'        => 'active',
            'profile'       => $profile,
            'services'      => $services,
        ]);
    }
}
