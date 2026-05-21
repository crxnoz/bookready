'use client'

import Link from 'next/link'
import {
  Building2,
  ChevronRight,
  FileText,
  Image,
  LayoutTemplate,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/cn'

type SectionStatus = 'complete' | 'needs-setup' | 'soon'

interface Section {
  href: string
  label: string
  description: string
  status: SectionStatus
  statusLabel: string
  icon: React.ElementType
  disabled?: boolean
}

const SECTIONS: Section[] = [
  {
    href:        '/editor/business',
    label:       'Business Info',
    description: 'Name, tagline, address, phone, and social links',
    status:      'complete',
    statusLabel: 'Complete',
    icon:        Building2,
  },
  {
    href:        '/editor/policies',
    label:       'Policies',
    description: 'Cancellation, no-show, late arrival, and deposit policies',
    status:      'needs-setup',
    statusLabel: 'Needs setup',
    icon:        FileText,
  },
  {
    href:        '#',
    label:       'Gallery',
    description: 'Photos and media displayed on your public site',
    status:      'soon',
    statusLabel: 'Coming soon',
    icon:        Image,
    disabled:    true,
  },
  {
    href:        '#',
    label:       'Branding',
    description: 'Colors, fonts, logo, and brand identity',
    status:      'soon',
    statusLabel: 'Coming soon',
    icon:        Palette,
    disabled:    true,
  },
  {
    href:        '#',
    label:       'Template',
    description: 'Customize and switch your site template',
    status:      'soon',
    statusLabel: 'Coming soon',
    icon:        LayoutTemplate,
    disabled:    true,
  },
]

const STATUS_BADGE: Record<SectionStatus, string> = {
  complete:     'bg-white border border-[rgba(18,18,18,0.12)] text-[rgba(18,18,18,0.6)]',
  'needs-setup':'bg-blush border-transparent text-[rgba(18,18,18,0.7)]',
  soon:         'bg-lavender border-transparent text-[rgba(18,18,18,0.5)]',
}

export default function WebsiteHub() {
  return (
    <div className="flex flex-col min-h-full bg-cream">

      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          Website
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Page head */}
        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight">Website</h1>
          <p className="text-sm text-muted-text mt-0.5">
            Manage your public-facing website, content, and brand presence.
          </p>
        </div>

        {/* Sections grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SECTIONS.map(({ href, label, description, status, statusLabel, icon: Icon, disabled }) => {
            const card = (
              <div
                className={cn(
                  'bg-white border p-5 flex flex-col gap-3 transition-colors h-full',
                  disabled
                    ? 'border-[rgba(18,18,18,0.08)] opacity-60 cursor-default'
                    : 'border-[rgba(18,18,18,0.12)] hover:border-near-black cursor-pointer',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={cn(
                    'w-9 h-9 flex items-center justify-center border flex-shrink-0',
                    disabled
                      ? 'bg-cream border-[rgba(18,18,18,0.08)]'
                      : 'bg-cream border-[rgba(18,18,18,0.12)]',
                  )}>
                    <Icon size={16} className={disabled ? 'text-muted-text' : 'text-near-black'} strokeWidth={1.6} />
                  </div>
                  <span className={cn(
                    'text-[9px] font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 flex-shrink-0',
                    STATUS_BADGE[status],
                  )}>
                    {statusLabel}
                  </span>
                </div>

                <div className="flex-1">
                  <p className={cn(
                    'text-[13px] font-semibold tracking-tight mb-1',
                    disabled ? 'text-muted-text' : 'text-near-black',
                  )}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-text leading-relaxed">{description}</p>
                </div>

                <div className={cn('flex items-center gap-1 text-[10px] font-semibold text-near-black', disabled && 'invisible')}>
                  Open <ChevronRight size={11} />
                </div>
              </div>
            )

            return disabled ? (
              <div key={label} className="h-full">{card}</div>
            ) : (
              <Link key={label} href={href} className="block h-full">
                {card}
              </Link>
            )
          })}
        </div>

      </div>
    </div>
  )
}
