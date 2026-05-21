'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Scissors,
  Clock,
  FileText,
  Image,
  Users,
  Palette,
  LayoutTemplate,
} from 'lucide-react'
import { cn } from '@/lib/cn'

type Status = 'complete' | 'needs-setup' | 'soon' | 'info'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  status: Status
  statusLabel: string
  disabled?: boolean
}

const NAV: NavItem[] = [
  { href: '/editor/business', label: 'Business Info', icon: Building2, status: 'complete', statusLabel: 'Complete' },
  { href: '/editor/services', label: 'Services', icon: Scissors, status: 'complete', statusLabel: 'Complete' },
  { href: '/editor/hours', label: 'Hours', icon: Clock, status: 'needs-setup', statusLabel: 'Needs setup' },
  { href: '/editor/policies', label: 'Policies', icon: FileText, status: 'needs-setup', statusLabel: 'Needs setup' },
  { href: '/editor/gallery', label: 'Gallery', icon: Image, status: 'soon', statusLabel: 'Coming soon', disabled: true },
  { href: '/editor/staff', label: 'Staff', icon: Users, status: 'soon', statusLabel: 'Coming soon', disabled: true },
  { href: '#', label: 'Branding', icon: Palette, status: 'soon', statusLabel: 'Coming soon', disabled: true },
  { href: '#', label: 'Template', icon: LayoutTemplate, status: 'info', statusLabel: 'The Fade Room', disabled: true },
]

const BADGE: Record<Status, string> = {
  complete: 'bg-white border border-[rgba(18,18,18,0.12)] text-[rgba(18,18,18,0.6)]',
  'needs-setup': 'bg-blush border-transparent text-[rgba(18,18,18,0.7)]',
  soon: 'bg-lavender border-transparent text-[rgba(18,18,18,0.5)]',
  info: 'bg-white border border-[rgba(18,18,18,0.12)] text-[rgba(18,18,18,0.5)]',
}

export default function EditorSidebar({ slug: _slug }: { slug: string }) {
  const path = usePathname()

  return (
    <aside
      className={cn(
        'bg-white border-[rgba(18,18,18,0.10)] flex-shrink-0',
        // Mobile: horizontal scrollable row
        'flex flex-row overflow-x-auto border-b w-full',
        // Desktop: vertical sidebar
        'md:flex-col md:w-[240px] md:border-b-0 md:border-r md:overflow-x-visible md:overflow-y-auto md:h-full',
      )}
    >
      {/* Label — desktop only */}
      <p className="hidden md:block px-5 pt-4 pb-2 text-[9px] font-bold tracking-[0.2em] uppercase text-muted-text flex-shrink-0">
        Site Sections
      </p>

      {/* Nav */}
      <div className="flex flex-row md:flex-col gap-0.5 p-2 md:p-2 flex-1">
        {NAV.map(({ href, label, icon: Icon, status, statusLabel, disabled }) => {
          const active = path === href || (href !== '#' && path.startsWith(href))
          return (
            <Link
              key={label}
              href={disabled ? '#' : href}
              onClick={disabled ? e => e.preventDefault() : undefined}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-medium transition-colors border whitespace-nowrap',
                'flex-col md:flex-row items-center md:items-center gap-1 md:gap-2.5',
                active
                  ? 'bg-near-black text-white border-near-black'
                  : disabled
                  ? 'border-transparent text-[rgba(18,18,18,0.3)] cursor-default'
                  : 'border-transparent text-[rgba(18,18,18,0.75)] hover:bg-[rgba(18,18,18,0.04)] hover:text-near-black',
              )}
            >
              <Icon
                size={14}
                strokeWidth={active ? 2.2 : 1.8}
                className="flex-shrink-0 md:flex-none"
              />
              {/* Label — always visible on mobile (icon + text stacked), row on desktop */}
              <span className="text-[10px] md:text-[13px]">{label}</span>

              {/* Status badge — desktop only */}
              <span
                className={cn(
                  'hidden md:inline-flex ml-auto text-[9px] font-semibold tracking-[0.06em] uppercase px-1.5 py-0.5 border',
                  active ? 'bg-white/15 border-white/20 text-white' : BADGE[status],
                )}
              >
                {statusLabel}
              </span>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}
