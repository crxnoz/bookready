import type { TemplateManifest } from '../_shared/manifest'

/**
 * The Fade Room — canonical BookReady editorial template.
 *
 * Surfaces the full editor capability set: cover + avatar + announcement +
 * business_type + all social buttons in the header; all six footer toggles;
 * accent-style color picker.
 *
 * Palette mirrors the historical WebsiteHub `ACCENT_PALETTES['thefaderoom']`
 * — keep these in sync until WebsiteHub is migrated to load palettes via
 * manifest (Phase 4).
 */
const manifest: TemplateManifest = {
  slug:    'thefaderoom',
  name:    'The Fade Room',
  version: '1.0.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#FF3DBE', label: 'Pink (default)' },
    { hex: '#F9FAFB', label: 'White' },
    { hex: '#22F5A3', label: 'Mint' },
    { hex: '#FF3B5C', label: 'Red' },
    { hex: '#FFD84D', label: 'Yellow' },
    { hex: '#3DA9FC', label: 'Blue' },
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
