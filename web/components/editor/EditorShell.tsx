'use client'

import { useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { EditorProvider } from '@/lib/editorContext'
import { PlanProvider }  from '@/components/editor/PlanContext'
import EditorInnerNav    from '@/components/editor/layout/EditorInnerNav'
import EditorPageHeader  from '@/components/editor/layout/EditorPageHeader'
import SectionTopBar     from '@/components/editor/layout/SectionTopBar'
import { useRole }       from '@/components/app/RoleContext'
import {
  EDITOR_SECTIONS,
  sectionForPath,
  type EditorSectionConfig,
} from '@/lib/editorNav'

/**
 * Wraps every editor page with the unified shell:
 *   ┌───────────────────────────────────────────────┐
 *   │ SectionTopBar     (Website / Bookings / …)    │
 *   ├───────────────────────────────────────────────┤
 *   │ EditorInnerNav    (Overview · Hero · Content) │
 *   ├───────────────────────────────────────────────┤
 *   │ EditorPageHeader  (title + subtitle)          │
 *   ├───────────────────────────────────────────────┤
 *   │ Page content (children)                       │
 *   └───────────────────────────────────────────────┘
 *
 * Props are all optional so existing pages can opt into the page header
 * incrementally. If title is omitted the section's default title is used.
 */
export default function EditorShell({
  children,
  title,
  subtitle,
  pageHeader = true,
  innerNav   = true,
  topBar     = true,
  actions,
  activeInnerTab,
}: {
  children:        React.ReactNode
  title?:          string
  subtitle?:       string
  pageHeader?:     boolean
  innerNav?:       boolean
  topBar?:         boolean
  actions?:        React.ReactNode
  /** Explicit inner tab override; otherwise resolved from URL */
  activeInnerTab?: string
}) {
  const path = usePathname()
  const sp   = useSearchParams()
  // Wave D — staff get a chrome-free shell (no owner section nav strip).
  // The page header + content still render; only the owner-oriented
  // SectionTopBar / EditorInnerNav are suppressed.
  const { isStaff } = useRole()

  const section: EditorSectionConfig = useMemo(() => sectionForPath(path), [path])

  // Resolve active inner tab.
  // - query-tab sections: use ?tab=… (default 'overview')
  // - route sections: match the current path against the configured hrefs
  const activeId = useMemo(() => {
    if (activeInnerTab) return activeInnerTab
    if (section.innerNavMode === 'query-tab') {
      const raw = sp?.get('tab') ?? 'overview'
      return section.innerNav.some(n => n.id === raw) ? raw : 'overview'
    }
    // route mode
    const exact = section.innerNav.find(n => n.href && n.href === path)
    if (exact) return exact.id
    const startsWith = section.innerNav.find(n =>
      n.href && n.href !== section.hubPath && path.startsWith(n.href + '/')
    )
    if (startsWith) return startsWith.id
    return 'overview'
  }, [activeInnerTab, section, sp, path])

  // "Sub-page" inside a section's hub gets a back link.
  // For query-tab sections any non-overview tab counts as a sub-page;
  // for route sections any path that's not the hub counts.
  const isHubRoot =
    (section.innerNavMode === 'query-tab' && activeId === 'overview' && path === section.hubPath) ||
    (section.innerNavMode === 'route'     && path === section.hubPath)

  const showBack = pageHeader && !isHubRoot && section.key !== 'dashboard'

  const resolvedTitle    = title    ?? section.defaultTitle
  const resolvedSubtitle = subtitle ?? section.defaultSubtitle

  // Staff never see the owner section nav, regardless of the per-page props.
  const showTopBar   = topBar   && ! isStaff
  const showInnerNav = innerNav && ! isStaff

  return (
    <EditorProvider>
      <PlanProvider>
        {showTopBar   && <SectionTopBar label={section.label} />}
        {showInnerNav && <EditorInnerNav section={section} activeId={activeId} />}
        {pageHeader && (
          <EditorPageHeader
            title={resolvedTitle}
            subtitle={resolvedSubtitle}
            backHref={showBack ? section.hubPath : undefined}
            backLabel={showBack ? section.label : undefined}
            actions={actions}
          />
        )}

        {/* Page content — full width, cream background, internal scroll */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto bg-cream">
            {children}
          </div>
        </div>
      </PlanProvider>
    </EditorProvider>
  )
}

// Re-export the section list for any caller that still imports it from here.
export { EDITOR_SECTIONS }
