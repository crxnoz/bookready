<?php

/**
 * Lacquer Lab demo seed — overwrites the `thefadestroom` tenant with a
 * fully-fledged editorial nail-art demo site. Safe to re-run: every step
 * is destructive-then-reseed within content tables only. Auth + Stripe
 * + subscriptions are untouched.
 *
 * Run on the server (from /var/www/bookready-api/api):
 *   php scripts/seed_lacquer_lab.php
 *
 * Bootstraps Laravel directly so we don't depend on laravel/tinker.
 */

// Resolve the Laravel root from $argv[1] or env, else fall back to the
// production install path so we can run the file from anywhere on disk.
$apiRoot = $argv[1] ?? getenv('API_ROOT') ?: '/var/www/bookready-api/api';
require $apiRoot . '/vendor/autoload.php';
$app = require_once $apiRoot . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Tenant;
use App\Support\TemplateDefaults;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

$tenantId = 'thefadestroom';
$tenant   = Tenant::findOrFail($tenantId);
tenancy()->initialize($tenant);

echo "Seeding Lacquer Lab into tenant: {$tenantId}\n";

// ── Wipe content (auth / subscription left alone) ──────────────────────────
$wipe = [
    'service_addon_links',
    'service_addons',
    'service_staff',
    'services',
    'service_categories',
    'staff_hours',
    'staff_blocked_dates',
    'staff',
    'hours',
    'gallery_items',
    'gallery_groups',
    'before_after_items',
    'before_after_groups',
    'website_sections',
    'business_policies',
    'business_profiles',
    'template_settings',
];
// FK checks off so we can wipe in any order even if other (untouched)
// tables reference these rows. Wrapped in try/finally so we restore the
// flag if a wipe ever throws.
DB::statement('SET FOREIGN_KEY_CHECKS = 0');
try {
    foreach ($wipe as $t) {
        if (Schema::hasTable($t)) {
            DB::table($t)->delete();
            echo "  · wiped {$t}\n";
        }
    }
} finally {
    DB::statement('SET FOREIGN_KEY_CHECKS = 1');
}

// ── Business profile ──────────────────────────────────────────────────────
DB::table('business_profiles')->insert([
    'business_name'   => 'Lacquer Lab',
    'tagline'         => 'Editorial nail art, hand-poured.',
    'business_type'   => 'Nail Studio',
    'public_email'    => 'hello@lacquerlab.example',
    'public_phone'    => '(213) 555-0142',
    'address_line'    => '847 Spring Street, Suite 3A',
    'city'            => 'Los Angeles',
    'state'           => 'CA',
    'zip'             => '90012',
    'instagram_url'   => 'https://instagram.com/lacquer.lab',
    'booking_enabled' => true,
    'site_status'     => 'public',
    // Phase-4 preferences (only set keys that exist on this tenant)
    ...(Schema::hasColumn('business_profiles', 'time_zone')                       ? ['time_zone' => 'America/Los_Angeles']                       : []),
    ...(Schema::hasColumn('business_profiles', 'week_start_day')                  ? ['week_start_day' => 1]                                       : []),
    ...(Schema::hasColumn('business_profiles', 'time_format')                     ? ['time_format' => '12h']                                      : []),
    ...(Schema::hasColumn('business_profiles', 'default_appointment_duration_minutes') ? ['default_appointment_duration_minutes' => 60]            : []),
    ...(Schema::hasColumn('business_profiles', 'post_booking_message')            ? ['post_booking_message' => "Can't wait to see you. We'll text 24h before to confirm."] : []),
    ...(Schema::hasColumn('business_profiles', 'site_visibility')                 ? ['site_visibility' => 'public']                               : []),
    'created_at'      => now(),
    'updated_at'      => now(),
]);
echo "  · business_profile seeded\n";

