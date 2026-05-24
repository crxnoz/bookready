'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { EditorProvider } from '@/lib/editorContext'
import { getTenantId } from '@/lib/auth'
import { cn } from '@/lib/cn'
import { ArrowLeft } from 'lucide-react'

// ── Section nav config ────────────────────────────────────────────────────────

type WebsiteTabId = 'overview' | 'business' | 'header' | 'content' | 'additionals' | 'footer'

const WEBSITE_NAV: { id: WebsiteTabId; label: string }[] = [
  { id: 'overview',    label: 'Overview'        },
  { id: 'business',    label: 'Business Info'   },
  { id: 'header',      label: 'Header / Hero'   },
  { id: 'content',     label: 'Content / Tabs'  },
  { id: 'additionals', label: 'Additionals'     },
  { id: 'footer',      label: 'Footer'          },
]

const BOOKINGS_NAV = [
  { href: '/editor/bookings',      label: 'Overview',      exact: true },
  { href: '/editor/services',      label: 'Services' },
  { href: '/editor/availability',  label: 'Availability' },
  { href: '/editor/appointments',  label: 'Appointments' },
  { href: '/editor/staff',         label: 'Staff' },
] as const

// Business Info, Policies, Gallery, etc. are all now tabs inside /editor/website.
// Legacy /editor/business and /editor/policies routes redirect to the matching tab.
const WEBSITE_PATHS = [
  '/editor/website',
  '/editor/branding',
  '/editor/template',
]

const BOOKINGS_PATHS = [
  '/editor/bookings',
  '/editor/services',
  '/editor/availability',
  '/editor/hours',
  '/editor/appointments',
  '/editor/staff',
]

const CUSTOMERS_PATHS = ['/editor/customers']

// ── Website tab strip (top horizontal nav) ────────────────────────────────────

function WebsiteSectionNav({ activeTab }: { activeTab: WebsiteTabId }) {
  return (
    <div className="flex flex-row overflow-x-auto border-b border-[rgba(18,18,18,0.10)] bg-white flex-shrink-0">
      <div className="flex flex-row px-2 gap-0 min-w-max">
        {WEBSITE_NAV.map(({ id, label }) => {
          const active = activeTab === id
          const href = id === 'overview' ? '/editor/website' : `/editor/website?tab=${id}`
          return (
            <Link
              key={id}
              href={href}
              scroll={false}
              className={cn(
                'px-3 py-3 text-[11px] font-medium whitespace-nowrap flex-shrink-0',
                'border-b-2 -mb-px transition-colors',
                active
                  ? 'border-near-black text-near-black font-semibold'
                  : 'border-transparent text-[rgba(18,18,18,0.6)] hover:text-near-black',
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Bookings tab strip (unchanged) ────────────────────────────────────────────

type BookingsNavItem = { href: string; label: string; exact?: boolean }

function BookingsSectionNav({ nav, path }: { nav: readonly BookingsNavItem[]; path: string }) {
  return (
    <div className="flex flex-row overflow-x-auto border-b border-[rgba(18,18,18,0.10)] bg-white flex-shrink-0">
      <div className="flex flex-row px-2 gap-0 min-w-max">
        {nav.map(({ href, label, exact }) => {
          const active = exact
            ? path === href
            : path === href || path.startsWith(href + '/')
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                'px-3 py-3 text-[11px] font-medium whitespace-nowrap flex-shrink-0',
                'border-b-2 -mb-px transition-colors',
                active
                  ? 'border-near-black text-near-black font-semibold'
                  : 'border-transparent text-[rgba(18,18,18,0.6)] hover:text-near-black',
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

const VALID_WEBSITE_TABS: WebsiteTabId[] = ['overview', 'business', 'header', 'content', 'additionals', 'footer']

export default function EditorShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const searchParams = useSearchParams()
  const [_slug, setSlug] = useState('')

  useEffect(() => {
    const id = getTenantId()
    if (id) setSlug(id)
  }, [])

  const isWebsiteHub = path === '/editor/website'
  const isWebsite    = WEBSITE_PATHS.some(p => path === p || path.startsWith(p + '/'))
  const isBookings   = BOOKINGS_PATHS.some(p => path === p || path.startsWith(p + '/'))
  const isCustomers  = CUSTOMERS_PATHS.some(p => path === p || path.startsWith(p + '/'))

  const sectionLabel = isWebsite ? 'Website' : isBookings ? 'Bookings' : isCustomers ? 'Customers' : 'Editor'

  // A "sub-page" inside the Website group (e.g. /editor/branding) gets a
  // small back link so users can always return to the Website hub.
  const isWebsiteSubpage = isWebsite && !isWebsiteHub
  const subpageBackHref  = '/editor/website'
  const subpageBackLabel = (() => {
    if (path.startsWith('/editor/branding')) return 'Branding'
    if (path.startsWith('/editor/template')) return 'Template'
    return 'Page'
  })()

  // Read active website tab from URL (only meaningful when isWebsiteHub)
  const rawTab = searchParams?.get('tab') ?? 'overview'
  const activeWebsiteTab: WebsiteTabId = VALID_WEBSITE_TABS.includes(rawTab as WebsiteTabId)
    ? (rawTab as WebsiteTabId)
    : 'overview'

  return (
    <EditorProvider>
      {/* Topbar */}
      <div className="flex items-center border-b border-[rgba(18,18,18,0.10)] bg-white px-4 py-3 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          {sectionLabel}
        </p>
      </div>

      {/* Section tab nav — only the Website hub gets the new tab strip */}
      {isWebsiteHub && <WebsiteSectionNav activeTab={activeWebsiteTab} />}
      {isBookings   && <BookingsSectionNav nav={BOOKINGS_NAV} path={path} />}

      {/* Back link for Website sub-pages (Business Info, Policies, etc.) */}
      {isWebsiteSubpage && (
        <div className="flex items-center gap-3 border-b border-[rgba(18,18,18,0.10)] bg-white px-4 py-2.5 flex-shrink-0">
          <Link
            href={subpageBackHref}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
          >
            <ArrowLeft size={12} /> Back to Website
          </Link>
          <span className="text-[10px] text-muted-text">/</span>
          <span className="text-[11px] font-semibold text-near-black">{subpageBackLabel}</span>
        </div>
      )}

      {/* Content area — full width. The Website hub owns its own editor/preview split. */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto bg-cream">
          {children}
        </div>
      </div>
    </EditorProvider>
  )
}
