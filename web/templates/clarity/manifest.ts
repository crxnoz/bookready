import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Clarity, minimalist clinical luxury template.
 *
 * For medspas, fine-line and micro-tattoo studios, premium nail and lash
 * studios that want to read as luxury. The aesthetic is ultra-clean Apple
 * Newsroom: type-led, photo-light, generous whitespace, fine sans
 * throughout, a single muted accent. Sharp not rounded (luxury reads
 * sharp).
 *
 * color_role: 'accent', the white canvas stays constant; the palette
 * swatches retone the accent (CTAs, eyebrow color, active-tab dot, fine
 * dividers). Default is a muted sage; every alternate is a low-saturation
 * dusty tone so dark text reads well on all of them.
 *
 * Active-tab marker: the muted-text label trades to ink and gains a
 * small 1px accent-colored status dot to the LEFT of the label. The
 * Apple-style status-dot move, distinct from TFR's marquee, Blackline's
 * underline, Velvet's gold bar, Lush's sparkle, Opaline's champagne
 * wash, Petale's scalloped curve, Bottega's terrazzo, and Inkhouse's
 * rust bar.
 */
const manifest: TemplateManifest = {
  slug:    'clarity',
  name:    'Clarity',
  version: '0.1.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#9EAD9C', label: 'Sage (default)' },
    { hex: '#C9A6A0', label: 'Dusty Rose' },
    { hex: '#A795A8', label: 'Mauve' },
    { hex: '#B5AEA1', label: 'Stone' },
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
