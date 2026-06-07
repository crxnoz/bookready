'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, DollarSign, Info } from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { ChartHover } from '../ChartHover'
import { getAdminActivityRevenue, type AdminActivityRevenue } from '@/lib/api'
import { Card, money } from '../_parts'
import { cn } from '@/lib/cn'

/**
 * /admin/activity/revenue — platform GMV estimate from
 * appointments.service_price (booked, NOT Stripe-precise). Useful for
 * trend tracking; the prominent disclaimer keeps that explicit.
 */

export default function ActivityRevenuePage() {
  const { auth } = useAdmin()
  const [data,    setData]    = useState<AdminActivityRevenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (auth !== 'ready') return
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminActivityRevenue()
        if (! cancelled) setData(d)
      } catch (e) {
        if (! cancelled) setErr(e instanceof Error ? e.message : 'Failed to load revenue')
      } finally {
        if (! cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [auth])

  return (
    <AdminShell tab="activity">
      <Link
        href="/admin/activity"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black mb-4"
      >
        <ArrowLeft size={12} /> Activity
      </Link>

      <header className="mb-4">
        <h1 className="text-xl font-bold text-near-black tracking-tight inline-flex items-center gap-2">
          <DollarSign size={18} /> Platform GMV (estimate)
        </h1>
        <p className="text-xs text-muted-text mt-1 inline-flex items-center gap-1.5">
          <Info size={11} />
          Booked value, NOT Stripe-reconciled. Sum of <code className="font-mono">appointments.service_price</code> across all tenants.
        </p>
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Loading revenue…
        </div>
      )}

      {data && ! data.kpis && (
        <Card>
          <p className="text-[13px] text-near-black">No revenue data in the latest snapshot.</p>
          <p className="text-[11px] text-muted-text mt-1">
            Re-run <code className="font-mono">php artisan admin:snapshot</code>.
          </p>
        </Card>
      )}

      {data && data.kpis && (
        <>
          <RevenueKpis k={data.kpis} />

          <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 mb-3">
            <p className="text-[13px] font-bold text-near-black">Daily GMV · last 90 days</p>
            <p className="text-[11px] text-muted-text mt-0.5 mb-3">All tenants, summed</p>
            <DailyRevenueChart series={data.daily_revenue} />
          </div>

          <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
            <p className="text-[13px] font-bold text-near-black">Top tenants by 30d revenue</p>
            <p className="text-[11px] text-muted-text mt-0.5 mb-3">
              Click any tenant to drill in to their dashboard
            </p>
            <TopRevenueTenants rows={data.top_tenants} />
          </div>
        </>
      )}
    </AdminShell>
  )
}

function RevenueKpis({ k }: { k: NonNullable<AdminActivityRevenue['kpis']> }) {
  const delta = k.revenue_prior_7d_cents > 0
    ? Math.round((k.revenue_7d_cents - k.revenue_prior_7d_cents) / k.revenue_prior_7d_cents * 100)
    : null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
      <RevenueCard
        label="Revenue (7d)"
        value={money(k.revenue_7d_cents)}
        sub={`prior: ${money(k.revenue_prior_7d_cents)}`}
        delta={delta}
      />
      <RevenueCard label="Revenue (30d)"  value={money(k.revenue_30d_cents)}   sub="rolling 30d" />
      <RevenueCard label="Lifetime"       value={money(k.revenue_total_cents)} sub="all tenants, all time" />
    </div>
  )
}

function RevenueCard({
  label, value, sub, delta,
}: {
  label: string; value: string; sub: string; delta?: number | null
}) {
  const deltaTone = delta === null || delta === undefined
    ? null
    : delta > 0 ? 'text-[#0f6f3d]' : delta < 0 ? 'text-[#b42828]' : 'text-muted-text'
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
      <p className="text-2xl font-bold text-near-black tracking-tight mt-2 leading-none">{value}</p>
      <div className="flex items-baseline gap-2 mt-2">
        {deltaTone && delta !== undefined && delta !== null && (
          <span className={cn('text-[11px] font-semibold tabular-nums', deltaTone)}>
            {delta > 0 ? '+' : ''}{delta}% WoW
          </span>
        )}
        <span className="text-[10px] text-muted-text">{sub}</span>
      </div>
    </div>
  )
}

function DailyRevenueChart({ series }: { series: AdminActivityRevenue['daily_revenue'] }) {
  const W = 800, H = 180
  const padding = { top: 10, right: 6, bottom: 6, left: 6 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom
  const n = series.length
  const max = Math.max(1, ...series.map(p => p.cents))

  if (n === 0) {
    return <div className="h-[140px] flex items-center justify-center text-[12px] text-muted-text">No data.</div>
  }

  const x = (i: number) => padding.left + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padding.top + innerH * (1 - v / max)
  const top = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.cents).toFixed(1)}`).join(' ')
  const baseY = padding.top + innerH
  const area = `${top} L${x(n - 1).toFixed(1)},${baseY.toFixed(1)} L${x(0).toFixed(1)},${baseY.toFixed(1)} Z`

  const hoverPoints = series.map(p => ({
    date: p.date,
    y:    y(p.cents),
    rows: [{ label: 'Revenue', value: money(p.cents) }],
  }))

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      <line
        x1={padding.left} x2={W - padding.right}
        y1={padding.top + innerH * 0.5} y2={padding.top + innerH * 0.5}
        stroke="rgba(18,18,18,0.06)" strokeWidth="1"
      />
      <path d={area} fill="rgba(122,91,134,0.10)" />
      <path d={top} fill="none" stroke="#7A5B86" strokeWidth="1.5" strokeLinejoin="round" />
      <ChartHover
        width={W} height={H} padding={padding}
        points={hoverPoints}
        primaryColor="#7A5B86"
      />
    </svg>
  )
}

function TopRevenueTenants({ rows }: { rows: AdminActivityRevenue['top_tenants'] }) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-muted-text">No paid revenue in the last 30 days yet.</p>
  }
  const max = Math.max(1, ...rows.map(r => r.revenue_30d_cents))
  return (
    <div className="space-y-2">
      {rows.map(r => {
        const wow = r.revenue_prior_7d_cents > 0
          ? Math.round((r.revenue_7d_cents - r.revenue_prior_7d_cents) / r.revenue_prior_7d_cents * 100)
          : null
        const wowTone = wow === null ? 'text-muted-text'
          : wow > 0 ? 'text-[#0f6f3d]' : wow < 0 ? 'text-[#b42828]' : 'text-muted-text'
        return (
          <div key={r.id} className="flex items-center gap-2">
            <Link
              href={`/admin/tenants/${r.id}`}
              className="text-[11px] font-semibold text-near-black w-28 truncate hover:underline flex-shrink-0"
              title={r.id}
            >
              {r.id}
            </Link>
            <div className="flex-1 h-5 bg-cream relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#7A5B86]"
                style={{ width: `${(r.revenue_30d_cents / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-near-black w-16 text-right flex-shrink-0 tabular-nums">
              {money(r.revenue_30d_cents)}
            </span>
            <span className={cn('text-[10px] tabular-nums font-semibold w-14 text-right flex-shrink-0', wowTone)}
              title={wow === null ? 'No prior-week baseline' : '7d vs prior 7d'}>
              {wow === null ? 'NEW' : `${wow >= 0 ? '+' : ''}${wow}%`}
            </span>
          </div>
        )
      })}
    </div>
  )
}
