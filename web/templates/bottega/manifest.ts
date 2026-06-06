import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Bottega — modern earthy nail / lash / brow studio template.
 *
 * The only template in the marketplace with a patterned background:
 * a tileable motif tile lives behind every section at a per-pattern
 * tuned opacity. Default is 'ceramic' (a Mediterranean blue mosaic
 * of broken shards) but the editor surfaces a pattern picker that
 * lets the owner swap in cherry blossoms / leaves / marble / coastal
 * any time. Italian-artisanal voice — "bottega" is the Italian word
 * for a small workshop / atelier — fits high-end concept nail bars,
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

  // Pattern picker — Bottega is the only template that ships a patterned
  // background, so the editor replaces its accent-color picker with a
  // pattern picker driven by this list. The selected key writes to
  // settings.theme.pattern_motif; BottegaTemplate's PATTERNS map resolves
  // each key to a URL + tuned overlay opacity + tile size at render time.
  pattern_options: [
    { key: 'ceramic',  label: 'Ceramic',          url: '/templates/bottega/ceramic.jpeg' },
    { key: 'flowers',  label: 'Cherry blossom',   url: '/templates/bottega/flowers.png' },
    { key: 'leaves',   label: 'Leaves',           url: '/templates/bottega/leaves.jpeg' },
    { key: 'marble',   label: 'Marble',           url: '/templates/bottega/marble.jpeg' },
    { key: 'oceanic',  label: 'Coastal',          url: '/templates/bottega/oceanic-pattern.jpg' },
  ],
}

export default manifest
