<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $profile = BusinessProfile::first() ?? new BusinessProfile([
            'booking_enabled' => true,
            'site_status'     => 'active',
        ]);

        tenancy()->end();

        return response()->json($profile);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'business_name'   => 'nullable|string|max:255',
            'tagline'         => 'nullable|string|max:255',
            'business_type'   => 'nullable|string|max:100',
            'public_email'    => 'nullable|email|max:255',
            'public_phone'    => 'nullable|string|max:50',
            'address_line'    => 'nullable|string|max:255',
            'city'            => 'nullable|string|max:100',
            'state'           => 'nullable|string|max:100',
            'zip'             => 'nullable|string|max:20',
            'instagram_url'   => 'nullable|string|max:255',
            'booking_enabled' => 'nullable|boolean',
            'site_status'     => 'nullable|string|in:active,maintenance,inactive',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $profile = BusinessProfile::first();
        if ($profile) {
            $profile->update($validated);
        } else {
            $profile = BusinessProfile::create($validated);
        }

        tenancy()->end();

        return response()->json($profile);
    }
}
