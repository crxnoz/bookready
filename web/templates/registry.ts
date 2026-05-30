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
  const key = (site.profile as unknown as Record<string, unknown>)?.template_key as string | undefined
  if (key && REGISTRY[key]) return REGISTRY[key]
  // Default fallback while we have only a couple templates — point at the
  // FadeRoom. Once we offer real picker UX we should refuse to render
  // when the tenant hasn't chosen one rather than silently defaulting.
  return REGISTRY.thefaderoom
}
