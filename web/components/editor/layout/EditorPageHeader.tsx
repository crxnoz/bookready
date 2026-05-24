'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Standard page header used at the top of every editor page.
 *
 * - title: bold page title (h1)
 * - subtitle: one-line supporting copy underneath
 * - backHref/backLabel: optional "← Back to {Hub}" link for sub-pages
 * - actions: optional right-aligned content (buttons, links)
 */
export default function EditorPageHeader({
  title, subtitle, backHref, backLabel, actions,
}: {
  title:     string
  subtitle?: string
  backHref?: string
  backLabel?: string
  actions?:  React.ReactNode
}) {
  return (
    <header className="px-4 sm:px-5 md:px-6 pt-4 pb-2 flex-shrink-0">
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline mb-1.5"
        >
          <ArrowLeft size={12} /> Back to {backLabel ?? 'Overview'}
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-near-black tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-[13px] text-muted-text mt-0.5 max-w-2xl">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>
        )}
      </div>
    </header>
  )
}
