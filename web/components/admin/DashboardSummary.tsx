'use client'

import Link from 'next/link'
import {
  AlertCircle, ArrowUpRight, ArrowDownRight, ExternalLink,
  Users, Hourglass, DollarSign, TrendingUp, Loader2,
} from 'lucide-react'
import type { AdminDashboardSummary } from '@/lib/api'
import { ChartHover } from './ChartHover'
import { money, relTime } from './_parts'
import { cn } from '@/lib/cn'

/**
 * Phase-1 dashboard widget — KPI bar + MRR trajectory + tenant growth +
 * recent activity feed. Props-driven (data + loading + error come from
 * <AdminProvider>) so the global refresh button drives this in lockstep
 * with the rest of the dashboard.
 */

// Blush → plum ramp for the stacked MRR area, on-brand with the editor's
// blush/lavender tokens. Bottom band lightest, top band deepest.
const PLAN_COLORS: Record<string, string> = {
  solo:   '#E0C7D2',
  studio: '#B98AA8',
  salon:  '#7A5B86',
}

export default function DashboardSummary({
  data, loading, error,
}: {
  data:    AdminDashboardSummary | null
  loading: boolean
  error:   string | null
}) {
  if (error && ! data) {
    return (
      <SectionFrame>
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      </SectionFrame>
    )
  }
  if (loading && ! data) {
    return (
      <SectionFrame>
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Loading overview…
        </div>
      </SectionFrame>
    )
  }
  if (! data) return null

  return (
    <SectionFrame computedAt={data.computed_at}>
      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <Kpi
          icon={Users}
          label="Active tenants"
          value={data.kpis.active_tenants}
          delta={{ n: data.kpis.active_delta_7d, suffix: 'this week' }}
        />
        <Kpi
          icon={Hourglass}
          label="Trial pipeline"
          value={data.kpis.trial_tenants}
          delta={{ n: data.kpis.trial_delta_7d, suffix: 'this week' }}
        />
        <Kpi
          icon={DollarSign}
          label="MRR"
          value={money(data.kpis.mrr_cents)}
          delta={{ money: data.kpis.mrr_delta_cents, suffix: 'this week' }}
        />
        <Kpi
          icon={TrendingUp}
          label="New signups (7d)"
          value={data.kpis.new_signups_7d}
          delta={{
            n: data.kpis.new_signups_7d - data.kpis.new_signups_prev_7d,
            suffix: 'vs prev week',
          }}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
        <Panel title="MRR trajectory" subtitle="Last 12 weeks · stacked by plan">
          <MrrChart series={data.mrr_series} catalog={data.plan_catalog} />
        </Panel>
        <Panel title="Tenant growth" subtitle="Weekly signups + cumulative · last 90 days">
          <GrowthChart series={data.growth_series} />
        </Panel>
      </div>

      {/* Activity feed */}
      <Panel title="Recent activity" subtitle="Latest signups across the platform">
        <ActivityFeed items={data.activity} />
      </Panel>
    </SectionFrame>
  )
}

