import type { TemplateManifest } from '@bkrdy/platform'

/**
 * Lush Studio — feminine cream/sage template.
 *
 * Differs from The Fade Room on header surface: no avatar (Lush deliberately
 * hides .lush-header-avatar via CSS, so exposing the upload would be a
 * tenant-confusing dead control). Otherwise full footer surface; accent-style
 * color picker over the sage palette.
 *
 * Palette mirrors the historical WebsiteHub `ACCENT_PALETTES['lushstudio']`
 * — keep these in sync until WebsiteHub is migrated to load palettes via
 * manifest (Phase 4).
 */
const manifest: TemplateManifest = {
  slug:    'lushstudio',
  name:    'Lush Studio',
  version: '1.0.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#7FAF9A', label: 'Sage (default)' },
    // Dusty spa-blue (lum ≈ 0.62) chosen so the white on-pink icons stay
    // legible. The earlier #A9D6E5 pick was too pale (lum 0.81) and forced
    // dark icons.
    { hex: '#6FA8C9', label: 'Dusty Blue' },
    { hex: '#E8A6A6', label: 'Coral' },
    { hex: '#FF4FA3', label: 'Hot Pink' },
  ],

  header_fields: [
    'cover_image',
    // 'avatar_image' deliberately omitted — Lush hides it in CSS.
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
