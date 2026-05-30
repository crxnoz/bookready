import type { ComponentType } from 'react'
import type { PublicSite } from '@/lib/types'

export interface TemplateProps {
  site: PublicSite
  slug: string
}

type TemplateLoader = () => Promise<{ default: ComponentType<TemplateProps> }>

const REGISTRY: Record<string, TemplateLoader> = {
  thefaderoom: () => import('./thefaderoom/TheFadeRoomTemplate'),
  lushstudio:  () => import('./lushstudio/LushStudioTemplate'),
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
