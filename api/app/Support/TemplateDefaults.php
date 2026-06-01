<?php

namespace App\Support;

/**
 * Default template settings + sections per template slug.
 *
 * Used both for seeding fresh records and for merging missing keys
 * onto stored settings_json. Keeping defaults in one place means the
 * frontend can rely on the API to always hydrate the full shape.
 */
class TemplateDefaults
{
    public const DEFAULT_TEMPLATE_SLUG = 'thefaderoom';

    public static function settingsFor(string $templateSlug): array
    {
        return match ($templateSlug) {
            'thefaderoom'  => self::theFadeRoomSettings(),
            'lushstudio'   => self::lushStudioSettings(),
            'velvettheory' => self::velvetTheorySettings(),
            default        => self::theFadeRoomSettings(),
        };
    }

    public static function sectionsFor(string $templateSlug): array
    {
        return match ($templateSlug) {
            'thefaderoom'  => self::theFadeRoomSections(),
            'lushstudio'   => self::lushStudioSections(),
            'velvettheory' => self::velvetTheorySections(),
            default        => self::theFadeRoomSections(),
        };
    }

    private static function theFadeRoomSettings(): array
    {
        return [
            'header' => [
                'show_book_button'        => true,
                'show_call_button'        => true,
                'show_email_button'       => true,
                'show_instagram_button'   => true,
                'show_directions_button'  => true,
                'show_pinterest_button'   => false,
                'show_youtube_button'     => false,
                'show_whatsapp_button'    => false,
                'show_tiktok_button'      => false,
                'show_facebook_button'    => false,
                'show_message_button'     => false,
                'book_button_url'         => null,
                'call_button_url'         => null,
                'email_button_url'        => null,
                'instagram_button_url'    => null,
                'directions_button_url'   => null,
                'pinterest_button_url'    => null,
                'youtube_button_url'      => null,
                'whatsapp_button_url'     => null,
                'tiktok_button_url'       => null,
                'facebook_button_url'     => null,
                'message_button_url'      => null,
                'announcement_text'       => 'Now booking for the season — limited weekend slots.',
                'show_announcement'       => true,
                'cover_image_url'         => null,
                'avatar_image_url'        => null,
            ],
            'tabs' => [
                'book_label'         => 'Book',
                'gallery_label'      => 'Gallery',
                'policy_label'       => 'Policy',
                'about_label'        => 'About',
                'results_label'      => 'Results',
                'advice_label'       => 'Advice',
                'timeline_label'     => 'Timeline',
            ],
            'about' => [
                'heading'    => 'About',
                'eyebrow'    => 'The Studio',
                'body'       => 'Tell visitors who you are, what you do, and what makes your work different.',
                'highlights' => [
                    ['title' => 'Detail-focused',  'body' => 'Every appointment is handled with care, from start to finish.'],
                    ['title' => 'Tailored to you', 'body' => 'Each service is shaped around what works best for your look.'],
                ],
                // Three image slots shown above the heading (left, center, right).
                // null = render the gradient placeholder.
                'images'     => [null, null, null],
            ],
            // M3 rename: 'steps' (internal) → 'advice' (canonical). Migration
            // 2026_06_01_000001 flips the stored key for existing tenants.
            'advice' => [
                'heading'     => 'Advice',
                // Phase 8 — optional shared label rendered above every
                // card's title (replaces the old auto "Step 01" labels).
                // Empty default = no label until the owner sets one.
                'card_kicker' => '',
                'items'       => [
                    ['title' => 'Keep it fresh',       'body' => 'Book maintenance regularly to keep your look at its best.'],
                    ['title' => 'Prep at home',        'body' => 'A clean canvas helps your stylist do their best work.'],
                    ['title' => 'Bring inspiration',   'body' => 'Photos and references help us nail what you want.'],
                    ['title' => 'Follow the care guide','body' => 'Aftercare keeps your service looking great for longer.'],
                ],
            ],
            // M3 rename: 'before_appointment' (internal) → 'timeline' (canonical).
            'timeline' => [
                'heading'     => 'Timeline',
                'card_kicker' => '',
                'items'       => [
                    ['title' => 'Pick your service',  'body' => 'Choose the service that fits your appointment.'],
                    ['title' => 'Select a time',      'body' => 'Pick an available date and time from the booking calendar.'],
                    ['title' => 'Send your request',  'body' => 'Add your contact details and submit your booking request.'],
                    ['title' => 'Get confirmation',   'body' => 'The business will review and confirm your appointment soon.'],
                ],
            ],
            'additionals' => [
                'show_thank_you'   => true,
                'thank_you_title'  => 'Thank you for choosing us',
                'thank_you_body'   => null,
                'faq' => [
                    'enabled' => false,
                    'heading' => 'Frequently asked',
                    'items'   => [],
                ],
                'reviews' => [
                    'enabled' => false,
                    'heading' => 'What clients say',
                    'items'   => [],
                ],
            ],
            'footer' => [
                'business_name_override' => null,
                'subtext'                => 'Booking by appointment. Walk-ins welcome when available.',
                'show_hours'             => true,
                'show_quick_book'        => true,
                'show_contact_links'     => true,
                'show_powered_by'        => true,
            ],
            // Visual theming. Currently only an accent color override —
            // null means "use the template default" (pink for TFR).
            'theme' => [
                'accent_color' => null,
            ],
        ];
    }

