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
        // Phase 3 + 4: categories are now a separate resource, services
        // carry per-service overrides + assigned staff. Old tenants that
        // haven't run the migrations are tolerated via Schema checks so
        // the public payload never explodes.
        $hasCategoryId   = Schema::hasColumn('services', 'category_id');
        $hasServiceImage = Schema::hasColumn('services', 'image_url');
        $hasBufferBefore = Schema::hasColumn('services', 'buffer_before_override_minutes');
        $hasBufferAfter  = Schema::hasColumn('services', 'buffer_after_override_minutes');
        $hasAvailDays    = Schema::hasColumn('services', 'available_days');

        // Bulk-load the service_staff pivot so we don't pay an N+1.
        $assignedByService = [];
        if (Schema::hasTable('service_staff')) {
            $assignedByService = DB::table('service_staff')
                ->orderBy('service_id')
                ->get(['service_id', 'staff_id'])
                ->groupBy('service_id')
                ->map(fn ($rows) => $rows->pluck('staff_id')->map(fn ($i) => (int) $i)->values()->all())
                ->toArray();
        }

        // Phase 5: bulk-load addon links per service so the booking form
        // can render the right add-ons without an extra round trip.
        $addonLinksByService = [];
        if (Schema::hasTable('service_addon_links')) {
            $addonLinksByService = DB::table('service_addon_links')
                ->orderBy('service_id')
                ->orderBy('id')
                ->get(['service_id', 'addon_id', 'is_required'])
                ->groupBy('service_id')
                ->map(fn ($rows) => $rows->map(fn ($r) => [
                    'addon_id'    => (int) $r->addon_id,
                    'is_required' => (bool) $r->is_required,
                ])->values()->all())
                ->toArray();
        }

        $services = DB::table('services')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(function ($r) use ($hasCategoryId, $hasServiceImage, $hasBufferBefore, $hasBufferAfter, $hasAvailDays, $assignedByService, $addonLinksByService) {
                $availableDays = null;
                if ($hasAvailDays && $r->available_days !== null) {
                    $decoded = is_string($r->available_days) ? json_decode($r->available_days, true) : $r->available_days;
                    if (is_array($decoded)) {
                        $availableDays = array_values(array_filter(
                            array_map('intval', $decoded),
                            fn ($d) => $d >= 0 && $d <= 6,
                        ));
                        if (empty($availableDays)) $availableDays = null;
                    }
                }
                return [
                    'id'               => (int)  $r->id,
                    'name'             =>         $r->name,
                    'description'      =>         $r->description,
                    'price'            => (float) $r->price,
                    'duration_minutes' => (int)   $r->duration,
                    // Legacy free-text category — kept until Phase 8 drops it.
                    'category'         =>         $r->category ?? null,
                    'category_id'      => $hasCategoryId && $r->category_id !== null ? (int) $r->category_id : null,
                    'image_url'        => $hasServiceImage ? ($r->image_url ?? null) : null,
                    'buffer_before_override_minutes' => $hasBufferBefore && $r->buffer_before_override_minutes !== null
                        ? (int) $r->buffer_before_override_minutes : null,
                    'buffer_after_override_minutes'  => $hasBufferAfter && $r->buffer_after_override_minutes !== null
                        ? (int) $r->buffer_after_override_minutes  : null,
                    'available_days'                 => $availableDays,
                    'assigned_staff_ids'             => $assignedByService[(int) $r->id] ?? [],
                    'linked_addons'                  => $addonLinksByService[(int) $r->id] ?? [],
                    'is_active'        => (bool)  $r->is_active,
                    'sort_order'       => (int)   $r->sort_order,
                ];
            })
            ->values();

        // Service add-ons (Phase 5) — exposed alongside services so the
        // public booking form can render the right options without a
        // round trip. Active-only; tenant-scoped via the tenant DB.
        $serviceAddons = [];
        if (Schema::hasTable('service_addons')) {
            $serviceAddons = DB::table('service_addons')
                ->where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'                     => (int) $r->id,
                    'name'                   =>       $r->name,
                    'description'            =>       $r->description ?? null,
                    'image_url'              =>       $r->image_url   ?? null,
                    'extra_price'            => (float) ($r->extra_price_cents / 100),
                    'extra_price_cents'      => (int)  $r->extra_price_cents,
                    'extra_duration_minutes' => (int)  $r->extra_duration_minutes,
                    'sort_order'             => (int)  $r->sort_order,
                ])
                ->values()
                ->all();
        }

        // Service categories — exposed so the booking widget can group
        // services by category card on the public site.
        $serviceCategories = [];
        if (Schema::hasTable('service_categories')) {
            $hasCatDesc   = Schema::hasColumn('service_categories', 'description');
            $hasCatImg    = Schema::hasColumn('service_categories', 'image_url');
            $hasCatActive = Schema::hasColumn('service_categories', 'is_active');
            $serviceCategories = DB::table('service_categories')
                ->when($hasCatActive, fn ($q) => $q->where('is_active', true))
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'          => (int) $r->id,
                    'name'        =>       $r->name,
                    'description' => $hasCatDesc ? ($r->description ?? null) : null,
                    'image_url'   => $hasCatImg  ? ($r->image_url   ?? null) : null,
                    'sort_order'  => (int) $r->sort_order,
                ])
                ->values()
                ->all();
        }

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

        // Normalize custom_groups to always be an array on the public payload.
        // The model casts null → null (not []), so older policy rows would
        // come through with custom_groups: null. The template renders cleaner
        // when it can iterate unconditionally.
        if (is_array($policiesArr)) {
            $rawGroups = $policiesArr['custom_groups'] ?? null;
            $policiesArr['custom_groups'] = is_array($rawGroups)
                ? array_values(array_map(function ($g) {
                    if (! is_array($g)) return null;
                    $items = is_array($g['items'] ?? null) ? $g['items'] : [];
                    return [
                        'heading' => (string) ($g['heading'] ?? ''),
                        'items'   => array_values(array_filter(array_map(function ($it) {
                            if (! is_array($it)) return null;
                            return [
                                'title'   => (string) ($it['title']   ?? ''),
                                'content' => (string) ($it['content'] ?? ''),
                            ];
                        }, $items))),
                    ];
                }, $rawGroups))
                : [];
            // Filter nulls that array_map produced for non-array entries.
            $policiesArr['custom_groups'] = array_values(array_filter(
                $policiesArr['custom_groups'],
                fn ($g) => $g !== null,
            ));
        }

        // Phase 2: pre-fetch per-staff hours + blocked dates so each staff
        // member surfaces them inline. Tables are defensively wrapped — old
        // tenants that haven't run the Phase 2 migrations still load.
        $hasStaffHours   = Schema::hasTable('staff_hours');
        $hasStaffBlocked = Schema::hasTable('staff_blocked_dates');
        $dayNames        = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $hoursByStaff    = $hasStaffHours
            ? DB::table('staff_hours')
                ->orderBy('staff_id')
                ->orderBy('day_of_week')
                ->get()
                ->groupBy('staff_id')
            : collect();
        $blockedByStaff  = $hasStaffBlocked
            ? DB::table('staff_blocked_dates')
                ->orderBy('staff_id')
                ->orderBy('start_date')
                ->get()
                ->groupBy('staff_id')
            : collect();

        $staff = DB::table('staff')
            ->where('is_active', true)
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->map(function ($r) use ($hoursByStaff, $blockedByStaff, $dayNames) {
                $staffId = (int) $r->id;
                $hours   = collect($hoursByStaff->get($staffId, []))
                    ->map(fn ($h) => [
                        'id'          => (int) $h->id,
                        'day_of_week' => (int) $h->day_of_week,
                        'day_name'    => $dayNames[(int) $h->day_of_week] ?? '',
                        'is_open'     => (bool) $h->is_open,
                        'open_time'   => $h->open_time   ? substr($h->open_time,   0, 5) : null,
                        'close_time'  => $h->close_time  ? substr($h->close_time,  0, 5) : null,
                        'break_start' => $h->break_start ? substr($h->break_start, 0, 5) : null,
                        'break_end'   => $h->break_end   ? substr($h->break_end,   0, 5) : null,
                    ])
                    ->values()
                    ->all();
                $blocked = collect($blockedByStaff->get($staffId, []))
                    ->map(fn ($b) => [
                        'id'         => (int) $b->id,
                        'staff_id'   => (int) $b->staff_id,
                        'start_date' => $b->start_date,
                        'end_date'   => $b->end_date,
                        'reason'     => $b->reason,
                    ])
                    ->values()
                    ->all();
                return [
                    'id'            => $staffId,
                    'name'          =>        $r->name,
                    'role'          =>        $r->role,
                    'bio'           =>        $r->bio,
                    'photo_url'     =>        $r->avatar_url ?? null,
                    'sort_order'    => (int)  $r->sort_order,
                    'hours'         => $hours,
                    'blocked_dates' => $blocked,
                ];
            })
            ->values()
            ->all();

        // ── Before & After items (active only, public) ──
        $beforeAfter = [];
        if (Schema::hasTable('before_after_items')) {
            $hasBaGroupCol = Schema::hasColumn('before_after_items', 'group_id');
            $beforeAfter = DB::table('before_after_items')
                ->where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'                => (int) $r->id,
                    'group_id'          => $hasBaGroupCol && $r->group_id !== null ? (int) $r->group_id : null,
                    'title'             =>        $r->title,
                    'caption'           =>        $r->caption,
                    'before_image_url'  =>        $r->before_image_url,
                    'after_image_url'   =>        $r->after_image_url,
                    'before_alt_text'   =>        $r->before_alt_text,
                    'after_alt_text'    =>        $r->after_alt_text,
                    'category'          =>        $r->category,
                    'sort_order'        => (int)  $r->sort_order,
                ])
                ->values()
                ->all();
        }

        // ── Before & After groups ──
        $beforeAfterGroups = [];
        if (Schema::hasTable('before_after_groups')) {
            $beforeAfterGroups = DB::table('before_after_groups')
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'         => (int) $r->id,
                    'heading'    =>       $r->heading,
                    'sort_order' => (int) $r->sort_order,
                ])
                ->values()
                ->all();
        }

        // ── Gallery items (active only, public) ──
        $gallery = [];
        if (Schema::hasTable('gallery_items')) {
            $hasGalleryGroupCol = Schema::hasColumn('gallery_items', 'group_id');
            $gallery = DB::table('gallery_items')
                ->where('is_active', true)
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'         => (int) $r->id,
                    'group_id'   => $hasGalleryGroupCol && $r->group_id !== null ? (int) $r->group_id : null,
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

        // ── Gallery groups ──
        $galleryGroups = [];
        if (Schema::hasTable('gallery_groups')) {
            $galleryGroups = DB::table('gallery_groups')
                ->orderBy('sort_order', 'asc')
                ->orderBy('id', 'asc')
                ->get()
                ->map(fn ($r) => [
                    'id'         => (int) $r->id,
                    'heading'    =>       $r->heading,
                    'sort_order' => (int) $r->sort_order,
                ])
                ->values()
                ->all();
        }

        // ── Booking settings (graceful fallback if migrations not yet run) ──
        $bookingSettings = [
            'booking_enabled'                   => true,
            'auto_confirm_bookings'             => false,
            'minimum_notice_minutes'            => 120,
            'max_days_ahead'                    => 30,
            'slot_interval_minutes'             => 30,
            'slot_release_mode'                 => 'always_open',
            'slot_release_window_days'          => null,
            'cancellation_window_hours'         => 24,
            'reschedule_window_hours'           => 24,
            'prevent_duplicate_client_bookings' => false,
        ];
        if (Schema::hasTable('booking_settings')) {
            $bsRow = DB::table('booking_settings')->first();
            if ($bsRow) {
                $bsGet = static fn(string $k, $default = null) =>
                    property_exists($bsRow, $k) ? $bsRow->{$k} : $default;
                $releaseEnabled = (bool) ($bsRow->slot_release_enabled ?? false);
                $releaseFreq    = $bsRow->slot_release_frequency ?? null;
                $mode = (! $releaseEnabled || ! in_array($releaseFreq, ['weekly', 'biweekly', 'monthly'], true))
                    ? 'always_open'
                    : $releaseFreq;
                $bookingSettings = [
                    'booking_enabled'                   => (bool) ($bsGet('booking_enabled', true)),
                    'auto_confirm_bookings'             => (bool) $bsRow->auto_confirm_bookings,
                    'minimum_notice_minutes'            => (int)  $bsRow->minimum_notice_minutes,
                    'max_days_ahead'                    => (int)  $bsRow->max_days_ahead,
                    'slot_interval_minutes'             => (int)  $bsRow->booking_interval_minutes,
                    'slot_release_mode'                 =>        $mode,
                    'slot_release_window_days'          => $bsRow->slot_release_window_days !== null
                                                                ? (int) $bsRow->slot_release_window_days
                                                                : null,
                    'cancellation_window_hours'         => (int)  ($bsGet('cancellation_window_hours', 24)),
                    'reschedule_window_hours'           => (int)  ($bsGet('reschedule_window_hours', 24)),
                    'prevent_duplicate_client_bookings' => (bool) ($bsGet('prevent_duplicate_client_bookings', false)),
                ];
            }
        }

        // ── Payment settings (graceful fallback if migrations not yet run) ──
        $paymentSettings = [
            'payments_enabled'   => false,
            'deposits_enabled'   => false,
            'deposit_type'       => null,
            'deposit_amount'     => null,
            'allow_full_payment' => false,
            'currency'           => 'USD',
        ];
        if (Schema::hasTable('payment_settings')) {
            $psRow = DB::table('payment_settings')->first();
            if ($psRow) {
                // Read add-on columns defensively in case migration #4 hasn't
                // run yet on this tenant.
                $get = static fn(string $k, $default = null) =>
                    property_exists($psRow, $k) ? $psRow->{$k} : $default;
                $paymentSettings = [
                    'payments_enabled'   => (bool) $psRow->payments_enabled,
                    'deposits_enabled'   => (bool) $psRow->deposits_enabled,
                    'deposit_type'       =>        $psRow->deposit_type,
                    'deposit_amount'     => $psRow->deposit_amount !== null ? (float) $psRow->deposit_amount : null,
                    'allow_full_payment' => (bool) $psRow->allow_full_payment,
                    'allow_split_pay'    => (bool) $get('allow_split_pay', false),
                    'collect_tax'        => (bool) $get('collect_tax',     false),
                    'late_cancel_fee_amount'   => $get('late_cancel_fee_amount') !== null ? (float) $get('late_cancel_fee_amount') : null,
                    'late_cancel_window_hours' => (int)  $get('late_cancel_window_hours', 24),
                    'currency'           =>        $psRow->currency ?? 'USD',
                ];
            }
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
            'services'           => $services,
            'service_categories' => $serviceCategories,
            'service_addons'     => $serviceAddons,
            'hours'         => $hours,
            'policies'      => $policiesArr,
            'staff'         => $staff,
            'availability'  => [
                'hours'    => $hours,
                'settings' => $settings,
            ],
            'gallery'              => $gallery,
            'gallery_groups'       => $galleryGroups,
            'before_after'         => $beforeAfter,
            'before_after_groups'  => $beforeAfterGroups,
            'template'      => [
                'slug'     => $templateSlug,
                'settings' => $templateSettings,
                'sections' => $templateSections,
            ],
            'payment_settings' => $paymentSettings,
            'booking_settings' => $bookingSettings,
        ]);
    }
}
