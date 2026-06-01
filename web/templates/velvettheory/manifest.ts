import type { TemplateManifest } from '../_shared/manifest'

/**
 * Velvet Theory — editorial luxe burgundy/gold template.
 *
 * Differs sharply from The Fade Room and Lush Studio:
 *   - color_role: 'background' — palette swaps the page background; the
 *     gold accent (#C9A876) stays constant. The editor labels the picker
 *     "Background variant" for this template.
 *   - No avatar in header. Just cover image + announcement + social
 *     buttons. Business_type is not surfaced (VT uses the tagline as the
 *     editorial subtitle).
 *   - Footer has no "Quick book" pill — the design uses an in-flow
 *     Reserve CTA instead.
 *
 * Palette mirrors the historical WebsiteHub `ACCENT_PALETTES['velvettheory']`
 * — keep these in sync until WebsiteHub is migrated to load palettes via
 * manifest (Phase 4).
 */
const manifest: TemplateManifest = {
  slug:    'velvettheory',
  name:    'Velvet Theory',
  version: '1.0.0',

  color_role: 'background',
  color_palette: [
    { hex: '#2D0F19', label: 'Burgundy (default)' },
    { hex: '#0E1A2B', label: 'Midnight' },
    { hex: '#0F2620', label: 'Emerald' },
    { hex: '#1F1130', label: 'Plum' },
    { hex: '#1A1A1C', label: 'Charcoal' },
    { hex: '#F5EFE6', label: 'Bone (light)' },
  ],

  header_fields: [
    'cover_image',
    'announcement',
    'social_buttons',
    // 'avatar_image' and 'business_type' deliberately omitted.
  ],

  footer_fields: [
    'show_powered_by',
    'show_hours',
    'show_contact_links',
    'business_name_override',
    'subtext',
    // 'show_quick_book' deliberately omitted — VT uses an in-flow Reserve
    // CTA, no pill needed.
  ],
}

export default manifest
