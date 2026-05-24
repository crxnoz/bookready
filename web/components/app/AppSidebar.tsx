'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Globe,
  Calendar,
  Users,
  CreditCard,
  Settings,
  Eye,
  Copy,
  LogOut,
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
  { href: '/editor',          label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/editor/website',  label: 'Website',   icon: Globe,           matchPaths: WEBSITE_PATHS },
  { href: '/editor/bookings', label: 'Bookings',  icon: Calendar,        matchPaths: BOOKINGS_PATHS },
  { href: '/editor/customers', label: 'Customers', icon: Users },
  { href: '#',                label: 'Payments',  icon: CreditCard,      soon: true },
  { href: '/editor/settings', label: 'Settings',  icon: Settings },
] as const

export default function AppSidebar({ slug }: { slug: string }) {
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

  function handleSignOut() {
    clearAuth()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'bg-white border-[rgba(18,18,18,0.10)] flex-shrink-0 z-10',
        // Mobile: horizontal bar at top
        'flex flex-row w-full border-b overflow-x-auto',
        // Desktop: vertical sidebar — h-screen so flex-1 nav + bottom actions pin correctly
        'md:flex-col md:w-[220px] md:h-screen md:border-r md:border-b-0 md:overflow-x-visible md:overflow-y-auto',
      )}
    >
      {/* Brand — desktop only */}
      <div className="hidden md:flex items-center gap-3 px-5 py-4 border-b border-[rgba(18,18,18,0.08)] flex-shrink-0">
        <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
          <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-near-black tracking-tight">BookReady</p>
          {slug && (
            <p className="text-[11px] text-muted-text truncate">{slug}.bkrdy.me</p>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex flex-row md:flex-col flex-1 p-2 md:p-0 md:py-3 gap-0.5 min-w-0">
        <p className="hidden md:block px-4 pt-1 pb-1.5 text-[9px] font-bold tracking-[0.2em] uppercase text-muted-text">
          Workspace
        </p>
        {MAIN_NAV.map(item => {
          const active = isActive(item)
          const Icon = item.icon
          const soon = 'soon' in item && item.soon
          return (
            <Link
              key={item.href}
              href={soon ? '#' : item.href}
              onClick={soon ? e => e.preventDefault() : undefined}
              className={cn(
                'flex flex-col md:flex-row items-center gap-1 md:gap-3 px-3 md:px-4 py-2 md:py-2.5',
                'text-[11px] md:text-[13px] font-medium transition-colors whitespace-nowrap flex-shrink-0',
                active
                  ? 'bg-near-black text-white'
                  : soon
                  ? 'text-[rgba(18,18,18,0.3)] cursor-default'
                  : 'text-[rgba(18,18,18,0.7)] hover:bg-[rgba(18,18,18,0.04)] hover:text-near-black',
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom actions — desktop */}
      <div className="hidden md:block border-t border-[rgba(18,18,18,0.08)] p-3 flex-shrink-0">
        <a
          href={`https://${slug}.bkrdy.me`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-muted-text hover:text-near-black hover:bg-[rgba(18,18,18,0.04)] transition-colors"
        >
          <Eye size={14} />
          View Site
        </a>
        <button
          onClick={handleCopy}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-muted-text hover:text-near-black hover:bg-[rgba(18,18,18,0.04)] transition-colors text-left"
        >
          <Copy size={14} />
          Copy Link
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-[13px] font-medium text-muted-text hover:text-near-black hover:bg-[rgba(18,18,18,0.04)] transition-colors text-left"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* Bottom actions — mobile (appended to scroll strip) */}
      <div className="md:hidden flex items-center border-l border-[rgba(18,18,18,0.10)] ml-1 flex-shrink-0">
        <a
          href={`https://${slug}.bkrdy.me`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium text-muted-text hover:text-near-black transition-colors whitespace-nowrap"
        >
          <Eye size={15} strokeWidth={1.8} />
          <span>Site</span>
        </a>
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center gap-1 px-3 py-2 text-[11px] font-medium text-muted-text hover:text-near-black transition-colors"
        >
          <LogOut size={15} strokeWidth={1.8} />
          <span>Out</span>
        </button>
      </div>
    </aside>
  )
}