    /**
     * Each entry: section_key, section_type, title, is_locked, sort_order
     */
    private static function theFadeRoomSections(): array
    {
        return [
            ['section_key' => 'header',             'section_type' => 'header',        'title' => 'Header',                  'is_locked' => true,  'sort_order' => 1],
            ['section_key' => 'book',               'section_type' => 'booking',       'title' => 'Book',                    'is_locked' => true,  'sort_order' => 2],
            ['section_key' => 'gallery',            'section_type' => 'gallery',       'title' => 'Gallery',                 'is_locked' => false, 'sort_order' => 3],
            ['section_key' => 'policy',             'section_type' => 'policy',        'title' => 'Policy',                  'is_locked' => false, 'sort_order' => 4],
            ['section_key' => 'about',              'section_type' => 'about',         'title' => 'About',                   'is_locked' => false, 'sort_order' => 5],
            ['section_key' => 'results',  'section_type' => 'results',       'title' => 'Results',  'is_locked' => false, 'sort_order' => 6],
            ['section_key' => 'advice',   'section_type' => 'instructions',  'title' => 'Advice',   'is_locked' => false, 'sort_order' => 7],
            ['section_key' => 'timeline', 'section_type' => 'instructions',  'title' => 'Timeline', 'is_locked' => false, 'sort_order' => 8],
            ['section_key' => 'footer',             'section_type' => 'footer',        'title' => 'Footer',                  'is_locked' => true,  'sort_order' => 99],
        ];
    }

    // ─── Lush Studio ────────────────────────────────────────────────────────────
    //
    // M4 — per-template defaults. Lush is a feminine spa/salon template;
    // the seeded copy reflects that. Structure mirrors The Fade Room so the
    // editor + templates can share field names — only the wording differs.

