'use client'

import Link from 'next/link'
import { cn } from '@/lib/cn'

export interface SubTab {
  id:    string
  label: string
  soon?: boolean
}

/**
 * Compact in-page secondary nav. Sits *inside* a page's content (below the
 * EditorShell section nav) to switch between sub-views — e.g. the Availability
 * sub-tabs or the Services Categories/Services/Add-ons/Packages split.
 *
 * Deliberately smaller + tighter than EditorInnerNav (text-2xs, less padding)
 * so the hierarchy reads: section nav  >  this.
 *
 * - Pass `hrefFor` for URL-driven tabs (renders <Link>s, bookmarkable).
 * - Pass `onSelect` for local-state tabs (renders <button>s).
 */
export default function SubTabNav({
  items, activeId, hrefFor, onSelect, className,
}: {
  items:     SubTab[]
  activeId:  string
  hrefFor?:  (id: string) => string
  onSelect?: (id: string) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-row items-center px-3 sm:px-5 md:px-6 border-b border-hairline-soft bg-white overflow-x-auto overflow-y-hidden',
        className,
      )}
    >
      {items.map(item => {
        const active = activeId === item.id
        const cls = cn(
          'inline-flex items-center px-2.5 py-2 text-2xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors flex-shrink-0',
          active
            ? 'border-near-black text-near-black font-semibold'
            : 'border-transparent text-muted-text hover:text-near-black',
        )
        const inner = (
          <>
            <span className={item.soon && !active ? 'text-faint-text' : undefined}>{item.label}</span>
            {item.soon && (
              <span className="ml-1 text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text border border-hairline-strong bg-cream px-1 py-px">
                Soon
              </span>
            )}
          </>
        )
        return hrefFor
          ? (
            <Link
              key={item.id}
              href={hrefFor(item.id)}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={cls}
            >
              {inner}
            </Link>
          )
          : (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect?.(item.id)}
              aria-current={active ? 'page' : undefined}
              className={cls}
            >
              {inner}
            </button>
          )
      })}
    </div>
  )
}
