'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  Calendar,
  Users,
  CreditCard,
  Plug,
  ShoppingBag,
  Settings,
  Eye,
  Copy,
  LogOut,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { clearAuth } from '@/lib/auth'

// Business Info, Policies, Gallery, etc. now live as tabs inside /editor/website.
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

const MAIN_NAV = [
  { href: '/editor',              label: 'Dashboard',    icon: LayoutDashboard, exact: true },
  { href: '/editor/website',      label: 'Website',      icon: Globe,           matchPaths: WEBSITE_PATHS },
  { href: '/editor/bookings',     label: 'Bookings',     icon: Calendar,        matchPaths: BOOKINGS_PATHS },
  { href: '/editor/customers',    label: 'Customers',    icon: Users },
  { href: '/editor/payments',     label: 'Payments',     icon: CreditCard },
  { href: '/editor/integrations', label: 'Integrations', icon: Plug },
  { href: '/editor/ecommerce',    label: 'Ecommerce',    icon: ShoppingBag, soon: true },
  { href: '/editor/settings',     label: 'Settings',     icon: Settings },
] as const

interface Props {
  slug:       string
  drawerOpen: boolean
  onClose:    () => void
}

export default function AppSidebar({ slug, drawerOpen, onClose }: Props) {
  const path = usePathname()
  const router = useRouter()

  function isActive(item: typeof MAIN_NAV[number]): boolean {
    if ('exact' in item && item.exact) return path === item.href
    if ('matchPaths' in item && item.matchPaths) {
      return item.matchPaths.some(p => path === p || path.startsWith(p + '/'))
    }
    return path === item.href || path.startsWith(item.href + '/')
  }

  function handleCopy() {
    navigator.clipboard?.writeText(`https://${slug}.bkrdy.me`).catch(() => {})
  }

  async function handleSignOut() {
    // Phase S6 — POST to /auth/logout first so the backend revokes
    // the Sanctum token AND sends a Max-Age=0 Set-Cookie to clear the
    // httpOnly session cookie. Then drop the local "logged in" flag
    // and any lingering legacy localStorage values.
    try {
      const { logout } = await import('@/lib/api')
      await logout()
    } catch {
      // Network or already-expired session — fall through to clearAuth.
      // Worst case the cookie lingers until its 14-day TTL.
    }
    clearAuth()
    router.push('/login')
  }

  const navItems = MAIN_NAV.map(item => {
    const active = isActive(item)
    const Icon   = item.icon
    return { item, active, Icon }
  })

  return (
    <>
      {/* ── Desktop sidebar (md and above) ─────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col md:w-[220px] md:h-screen md:border-r md:border-hairline-soft md:bg-white md:flex-shrink-0 md:overflow-y-auto">
        <SidebarBrand slug={slug} />
        <SidebarNav navItems={navItems} variant="desktop" />
        <SidebarBottomActions slug={slug} onCopy={handleCopy} onSignOut={handleSignOut} variant="desktop" />
      </aside>

      {/* ── Mobile drawer (below md) — overlay + slide-in panel ────────── */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          drawerOpen ? '' : 'pointer-events-none',
        )}
        aria-hidden={!drawerOpen}
      >
        {/* Backdrop */}
        <div
          onClick={onClose}
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity duration-200',
            drawerOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        {/* Panel */}
        <aside
          className={cn(
            'absolute left-0 top-0 bottom-0 w-[280px] max-w-[85%] bg-white border-r border-hairline-soft',
            'flex flex-col overflow-y-auto transition-transform duration-200 ease-out',
            drawerOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between border-b border-hairline-soft flex-shrink-0">
            <SidebarBrand slug={slug} dense />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="m-2 mr-3 w-8 h-8 flex items-center justify-center text-muted-text hover:text-near-black border border-hairline-soft flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
          <SidebarNav navItems={navItems} variant="drawer" onItemClick={onClose} />
          <SidebarBottomActions slug={slug} onCopy={handleCopy} onSignOut={handleSignOut} variant="drawer" />
        </aside>
      </div>
    </>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SidebarBrand({ slug, dense = false }: { slug: string; dense?: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-5 border-b border-hairline-soft flex-shrink-0',
      dense ? 'py-3 border-b-0' : 'py-4',
    )}>
      <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-near-black tracking-tight">BookReady</p>
        {slug && (
          <p className="text-2xs text-muted-text truncate">{slug}.bkrdy.me</p>
        )}
      </div>
    </div>
  )
}

function SidebarNav({
  navItems, variant, onItemClick,
}: {
  navItems: { item: typeof MAIN_NAV[number]; active: boolean; Icon: React.ElementType }[]
  variant:  'desktop' | 'drawer'
  onItemClick?: () => void
}) {
  return (
    <nav className="flex flex-col flex-1 py-3 gap-0.5 min-w-0">
      <p className="px-4 pt-1 pb-1.5 text-eyebrow font-bold tracking-[0.2em] uppercase text-muted-text">
        Menu
      </p>
      {navItems.map(({ item, active, Icon }) => {
        const soon = 'soon' in item && item.soon
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
              active
                ? 'bg-near-black text-white'
                : 'text-[rgba(18,18,18,0.7)] hover:bg-[rgba(18,18,18,0.04)] hover:text-near-black',
            )}
          >
            <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
            <span className={soon && !active ? 'text-faint-text' : undefined}>{item.label}</span>
            {soon && (
              <span className="ml-1 text-eyebrow font-bold tracking-eyebrow uppercase text-muted-text border border-hairline-strong bg-cream px-1 py-px">
                Soon
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

function SidebarBottomActions({
  slug, onCopy, onSignOut, variant,
}: {
  slug:      string
  onCopy:    () => void
  onSignOut: () => void
  variant:   'desktop' | 'drawer'
}) {
  return (
    <div className="border-t border-hairline-soft p-3 flex-shrink-0">
      <a
        href={`https://${slug}.bkrdy.me`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-near-black hover:bg-[rgba(18,18,18,0.04)] transition-colors"
      >
        <Eye size={14} />
        View Site
      </a>
      <button
        onClick={onCopy}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-near-black hover:bg-[rgba(18,18,18,0.04)] transition-colors text-left"
      >
        <Copy size={14} />
        Copy Link
      </button>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-text hover:text-near-black hover:bg-[rgba(18,18,18,0.04)] transition-colors text-left"
      >
        <LogOut size={14} />
        Sign Out
      </button>
    </div>
  )
}
