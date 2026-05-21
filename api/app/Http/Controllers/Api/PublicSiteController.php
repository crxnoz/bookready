<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessPolicy;
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
        $policies = BusinessPolicy::first();
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

        $hours = DB::table('hours')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => [
                'id'          => (int)   $r->id,
                'day_of_week' => (int)   $r->day_of_week,
                'day_name'    => ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][(int) $r->day_of_week],
                'is_open'     => ! (bool) $r->is_closed,
                'open_time'   => $r->open_time  ? substr($r->open_time,  0, 5) : null,
                'close_time'  => $r->close_time ? substr($r->close_time, 0, 5) : null,
                'break_start' => isset($r->break_start) && $r->break_start ? substr($r->break_start, 0, 5) : null,
                'break_end'   => isset($r->break_end)   && $r->break_end   ? substr($r->break_end,   0, 5) : null,
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
            'hours'         => $hours,
            'policies'      => $policies,
        ]);
    }
}
