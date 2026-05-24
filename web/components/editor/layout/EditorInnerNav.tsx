'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'
import { hrefForInnerTab, type EditorSectionConfig } from '@/lib/editorNav'

/**
 * Horizontal scrollable section sub-nav strip.
 *
 * - Mobile-first: items don't wrap; the strip scrolls horizontally if
 *   needed. The page itself never overflows because the strip is its own
 *   scroll container.
 * - 'soon' items are visibly muted but still link (placeholder pages
 *   should render a friendly "coming soon" message).
 */
export default function EditorInnerNav({
  section, activeId,
}: {
  section:  EditorSectionConfig
  activeId: string
}) {
  if (section.innerNav.length === 0) return null

  return (
    <div className="flex flex-row overflow-x-auto border-b border-[rgba(18,18,18,0.10)] bg-white flex-shrink-0">
      <div className="flex flex-row px-2 gap-0 min-w-max">
        {section.innerNav.map(item => {
          const active = activeId === item.id
          const href   = hrefForInnerTab(section, item)
          return (
            <Link
              key={item.id}
              href={href}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'px-3 py-3 text-[11px] font-medium whitespace-nowrap flex-shrink-0',
                'border-b-2 -mb-px transition-colors',
                active
                  ? 'border-near-black text-near-black font-semibold'
                  : item.soon
                  ? 'border-transparent text-[rgba(18,18,18,0.35)] hover:text-[rgba(18,18,18,0.6)]'
                  : 'border-transparent text-[rgba(18,18,18,0.6)] hover:text-near-black',
              )}
            >
              {item.label}
              {item.soon && (
                <span className="ml-1.5 text-[8px] font-bold tracking-[0.06em] uppercase text-muted-text border border-[rgba(18,18,18,0.15)] bg-cream px-1 py-px align-middle">
                  Soon
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
