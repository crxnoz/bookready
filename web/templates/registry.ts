import type { ComponentType } from 'react'
import type { PublicSite } from '@/lib/types'

export interface TemplateProps {
  site: PublicSite
  slug: string
}

type TemplateLoader = () => Promise<{ default: ComponentType<TemplateProps> }>

const REGISTRY: Record<string, TemplateLoader> = {
  thefaderoom: () => import('./thefaderoom/TheFadeRoomTemplate'),
}

export function resolveTemplate(site: PublicSite): TemplateLoader | null {
  const key = (site.profile as unknown as Record<string, unknown>)?.template_key as string | undefined
  if (key && REGISTRY[key]) return REGISTRY[key]
  // Default: all sites use The Fade Room template for now
  return REGISTRY.thefaderoom
}
