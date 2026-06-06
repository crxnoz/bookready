'use client'

import { useEffect, useState } from 'react'
import {
  RefreshCw, Loader2, AlertCircle, ArrowUpRight, ArrowDownRight,
  Users, Hourglass, DollarSign, TrendingUp, ExternalLink,
} from 'lucide-react'
import { getAdminDashboardSummary, type AdminDashboardSummary } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Platform admin dashboard — Phase 1 (daily-briefing MVP).
 *
 * KPI bar + MRR trajectory + tenant growth + recent activity feed.
 * All charts are hand-rolled inline SVG (no chart dependency) to match
 * the codebase's bespoke-everything house style and keep the bundle
 * lean. Data is the central-DB summary endpoint, cached 5 min server-side.
 */

// Blush → plum ramp for the stacked MRR area, on-brand with the editor's
// blush/lavender tokens. Bottom band lightest, top band deepest.
const PLAN_COLORS: Record<string, string> = {
  solo:   '#E0C7D2',
  studio: '#B98AA8',
  salon:  '#7A5B86',
}

function money(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString()
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function DashboardSummary() {
  const [data,    setData]    = useState<AdminDashboardSummary | null>(null)
  const [err,     setErr]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setErr(null)
    try {
      setData(await getAdminDashboardSummary())
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load dashboard')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  return (
    <section className="mb-2">
      <header className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-near-black tracking-tight">Platform overview</h2>
          <p className="text-xs text-muted-text">
            {loading ? 'Loading…' : data
              ? <>Cached up to 5 minutes · last computed {new Date(data.computed_at).toLocaleTimeString()}</>
              : 'Overview unavailable.'}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-50"
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Refresh
        </button>
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Kpi
          icon={Users}
          label="Active tenants"
          value={data?.kpis.active_tenants}
          delta={data ? { n: data.kpis.active_delta_7d, suffix: 'this week', goodUp: true } : null}
        />
        <Kpi
          icon={Hourglass}
          label="Trial pipeline"
          value={data?.kpis.trial_tenants}
          delta={data ? { n: data.kpis.trial_delta_7d, suffix: 'this week', goodUp: true } : null}
        />
        <Kpi
          icon={DollarSign}
          label="MRR"
          value={data ? money(data.kpis.mrr_cents) : undefined}
          delta={data ? { money: data.kpis.mrr_delta_cents, suffix: 'this week', goodUp: true } : null}
        />
        <Kpi
          icon={TrendingUp}
          label="New signups (7d)"
          value={data?.kpis.new_signups_7d}
          delta={data ? {
            n: data.kpis.new_signups_7d - data.kpis.new_signups_prev_7d,
            suffix: 'vs prev week', goodUp: true,
          } : null}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Panel title="MRR trajectory" subtitle="Last 12 weeks · stacked by plan">
          {data && <MrrChart series={data.mrr_series} catalog={data.plan_catalog} />}
        </Panel>
        <Panel title="Tenant growth" subtitle="Weekly signups + cumulative · last 90 days">
          {data && <GrowthChart series={data.growth_series} />}
        </Panel>
      </div>

      {/* Activity feed */}
      <Panel title="Recent activity" subtitle="Latest signups across the platform">
        {data && <ActivityFeed items={data.activity} />}
      </Panel>
    </section>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function Kpi({
  icon: Icon, label, value, delta,
}: {
  icon: React.ElementType
  label: string
  value: number | string | undefined
  delta: { n?: number; money?: number; suffix: string; goodUp: boolean } | null
}) {
  const display = value === undefined
    ? '—'
    : (typeof value === 'number' ? value.toLocaleString() : value)

  // Resolve delta numeric for direction + formatted text.
  const deltaNum = delta ? (delta.money ?? delta.n ?? 0) : 0
  const deltaText = delta
    ? (delta.money !== undefined
        ? (deltaNum >= 0 ? '+' : '−') + money(Math.abs(delta.money))
        : (deltaNum >= 0 ? '+' : '−') + Math.abs(delta.n ?? 0))
    : ''
  const up   = deltaNum > 0
  const down = deltaNum < 0
  const tone = up ? '#0f6f3d' : down ? '#b42828' : 'rgba(18,18,18,0.45)'

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
        <Icon size={14} className="text-muted-text" />
      </div>
      <p className="text-3xl font-bold text-near-black tracking-tight mt-2 leading-none">{display}</p>
      {delta && (
        <p className="text-[11px] mt-2 inline-flex items-center gap-1" style={{ color: tone }}>
          {up   && <ArrowUpRight size={11} />}
          {down && <ArrowDownRight size={11} />}
          <span className="font-semibold">{deltaText}</span>
          <span className="text-muted-text font-normal">{delta.suffix}</span>
        </p>
      )}
    </div>
  )
}

// ── Panel wrapper ─────────────────────────────────────────────────────────────

function Panel({
  title, subtitle, children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="mb-3">
        <p className="text-[13px] font-bold text-near-black">{title}</p>
        {subtitle && <p className="text-[11px] text-muted-text mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ── MRR stacked-area chart ────────────────────────────────────────────────────

function MrrChart({
  series, catalog,
}: {
  series: AdminDashboardSummary['mrr_series']
  catalog: AdminDashboardSummary['plan_catalog']
}) {
  const W = 640, H = 200, padT = 12, padB = 8, padL = 8, padR = 8
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = series.length

  const order: ('solo' | 'studio' | 'salon')[] = ['solo', 'studio', 'salon']
  const totals = series.map(p => p.solo + p.studio + p.salon)
  const maxTotal = Math.max(...totals, 0)
  const latest = totals[totals.length - 1] ?? 0

  if (maxTotal === 0) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center text-center px-6">
        <p className="text-[13px] text-muted-text">No paid subscriptions yet.</p>
        <p className="text-[11px] text-muted-text/70 mt-1">
          MRR will chart here once tenants convert from trial to a paid plan.
        </p>
      </div>
    )
  }

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padT + innerH * (1 - v / maxTotal)

  // Cumulative tops per week, in stack order.
  const tops = series.map(p => {
    const solo = p.solo
    const studio = solo + p.studio
    const salon = studio + p.salon
    return { solo, studio, salon, base: 0 }
  })

  // Build each stacked band as a filled area: trace the upper edge L→R,
  // then the lower edge R→L, and close.
  function areaPath(lowerVals: number[], upperVals: number[]): string {
    let d = ''
    upperVals.forEach((v, i) => { d += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)} ` })
    for (let i = n - 1; i >= 0; i--) { d += `L${x(i).toFixed(1)},${y(lowerVals[i]).toFixed(1)} ` }
    return d + 'Z'
  }

  const soloBand   = areaPath(tops.map(() => 0),          tops.map(t => t.solo))
  const studioBand = areaPath(tops.map(t => t.solo),       tops.map(t => t.studio))
  const salonBand  = areaPath(tops.map(t => t.studio),     tops.map(t => t.salon))

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-2xl font-bold text-near-black leading-none">{money(latest)}<span className="text-[11px] font-normal text-muted-text">/mo now</span></p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f}
            stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
        ))}
        {salonBand  && <path d={salonBand}  fill={PLAN_COLORS.salon}  opacity="0.95" />}
        {studioBand && <path d={studioBand} fill={PLAN_COLORS.studio} opacity="0.95" />}
        {soloBand   && <path d={soloBand}   fill={PLAN_COLORS.solo}   opacity="0.95" />}
      </svg>
      {/* legend */}
      <div className="flex items-center gap-4 mt-2">
        {order.map(p => (
          <span key={p} className="inline-flex items-center gap-1.5 text-[11px] text-muted-text">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PLAN_COLORS[p] }} />
            {catalog[p]?.label ?? p}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Growth chart (bars + cumulative line) ─────────────────────────────────────

function GrowthChart({ series }: { series: AdminDashboardSummary['growth_series'] }) {
  const W = 640, H = 200, padT = 14, padB = 8, padL = 8, padR = 8
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = series.length

  const maxSignups = Math.max(...series.map(p => p.signups), 1)
  const maxCum     = Math.max(...series.map(p => p.cumulative), 1)
  const latestCum  = series[series.length - 1]?.cumulative ?? 0
  const totalSignups = series.reduce((s, p) => s + p.signups, 0)

  const slot   = innerW / n
  const barW   = slot * 0.55
  const barX   = (i: number) => padL + slot * i + (slot - barW) / 2
  const barH   = (v: number) => innerH * (v / maxSignups)
  const cx     = (i: number) => padL + slot * i + slot / 2
  const cy     = (v: number) => padT + innerH * (1 - v / maxCum)

  const cumLine = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(p.cumulative).toFixed(1)}`)
    .join(' ')

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <p className="text-2xl font-bold text-near-black leading-none">{latestCum}<span className="text-[11px] font-normal text-muted-text"> tenants</span></p>
        <p className="text-[11px] text-muted-text">{totalSignups} signups in 90d</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f}
            stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
        ))}
        {/* signup bars */}
        {series.map((p, i) => (
          <rect key={i}
            x={barX(i)} width={barW}
            y={padT + innerH - barH(p.signups)} height={barH(p.signups)}
            fill="#E6B8C8" rx="1.5" />
        ))}
        {/* cumulative line */}
        <path d={cumLine} fill="none" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
        {series.map((p, i) => (
          <circle key={i} cx={cx(i)} cy={cy(p.cumulative)} r="2" fill="#121212" />
        ))}
      </svg>
      <div className="flex items-center gap-4 mt-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-text">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#E6B8C8' }} /> Weekly signups
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-text">
          <span className="w-3 h-0.5" style={{ background: '#121212' }} /> Cumulative
        </span>
      </div>
    </div>
  )
}

