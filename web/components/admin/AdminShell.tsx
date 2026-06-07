'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  RefreshCw, Loader2, AlertCircle, ShieldAlert, LogOut,
  LayoutDashboard, Users, Activity, Sparkles, Heart,
} from 'lucide-react'
import { useAdmin } from './AdminProvider'
import { clearAuth } from '@/lib/auth'
import { Card } from './_parts'
import { cn } from '@/lib/cn'

/**
 * Shared shell for every admin route. Owns:
 *   - the top header (logo + signed-in identity + sign-out)
 *   - the sub-nav strip with the active tab highlight
 *   - the global "Refresh" button + "last refreshed Xs ago" timestamp
 *   - the loading / login_required / denied gate
 *
 * Auth + data is supplied by <AdminProvider> in the layout — this
 * component is presentational on top of that.
 *
 * If the caller passes `tab={false}` (e.g. the tenant detail page) the
 * sub-nav is hidden, useful for drill-in pages that have their own
 * back-link affordance.
 */

type TabId = 'overview' | 'tenants' | 'activity' | 'insights' | 'system'

interface Tab {
  id:    TabId
  label: string
  href:  string
  icon:  React.ElementType
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', href: '/admin',          icon: LayoutDashboard },
  { id: 'tenants',  label: 'Tenants',  href: '/admin/tenants',  icon: Users },
  { id: 'activity', label: 'Activity', href: '/admin/activity', icon: Activity },
  { id: 'insights', label: 'Insights', href: '/admin/insights', icon: Sparkles },
  { id: 'system',   label: 'System',   href: '/admin/system',   icon: Heart },
]

export function AdminShell({
  children, tab,
}: {
  children: React.ReactNode
  /** Pass `false` to hide the sub-nav (e.g. tenant detail page). */
  tab?: TabId | false
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { auth, me, authError, refreshing, lastRefreshAt, refreshAll } = useAdmin()
  const [now, setNow] = useState(() => Date.now())

  // Tick the "last refreshed Xs ago" label once a minute so it stays
  // honest without re-rendering every second.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  function signOut() {
    clearAuth()
    router.push('/login')
  }

  // Resolve active tab from explicit prop, else from the pathname.
  const activeTab: TabId | null =
    tab === false ? null :
    tab ? tab :
    (TABS.find(t => t.href === pathname)?.id ?? null)

  // ── Auth gate ──────────────────────────────────────────────────────────
  if (auth === 'loading') {
    return (
      <BareShell>
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-10">
          <Loader2 size={14} className="animate-spin" /> Loading admin…
        </div>
      </BareShell>
    )
  }
  if (auth === 'login_required') {
    return (
      <BareShell>
        <Card>
          <h1 className="text-base font-bold text-near-black mb-2">Sign in required</h1>
          <p className="text-[13px] text-muted-text mb-4">
            You need to be signed in as a BookReady platform admin to view this page.
          </p>
          <a
            href="/login?next=/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2"
          >
            Go to Sign In
          </a>
        </Card>
      </BareShell>
    )
  }
  if (auth === 'denied') {
    return (
      <BareShell signedInAs={me?.email}>
        <Card tone="warn">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-[#8a5a00] flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-base font-bold text-near-black mb-1">Admin access required</h1>
              <p className="text-[13px] text-muted-text">
                Your account doesn&rsquo;t have BookReady admin privileges. If this is a
                mistake, ask another admin to flip the is_admin flag on your user.
              </p>
              {authError && (
                <p className="text-[11px] text-[#b42828] mt-2 inline-flex items-center gap-1">
                  <AlertCircle size={11} /> {authError}
                </p>
              )}
            </div>
          </div>
        </Card>
      </BareShell>
    )
  }

  // ── Authenticated shell ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)]">
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-near-black">BookReady</p>
              <p className="text-[11px] text-muted-text">Platform admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RefreshControl
              refreshing={refreshing}
              lastRefreshAt={lastRefreshAt}
              now={now}
              onClick={refreshAll}
            />
            {me?.email && <span className="text-[11px] text-muted-text hidden md:inline">{me.email}</span>}
            <button
              type="button"
              onClick={signOut}
              className="text-[11px] font-semibold tracking-tight text-muted-text hover:text-near-black inline-flex items-center gap-1"
            >
              <LogOut size={11} /> <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>

        {activeTab && (
          <nav className="border-t border-[rgba(18,18,18,0.06)] overflow-x-auto">
            <div className="flex items-center gap-1 px-3">
              {TABS.map(t => {
                const Icon = t.icon
                const active = t.id === activeTab
                return (
                  <Link
                    key={t.id}
                    href={t.href}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2.5 border-b-2 -mb-px whitespace-nowrap',
                      active
                        ? 'text-near-black border-near-black'
                        : 'text-muted-text border-transparent hover:text-near-black',
                    )}
                  >
                    <Icon size={12} /> {t.label}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-5 md:p-6">{children}</main>
    </div>
  )
}

function RefreshControl({
  refreshing, lastRefreshAt, now, onClick,
}: {
  refreshing:    boolean
  lastRefreshAt: number | null
  now:           number
  onClick:       () => void
}) {
  const since = lastRefreshAt ? Math.max(0, Math.floor((now - lastRefreshAt) / 1000)) : null
  const label = since === null
    ? '—'
    : since < 60      ? `${since}s ago`
    : since < 3600    ? `${Math.floor(since / 60)}m ago`
    :                   `${Math.floor(since / 3600)}h ago`
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      title={lastRefreshAt ? `Last refreshed: ${new Date(lastRefreshAt).toLocaleTimeString()}` : ''}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border bg-white text-near-black px-3 py-1.5',
        'border-[rgba(18,18,18,0.15)] hover:border-near-black disabled:opacity-60 disabled:cursor-wait',
      )}
    >
      {refreshing
        ? <Loader2 size={11} className="animate-spin" />
        : <RefreshCw size={11} />}
      <span>Refresh</span>
      <span className="text-muted-text font-normal normal-case tracking-normal hidden sm:inline">· {label}</span>
    </button>
  )
}

// Minimal shell used by the auth-gated states (no sub-nav, no refresh).
function BareShell({
  children, signedInAs,
}: { children: React.ReactNode; signedInAs?: string }) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-near-black">BookReady</p>
            <p className="text-[11px] text-muted-text">Platform admin</p>
          </div>
        </div>
        {signedInAs && <span className="text-[11px] text-muted-text hidden sm:inline">{signedInAs}</span>}
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-5 md:p-6">{children}</main>
    </div>
  )
}
