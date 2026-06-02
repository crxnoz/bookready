import type { TemplateManifest } from '@bkrdy/platform'

/**
 * The Fade Room — late-night neon nail + lash studio template.
 *
 * Dark editorial canvas with a bright neon accent. Built for nail and
 * lash studios with after-hours energy — the kind of place where the
 * client lingers in the chair for ninety minutes and rebooks before
 * they leave.
 *
 * Surfaces the full editor capability set: cover + avatar + announcement
 * + business_type + all social buttons in the header; all six footer
 * toggles; accent-style color picker against a constant dark canvas
 * (the palette swatches set the neon highlight color — pink, cyan,
 * lime, etc — rather than swapping the page background).
 */
const manifest: TemplateManifest = {
  slug:    'thefaderoom',
  name:    'The Fade Room',
  version: '2.0.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#FF3DBE', label: 'Pink (default)' },
    { hex: '#00E5FF', label: 'Cyan' },
    { hex: '#B5FF3D', label: 'Lime' },
    { hex: '#C84FFF', label: 'Purple' },
    { hex: '#FFC93D', label: 'Sunset' },
    { hex: '#FF6B6B', label: 'Coral' },
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