function SectionFrame({ children, computedAt }: { children: React.ReactNode; computedAt?: string }) {
  return (
    <section className="mb-2">
      <header className="flex items-end justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold text-near-black tracking-tight">Platform overview</h2>
          {computedAt && (
            <p className="text-xs text-muted-text">
              Cached up to 5 minutes · last computed {new Date(computedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function Kpi({
  icon: Icon, label, value, delta,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  delta: { n?: number; money?: number; suffix: string }
}) {
  const display = typeof value === 'number' ? value.toLocaleString() : value
  const deltaNum = delta.money ?? delta.n ?? 0
  const deltaText = delta.money !== undefined
    ? (deltaNum >= 0 ? '+' : '−') + money(Math.abs(delta.money))
    : (deltaNum >= 0 ? '+' : '−') + Math.abs(delta.n ?? 0)
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
      <p className="text-[11px] mt-2 inline-flex items-center gap-1" style={{ color: tone }}>
        {up   && <ArrowUpRight size={11} />}
        {down && <ArrowDownRight size={11} />}
        <span className="font-semibold">{deltaText}</span>
        <span className="text-muted-text font-normal">{delta.suffix}</span>
      </p>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
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

// ── MRR stacked-area chart (with hover) ───────────────────────────────────────

function MrrChart({
  series, catalog,
}: {
  series: AdminDashboardSummary['mrr_series']
  catalog: AdminDashboardSummary['plan_catalog']
}) {
  const W = 640, H = 200
  const padding = { top: 12, right: 8, bottom: 8, left: 8 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom
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

  const x = (i: number) => padding.left + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padding.top + innerH * (1 - v / maxTotal)

  const tops = series.map(p => ({
    solo:   p.solo,
    studio: p.solo + p.studio,
    salon:  p.solo + p.studio + p.salon,
  }))

  function areaPath(lowerVals: number[], upperVals: number[]): string {
    let d = ''
    upperVals.forEach((v, i) => { d += `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)} ` })
    for (let i = n - 1; i >= 0; i--) { d += `L${x(i).toFixed(1)},${y(lowerVals[i]).toFixed(1)} ` }
    return d + 'Z'
  }

  const soloBand   = areaPath(tops.map(() => 0),       tops.map(t => t.solo))
  const studioBand = areaPath(tops.map(t => t.solo),    tops.map(t => t.studio))
  const salonBand  = areaPath(tops.map(t => t.studio),  tops.map(t => t.salon))

  // Hover points: anchor the dot at the TOTAL (top of stack), show breakdown.
  const hoverPoints = series.map((p, i) => ({
    date: p.week,
    y:    y(tops[i].salon),
    rows: [
      ...order
        .filter(plan => p[plan] > 0)
        .map(plan => ({
          color: PLAN_COLORS[plan],
          label: catalog[plan]?.label ?? plan,
          value: money(p[plan]),
        })),
      { label: 'Total', value: money(totals[i]) },
    ],
  }))

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-2xl font-bold text-near-black leading-none">
          {money(latest)}<span className="text-[11px] font-normal text-muted-text">/mo now</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f}
            x1={padding.left} x2={W - padding.right}
            y1={padding.top + innerH * f} y2={padding.top + innerH * f}
            stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
        ))}
        <path d={salonBand}  fill={PLAN_COLORS.salon}  opacity="0.95" />
        <path d={studioBand} fill={PLAN_COLORS.studio} opacity="0.95" />
        <path d={soloBand}   fill={PLAN_COLORS.solo}   opacity="0.95" />
        <ChartHover
          width={W} height={H} padding={padding}
          points={hoverPoints}
          primaryColor={PLAN_COLORS.salon}
        />
      </svg>
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

// ── Growth chart (bars + cumulative line, with hover) ─────────────────────────

function GrowthChart({ series }: { series: AdminDashboardSummary['growth_series'] }) {
  const W = 640, H = 200
  const padding = { top: 14, right: 8, bottom: 8, left: 8 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom
  const n = series.length

  const maxSignups = Math.max(...series.map(p => p.signups), 1)
  const maxCum     = Math.max(...series.map(p => p.cumulative), 1)
  const latestCum  = series[series.length - 1]?.cumulative ?? 0
  const totalSignups = series.reduce((s, p) => s + p.signups, 0)

  const slot = innerW / n
  const barW = slot * 0.55
  const barX = (i: number) => padding.left + slot * i + (slot - barW) / 2
  const barH = (v: number) => innerH * (v / maxSignups)
  const cx   = (i: number) => padding.left + slot * i + slot / 2
  const cy   = (v: number) => padding.top + innerH * (1 - v / maxCum)

  const cumLine = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${cx(i).toFixed(1)},${cy(p.cumulative).toFixed(1)}`)
    .join(' ')

  // Hover points anchored on the cumulative dot (it sits higher than the bar
  // in growth contexts, easier to read at a glance).
  const hoverPoints = series.map(p => ({
    date: p.week,
    y:    cy(p.cumulative),
    rows: [
      { color: '#E6B8C8', label: 'Signups',    value: String(p.signups) },
      { color: '#121212', label: 'Cumulative', value: String(p.cumulative) },
    ],
  }))

  // Pass a custom xFor for ChartHover via padding — we want the hover bands to
  // align with the bar/dot center, not edge-to-edge.
  // ChartHover's xFor uses ratio*(n-1) so we shift padding to match cx(i).
  const hoverPadding = { ...padding, left: padding.left + slot / 2, right: padding.right + slot / 2 }

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-1">
        <p className="text-2xl font-bold text-near-black leading-none">
          {latestCum}<span className="text-[11px] font-normal text-muted-text"> tenants</span>
        </p>
        <p className="text-[11px] text-muted-text">{totalSignups} signups in 90d</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f}
            x1={padding.left} x2={W - padding.right}
            y1={padding.top + innerH * f} y2={padding.top + innerH * f}
            stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
        ))}
        {series.map((p, i) => (
          <rect key={i}
            x={barX(i)} width={barW}
            y={padding.top + innerH - barH(p.signups)} height={barH(p.signups)}
            fill="#E6B8C8" rx="1.5" />
        ))}
        <path d={cumLine} fill="none" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
        {series.map((p, i) => (
          <circle key={i} cx={cx(i)} cy={cy(p.cumulative)} r="2" fill="#121212" />
        ))}
        <ChartHover
          width={W} height={H} padding={hoverPadding}
          points={hoverPoints}
          primaryColor="#121212"
        />
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
                <Link href={`/admin/tenants/${it.tenant}`} className="font-semibold hover:underline">
                  {it.tenant}
                </Link>
                <a
                  href={`https://${it.tenant}.bkrdy.me`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-text hover:text-near-black ml-1"
                  title="Open public site"
                >
                  <ExternalLink size={9} className="inline" />
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
              {relTime(it.ts)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
