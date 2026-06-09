import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Inkhouse, dark editorial tattoo studio template.
 *
 * For modern tattoo studios doing fine-line, blackwork, or traditional
 * work, plus solo artists with strong personal brands. The aesthetic is
 * brutalist editorial on a near-black canvas: a heavy Cormorant Garamond
 * masthead serif over a clean Inter body, warm-charcoal cards, rust
 * accents that read like fresh ink without aggression, and sharp
 * radius-0 surfaces everywhere.
 *
 * color_role: 'accent', the warm-charcoal canvas stays constant; the
 * palette swatches tone CTAs, eyebrow rules, active-tab markers, and the
 * thin horizontal dividers between sections. The default rust is the
 * signature; every alternate swatch is dark-canvas-compatible so the
 * page reads editorial regardless of which the owner picks.
 *
 * Active-tab marker: a short, thick rust bar centered BELOW the active
 * pill, sharp (no radius), distinct from Opaline's champagne wash,
 * Velvet's flush gold bar, Blackline's flat underline, Lush's floating
 * sparkle, TFR's marquee glow, and Pétale's scalloped curve.
 */
const manifest: TemplateManifest = {
  slug:    'inkhouse',
  name:    'Inkhouse',
  version: '0.1.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#C84A1E', label: 'Rust (default)' },
    { hex: '#D17A56', label: 'Burnt Sienna' },
    { hex: '#A89978', label: 'Warm Stone' },
    { hex: '#8B6F4E', label: 'Walnut' },
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
