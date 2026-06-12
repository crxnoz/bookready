'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ExternalLink, Sparkles } from 'lucide-react'
import { SITE_TEMPLATES } from '@/lib/templates'
import { cn } from '@/lib/cn'

/**
 * Shared template picker used on /register (email signup) and
 * /register/complete (Google signup). Surfaces all 9 templates in a
 * single grid that's collapsed by default — the picker shows only
 * the current selection until the owner clicks "View other templates."
 *
 * Why collapsible: the email signup form is already long (owner name,
 * email, password ×2, business name, ToS, CAPTCHA, submit). A 9-card
 * grid permanently expanded under the business-name field would
 * dominate the page. Showing the selection inline + a single expand
 * affordance keeps the form scannable while still giving every
 * template a fair shot when the owner explicitly opts in.
 *
 * Both call sites read/write the same TEMPLATE_KEY in localStorage
 * outside this component; the picker is presentational and only
 * mirrors `value` -> `onChange`.
 */
interface Props {
  value:    string
  onChange: (slug: string) => void
}

export default function CollapsibleTemplatePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  const selected = SITE_TEMPLATES.find(t => t.slug === value) ?? SITE_TEMPLATES[0]

  function pick(slug: string) {
    onChange(slug)
    setOpen(false) // Auto-collapse on selection so the new pick reads as committed.
  }

  return (
    <div>
      {/* Label + showcase cross-link mirror the existing
          /register/complete pattern so the affordances feel familiar. */}
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-0">
          Template
        </label>
        <Link
          href="/templates"
          className="text-[10px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black"
        >
          change ↗
        </Link>
      </div>

      {/* Featured cross-link to the marketing showcase. */}
      <a
        href="https://mybookready.com/templates"
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center gap-3 bg-blush border border-[rgba(18,18,18,0.10)] hover:border-near-black p-3 mb-2 transition-colors"
      >
        <div className="w-8 h-8 flex items-center justify-center bg-white border border-[rgba(18,18,18,0.10)] flex-shrink-0">
          <Sparkles size={13} className="text-near-black" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-bold text-near-black leading-tight">
            See the full template showcase
          </p>
          <p className="text-[10px] text-muted-text mt-0.5">
            Full previews + demos on mybookready.com
          </p>
        </div>
        <ExternalLink size={13} className="text-muted-text group-hover:text-near-black flex-shrink-0" />
      </a>

      {/* Currently-selected row, always visible. Clicking it toggles
          the rest of the grid open or closed. */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left flex items-center gap-3 px-3 py-2.5 border border-near-black bg-white transition-colors"
        aria-expanded={open}
      >
        <span
          className="w-6 h-6 flex-shrink-0 border border-[rgba(18,18,18,0.10)]"
          style={{ background: selected.color }}
        />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-near-black leading-tight">{selected.label}</span>
          <span className="block text-[11px] text-muted-text truncate">{selected.desc}</span>
        </span>
        <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-near-black text-white px-1.5 py-0.5 flex-shrink-0">
          Selected
        </span>
        <ChevronDown
          size={14}
          className={cn(
            'text-muted-text flex-shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {/* Collapsed default state — small "see other options" tease so
          owners who scan past notice the choice is changeable without
          having to recognize the chevron. */}
      {! open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 text-[11px] text-muted-text underline underline-offset-2 hover:text-near-black"
        >
          View {SITE_TEMPLATES.length - 1} other template{SITE_TEMPLATES.length - 1 === 1 ? '' : 's'}
        </button>
      )}

      {/* Expanded grid — all templates EXCEPT the currently-selected
          one (which is already shown above). Renders inline to avoid
          floating-UI edge cases inside long scroll containers. */}
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {SITE_TEMPLATES.filter(t => t.slug !== selected.slug).map(t => (
            <button
              key={t.slug}
              type="button"
              onClick={() => pick(t.slug)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 border border-[rgba(18,18,18,0.12)] bg-white hover:bg-cream transition-colors"
            >
              <span
                className="w-6 h-6 flex-shrink-0 border border-[rgba(18,18,18,0.10)]"
                style={{ background: t.color }}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-near-black leading-tight">{t.label}</span>
                <span className="block text-[11px] text-muted-text truncate">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-muted-text">
        You can change this anytime in the editor.
      </p>
    </div>
  )
}
