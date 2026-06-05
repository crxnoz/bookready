import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Blackline — sleek industrial-modern barbershop template.
 *
 * Design language: heavy canvas (Onyx default), brass-hardware accent
 * (#B8966B), restrained Space Grotesk display + Inter body, hairline
 * brass rules, sharp corners, tracked uppercase eyebrows. Reads as
 * editorial / architectural rather than nostalgic.
 *
 * color_role: 'background' — the palette swatches paint the page
 * surface (Onyx, Charcoal, Walnut, Bone), the brass accent stays
 * constant across variants. Editor labels the picker "Canvas".
 *
 * Header dropped avatar_image: industrial editorial leads with the
 * wordmark, not a logo block. Same call as Atlas / Velvet Theory.
 *
 * Footer keeps all six fields — Quick Book is functional, not
 * decorative, and the brass-accent CTA fits the visual vocabulary.
 */
const manifest: TemplateManifest = {
  slug:    'blackline',
  name:    'Blackline',
  version: '0.1.0',

  color_role: 'background',
  color_palette: [
    { hex: '#0A0A0A', label: 'Onyx (default)' },
    { hex: '#2A2A2A', label: 'Charcoal' },
    { hex: '#3D2817', label: 'Walnut' },
    { hex: '#E8E2D7', label: 'Bone' },
  ],

  header_fields: [
    'cover_image',
    'announcement',
    'business_type',
    'social_buttons',
    // 'avatar_image' deliberately omitted — industrial editorial leads
    // with the wordmark, not a logo block.
  ],

  footer_fields: [
    'show_powered_by',
    'show_hours',
    'show_quick_book',
    'show_contact_links',
    'business_name_override',
    'subtext',
  ],

  // Blackline's About surface is body + highlights only — no eyebrow,
  // no images. Declaring the subset hides those editor controls so the
  // owner doesn't fill in fields the template silently ignores.
  about_fields: ['highlights'],
}

export default manifest
