import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Opaline — premium luxury beauty + spa template.
 *
 * For estheticians, med spas, lash + brow artists, waxing studios,
 * injectors, PMU artists, skin clinics, and boutique luxury salons.
 * The aesthetic is pearl + champagne + marble + silk: bright, soft,
 * generously spaced, timeless. Luxury through restraint.
 *
 * color_role: 'accent' — the pearl/marble canvas stays constant; the
 * palette swatches tone the accent (CTAs, ornaments, active tab wash,
 * timeline numerals). The default is a muted champagne gold; every
 * swatch is a low-saturation, sophisticated metal/tone so the page
 * reads premium regardless of which the owner picks.
 */
const manifest: TemplateManifest = {
  slug:    'opaline',
  name:    'Opaline',
  version: '1.0.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#B89B72', label: 'Champagne (default)' },
    { hex: '#A8998A', label: 'Taupe' },
    { hex: '#C2A9A1', label: 'Rose Nude' },
    { hex: '#9AA89E', label: 'Sage Mist' },
    { hex: '#7C7770', label: 'Slate' },
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
}

export default manifest
