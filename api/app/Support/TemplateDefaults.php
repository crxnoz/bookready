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
            'thefaderoom' => self::theFadeRoomSettings(),
            default       => self::theFadeRoomSettings(),
        };
    }

    public static function sectionsFor(string $templateSlug): array
    {
        return match ($templateSlug) {
            'thefaderoom' => self::theFadeRoomSections(),
            default       => self::theFadeRoomSections(),
        };
    }

    private static function theFadeRoomSettings(): array
    {
        return [
            'header' => [
                'tagline'                 => 'Sharp cuts. Smooth booking.',
                'show_book_button'        => true,
                'show_call_button'        => true,
                'show_email_button'       => true,
                'show_instagram_button'   => true,
                'show_directions_button'  => true,
                'announcement_text'       => 'Now booking for the season — limited weekend slots.',
                'show_announcement'       => true,
                'cover_image_url'         => null,
                'avatar_image_url'        => null,
            ],
            'tabs' => [
                'book_label'               => 'Book',
                'gallery_label'            => 'Gallery',
                'policy_label'             => 'Policy',
                'about_label'              => 'About',
                'results_label'            => 'Before & After',
                'steps_label'              => 'Steps',
                'before_appointment_label' => 'Before Your Appointment',
            ],
            'steps' => [
                'heading' => 'Steps',
                'items'   => [
                    ['title' => 'Choose your service',  'body' => 'Pick the service that fits your appointment.'],
                    ['title' => 'Select your time',     'body' => 'Choose an available date and time from the booking calendar.'],
                    ['title' => 'Send your request',    'body' => 'Add your contact details and submit your booking request.'],
                    ['title' => 'Wait for confirmation','body' => 'The business will confirm your appointment soon.'],
                ],
            ],
            'before_appointment' => [
                'heading' => 'Before Your Appointment',
                'items'   => [
                    ['title' => 'Arrive on time',         'body' => 'Late arrivals may need to be rescheduled.'],
                    ['title' => 'Come prepared',          'body' => 'Arrive ready for the service you booked.'],
                    ['title' => 'Bring reference photos', 'body' => 'If you have a specific look in mind, bring photos.'],
                    ['title' => 'Review policies',        'body' => 'Please review cancellation, late, and no-show policies before booking.'],
                ],
            ],
            'additionals' => [
                'show_thank_you'   => true,
                'thank_you_title'  => 'Thank you for choosing us',
                'thank_you_body'   => null,
            ],
            'footer' => [
                'business_name_override' => null,
                'subtext'                => 'Booking by appointment. Walk-ins welcome when available.',
                'show_hours'             => true,
                'show_quick_book'        => true,
                'show_contact_links'     => true,
                'show_powered_by'        => true,
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
            ['section_key' => 'before_after',       'section_type' => 'before_after',  'title' => 'Before & After',          'is_locked' => false, 'sort_order' => 6],
            ['section_key' => 'steps',              'section_type' => 'instructions',  'title' => 'Steps',                   'is_locked' => false, 'sort_order' => 7],
            ['section_key' => 'before_appointment', 'section_type' => 'instructions',  'title' => 'Before Your Appointment', 'is_locked' => false, 'sort_order' => 8],
            ['section_key' => 'footer',             'section_type' => 'footer',        'title' => 'Footer',                  'is_locked' => true,  'sort_order' => 99],
        ];
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
