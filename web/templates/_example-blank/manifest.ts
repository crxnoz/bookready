import type { TemplateManifest } from '../_shared/manifest'

/**
 * Example Blank — the official starter template.
 *
 * Minimal manifest that surfaces every standard editor field. Fork this,
 * change the slug, name, palette, and field declarations, then build your
 * actual template component.
 *
 * NOT registered in the production registry — this exists in the
 * codebase as a reference + a known-good fixture for the manifest
 * validator. Submission portals also use it as the diff baseline ("what
 * changed vs. the starter?") for review tooling.
 */
const manifest: TemplateManifest = {
  slug:    'example-blank',
  name:    'Example Blank',
  version: '0.1.0',

  color_role: 'accent',
  color_palette: [
    { hex: '#1A1A1A', label: 'Charcoal (default)' },
    { hex: '#FFFFFF', label: 'White' },
  ],

  // Maximal header surface — declare what your template renders.
  header_fields: [
    'cover_image',
    'avatar_image',
    'announcement',
    'business_type',
    'social_buttons',
  ],

  // Maximal footer surface.
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
