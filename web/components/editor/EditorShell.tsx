'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { EditorProvider, useEditor } from '@/lib/editorContext'
import LivePreview from './LivePreview'
import FadeRoomTemplate from '@/components/public-site/FadeRoomTemplate'
import { getTenantId } from '@/lib/auth'
import { ChevronDown, ChevronUp, Smartphone, Monitor } from 'lucide-react'
import { cn } from '@/lib/cn'

// ── Section nav config ────────────────────────────────────────────────────────

const WEBSITE_NAV = [
  { href: '/editor/website',  label: 'Overview',      exact: true },
  { href: '/editor/business', label: 'Business Info' },
  { href: '/editor/policies', label: 'Policies' },
  { href: '/editor/gallery',  label: 'Gallery',    disabled: true },
  { href: '/editor/branding', label: 'Branding',   disabled: true },
  { href: '/editor/template', label: 'Template',   disabled: true },
] as const

const BOOKINGS_NAV = [
  { href: '/editor/bookings',      label: 'Overview',      exact: true },
  { href: '/editor/services',      label: 'Services' },
  { href: '/editor/availability',  label: 'Availability' },
  { href: '/editor/appointments',  label: 'Appointments' },
  { href: '/editor/staff',         label: 'Staff',      disabled: true },
] as const

const WEBSITE_PATHS = [
  '/editor/website',
  '/editor/business',
  '/editor/policies',
  '/editor/gallery',
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

// ── Section tab strip ─────────────────────────────────────────────────────────

type NavItem = {
  href: string
  label: string
  exact?: boolean
  disabled?: boolean
}

function SectionNav({ nav, path }: { nav: readonly NavItem[]; path: string }) {
  return (
    <div className="flex flex-row overflow-x-auto border-b border-[rgba(18,18,18,0.10)] bg-white flex-shrink-0">
      <div className="flex flex-row px-2 gap-0 min-w-max">
        {nav.map(({ href, label, exact, disabled }) => {
          if (disabled) {
            return (
              <span
                key={label}
                className="px-3 py-3 text-[11px] font-medium text-[rgba(18,18,18,0.28)] whitespace-nowrap cursor-default flex-shrink-0"
              >
                {label}
              </span>
            )
          }
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

// ── Mobile preview panel (website section only) ───────────────────────────────

type DeviceMode = 'mobile' | 'desktop'

function MobilePreviewPanel() {
  const { data } = useEditor()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DeviceMode>('mobile')

  const MOBILE_W = 390
  const DESKTOP_W = 1280
  const mobileScale = 320 / MOBILE_W
  const desktopScale = 320 / DESKTOP_W

  return (
    <div className="xl:hidden border-t border-[rgba(18,18,18,0.10)] bg-cream flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text hover:text-near-black transition-colors"
      >
        <span>Preview Site</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="px-4 pb-5">
          <div className="flex gap-1.5 mb-4">
            {(['mobile', 'desktop'] as DeviceMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase border transition-colors ${
                  mode === m
                    ? 'bg-near-black text-white border-near-black'
                    : 'bg-white text-muted-text border-[rgba(18,18,18,0.12)] hover:text-near-black'
                }`}
              >
                {m === 'mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                {m === 'mobile' ? 'Mobile' : 'Desktop'}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {mode === 'mobile' ? (
              <div
                style={{
                  display: 'inline-block',
                  border: '8px solid #121212',
                  borderRadius: 24,
                  overflow: 'hidden',
                  width: MOBILE_W * mobileScale + 16,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: MOBILE_W,
                    transformOrigin: 'top left',
                    transform: `scale(${mobileScale})`,
                    marginBottom: `${-MOBILE_W * (1 - mobileScale)}px`,
                  }}
                >
                  <FadeRoomTemplate data={data} isPreview />
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'inline-block',
                  border: '1px solid rgba(18,18,18,0.12)',
                  overflow: 'hidden',
                  width: DESKTOP_W * desktopScale,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: DESKTOP_W,
                    transformOrigin: 'top left',
                    transform: `scale(${desktopScale})`,
                    marginBottom: `${-DESKTOP_W * (1 - desktopScale)}px`,
                  }}
                >
                  <FadeRoomTemplate data={data} isPreview />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function EditorShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [_slug, setSlug] = useState('')

  useEffect(() => {
    const id = getTenantId()
    if (id) setSlug(id)
  }, [])

  const isWebsite   = WEBSITE_PATHS.some(p => path === p || path.startsWith(p + '/'))
  const isBookings  = BOOKINGS_PATHS.some(p => path === p || path.startsWith(p + '/'))
  const isCustomers = CUSTOMERS_PATHS.some(p => path === p || path.startsWith(p + '/'))

  const sectionLabel = isWebsite ? 'Website' : isBookings ? 'Bookings' : isCustomers ? 'Customers' : 'Editor'

  return (
    <EditorProvider>
      {/* Topbar */}
      <div className="flex items-center border-b border-[rgba(18,18,18,0.10)] bg-white px-4 py-3 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          {sectionLabel}
        </p>
      </div>

      {/* Section tab nav */}
      {isWebsite  && <SectionNav nav={WEBSITE_NAV}  path={path} />}
      {isBookings && <SectionNav nav={BOOKINGS_NAV} path={path} />}

      {/* Content row */}
      <div className="flex flex-col xl:flex-row flex-1 min-h-0">

        {/* Main content column */}
        <div
          className={cn(
            'flex flex-col overflow-hidden bg-white',
            isWebsite
              ? 'flex-1 xl:flex-none xl:w-[420px] xl:border-r xl:border-[rgba(18,18,18,0.10)]'
              : 'flex-1',
          )}
        >
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Collapsible mobile preview — website only */}
          {isWebsite && <MobilePreviewPanel />}
        </div>

        {/* Live preview — website only, xl screens only */}
        {isWebsite && (
          <div className="hidden xl:flex flex-1 min-w-0 overflow-hidden">
            <LivePreview />
          </div>
        )}
      </div>
    </EditorProvider>
  )
}