    private static function lushStudioSettings(): array
    {
        $base = self::theFadeRoomSettings();
        $base['header']['announcement_text'] = 'Booking with care — limited spots each week.';
        // Lush hides the avatar slot in CSS (manifest declares it
        // unsupported), so we leave the field as-is for legacy tenants.
        $base['about'] = [
            'heading'    => 'About the studio',
            'eyebrow'    => 'The Studio',
            'body'       => 'Share your story — what you offer, who you serve, and what makes time in your chair feel different.',
            'highlights' => [
                ['title' => 'Considered, never rushed', 'body' => 'Every appointment runs at its own pace — your comfort comes first.'],
                ['title' => 'Tailored to you',          'body' => 'Each service is shaped around what works best for you.'],
            ],
            'images'     => [null, null, null],
        ];
        $base['advice'] = [
            'heading'     => 'Advice',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Arrive ready',         'body' => 'Come with clean skin or hair, depending on your service.'],
                ['title' => 'Talk it through',      'body' => 'Tell us what you love and what you avoid — we listen first.'],
                ['title' => 'Mind the aftercare',   'body' => 'A few small habits keep your results looking fresh.'],
                ['title' => 'Rebook with rhythm',   'body' => 'A regular cadence keeps your look consistent.'],
            ],
        ];
        $base['timeline'] = [
            'heading'     => 'Timeline',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Choose your service',  'body' => 'Pick the treatment that fits.'],
                ['title' => 'Find a time',          'body' => 'Browse the calendar and pick what suits your week.'],
                ['title' => 'Share your details',   'body' => 'Drop us a note about anything we should know.'],
                ['title' => 'See you soon',         'body' => 'Confirmation lands in your inbox once we review.'],
            ],
        ];
        $base['footer']['subtext'] = 'Booking by appointment. Reach out anytime.';
        return $base;
    }

    private static function lushStudioSections(): array
    {
        // Same section taxonomy as TFR — Lush surfaces the same set of
        // tabs, just styled differently.
        return self::theFadeRoomSections();
    }

    // ─── Velvet Theory ──────────────────────────────────────────────────────────
    //
    // M4 — luxe editorial template. Different copy voice (sparser, more
    // measured) but the same field structure.

    private static function velvetTheorySettings(): array
    {
        $base = self::theFadeRoomSettings();
        $base['header']['announcement_text'] = 'Reservations open by appointment only.';
        $base['about'] = [
            'heading'    => 'The atelier',
            'eyebrow'    => 'Studio',
            'body'       => 'Tell visitors what your studio is — the work you do, the way you do it, and the world you’ve built around it.',
            'highlights' => [
                ['title' => 'A considered hand', 'body' => 'Every appointment is treated with the attention it deserves.'],
                ['title' => 'Quietly precise',   'body' => 'Detail shows in the result. We treat the work as a craft, not a transaction.'],
            ],
            'images'     => [null, null, null],
        ];
        $base['advice'] = [
            'heading'     => 'Notes',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Arrive on time',      'body' => 'A few minutes early keeps the rhythm of the day.'],
                ['title' => 'Bring references',    'body' => 'Images we can read together help us land what you want.'],
                ['title' => 'Keep aftercare close','body' => 'A short routine extends what we do here.'],
                ['title' => 'Return with rhythm',  'body' => 'A regular cadence preserves the look you’ve built.'],
            ],
        ];
        $base['timeline'] = [
            'heading'     => 'Itinerary',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Select a service',    'body' => 'Pick what fits the visit you want.'],
                ['title' => 'Reserve a time',      'body' => 'Choose the date and hour from the calendar.'],
                ['title' => 'Share your notes',    'body' => 'A few details — anything we should know.'],
                ['title' => 'Receive your seat',   'body' => 'Confirmation arrives once we review.'],
            ],
        ];
        // VT footer manifest declines quick_book; the default is still set
        // so a tenant who toggles the template back to TFR keeps the field
        // populated. Manifest gating in the editor hides the toggle.
        $base['footer']['subtext'] = 'Reservations by appointment. Inquiries welcome.';
        return $base;
    }

    private static function velvetTheorySections(): array
    {
        return self::theFadeRoomSections();
    }

    /**
     * Deep-merge stored settings onto defaults so any keys added in
     * later releases are filled in for older tenants.
     */
    public static function mergeWithDefaults(string $templateSlug, ?array $stored): array
    {
        $defaults = self::settingsFor($templateSlug);
        if (! $stored) return $defaults;
        return self::deepMerge($defaults, $stored);
    }

    private static function deepMerge(array $base, array $override): array
    {
        foreach ($override as $k => $v) {
            if (is_array($v) && isset($base[$k]) && is_array($base[$k]) && self::isAssoc($base[$k])) {
                $base[$k] = self::deepMerge($base[$k], $v);
            } else {
                $base[$k] = $v;
            }
        }
        return $base;
    }

    private static function isAssoc(array $arr): bool
    {
        if ($arr === []) return false;
        return array_keys($arr) !== range(0, count($arr) - 1);
    }
}
