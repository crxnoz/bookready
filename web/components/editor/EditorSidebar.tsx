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
  { href: '/editor/business',  label: 'Business',  icon: Building2,      status: 'complete',    statusLabel: 'Complete'     },
  { href: '/editor/services',  label: 'Services',  icon: Scissors,       status: 'complete',    statusLabel: 'Complete'     },
  { href: '/editor/hours',     label: 'Hours',     icon: Clock,          status: 'needs-setup', statusLabel: 'Needs setup'  },
  { href: '/editor/policies',  label: 'Policies',  icon: FileText,       status: 'needs-setup', statusLabel: 'Needs setup'  },
  { href: '/editor/gallery',   label: 'Gallery',   icon: Image,          status: 'soon',        statusLabel: 'Coming soon', disabled: true },
  { href: '/editor/staff',     label: 'Staff',     icon: Users,          status: 'soon',        statusLabel: 'Coming soon', disabled: true },
  { href: '#',                 label: 'Branding',  icon: Palette,        status: 'soon',        statusLabel: 'Coming soon', disabled: true },
  { href: '#',                 label: 'Template',  icon: LayoutTemplate, status: 'info',        statusLabel: 'The Fade Room', disabled: true },
]

const BADGE: Record<Status, string> = {
  complete:     'bg-white border border-[rgba(18,18,18,0.12)] text-[rgba(18,18,18,0.6)]',
  'needs-setup':'bg-blush border-transparent text-[rgba(18,18,18,0.7)]',
  soon:         'bg-lavender border-transparent text-[rgba(18,18,18,0.5)]',
  info:         'bg-white border border-[rgba(18,18,18,0.12)] text-[rgba(18,18,18,0.5)]',
}

export default function EditorSidebar({ slug: _slug }: { slug: string }) {
  const path = usePathname()

  return (
    <aside
      className={cn(
        'bg-white border-[rgba(18,18,18,0.10)] flex-shrink-0',
        // Mobile / tablet: horizontal scrollable strip at top
        'flex flex-row overflow-x-auto border-b',
        // xl+: vertical sidebar on left
        'xl:flex-col xl:w-[220px] xl:border-b-0 xl:border-r xl:overflow-x-visible xl:overflow-y-auto xl:h-full',
      )}
    >
      {/* Label — desktop only */}
      <p className="hidden xl:block px-5 pt-4 pb-2 text-[9px] font-bold tracking-[0.2em] uppercase text-muted-text flex-shrink-0">
        Site Sections
      </p>

      {/* Nav items */}
      <div className="flex flex-row xl:flex-col gap-0.5 p-1.5 xl:p-2 flex-1 xl:flex-none">
        {NAV.map(({ href, label, icon: Icon, status, statusLabel, disabled }) => {
          const active = href !== '#' && (path === href || path.startsWith(href))
          return (
            <Link
              key={label}
              href={disabled ? '#' : href}
              onClick={disabled ? e => e.preventDefault() : undefined}
              className={cn(
                'flex items-center border transition-colors select-none',
                // Mobile: compact vertical stack (icon above label)
                'flex-col gap-1 px-3 py-2.5 min-w-[60px] whitespace-nowrap',
                // xl: horizontal row with badge
                'xl:flex-row xl:gap-2.5 xl:px-3 xl:py-2.5 xl:min-w-0 xl:w-full',
                active
                  ? 'bg-near-black text-white border-near-black'
                  : disabled
                  ? 'border-transparent text-[rgba(18,18,18,0.28)] cursor-default'
                  : 'border-transparent text-[rgba(18,18,18,0.7)] hover:bg-[rgba(18,18,18,0.04)] hover:text-near-black',
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} className="flex-shrink-0" />

              <span className="text-[10px] xl:text-[13px] font-medium leading-tight">{label}</span>

              {/* Status badge — xl only */}
              <span
                className={cn(
                  'hidden xl:inline-flex ml-auto text-[9px] font-semibold tracking-[0.06em] uppercase px-1.5 py-0.5 border flex-shrink-0',
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
