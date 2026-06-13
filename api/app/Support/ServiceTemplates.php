<?php

namespace App\Support;

/**
 * Default service rosters per business type — shown on the Step 3
 * business setup page so users don't have to type anything. They CAN
 * edit any field inline, but the goal is "see your services, click
 * Continue, keep moving."
 *
 * Format mirrors what the services table accepts at seed time:
 *   - name              string
 *   - price_cents       int    (display = $price_cents/100)
 *   - duration_minutes  int
 *
 * Keep each list to 3 entries — enough to feel real on the template
 * preview, short enough that editing one is trivial. Pricing reflects
 * mid-market US averages; owners always tweak them later.
 */
class ServiceTemplates
{
    /**
     * Valid business_type slugs. The Step 3 page maps these to
     * human-readable labels for the picker.
     */
    public const TYPES = [
        'barber',
        'hair_salon',
        'spa',
        'nail_studio',
        'lash_studio',
        'tattoo_studio',
        'other',
    ];

    public static function forType(?string $type): array
    {
        return match ($type) {
            'barber' => [
                ['name' => 'Haircut',          'price_cents' => 3500,  'duration_minutes' => 45],
                ['name' => 'Beard Trim',       'price_cents' => 2000,  'duration_minutes' => 20],
                ['name' => 'Haircut + Beard',  'price_cents' => 5000,  'duration_minutes' => 60],
            ],
            'hair_salon' => [
                ['name' => 'Cut & Style',      'price_cents' => 6500,  'duration_minutes' => 60],
                ['name' => 'Color',            'price_cents' => 12000, 'duration_minutes' => 120],
                ['name' => 'Blowout',          'price_cents' => 4500,  'duration_minutes' => 45],
            ],
            'spa' => [
                ['name' => 'Signature Facial', 'price_cents' => 12000, 'duration_minutes' => 60],
                ['name' => 'Massage (60 min)', 'price_cents' => 11000, 'duration_minutes' => 60],
                ['name' => 'Body Treatment',   'price_cents' => 15000, 'duration_minutes' => 90],
            ],
            'nail_studio' => [
                ['name' => 'Gel Manicure',     'price_cents' => 4500,  'duration_minutes' => 45],
                ['name' => 'Pedicure',         'price_cents' => 5500,  'duration_minutes' => 60],
                ['name' => 'Nail Art',         'price_cents' => 7500,  'duration_minutes' => 75],
            ],
            'lash_studio' => [
                ['name' => 'Classic Full Set', 'price_cents' => 14000, 'duration_minutes' => 120],
                ['name' => 'Lash Fill',        'price_cents' => 7500,  'duration_minutes' => 60],
                ['name' => 'Lash Lift',        'price_cents' => 9000,  'duration_minutes' => 60],
            ],
            'tattoo_studio' => [
                ['name' => 'Small Piece',      'price_cents' => 15000, 'duration_minutes' => 60],
                ['name' => 'Half-Day Session', 'price_cents' => 50000, 'duration_minutes' => 240],
                ['name' => 'Consultation',     'price_cents' => 0,     'duration_minutes' => 30],
            ],
            'other' => [
                ['name' => 'Standard Service', 'price_cents' => 5000,  'duration_minutes' => 60],
                ['name' => 'Short Service',    'price_cents' => 2500,  'duration_minutes' => 30],
                ['name' => 'Extended Service', 'price_cents' => 10000, 'duration_minutes' => 90],
            ],
            default => self::forType('other'),
        };
    }

    /**
     * Resolve the labels shown on the Step 3 business_type picker.
     * Backend keeps the slug; frontend renders the label.
     */
    public static function typeLabel(string $type): string
    {
        return match ($type) {
            'barber'        => 'Barber Shop',
            'hair_salon'    => 'Hair Salon',
            'spa'           => 'Spa',
            'nail_studio'   => 'Nail Studio',
            'lash_studio'   => 'Lash Studio',
            'tattoo_studio' => 'Tattoo Studio',
            'other'         => 'Other',
            default         => 'Other',
        };
    }
}
