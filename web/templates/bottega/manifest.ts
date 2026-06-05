import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Bottega — modern earthy nail / lash / brow studio template.
 *
 * The only template in the marketplace with a patterned background:
 * a tileable terrazzo PNG (warm cream base with rust + walnut + sand +
 * slate + navy speckles) lives behind every section at ~8% effective
 * opacity. Italian-artisanal voice — "bottega" is the Italian word for
 * a small workshop / atelier — fits high-end concept nail bars,
 * refined lash + brow studios, and Italian-villa-coded salons.
 *
 * color_role: 'accent' — the palette swatches set the accent color
 * (Rust default; alternates drawn FROM the speckle palette so the
 * highlight always reads "in family" with the pattern). The canvas
 * + terrazzo stay constant. The editor labels the picker "Accent color".
 *
 * Differentiation from the existing six:
 *   - The pattern alone. No other shipped template uses one.
 *   - DM Serif Display italic + Inter — the serif lane is busy with
 *     Cormorant, Fraunces, Playfair, Pinyon, DM Serif TEXT (Lush), but
 *     DM Serif DISPLAY is its own family with heavier contrast.
 *   - About is a 2-image equal-weight side-by-side diptych (no offset),
 *     distinct from Pétale's asymmetric diptych + offset.
 *   - Active-tab marker is a 3-circle speckle cluster — the ONE place
 *     the terrazzo motif gets a glyph-scale callback.
 *
 * Pattern asset: ships at web/public/templates/bottega/terrazzo.png.
 * The template references it via the URL path /templates/bottega/terrazzo.png
 * (Next.js serves anything in public/ from the URL root).
 */
const manifest: TemplateManifest = {
  slug:    'bottega',
  name:    'Bottega',
  version: '0.1.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#C9692C', label: 'Rust (default)' },
    { hex: '#A87A4A', label: 'Walnut' },
    { hex: '#5C6378', label: 'Slate' },
    { hex: '#1A2238', label: 'Deep Navy' },
    { hex: '#7F9277', label: 'Sage' },
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

  // Bottega's About surfaces body + highlights + a 2-image equal-weight
  // side-by-side diptych. Eyebrow is omitted because every template now
  // derives the about eyebrow from the About tab name.
  about_fields: ['highlights', 'images'],
  about_image_count: 2,
}

export default manifest
