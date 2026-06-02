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

    /**
     * The canonical, dash-less slugs of every template that actually
     * exists (matches the keys in web/templates/registry.ts). Anything
     * outside this set is not a real template and must fall back to the
     * default rather than seeding a tenant with a broken slug.
     */
    public const KNOWN_SLUGS = ['thefaderoom', 'lushstudio', 'velvettheory', 'blackline', 'opaline'];

    /**
     * Map any signup/registry template value to a canonical, KNOWN slug.
     * Strips dashes/spaces/underscores and lowercases ("The Fade Room",
     * "the-fade-room" → "thefaderoom"), then validates against KNOWN_SLUGS.
     * Unknown / empty input (e.g. the long-gone "cleanbeauty") degrades to
     * DEFAULT_TEMPLATE_SLUG so a tenant never lands on a non-existent template.
     */
    public static function normalizeSlug(?string $slug): string
    {
        $normalized = str_replace([' ', '-', '_'], '', strtolower(trim((string) $slug)));
        return in_array($normalized, self::KNOWN_SLUGS, true)
            ? $normalized
            : self::DEFAULT_TEMPLATE_SLUG;
    }

    public static function settingsFor(string $templateSlug): array
    {
        return match ($templateSlug) {
            'thefaderoom'  => self::theFadeRoomSettings(),
            'lushstudio'   => self::lushStudioSettings(),
            'velvettheory' => self::velvetTheorySettings(),
            'blackline'    => self::blacklineSettings(),
            'opaline'      => self::opalineSettings(),
            default        => self::theFadeRoomSettings(),
        };
    }

    public static function sectionsFor(string $templateSlug): array
    {
        return match ($templateSlug) {
            'thefaderoom'  => self::theFadeRoomSections(),
            'lushstudio'   => self::lushStudioSections(),
            'velvettheory' => self::velvetTheorySections(),
            'blackline'    => self::blacklineSections(),
            'opaline'      => self::opalineSections(),
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

    // ─── Blackline ──────────────────────────────────────────────────────────────
    //
    // Sleek industrial-modern barbershop. Voice: clipped, technical, no
    // nostalgia. Heavy canvas (onyx default) with a brass-hardware accent.

    private static function blacklineSettings(): array
    {
        $base = self::theFadeRoomSettings();
        $base['header']['announcement_text'] = 'Walk-ins by request. Booking is the cleanest path.';
        $base['tabs'] = [
            'book_label'     => 'Reserve',
            'gallery_label'  => 'Work',
            'policy_label'   => 'House Rules',
            'about_label'    => 'The Shop',
            'results_label'  => 'Before / After',
            'advice_label'   => 'Notes',
            'timeline_label' => 'Process',
        ];
        $base['about'] = [
            'heading'    => 'The Shop',
            'eyebrow'    => 'The Floor',
            'body'       => 'We cut by appointment in a quiet room with sharp tools and a steady chair. No mood music, no upsell — just the work, done clean.',
            'highlights' => [
                ['title' => 'Sharp tools',  'body' => 'Straight razors and clippers tuned for the cut, sterilized between every chair.'],
                ['title' => 'Steady chair', 'body' => 'Single barber, single client at a time. We move at the pace the work asks for.'],
            ],
            'images'     => [null, null, null],
        ];
        $base['advice'] = [
            'heading'     => 'Notes',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Come clean',        'body' => 'Wash your hair the morning of. Product-free cuts cleanest.'],
                ['title' => 'Bring a photo',     'body' => 'A reference — even a rough one — gets us aligned in seconds.'],
                ['title' => 'Stay between visits','body' => 'A quick maintenance trim every 3 weeks keeps the line clean.'],
                ['title' => 'Book the cadence',  'body' => 'Standing slots open first. Hold yours by booking the next one before you leave.'],
            ],
        ];
        $base['timeline'] = [
            'heading'     => 'Process',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Pick the service',  'body' => 'Choose the cut you want.'],
                ['title' => 'Lock the time',     'body' => 'Available slots only — no waitlist guesswork.'],
                ['title' => 'Send the brief',    'body' => 'Drop your contact and any notes on the cut.'],
                ['title' => 'Take the seat',     'body' => 'Confirmation lands in your inbox. Show up ready.'],
            ],
        ];
        $base['footer']['subtext'] = 'By appointment. Doors at the hour, not before.';
        return $base;
    }

    private static function blacklineSections(): array
    {
        return self::theFadeRoomSections();
    }

    // ─── Opaline ──────────────────────────────────────────────────────────────
    //
    // Premium luxury beauty + spa. Voice: calm, considered, quietly
    // confident. Pearl + champagne canvas; the copy reads like a high-end
    // spa that values quality over volume.

    private static function opalineSettings(): array
    {
        $base = self::theFadeRoomSettings();
        $base['header']['announcement_text'] = 'By appointment — a calm, unhurried experience, every visit.';
        $base['tabs'] = [
            'book_label'     => 'Reserve',
            'gallery_label'  => 'Gallery',
            'policy_label'   => 'Policies',
            'about_label'    => 'About',
            'results_label'  => 'Results',
            'advice_label'   => 'Care',
            'timeline_label' => 'Visit',
        ];
        $base['about'] = [
            'heading'    => 'The studio',
            'eyebrow'    => 'About us',
            'body'       => 'We are a quiet, considered studio built around one idea: that beauty should feel like care, not a transaction. Every treatment is tailored, every room is calm, and every detail is intentional — so you can relax fully and leave feeling like the best version of yourself.',
            'highlights' => [
                ['title' => 'Quality over volume', 'body' => 'We see fewer clients each day so yours is never rushed. The time is yours.'],
                ['title' => 'A considered hand',   'body' => 'Treatments are tailored to your skin and your goals — never one-size-fits-all.'],
                ['title' => 'A space to exhale',   'body' => 'Soft light, clean lines, and quiet. The environment is part of the result.'],
            ],
            'images'     => [null, null, null],
        ];
        $base['advice'] = [
            'heading'     => 'Care notes',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Keep it gentle',      'body' => 'Skip strong actives and exfoliants for 24–48 hours after your treatment.'],
                ['title' => 'Protect your skin',   'body' => 'Daily SPF is the single best thing you can do to preserve your results.'],
                ['title' => 'Hydrate, inside and out', 'body' => 'Water and a simple barrier moisturizer help your skin settle beautifully.'],
                ['title' => 'Stay on a rhythm',    'body' => 'A regular cadence keeps results consistent. We will recommend yours.'],
            ],
        ];
        $base['timeline'] = [
            'heading'     => 'Your visit',
            'card_kicker' => '',
            'items'       => [
                ['title' => 'Choose your service',  'body' => 'Select the treatment that suits you — we will confirm the right fit on arrival.'],
                ['title' => 'Reserve your time',    'body' => 'Pick a date and time that works. A deposit may secure your appointment.'],
                ['title' => 'Arrive and settle',    'body' => 'Come a few minutes early, breathe, and let the day slow down.'],
                ['title' => 'Relax and renew',      'body' => 'We take it from here — unhurried, attentive, and entirely focused on you.'],
            ],
        ];
        $base['additionals']['thank_you_title'] = 'Thank you for trusting us';
        $base['additionals']['thank_you_body']  = 'It is a privilege to care for you. We look forward to welcoming you back.';
        $base['footer']['subtext'] = 'By appointment. A calm, premium experience from the moment you arrive.';
        return $base;
    }

    private static function opalineSections(): array
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
