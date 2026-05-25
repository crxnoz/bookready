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
        // Defensive reader — preferences columns don't exist on tenants
        // that haven't run migration #5 yet. Return safe defaults instead
        // of crashing.
        $get = static fn(?BusinessProfile $p, string $k, $default = null) =>
            $p && property_exists($p, $k) ? $p->{$k} : ($p?->getAttribute($k) ?? $default);

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
                // Preferences (migration #5 — may be null on un-migrated tenants)
                'time_zone'                            => $get($profile, 'time_zone'),
                'week_start_day'                       => (int) ($get($profile, 'week_start_day', 0)),
                'time_format'                          => $get($profile, 'time_format', '12h'),
                'default_appointment_duration_minutes' => (int) ($get($profile, 'default_appointment_duration_minutes', 60)),
                'post_booking_message'                 => $get($profile, 'post_booking_message'),
                'email_signature'                      => $get($profile, 'email_signature'),
                'site_visibility'                      => $get($profile, 'site_visibility', 'public'),
                // password_hash is intentionally NOT exposed; we just signal whether one is set
                'site_password_set'                    => ! empty($get($profile, 'site_password_hash')),
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
            'time_zone'       => null,
            'week_start_day'  => 0,
            'time_format'     => '12h',
            'default_appointment_duration_minutes' => 60,
            'post_booking_message' => null,
            'email_signature' => null,
            'site_visibility' => 'public',
            'site_password_set' => false,
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
            // Preferences (migration #5)
            'time_zone'                            => 'sometimes|nullable|string|max:64',
            'week_start_day'                       => 'sometimes|integer|in:0,1',
            'time_format'                          => 'sometimes|string|in:12h,24h',
            'default_appointment_duration_minutes' => 'sometimes|integer|min:5|max:600',
            'post_booking_message'                 => 'sometimes|nullable|string|max:1000',
            'email_signature'                      => 'sometimes|nullable|string|max:500',
            'site_visibility'                      => 'sometimes|string|in:public,private,coming_soon',
            // Plain password — controller hashes before storing. Pass '' to clear.
            'site_password'                        => 'sometimes|nullable|string|max:100',
        ]);

        $tenant = Tenant::findOrFail($request->user()->tenant_id);
        tenancy()->initialize($tenant);

        // Hash the password before persisting; never store the plain text.
        // An empty string clears the existing one (useful when site_visibility
        // flips off 'private').
        if (array_key_exists('site_password', $validated)) {
            $pw = $validated['site_password'];
            $validated['site_password_hash'] = ($pw === null || $pw === '')
                ? null
                : \Illuminate\Support\Facades\Hash::make($pw);
            unset($validated['site_password']);
        }

        // Guard: don't crash on tenants that haven't run migration #5 — drop
        // any preference columns we know don't exist there.
        $apptCols = \Illuminate\Support\Facades\Schema::getColumnListing('business_profiles');
        foreach (array_keys($validated) as $key) {
            if (! in_array($key, $apptCols, true)) {
                unset($validated[$key]);
            }
        }

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
