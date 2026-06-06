'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ArrowLeft, ExternalLink, ShieldAlert, LogOut,
} from 'lucide-react'
import { getCurrentUser, getAdminTenantDetail, type AdminTenantDetail } from '@/lib/api'
import { isLoggedIn, clearAuth } from '@/lib/auth'
import type { AuthUser } from '@/lib/types'
import { cn } from '@/lib/cn'

type LoadState = 'loading' | 'ready' | 'denied' | 'login_required' | 'not_found'

function money(cents: number): string { return '$' + Math.round(cents / 100).toLocaleString() }
function relTime(iso: string | null): string {
  if (! iso) return 'never'
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d <= 0) return 'today'
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function AdminTenantDetailPage({ slug }: { slug: string }) {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [me,        setMe]        = useState<AuthUser | null>(null)
  const [detail,    setDetail]    = useState<AdminTenantDetail | null>(null)
  const [err,       setErr]       = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (! isLoggedIn()) { if (! cancelled) setLoadState('login_required'); return }
      try {
        const user = await getCurrentUser()
        if (cancelled) return
        setMe(user)
        if (! user.is_admin) { setLoadState('denied'); return }
        try {
          const d = await getAdminTenantDetail(slug)
          if (cancelled) return
          setDetail(d)
          setLoadState('ready')
        } catch (e) {
          if (cancelled) return
          const msg = e instanceof Error ? e.message : 'Failed to load tenant'
          if (/not found/i.test(msg)) { setLoadState('not_found') }
          else { setErr(msg); setLoadState('not_found') }
        }
      } catch (e) {
        if (cancelled) return
        setErr(e instanceof Error ? e.message : 'Failed to load')
        setLoadState('denied')
      }
    }
    boot()
    return () => { cancelled = true }
  }, [slug])

  function signOut() { clearAuth(); router.push('/login') }

  if (loadState === 'loading') {
    return <Shell><div className="flex items-center gap-2 text-xs text-muted-text px-1 py-10">
      <Loader2 size={14} className="animate-spin" /> Loading tenant…
    </div></Shell>
  }
  if (loadState === 'login_required') {
    return <Shell><Card>
      <h1 className="text-base font-bold text-near-black mb-2">Sign in required</h1>
      <a href="/login?next=/admin" className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2">Go to Sign In</a>
    </Card></Shell>
  }
  if (loadState === 'denied') {
    return <Shell signedInAs={me?.email}><Card tone="warn">
      <div className="flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#8a5a00] flex-shrink-0 mt-0.5" />
        <div>
          <h1 className="text-base font-bold text-near-black mb-1">Admin access required</h1>
          {err && <p className="text-[11px] text-[#b42828] mt-2 inline-flex items-center gap-1"><AlertCircle size={11} /> {err}</p>}
        </div>
      </div>
    </Card></Shell>
  }
  if (loadState === 'not_found' || ! detail) {
    return <Shell signedInAs={me?.email} onSignOut={signOut}>
      <BackLink />
      <Card>
        <h1 className="text-base font-bold text-near-black mb-1">Tenant not found</h1>
        <p className="text-[13px] text-muted-text">No tenant with slug <strong className="text-near-black font-mono">{slug}</strong>.</p>
        {err && <p className="text-[11px] text-[#b42828] mt-2 inline-flex items-center gap-1"><AlertCircle size={11} /> {err}</p>}
      </Card>
    </Shell>
  }

  const d = detail
  const isActive = d.state === 'active'

  return (
    <Shell signedInAs={me?.email} onSignOut={signOut}>
      <BackLink />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight">{d.id}</h1>
          <p className="text-xs text-muted-text mt-1">
            {d.owner_name ?? '—'} · {d.owner_email ?? '—'}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge tone={isActive ? 'good' : 'neutral'}>{d.state ?? 'unknown'}</Badge>
            <Badge tone="neutral"><span className="capitalize">{d.plan ?? '—'}</span></Badge>
            {d.domain && (
              <a href={`https://${d.domain}`} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-muted-text hover:text-near-black inline-flex items-center gap-1">
                {d.domain} <ExternalLink size={10} />
              </a>
            )}
          </div>
        </div>
        <a
          href={`https://${d.id}.bkrdy.me`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black"
        >
          <ExternalLink size={11} /> Open public site
        </a>
      </div>

      {! d.scan_ok && (
        <div className="bg-white border border-[rgba(180,120,0,0.3)] p-3 text-xs text-[#8a5a00] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> Couldn&rsquo;t read this tenant&rsquo;s booking data (DB may be mid-migration). Showing metadata only.
        </div>
      )}

      {/* KPI chips */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        <Stat label="MRR" value={isActive ? money(d.mrr_cents) : '$0'} />
        <Stat label="Bookings (total)" value={d.bookings_total.toLocaleString()} />
        <Stat label="Bookings (30d)" value={d.bookings_30d.toLocaleString()} />
        <Stat label="Bookings (7d)" value={d.bookings_7d.toLocaleString()} />
        <Stat label="Last booking" value={relTime(d.last_booking_at)} small />
      </div>

      {/* Booking volume */}
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 mb-3">
        <p className="text-[13px] font-bold text-near-black mb-3">Bookings · last 90 days</p>
        <BookingChart series={d.daily_bookings} />
      </div>

      {/* Recent bookings + meta */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 lg:col-span-2">
          <p className="text-[13px] font-bold text-near-black mb-3">Recent bookings</p>
          {d.recent.length === 0 ? (
            <p className="text-[12px] text-muted-text">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[12px] min-w-[480px]">
                <thead>
                  <tr className="border-b border-[rgba(18,18,18,0.08)] text-left">
                    <th className="px-1 py-1.5 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text">Service</th>
                    <th className="px-1 py-1.5 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text">Customer</th>
                    <th className="px-1 py-1.5 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text">Status</th>
                    <th className="px-1 py-1.5 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text">When</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recent.map((r, i) => (
                    <tr key={i} className="border-b border-[rgba(18,18,18,0.06)] last:border-b-0">
                      <td className="px-1 py-2 text-near-black">{r.service_name ?? '—'}</td>
                      <td className="px-1 py-2 text-muted-text">{r.customer_name ?? '—'}</td>
                      <td className="px-1 py-2"><span className="capitalize text-near-black">{r.status ?? '—'}</span></td>
                      <td className="px-1 py-2 text-muted-text">{relTime(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
          <p className="text-[13px] font-bold text-near-black mb-3">Account</p>
          <dl className="space-y-2.5 text-[12px]">
            <Meta label="Plan" value={d.plan ?? '—'} cap />
            <Meta label="State" value={d.state ?? '—'} cap />
            <Meta label="MRR" value={isActive ? money(d.mrr_cents) + '/mo' : '$0'} />
            <Meta label="Created" value={d.created_at ? new Date(d.created_at).toLocaleDateString() : '—'} />
            <Meta label="Trial ends" value={d.trial_ends_at ? new Date(d.trial_ends_at).toLocaleDateString() : '—'} />
            <Meta label="Owner" value={d.owner_email ?? '—'} />
          </dl>
        </div>
      </div>
    </Shell>
  )
}

// ── Booking area chart ────────────────────────────────────────────────────────

function BookingChart({ series }: { series: AdminTenantDetail['daily_bookings'] }) {
  const W = 800, H = 160, padT = 10, padB = 6, padL = 6, padR = 6
  const innerW = W - padL - padR, innerH = H - padT - padB
  const n = series.length
  const max = Math.max(...series.map(p => p.count), 1)
  if (n === 0) return <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-text">No data.</div>
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padT + innerH * (1 - v / max)
  const top = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
  const area = `${top} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      <line x1={padL} x2={W - padR} y1={padT + innerH * 0.5} y2={padT + innerH * 0.5} stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
      <path d={area} fill="rgba(18,18,18,0.06)" />
      <path d={top} fill="none" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ── Bits ──────────────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link href="/admin" className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black mb-4">
      <ArrowLeft size={12} /> All tenants
    </Link>
  )
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
      <p className={cn('font-bold text-near-black tracking-tight mt-1.5 leading-none', small ? 'text-lg' : 'text-2xl')}>{value}</p>
    </div>
  )
}

function Meta({ label, value, cap }: { label: string; value: string; cap?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-text">{label}</dt>
      <dd className={cn('text-near-black font-medium text-right truncate', cap && 'capitalize')}>{value}</dd>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'good' | 'neutral' }) {
  return (
    <span className={cn(
      'text-[10px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 border',
      tone === 'good'
        ? 'border-[rgba(15,111,61,0.25)] bg-[rgba(15,111,61,0.06)] text-[#0f6f3d]'
        : 'border-[rgba(18,18,18,0.12)] bg-cream text-[rgba(18,18,18,0.65)]',
    )}>{children}</span>
  )
}

function Shell({ children, signedInAs, onSignOut }: {
  children: React.ReactNode; signedInAs?: string; onSignOut?: () => void
}) {
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
        <div className="flex items-center gap-3">
          {signedInAs && <span className="text-[11px] text-muted-text hidden sm:inline">{signedInAs}</span>}
          {onSignOut && (
            <button type="button" onClick={onSignOut} className="text-[11px] font-semibold tracking-tight text-muted-text hover:text-near-black inline-flex items-center gap-1">
              <LogOut size={11} /> Sign out
            </button>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-5 md:p-6">{children}</main>
    </div>
  )
}

function Card({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return (
    <section className={cn('bg-white border p-5', tone === 'warn' ? 'border-[rgba(180,120,0,0.30)]' : 'border-[rgba(18,18,18,0.10)]')}>
      {children}
    </section>
  )
}
