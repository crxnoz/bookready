import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Pétale — soft pink bridal/luxe-feminine template.
 *
 * For brides, makeup artists, lash artists who serve brides, hair-for-events
 * stylists, and boutique studios in the wedding + special-occasion lane.
 * Vibe: airy editorial-feminine — Playfair italic over pink canvases, a
 * warm metallic-to-wine accent tuned per canvas, scalloped hairlines, and
 * a Pinyon Script flourish at the moments that matter (signature lines).
 *
 * color_role: 'background' — the palette swatches paint the canvas (Blush,
 * Rose Quartz, Peach, Mauve, Dusty Rose, Cream); each variant pairs the
 * canvas with its own accent — champagne gold (#C9A876) on the light
 * canvases (Blush, Cream), deepened wine/copper tones (deep wine, burnt
 * copper, oxblood, claret) on the darker pinks where gold loses contrast.
 * The editor labels the picker "Background variant" for this template.
 *
 * Differentiation from Opaline (the other editorial-feminine option):
 *   - Opaline keeps the cream canvas constant and swaps the accent.
 *     Pétale swaps the canvas, with the accent following the canvas.
 *   - Opaline reads as restrained marble-pearl. Pétale reads as
 *     romantic-wedding-paper.
 *   - Opaline = Cormorant + Jost. Pétale = Playfair Display + Inter +
 *     Pinyon Script signatures.
 *
 * About: two-image asymmetric diptych (about_image_count: 2). Distinct
 * from the existing four: TFR/Lush/Velvet use a 3-staggered hero, Opaline
 * does 3-grid, Blackline does 1-hero. The eyebrow is omitted because every
 * template now derives the about eyebrow from tabLabel.about.
 *
 * Active-tab marker: a scalloped curve underline beneath the active pill
 * — a signature move distinct from Opaline's champagne-wash pill, Velvet's
 * gold underline, Blackline's flat underline, Lush's floating sparkle,
 * and TFR's marquee glow.
 */
const manifest: TemplateManifest = {
  slug:    'petale',
  name:    'Pétale',
  version: '0.1.0',

  color_role: 'background',
  color_palette: [
    { hex: '#F4DDE0', label: 'Blush (default)' },
    { hex: '#EAC4CB', label: 'Rose Quartz' },
    { hex: '#F5D5C0', label: 'Peach' },
    { hex: '#E0B5C4', label: 'Mauve' },
    { hex: '#D9A8B0', label: 'Dusty Rose' },
    { hex: '#F5EFE6', label: 'Cream' },
  ],

  header_fields: [
    'cover_image',
    'avatar_image',
    'announcement',
    'business_type',
    'social_buttons',
  ],

  footer_fields: [
    'show_powered_by',
    'show_hours',
    'show_quick_book',
    'show_contact_links',
    'business_name_override',
    'subtext',
  ],

  // Pétale's About surfaces body + highlights + a 2-image asymmetric
  // diptych (portrait-left + offset-right). Eyebrow is omitted because
  // every template now derives the about eyebrow from the About tab name.
  about_fields: ['highlights', 'images'],
  about_image_count: 2,
}

export default manifest