// ── Activity feed ─────────────────────────────────────────────────────────────

function ActivityFeed({ items }: { items: AdminDashboardSummary['activity'] }) {
  if (items.length === 0) {
    return <p className="text-[12px] text-muted-text">No recent activity.</p>
  }
  return (
    <ul className="divide-y divide-[rgba(18,18,18,0.06)] -my-1">
      {items.map((it, i) => {
        const active = it.state === 'active'
        return (
          <li key={i} className="flex items-center gap-3 py-2.5">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              active ? 'bg-[#0f6f3d]' : 'bg-[#C9A876]',
            )} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-near-black">
                <a
                  href={`https://${it.tenant}.bkrdy.me`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline inline-flex items-center gap-1"
                >
                  {it.tenant} <ExternalLink size={9} className="text-muted-text" />
                </a>
                <span className="text-muted-text"> signed up</span>
              </p>
            </div>
            <span className={cn(
              'text-[9px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 border flex-shrink-0',
              active
                ? 'border-[rgba(15,111,61,0.25)] bg-[rgba(15,111,61,0.06)] text-[#0f6f3d]'
                : 'border-[rgba(18,18,18,0.12)] bg-blush text-[rgba(18,18,18,0.65)]',
            )}>
              {active ? 'Active' : 'Trial'}
            </span>
            <span className="text-[10px] text-muted-text w-16 text-right flex-shrink-0">
              {relativeTime(it.ts)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
