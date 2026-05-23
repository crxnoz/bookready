<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessPolicy;
use App\Models\BusinessProfile;
use App\Models\Tenant;
use App\Support\TemplateDefaults;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

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

        $staff = DB::table('staff')
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($r) => [
                'id'         => (int) $r->id,
                'name'       =>        $r->name,
                'role'       =>        $r->role,
                'bio'        =>        $r->bio,
                'photo_url'  =>        $r->avatar_url ?? null,
                'sort_order' => (int)  $r->sort_order,
            ])
            ->values()
            ->all();

        // ── Gallery items (active only, public) ──
        $gallery = [];
        if (Schema::hasTable('gallery_items')) {
            $gallery = DB::table('gallery_items')
                ->where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'         => (int) $r->id,
                    'title'      =>        $r->title,
                    'caption'    =>        $r->caption,
                    'alt_text'   =>        $r->alt_text,
                    'image_url'  =>        $r->image_url,
                    'category'   =>        $r->category,
                    'sort_order' => (int)  $r->sort_order,
                ])
                ->values()
                ->all();
        }

        // ── Template settings + sections (graceful fallback if migrations not yet run) ──
        $templateSlug = TemplateDefaults::DEFAULT_TEMPLATE_SLUG;
        $templateSettings = TemplateDefaults::settingsFor($templateSlug);
        $templateSections = [];

        if (Schema::hasTable('template_settings')) {
            $tsRow = DB::table('template_settings')
                ->where('template_slug', $templateSlug)
                ->first();
            if ($tsRow && $tsRow->settings_json) {
                $templateSettings = TemplateDefaults::mergeWithDefaults(
                    $templateSlug,
                    json_decode($tsRow->settings_json, true) ?: []
                );
            }
        }

        if (Schema::hasTable('website_sections')) {
            $templateSections = DB::table('website_sections')
                ->where('template_slug', $templateSlug)
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'           => (int)  $r->id,
                    'section_key'  =>        $r->section_key,
                    'section_type' =>        $r->section_type,
                    'title'        =>        $r->title,
                    'subtitle'     =>        $r->subtitle,
                    'content_json' =>        $r->content_json ? json_decode($r->content_json, true) : null,
                    'is_enabled'   => (bool) $r->is_enabled,
                    'is_locked'    => (bool) $r->is_locked,
                    'sort_order'   => (int)  $r->sort_order,
                ])
                ->values()
                ->all();
        }

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
            'staff'         => $staff,
            'availability'  => [
                'hours'    => $hours,
                'settings' => $settings,
            ],
            'gallery'       => $gallery,
            'template'      => [
                'slug'     => $templateSlug,
                'settings' => $templateSettings,
                'sections' => $templateSections,
            ],
        ]);
    }
}
