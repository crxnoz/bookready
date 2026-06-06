// Canonical list of selectable site templates for the sign-up / checkout
// flows. Keep in sync with web/templates/registry.ts (the slugs that
// actually render) and TemplateDefaults::KNOWN_SLUGS on the backend.

export interface TemplateChoice {
  slug: string
  label: string
  desc: string
  /** Swatch color shown in the picker. */
  color: string
}

export const SITE_TEMPLATES: TemplateChoice[] = [
  { slug: 'velvettheory', label: 'Velvet Theory', desc: 'Editorial luxury — sharp, refined, deep tones',  color: '#2D0F19' },
  { slug: 'thefaderoom',  label: 'The Fade Room', desc: 'Dark editorial barbershop',                       color: '#0A0A0A' },
  { slug: 'blackline',    label: 'Blackline',     desc: 'Industrial editorial — stark, brutalist lines',  color: '#141414' },
  { slug: 'lushstudio',   label: 'Lush Studio',   desc: 'Soft feminine salon — sage & cream',              color: '#F3E8F0' },
  { slug: 'opaline',      label: 'Opaline',       desc: 'Luminous luxury spa — airy & pearlescent',        color: '#E7EEF0' },
  { slug: 'petale',       label: 'Pétale',        desc: 'Soft pink bridal — wedding-paper romantic',       color: '#F4DDE0' },
  { slug: 'bottega',      label: 'Bottega',       desc: 'Earthy nail / lash / brow — Italian-artisanal',   color: '#C9692C' },
]

export const DEFAULT_TEMPLATE_SLUG = 'thefaderoom'

/** Coerce an arbitrary value to a real template slug (default if unknown). */
export function normalizeTemplateSlug(slug: string | null | undefined): string {
  const s = (slug ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return SITE_TEMPLATES.some(t => t.slug === s) ? s : DEFAULT_TEMPLATE_SLUG
}
