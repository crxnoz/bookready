<?php

namespace App\Http\Controllers\Api\Editor;

use App\Http\Controllers\Controller;
use App\Models\BusinessProfile;
use App\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BusinessProfileController extends Controller
{
    /**
     * Convert an Eloquent model (or seed array) to a plain array while
     * tenancy is still initialized. This avoids the "Database connection
     * [tenant] not configured" error that fires if response()->json()
     * tries to serialize a tenant-bound model AFTER tenancy()->end()
     * has removed the connection.
     */
    private function format(?BusinessProfile $profile): array
    {
        if ($profile && $profile->exists) {
            return [
                'id'              => (int)  $profile->id,
                'business_name'   =>         $profile->business_name,
                'tagline'         =>         $profile->tagline,
                'business_type'   =>         $profile->business_type,
                'public_email'    =>         $profile->public_email,
                'public_phone'    =>         $profile->public_phone,
                'address_line'    =>         $profile->address_line,
                'city'            =>         $profile->city,
                'state'           =>         $profile->state,
                'zip'             =>         $profile->zip,
                'instagram_url'   =>         $profile->instagram_url,
                'booking_enabled' => (bool)  $profile->booking_enabled,
                'site_status'     =>         $profile->site_status,
                'created_at'      => $profile->created_at?->toJSON(),
                'updated_at'      => $profile->updated_at?->toJSON(),
            ];
        }

        return [
            'business_name'   => null,
            'tagline'         => null,
            'business_type'   => null,
            'public_email'    => null,
            'public_phone'    => null,
            'address_line'    => null,
            'city'            => null,
            'state'           => null,
            'zip'             => null,
            'instagram_url'   => null,
            'booking_enabled' => true,
            'site_status'     => 'active',
        ];
    }

    public function show(Request $request): JsonResponse
    {
        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        $profile = BusinessProfile::first();
        $result  = $this->format($profile);

        tenancy()->end();

        return response()->json($result);
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

        $result = $this->format($profile);

        tenancy()->end();

        return response()->json($result);
    }
}
