import type { ComponentType } from 'react'
import type { PublicSite } from '@/lib/types'
import type { TemplateManifest } from '@bkrdy/platform'

export interface TemplateProps {
  site: PublicSite
  slug: string
}

type TemplateLoader = () => Promise<{ default: ComponentType<TemplateProps> }>
type ManifestLoader = () => Promise<{ default: TemplateManifest }>

/**
 * Component bundle — what the public site renderer loads. The shape
 * `{ default: Component }` is preserved so existing consumers
 * (web/app/(public)/site/[slug]/page.tsx) keep working unchanged.
 */
const REGISTRY: Record<string, TemplateLoader> = {
  thefaderoom:  () => import('./thefaderoom/TheFadeRoomTemplate'),
  lushstudio:   () => import('./lushstudio/LushStudioTemplate'),
  velvettheory: () => import('./velvettheory/VelvetTheoryTemplate'),
  blackline:    () => import('./blackline/BlacklineTemplate'),
  opaline:      () => import('./opaline/OpalineTemplate'),
  petale:       () => import('./petale/PetaleTemplate'),
  bottega:      () => import('./bottega/BottegaTemplate'),
  inkhouse:     () => import('./inkhouse/InkhouseTemplate'),
  clarity:      () => import('./clarity/ClarityTemplate'),
}

/**
 * Manifest bundle — what the editor loads to decide which header/footer
 * fields to surface, which color picker to render (accent vs background),
 * etc. Kept separate from the component bundle so the editor can read a
 * template's declared capabilities without pulling its 2-3000 line render
 * component into the editor bundle.
 */
const MANIFESTS: Record<string, ManifestLoader> = {
  thefaderoom:  () => import('./thefaderoom/manifest'),
  lushstudio:   () => import('./lushstudio/manifest'),
  velvettheory: () => import('./velvettheory/manifest'),
  blackline:    () => import('./blackline/manifest'),
  opaline:      () => import('./opaline/manifest'),
  petale:       () => import('./petale/manifest'),
  bottega:      () => import('./bottega/manifest'),
  inkhouse:     () => import('./inkhouse/manifest'),
  clarity:      () => import('./clarity/manifest'),
}

export function resolveTemplate(site: PublicSite): TemplateLoader | null {
  // Canonical source: site.template.slug from PublicSiteController.
  // We previously read site.profile.template_key which never existed
  // on the response — that's why everyone got the default until
  // today regardless of what was in their DB.
  const key = site.template?.slug
  if (key && REGISTRY[key]) return REGISTRY[key]
  // Default fallback while we have only a couple templates — point at
  // the FadeRoom. Once we offer real picker UX we should refuse to
  // render when the tenant hasn't chosen one rather than silently
  // defaulting.
  return REGISTRY.thefaderoom
}

/**
 * Load a template's manifest by slug. Returns null when the slug is
 * unknown (so callers can fall back rather than crash).
 *
 * Editor surfaces use this to gate header/footer fields and to render
 * the right color picker. See `web/templates/_shared/manifest.ts` for
 * the contract.
 */
export async function loadTemplateManifest(
  slug: string | null | undefined,
): Promise<TemplateManifest | null> {
  if (!slug) return null
  const loader = MANIFESTS[slug]
  if (!loader) return null
  const mod = await loader()
  return mod.default
}

/**
 * Enumerate every registered template slug with a lazy manifest loader.
 * Use this for a template-picker UI that needs the marketplace catalog
 * without bundling every manifest upfront.
 */
export function listTemplates(): { slug: string; loadManifest: ManifestLoader }[] {
  return Object.entries(MANIFESTS).map(([slug, loadManifest]) => ({
    slug,
    loadManifest,
  }))
}
