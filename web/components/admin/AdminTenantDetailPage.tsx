'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, ExternalLink } from 'lucide-react'
import { getAdminTenantDetail, type AdminTenantDetail } from '@/lib/api'
import { AdminShell } from './AdminShell'
import { useAdmin } from './AdminProvider'
import { ChartHover } from './ChartHover'
import { Card, money, relTime } from './_parts'
import { cn } from '@/lib/cn'

/**
 * /admin/tenants/[slug] — per-tenant drill-in.
 *
 * Auth + sign-out live in AdminShell via AdminProvider. The slug-specific
 * detail fetch stays local: it's per-route and doesn't belong in the
 * shared dashboard data context.
 */

type DetailState = 'loading' | 'ready' | 'not_found'

export default function AdminTenantDetailPage({ slug }: { slug: string }) {
  const { auth } = useAdmin()
  const [state,  setState]  = useState<DetailState>('loading')
  const [detail, setDetail] = useState<AdminTenantDetail | null>(null)
  const [err,    setErr]    = useState<string | null>(null)

  useEffect(() => {
    // Wait for the provider to settle auth before fetching — saves a 401.
    if (auth !== 'ready') return
    let cancelled = false
    ;(async () => {
      setState('loading')
      setErr(null)
      try {
        const d = await getAdminTenantDetail(slug)
        if (cancelled) return
        setDetail(d)
        setState('ready')
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Failed to load tenant'
        setErr(msg)
        setState('not_found')
      }
    })()
    return () => { cancelled = true }
  }, [slug, auth])

  return (
    <AdminShell tab={false}>
      <BackLink />

      {state === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-10">
          <Loader2 size={14} className="animate-spin" /> Loading tenant…
        </div>
      )}

      {state === 'not_found' && (
        <Card>
          <h1 className="text-base font-bold text-near-black mb-1">Tenant not found</h1>
          <p className="text-[13px] text-muted-text">
            No tenant with slug <strong className="text-near-black font-mono">{slug}</strong>.
          </p>
          {err && (
            <p className="text-[11px] text-[#b42828] mt-2 inline-flex items-center gap-1">
              <AlertCircle size={11} /> {err}
            </p>
          )}
        </Card>
      )}

      {state === 'ready' && detail && <DetailBody d={detail} />}
    </AdminShell>
  )
}

function DetailBody({ d }: { d: AdminTenantDetail }) {
  const isActive = d.state === 'active'
  return (
    <>
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
    </>
  )
}

// ── Booking area chart (with hover) ───────────────────────────────────────────

function BookingChart({ series }: { series: AdminTenantDetail['daily_bookings'] }) {
  const W = 800, H = 160
  const padding = { top: 10, right: 6, bottom: 6, left: 6 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom
  const n = series.length
  const max = Math.max(...series.map(p => p.count), 1)
  if (n === 0) return <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-text">No data.</div>
  const x = (i: number) => padding.left + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padding.top + innerH * (1 - v / max)
  const top = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
  const baseY = padding.top + innerH
  const area = `${top} L${x(n - 1).toFixed(1)},${baseY.toFixed(1)} L${x(0).toFixed(1)},${baseY.toFixed(1)} Z`

  const hoverPoints = series.map(p => ({
    date: p.date,
    y:    y(p.count),
    rows: [{ label: 'Bookings', value: String(p.count) }],
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      <line x1={padding.left} x2={W - padding.right}
        y1={padding.top + innerH * 0.5} y2={padding.top + innerH * 0.5}
        stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
      <path d={area} fill="rgba(18,18,18,0.06)" />
      <path d={top} fill="none" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
      <ChartHover
        width={W} height={H} padding={padding}
        points={hoverPoints}
        primaryColor="#121212"
      />
    </svg>
  )
}

// ── Bits ──────────────────────────────────────────────────────────────────────

function BackLink() {
  return (
    <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black mb-4">
      <ArrowLeft size={12} /> All tenants
    </Link>
  )
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
      <p className={cn('font-bold text-near-black tracking-tight mt-1.5 leading-none', small ? 'text-lg' : 'text-2xl')}>
        {value}
      </p>
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