// ── Business hours (Tue-Sat 10-7, closed Sun + Mon) ───────────────────────
foreach (range(0, 6) as $dow) {
    $isClosed = in_array($dow, [0, 1]); // 0=Sun, 1=Mon closed
    DB::table('hours')->insert([
        'day_of_week' => $dow,
        'is_closed'   => $isClosed,
        'open_time'   => $isClosed ? null : '10:00:00',
        'close_time'  => $isClosed ? null : '19:00:00',
        ...(Schema::hasColumn('hours', 'break_start') ? ['break_start' => null] : []),
        ...(Schema::hasColumn('hours', 'break_end')   ? ['break_end'   => null] : []),
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);
}
echo "  · hours seeded\n";

// ── Service categories ────────────────────────────────────────────────────
$catIds = [];
$cats = [
    ['name' => 'Manicures',   'desc' => 'Hand-finished manicures with our signature Lacquer Lab prep.', 'order' => 1],
    ['name' => 'Pedicures',   'desc' => 'Slow, restorative pedicures in our quiet treatment suite.',     'order' => 2],
    ['name' => 'Nail Art',    'desc' => 'Editorial sets — custom designs hand-painted to your concept.', 'order' => 3],
];
foreach ($cats as $c) {
    $catIds[$c['name']] = DB::table('service_categories')->insertGetId([
        'name'        => $c['name'],
        ...(Schema::hasColumn('service_categories', 'description') ? ['description' => $c['desc']]  : []),
        ...(Schema::hasColumn('service_categories', 'image_url')   ? ['image_url'   => null]        : []),
        ...(Schema::hasColumn('service_categories', 'is_active')   ? ['is_active'   => true]        : []),
        'sort_order'  => $c['order'],
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);
}
echo "  · " . count($catIds) . " categories seeded\n";

// ── Services ──────────────────────────────────────────────────────────────
$services = [
    // Manicures
    ['Express Manicure',        'Quick-turn manicure for a clean polished finish — perfect on a lunch break.',                  45,  35.0,  'Manicures', 1],
    ['Signature Lacquer Manicure', 'Our hero treatment. Cuticle care, hand massage, and any-color long-wear polish.',           75,  55.0,  'Manicures', 2],
    ['Builder Gel Overlay',     'Strengthen natural nails with a builder gel overlay. Lasts 3-4 weeks.',                         90,  85.0,  'Manicures', 3],
    // Pedicures
    ['Spa Pedicure',            'Soak, scrub, mask, and polish. Ten minutes of leg massage included.',                          75,  70.0,  'Pedicures', 4],
    ['Detox Pedicure',          'Eucalyptus soak with hot stones and clay foot mask. For tired feet.',                         105,  95.0,  'Pedicures', 5],
    // Nail Art
    ['Custom Nail Art Set',     'Built around your reference photos. One consult call before the appointment included.',       150, 145.0,  'Nail Art',  6],
    ['Chrome Mirror Set',       'Mirror-finish chrome powders applied over gel. Comes in silver, rose, copper, holo.',          90,  95.0,  'Nail Art',  7],
    ['Encapsulated Art Tips',   'Tips with hand-set florals, foils, or 3D elements sealed under gel.',                         165, 175.0,  'Nail Art',  8],
];
$serviceIds = [];
foreach ($services as [$name, $desc, $duration, $price, $catName, $order]) {
    $serviceIds[$name] = DB::table('services')->insertGetId([
        'name'             => $name,
        'description'      => $desc,
        'duration'         => $duration,
        'price'            => $price,
        'deposit'          => null,
        'sort_order'       => $order,
        'is_active'        => true,
        'category'         => $catName,
        ...(Schema::hasColumn('services', 'category_id') ? ['category_id' => $catIds[$catName]] : []),
        ...(Schema::hasColumn('services', 'image_url')   ? ['image_url'   => null]              : []),
        'created_at'       => now(),
        'updated_at'       => now(),
    ]);
}
echo "  · " . count($serviceIds) . " services seeded\n";

// ── Add-ons ───────────────────────────────────────────────────────────────
$addons = [
    ['Gel Removal',          'Safely soaking off existing gel — add when arriving with gel from elsewhere.', 15,  15.00],
    ['Paraffin Treatment',   'Warm paraffin wax dip for hands or feet. Softens, hydrates, eases stiffness.', 15,  18.00],
    ['Callus Reduction',     'Targeted exfoliation for heels and pressure points.',                           20,  22.00],
    ['Chrome Top Finish',    'Add a chrome / pearl shift over any polish color.',                              15,  25.00],
];
$addonIds = [];
foreach ($addons as [$name, $desc, $extraMin, $extraPrice]) {
    $addonIds[$name] = DB::table('service_addons')->insertGetId([
        'name'                   => $name,
        'description'            => $desc,
        'image_url'              => null,
        'extra_price_cents'      => (int) round($extraPrice * 100),
        'extra_duration_minutes' => $extraMin,
        'is_active'              => true,
        'sort_order'             => count($addonIds) + 1,
        'created_at'             => now(),
        'updated_at'             => now(),
    ]);
}
echo "  · " . count($addonIds) . " add-ons seeded\n";

// Link add-ons to relevant services. Required = pre-checked at booking time.
$links = [
    // Gel removal: optional on every manicure-ish set
    ['Express Manicure',          'Gel Removal',          false],
    ['Signature Lacquer Manicure', 'Gel Removal',         false],
    ['Builder Gel Overlay',       'Gel Removal',          false],
    ['Custom Nail Art Set',       'Gel Removal',          false],
    ['Chrome Mirror Set',         'Gel Removal',          false],
    // Chrome top finish — optional on every nail-art set
    ['Custom Nail Art Set',       'Chrome Top Finish',    false],
    ['Encapsulated Art Tips',     'Chrome Top Finish',    false],
    // Pedicure add-ons
    ['Spa Pedicure',              'Paraffin Treatment',   false],
    ['Detox Pedicure',            'Paraffin Treatment',   false],
    ['Detox Pedicure',            'Callus Reduction',     true],  // required for detox
];
foreach ($links as [$svcName, $addonName, $required]) {
    DB::table('service_addon_links')->insert([
        'service_id'  => $serviceIds[$svcName],
        'addon_id'    => $addonIds[$addonName],
        'is_required' => $required,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);
}
echo "  · " . count($links) . " service ↔ add-on links seeded\n";

// ── Staff ─────────────────────────────────────────────────────────────────
$siennaId = DB::table('staff')->insertGetId([
    'name'        => 'Sienna Park',
    'role'        => 'Founder & Lead Artist',
    'bio'         => 'Sienna founded Lacquer Lab after years on the editorial circuit. Her work has appeared in Allure, Coveteur, and the Tom Ford SS24 lookbook.',
    'email'       => 'sienna@lacquerlab.example',
    'phone'       => '(213) 555-0143',
    'avatar_url'  => null,
    'is_active'   => true,
    'sort_order'  => 1,
    'created_at'  => now(),
    'updated_at'  => now(),
]);
$julesId = DB::table('staff')->insertGetId([
    'name'        => 'Jules Kim',
    'role'        => 'Nail Artist',
    'bio'         => 'Jules specializes in encapsulated 3D work and one-of-one floral sets. Trained at Tokyo NAIL Academy before joining Lacquer Lab in 2024.',
    'email'       => 'jules@lacquerlab.example',
    'phone'       => null,
    'avatar_url'  => null,
    'is_active'   => true,
    'sort_order'  => 2,
    'created_at'  => now(),
    'updated_at'  => now(),
]);
echo "  · 2 staff seeded\n";

// Staff hours — Sienna and Jules share the shop schedule.
foreach ([$siennaId, $julesId] as $sid) {
    foreach (range(0, 6) as $dow) {
        $closed = in_array($dow, [0, 1]);
        DB::table('staff_hours')->insert([
            'staff_id'    => $sid,
            'day_of_week' => $dow,
            'is_open'     => ! $closed,
            'open_time'   => $closed ? null : '10:00:00',
            'close_time'  => $closed ? null : '19:00:00',
            'break_start' => null,
            'break_end'   => null,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }
}
echo "  · staff hours seeded\n";

// Assign staff to services. Nail art = Sienna + Jules; basics = both.
foreach ($serviceIds as $name => $svcId) {
    // Both staff can do everything; this surfaces the multi-staff UX
    // in the editor + (eventually) the booking form.
    foreach ([$siennaId, $julesId] as $sid) {
        DB::table('service_staff')->insert([
            'service_id' => $svcId,
            'staff_id'   => $sid,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
echo "  · service ↔ staff pivot seeded\n";

// ── Policies ──────────────────────────────────────────────────────────────
DB::table('business_policies')->insert([
    'cancellation_policy' => 'We require 24 hours notice for any cancellation. Same-day cancellations forfeit 50% of the service price.',
    'late_policy'         => 'After 15 minutes we may need to shorten or reschedule your service to protect the next client.',
    'no_show_policy'      => 'No-shows are charged the full service price and require prepayment for future bookings.',
    'deposit_policy'      => 'A 25% deposit is required at booking for custom nail-art sets. Refundable up to the cancellation window.',
    'reschedule_policy'   => 'Reschedule freely up to 24 hours before your appointment. After that we charge a 25% rebooking fee.',
    'extra_notes'         => 'Please remove existing polish before arriving when possible — gel removal is a separate add-on.',
    // Enforcement rules
    ...(Schema::hasColumn('business_policies', 'late_grace_period_minutes')      ? ['late_grace_period_minutes' => 15]      : []),
    ...(Schema::hasColumn('business_policies', 'forfeit_deposit_on_late_cancel') ? ['forfeit_deposit_on_late_cancel' => true] : []),
    ...(Schema::hasColumn('business_policies', 'max_reschedules_per_booking')    ? ['max_reschedules_per_booking' => 2]     : []),
    ...(Schema::hasColumn('business_policies', 'require_policy_agreement')       ? ['require_policy_agreement' => true]     : []),
    // Custom policy groups
    ...(Schema::hasColumn('business_policies', 'custom_groups') ? ['custom_groups' => json_encode([
        [
            'heading' => 'Aftercare',
            'items' => [
                ['title' => 'Skip the pool for 24 hours',  'content' => 'Chlorine and salt water dull a fresh manicure. Wait a day.'],
                ['title' => 'Use cuticle oil daily',       'content' => 'Apply at night for at least the first week — your set lasts longer.'],
                ['title' => 'Wear gloves for chores',      'content' => 'Dish soap and cleaners are the fastest way to shorten a manicure.'],
            ],
        ],
        [
            'heading' => 'Parking & Arrival',
            'items' => [
                ['title' => 'Street parking on Spring',    'content' => 'Metered street parking runs the block — bring quarters or use the ParkMobile app.'],
                ['title' => 'Buzz suite 3A',               'content' => 'Take the elevator to the third floor and ring the bell. Door stays locked between clients.'],
            ],
        ],
    ])] : []),
    'created_at'          => now(),
    'updated_at'          => now(),
]);
echo "  · business_policies + 2 custom groups seeded\n";

// ── Template settings (TFR — header / tabs / content / additionals / theme) ──
$templateSettings = TemplateDefaults::mergeWithDefaults('thefaderoom', [
    'header' => [
        'show_book_button'        => true,
        'show_call_button'        => true,
        'show_email_button'       => true,
        'show_instagram_button'   => true,
        'show_directions_button'  => true,
        'show_message_button'     => true,
        'announcement_text'       => 'Summer chrome drop — bookings open now.',
        'show_announcement'       => true,
    ],
    'tabs' => [
        'book_label'               => 'Book',
        'gallery_label'            => 'Gallery',
        'policy_label'             => 'Policies',
        'about_label'              => 'About',
        'results_label'            => 'Before / After',
        'steps_label'              => 'Aftercare',
        'before_appointment_label' => 'Before You Visit',
    ],
    'steps' => [
        'heading' => 'Aftercare',
        'items' => [
            ['title' => 'Day 1', 'body' => 'Keep hands warm and dry for the first six hours. Avoid hot showers until tomorrow.'],
            ['title' => 'Week 1', 'body' => 'Use cuticle oil every night — it doubles the life of your set.'],
            ['title' => 'Every day', 'body' => 'Gloves for cleaning. Always. We mean it.'],
            ['title' => 'When you need a fill', 'body' => 'Most clients return at the 3-4 week mark. We email a reminder.'],
        ],
    ],
    'before_appointment' => [
        'heading' => 'Before You Visit',
        'items' => [
            ['title' => 'Bring references',  'body' => 'Save 3-5 images of designs you love. We work best when we can see the direction.'],
            ['title' => 'Eat ahead',         'body' => 'Nail art sets can run 2+ hours. Eat beforehand — your hands are committed.'],
            ['title' => 'Arrive product-free', 'body' => 'Skip hand lotion before your visit so the polish adheres cleanly.'],
            ['title' => 'Tell us about allergies', 'body' => 'We use a few proprietary primers; let us know about gel or acrylic sensitivities.'],
        ],
    ],
    'about' => [
        'eyebrow' => 'LACQUER',
        'heading' => 'A studio for the slow, considered set.',
        'body'    => "Lacquer Lab opened in 2023 above a flower shop in downtown LA. We treat nail art as a wearable medium — designs are hand-painted, not stamped, and built around the way you actually use your hands. Bring an idea, we'll bring the technique.",
        'highlights' => [
            ['title' => 'Hand-painted',      'body' => 'Every design is original, not transfer or stamped.'],
            ['title' => 'Clean ingredients', 'body' => "5-free polishes and HEMA-free gels for sensitive sets."],
            ['title' => 'One client at a time', 'body' => 'No overlap appointments — your time is yours.'],
        ],
        'images' => [null, null, null],
    ],
    'additionals' => [
        'show_thank_you'       => true,
        'thank_you_title'      => 'Until next time',
        'thank_you_body'       => "Tag @lacquer.lab on your way out — we love seeing your set in the wild.",
        'thank_you_signature'  => 'with love',
        'faq' => [
            'enabled' => true,
            'heading' => 'Good to know',
            'items'   => [
                ['question' => 'Do you take walk-ins?',                 'answer' => 'No — we book one client at a time to protect your slot. Booking ahead is the only way in.'],
                ['question' => 'How long do nail-art sets last?',       'answer' => 'Gel sets hold 3-4 weeks. Encapsulated and chrome sets can run closer to 5 with diligent oiling.'],
                ['question' => 'Can I bring a friend?',                 'answer' => 'We have one chair in the front room for a guest. Just let us know in your booking notes so we save the seat.'],
                ['question' => 'Do you do nails for events?',           'answer' => 'Yes — email hello@lacquerlab.example with your event date and party size.'],
            ],
        ],
        'reviews' => [
            'enabled' => true,
            'heading' => 'What clients say',
            'items'   => [
                ['author' => 'Maya R.',  'location' => 'Arts District', 'rating' => 5, 'body' => "Sienna painted a custom chrome floral set for my wedding and it lasted through the honeymoon. Worth every minute."],
                ['author' => 'Devyn K.', 'location' => 'Echo Park',     'rating' => 5, 'body' => 'The studio is calm in a way nail salons never are. Jules took the time to actually sketch the design with me first.'],
                ['author' => 'Carlos M.', 'location' => 'DTLA',         'rating' => 5, 'body' => "I came in for a builder gel overlay and Sienna saved my nails. Honest about what wouldn't work — I'll come back."],
            ],
        ],
    ],
    'footer' => [
        'business_name_override' => null,
        'subtext'                => 'By appointment · Suite 3A · Above Petal House',
        'show_hours'             => true,
        'show_quick_book'        => true,
        'show_contact_links'     => true,
        'show_powered_by'        => true,
    ],
    'theme' => [
        // Phase 5: editorial blue accent.
        'accent_color' => '#3DA9FC',
    ],
]);

DB::table('template_settings')->insert([
    'template_slug' => 'thefaderoom',
    'settings_json' => json_encode($templateSettings),
    'created_at'    => now(),
    'updated_at'    => now(),
]);
echo "  · template_settings (theme + about + faq + reviews) seeded\n";

// ── Website sections (locked + unlocked, defaults) ────────────────────────
$sections = [
    ['header',             'header',       'Header',         true,  true,  1],
    ['book',               'booking',      'Booking',        true,  true,  2],
    ['gallery',            'gallery',      'Gallery',        true,  false, 3],
    ['policy',             'policy',       'Policies',       true,  false, 4],
    ['about',              'about',        'About',          true,  false, 5],
    ['before_after',       'before_after', 'Before & After', true,  false, 6],
    ['steps',              'instructions', 'Aftercare',      true,  false, 7],
    ['before_appointment', 'instructions', 'Before You Visit', true, false, 8],
    ['footer',             'footer',       'Footer',         true,  true,  9],
];
foreach ($sections as [$key, $type, $title, $enabled, $locked, $order]) {
    DB::table('website_sections')->insert([
        'template_slug' => 'thefaderoom',
        'section_key'   => $key,
        'section_type'  => $type,
        'title'         => $title,
        'subtitle'      => null,
        'content_json'  => null,
        'is_enabled'    => $enabled,
        'is_locked'     => $locked,
        'sort_order'    => $order,
        'created_at'    => now(),
        'updated_at'    => now(),
    ]);
}
echo "  · " . count($sections) . " website_sections seeded\n";

// ── Booking settings (touch only — table exists from earlier migration) ──
if (Schema::hasTable('booking_settings')) {
    DB::table('booking_settings')->truncate();
    DB::table('booking_settings')->insert([
        'booking_enabled'                   => true,
        'auto_confirm_bookings'             => false,
        'minimum_notice_minutes'            => 12 * 60,
        'max_days_ahead'                    => 45,
        ...(Schema::hasColumn('booking_settings', 'slot_interval_minutes')        ? ['slot_interval_minutes'        => 30] : []),
        ...(Schema::hasColumn('booking_settings', 'slot_release_mode')            ? ['slot_release_mode'            => 'always_open'] : []),
        ...(Schema::hasColumn('booking_settings', 'slot_release_window_days')     ? ['slot_release_window_days'     => null] : []),
        ...(Schema::hasColumn('booking_settings', 'cancellation_window_hours')    ? ['cancellation_window_hours'    => 24] : []),
        ...(Schema::hasColumn('booking_settings', 'reschedule_window_hours')      ? ['reschedule_window_hours'      => 24] : []),
        ...(Schema::hasColumn('booking_settings', 'prevent_duplicate_client_bookings') ? ['prevent_duplicate_client_bookings' => true] : []),
        'created_at'                        => now(),
        'updated_at'                        => now(),
    ]);
    echo "  · booking_settings seeded\n";
}

tenancy()->end();

echo "\nDone. Visit: https://thefadestroom.bookready.app\n";
echo "Or via curl: curl -s https://api.bkrdy.me/api/v1/public/sites/thefadestroom\n";
