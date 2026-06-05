/**
 * BookReady template manifest.
 *
 * Every marketplace template MUST ship a manifest that declares:
 *   - Which header / footer fields it actually surfaces (so the editor
 *     can hide controls the template would silently ignore).
 *   - How it interprets the theme color (`accent` highlight vs page
 *     `background`).
 *   - The color palette options it offers tenants.
 *
 * The editor reads the active template's manifest to decide which panels
 * and fields to render, so a Lush Studio tenant doesn't see an "Avatar
 * image" upload that the template won't display, and a Velvet Theory
 * tenant sees "Background variant" instead of "Accent color".
 *
 * Loaded lazily alongside the template component via registry.ts.
 */

// ─── Header fields a template MAY support ──────────────────────────────────────
//
// These are grouped concepts — "social_buttons" is the full set of 11 platform
// toggles + URL overrides (Instagram, Phone, Email, Maps, Pinterest, YouTube,
// WhatsApp, TikTok, Facebook, Message, Book). A template either supports the
// social-buttons cluster as a whole or doesn't.

export type HeaderField =
  | 'cover_image'      // header.cover_image_url
  | 'avatar_image'     // header.avatar_image_url
  | 'announcement'     // header.announcement_text + header.show_announcement
  | 'business_type'    // profile.business_type rendered in header
  | 'social_buttons'   // header.show_*_button + header.*_button_url (11 entries)

// ─── About fields a template MAY surface ──────────────────────────────────────
//
// All About content lives in template_settings.about.* regardless of which
// template is active. about_fields lets a template declare which of those
// fields it actually renders, so the editor can hide controls the template
// would silently ignore (e.g. Blackline About has no eyebrow and no images;
// only the highlights list + heading + body show up).
//
// Default (when about_fields is undefined): show all controls — backward
// compatible with templates that pre-date this field.

export type AboutField =
  | 'eyebrow'      // about.eyebrow rendered above the heading
  | 'images'       // about.images[3] rendered in the section
  | 'highlights'   // about.highlights[].{title,body} rendered as a list

// ─── Footer fields a template MAY support ──────────────────────────────────────
//
// One token per footer.show_* toggle plus the two text fields. A template that
// doesn't declare a footer field renders that section however it wants but the
// editor hides the corresponding control.

export type FooterField =
  | 'show_powered_by'
  | 'show_hours'
  | 'show_quick_book'
  | 'show_contact_links'
  | 'business_name_override'
  | 'subtext'

// ─── Color palette entry ───────────────────────────────────────────────────────
//
// Templates ship their own palettes. The first entry is the default; the
// editor highlights it as such. Hex must be six digits with a leading #.

export interface ColorPaletteEntry {
  hex:   string   // e.g. '#FF3DBE'
  label: string   // e.g. 'Pink (default)'
}

// ─── Manifest ──────────────────────────────────────────────────────────────────

export interface TemplateManifest {
  /**
   * Stable identifier. Must match the directory name under web/templates/
   * AND the value stored in `template_settings.template_slug`.
   */
  slug: string

  /** Human-readable name shown in the editor template card and template list. */
  name: string

  /**
   * Marketplace version (semver). Bump on any breaking change to the
   * template's data consumption or rendering. Reserved for the marketplace
   * upgrade flow — not enforced at runtime yet.
   */
  version: string

  /**
   * How this template interprets `template.settings.theme.accent_color`:
   *   - 'accent':     the value is a highlight applied to chrome (buttons,
   *                   links, eyebrows). Page background stays the template's
   *                   default. The editor labels the picker "Accent color".
   *   - 'background': the value replaces the page background. The template's
   *                   accent (e.g. Velvet Theory's gold) stays constant. The
   *                   editor labels the picker "Background variant".
   */
  color_role: 'accent' | 'background'

  /**
   * Palette options offered to tenants. First entry is the default.
   * Editor highlights the currently-selected entry by exact hex match.
   */
  color_palette: ColorPaletteEntry[]

  /**
   * Header fields this template actually surfaces to visitors. The editor
   * will hide any control whose field is not in this list, even though the
   * value is still stored in template_settings.settings_json.header.*
   */
  header_fields: HeaderField[]

  /**
   * Footer fields this template actually surfaces. Same gating semantics as
   * header_fields.
   */
  footer_fields: FooterField[]

  /**
   * About fields this template surfaces. Optional for backward-compat with
   * older manifests; treated as ['eyebrow', 'images', 'highlights'] (all on)
   * when omitted. Declare an explicit subset to hide editor controls the
   * template doesn't render.
   */
  about_fields?: AboutField[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Get the default palette entry (first entry). */
export function defaultColorFor(manifest: TemplateManifest): ColorPaletteEntry {
  return manifest.color_palette[0]
}

/** True if the template declares support for a given header field. */
export function supportsHeaderField(
  manifest: TemplateManifest,
  field: HeaderField,
): boolean {
  return manifest.header_fields.includes(field)
}

/** True if the template declares support for a given footer field. */
export function supportsFooterField(
  manifest: TemplateManifest,
  field: FooterField,
): boolean {
  return manifest.footer_fields.includes(field)
}

/**
 * True if the template surfaces a given About field. Undeclared
 * about_fields = backward-compat default of "all on".
 */
export function supportsAboutField(
  manifest: TemplateManifest,
  field: AboutField,
): boolean {
  return manifest.about_fields ? manifest.about_fields.includes(field) : true
}

/** Runtime guard so registry consumers can validate at load time. */
export function isTemplateManifest(x: unknown): x is TemplateManifest {
  if (!x || typeof x !== 'object') return false
  const m = x as Partial<TemplateManifest>
  return typeof m.slug === 'string'
    && typeof m.name === 'string'
    && typeof m.version === 'string'
    && (m.color_role === 'accent' || m.color_role === 'background')
    && Array.isArray(m.color_palette)
    && Array.isArray(m.header_fields)
    && Array.isArray(m.footer_fields)
}
