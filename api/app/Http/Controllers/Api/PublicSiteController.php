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

        $dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $fmtTime  = fn (?string $t) => $t ? substr($t, 0, 5) : null;

        $hours = DB::table('hours')
            ->orderBy('day_of_week')
            ->get()
            ->map(fn ($r) => [
                'id'          => (int)   $r->id,
                'day_of_week' => (int)   $r->day_of_week,
                'day_name'    =>          $dayNames[(int) $r->day_of_week],
                'is_open'     => ! (bool) $r->is_closed,
                'open_time'   =>          $fmtTime($r->open_time),
                'close_time'  =>          $fmtTime($r->close_time),
                'break_start' =>          $fmtTime($r->break_start ?? null),
                'break_end'   =>          $fmtTime($r->break_end   ?? null),
            ])
            ->values()
            ->all();

        $settingsRow = DB::table('booking_settings')->first();
        $settings = $settingsRow ? [
            'buffer_before_minutes'     => (int)   $settingsRow->buffer_before_minutes,
            'buffer_after_minutes'      => (int)   $settingsRow->buffer_after_minutes,
            'minimum_notice_minutes'    => (int)   $settingsRow->minimum_notice_minutes,
            'booking_interval_minutes'  => (int)   $settingsRow->booking_interval_minutes,
            'max_days_ahead'            => (int)   $settingsRow->max_days_ahead,
            'max_appointments_per_day'  =>          $settingsRow->max_appointments_per_day !== null
                                                        ? (int) $settingsRow->max_appointments_per_day
                                                        : null,
            'auto_confirm_bookings'     => (bool)  $settingsRow->auto_confirm_bookings,
            'slot_release_enabled'      => (bool)  $settingsRow->slot_release_enabled,
            'slot_release_frequency'    =>          $settingsRow->slot_release_frequency,
            'slot_release_day_of_week'  =>          $settingsRow->slot_release_day_of_week  !== null
                                                        ? (int) $settingsRow->slot_release_day_of_week
                                                        : null,
            'slot_release_day_of_month' =>          $settingsRow->slot_release_day_of_month !== null
                                                        ? (int) $settingsRow->slot_release_day_of_month
                                                        : null,
            'slot_release_time'         =>          $fmtTime($settingsRow->slot_release_time),
            'slot_release_window_days'  =>          $settingsRow->slot_release_window_days  !== null
                                                        ? (int) $settingsRow->slot_release_window_days
                                                        : null,
        ] : null;

        $profileArr  = $profile  ? (array) $profile->toArray()  : null;
        $policiesArr = $policies ? (array) $policies->toArray() : null;

        tenancy()->end();

        return response()->json([
            'tenant_id'     => $tenant->id,
            'slug'          => $tenant->id,
            'domain'        => $domain?->domain,
            'business_name' => $profileArr['business_name'] ?? null,
            'plan'          => $tenant->plan,
            'status'        => 'active',
            'profile'       => $profileArr,
            'services'      => $services,
            'hours'         => $hours,
            'policies'      => $policiesArr,
            'availability'  => [
                'hours'    => $hours,
                'settings' => $settings,
            ],
        ]);
    }
}
