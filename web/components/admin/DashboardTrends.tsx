'use client'

import Link from 'next/link'
import {
  AlertCircle, Loader2, ArrowUpRight, ArrowDownRight, Minus, ChevronRight,
  Calendar, Users, XCircle, Clock, TrendingUp, DollarSign,
} from 'lucide-react'
import type {
  AdminDashboardTrends, AdminActivityKpis, ActivityKpiHistoryPoint, ActivityTier,
} from '@/lib/api'
import { ChartHover } from './ChartHover'
import { MiniSparkline } from './MiniSparkline'
import { cn } from '@/lib/cn'

/**
 * Platform admin dashboard — Phase 2 (cross-tenant operational view).
 *
 * Presentational: AdminPage owns the trends fetch (so the same payload
 * also feeds the extended tenant table) and passes it down here. Renders
 * the platform booking-volume chart, top tenants, and activity heatmap.
 * All hand-rolled SVG / CSS grid — no chart dependency.
 */

const TIER_COLOR: Record<ActivityTier, string> = {
  alive:   '#0f6f3d',
  slowing: '#C9A876',
  dormant: 'rgba(18,18,18,0.14)',
}
const TIER_LABEL: Record<ActivityTier, string> = {
  alive:   'Active (7d)',
  slowing: 'Slowing (8-30d)',
  dormant: 'Dormant (30d+)',
}

function relativeTime(iso: string | null): string {
  if (! iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function DashboardTrends({
  trends, loading, error,
}: {
  trends: AdminDashboardTrends | null
  loading: boolean
  error: string | null
}) {
  return (
    <section className="mb-2 mt-8">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-near-black tracking-tight">Booking activity</h2>
        <p className="text-xs text-muted-text">
          {loading ? 'Loading…' : trends?.snapshot_date
            ? <>Cross-tenant snapshot · as of {new Date(trends.snapshot_date).toLocaleDateString()}
                {trends.stale && <span className="text-[#b42828] font-semibold"> · stale (snapshot job may have missed a run)</span>}
              </>
            : 'No snapshot yet.'}
        </p>
      </header>

      {error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && ! trends && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Loading cross-tenant trends…
        </div>
      )}

      {trends && trends.snapshot_date === null && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 text-center">
          <p className="text-[13px] text-near-black font-semibold">No snapshot yet</p>
          <p className="text-[11px] text-muted-text mt-1">
            Run <code className="font-mono bg-cream px-1">php artisan admin:snapshot</code> to populate cross-tenant trends.
            It runs automatically each night at 3am.
          </p>
        </div>
      )}

      {trends && trends.snapshot_date && trends.kpis && (
        <KpiBar kpis={trends.kpis} history={trends.kpi_history ?? []} />
      )}

      {trends && trends.snapshot_date && <DrillInNav />}

      {trends && trends.snapshot_date && (
        <>
          {/* Platform booking volume */}
          <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 mb-3">
            <div className="flex items-end justify-between gap-3 mb-3 flex-wrap">
              <div>
                <p className="text-[13px] font-bold text-near-black">Platform booking volume</p>
                <p className="text-[11px] text-muted-text mt-0.5">Daily appointments across all tenants · 90 days</p>
              </div>
              <div className="flex items-center gap-4">
                <Stat label="Total" value={trends.platform?.bookings_total} />
                <Stat label="30 days" value={trends.platform?.bookings_30d} />
                <Stat label="7 days" value={trends.platform?.bookings_7d} />
              </div>
            </div>
            <BookingVolumeChart series={trends.daily_bookings} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Top tenants */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
              <p className="text-[13px] font-bold text-near-black">Top tenants</p>
              <p className="text-[11px] text-muted-text mt-0.5 mb-3">By bookings · last 30 days</p>
              <TopTenants rows={trends.top_tenants} />
            </div>

            {/* Activity heatmap */}
            <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
              <p className="text-[13px] font-bold text-near-black">Tenant activity</p>
              <p className="text-[11px] text-muted-text mt-0.5 mb-3">Every tenant, by recency of last booking</p>
              <Heatmap tiles={trends.heatmap} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="text-right">
      <p className="text-lg font-bold text-near-black leading-none">{value?.toLocaleString() ?? '—'}</p>
      <p className="text-[10px] tracking-[0.1em] uppercase text-muted-text mt-1">{label}</p>
    </div>
  )
}

// ── KPI bar (top of /admin/activity) ──────────────────────────────────────────

function KpiBar({
  kpis, history,
}: { kpis: AdminActivityKpis; history: ActivityKpiHistoryPoint[] }) {
  // Extract per-KPI series from the history. Older snapshots may be
  // missing newer fields — they come through as null and the sparkline
  // gaps over them.
  const bookingsSeries = history.map(h => h.bookings_7d ?? null)
  const activeSeries   = history.map(h => h.active_tenants_7d ?? null)
  const cancelSeries   = history.map(h => h.cancellation_pct  ?? null)
  const leadSeries     = history.map(h => h.lead_hours        ?? null)

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <KpiCard
        icon={Calendar}
        label="Bookings (7d)"
        value={kpis.bookings_7d.toLocaleString()}
        delta={pctDelta(kpis.bookings_7d, kpis.bookings_prior_7d)}
        sub={`prior 7d: ${kpis.bookings_prior_7d.toLocaleString()}`}
        sparkValues={bookingsSeries}
        sparkColor="#7A5B86"
      />
      <KpiCard
        icon={Users}
        label="Active tenants (7d)"
        value={kpis.active_tenants_7d.toLocaleString()}
        delta={pctDelta(kpis.active_tenants_7d, kpis.active_tenants_prior_7d)}
        sub={`prior 7d: ${kpis.active_tenants_prior_7d.toLocaleString()}`}
        sparkValues={activeSeries}
        sparkColor="#7A5B86"
      />
      <KpiCard
        icon={XCircle}
        label="Cancellation rate"
        value={fmtPct(kpis.cancellation_pct_7d)}
        // Lower is better — flip the tone.
        delta={pctDelta(kpis.cancellation_pct_7d, kpis.cancellation_pct_prior_7d, true)}
        sub={`prior: ${fmtPct(kpis.cancellation_pct_prior_7d)}`}
        sparkValues={cancelSeries}
        sparkColor="#b42828"
      />
      <KpiCard
        icon={Clock}
        label="Avg lead time"
        value={fmtHours(kpis.lead_hours_7d)}
        // Higher lead time = customers booking further out = neutral/positive.
        // Treat as neutral so no green/red, just an arrow.
        delta={pctDelta(kpis.lead_hours_7d, kpis.lead_hours_prior_7d)}
        sub={`prior: ${fmtHours(kpis.lead_hours_prior_7d)}`}
        sparkValues={leadSeries}
        sparkColor="#7A5B86"
      />
    </div>
  )
}

interface DeltaInfo {
  /** ↑ ↓ → ; null if not computable (e.g. divide by 0 with prior=0). */
  direction: 'up' | 'down' | 'flat' | null
  /** Tone applied to the chip: good (green), bad (red), neutral (gray). */
  tone:      'good' | 'bad' | 'neutral'
  /** Pre-formatted "+12%" / "−5%" / "—". */
  label:     string
}

/**
 * Compute a directional + tonal delta from two numbers. `lowerIsBetter`
 * flips the tone so e.g. a rising cancellation rate is BAD not good.
 * When the prior was zero (no baseline), there's no meaningful percent —
 * we return "new" without a tone.
 */
function pctDelta(current: number | null, prior: number | null, lowerIsBetter = false): DeltaInfo {
  if (current === null && prior === null) return { direction: null, tone: 'neutral', label: '—' }
  if (prior === null || prior === 0) {
    return current && current > 0
      ? { direction: 'up', tone: lowerIsBetter ? 'bad' : 'good', label: 'new' }
      : { direction: 'flat', tone: 'neutral', label: '—' }
  }
  if (current === null) return { direction: 'flat', tone: 'neutral', label: '—' }
  const pct = ((current - prior) / prior) * 100
  const direction: DeltaInfo['direction'] = pct > 1 ? 'up' : pct < -1 ? 'down' : 'flat'
  const tone: DeltaInfo['tone'] = direction === 'flat'
    ? 'neutral'
    : (direction === 'up') === !lowerIsBetter ? 'good' : 'bad'
  const sign = pct >= 0 ? '+' : '−'
  const formatted = `${sign}${Math.abs(pct).toFixed(pct > 99 || pct < -99 ? 0 : 1)}%`
  return { direction, tone, label: formatted }
}

const DELTA_TONE: Record<DeltaInfo['tone'], string> = {
  good:    'text-[#0f6f3d]',
  bad:     'text-[#b42828]',
  neutral: 'text-muted-text',
}

function DeltaChip({ delta, compact }: { delta: DeltaInfo; compact?: boolean }) {
  const Icon = delta.direction === 'up' ? ArrowUpRight
    : delta.direction === 'down' ? ArrowDownRight
    : Minus
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 font-semibold tabular-nums',
      compact ? 'text-[10px]' : 'text-[11px]',
      DELTA_TONE[delta.tone],
    )}>
      <Icon size={compact ? 9 : 11} />
      {delta.label}
    </span>
  )
}

function KpiCard({
  icon: Icon, label, value, delta, sub, sparkValues, sparkColor,
}: {
  icon:        React.ElementType
  label:       string
  value:       string
  delta:       DeltaInfo
  sub:         string
  sparkValues: (number | null)[]
  sparkColor:  string
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
        <Icon size={14} className="text-muted-text" />
      </div>
      <p className="text-2xl font-bold text-near-black tracking-tight mt-2 leading-none">{value}</p>
      <div className="flex items-baseline gap-2 mt-2">
        <DeltaChip delta={delta} />
        <span className="text-[10px] text-muted-text">{sub}</span>
      </div>
      <div className="mt-2" title="Last 30 daily snapshots">
        <MiniSparkline
          values={sparkValues}
          color={sparkColor}
          placeholder={`Building 30d history (${sparkValues.filter(v => v !== null).length} pts)`}
        />
      </div>
    </div>
  )
}

function fmtPct(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(v >= 10 ? 0 : 1) + '%'
}

function fmtHours(v: number | null): string {
  if (v === null) return '—'
  if (v < 1)   return Math.round(v * 60) + 'm'
  if (v < 48)  return v.toFixed(1) + 'h'
  return Math.round(v / 24) + 'd'
}

// ── Drill-in nav (below KPIs) ────────────────────────────────────────────────

function DrillInNav() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
      <DrillCard
        href="/admin/activity/patterns"
        icon={Clock}
        label="Booking patterns"
        teaser="Time-of-day × day-of-week heatmap + lead-time histogram"
      />
      <DrillCard
        href="/admin/activity/movers"
        icon={TrendingUp}
        label="Tenant movers"
        teaser="Who's surging, declining, and newcomers this week"
      />
      <DrillCard
        href="/admin/activity/revenue"
        icon={DollarSign}
        label="Platform revenue"
        teaser="GMV estimate · daily series · top-grossing tenants"
      />
    </div>
  )
}

function DrillCard({
  href, icon: Icon, label, teaser,
}: {
  href:   string
  icon:   React.ElementType
  label:  string
  teaser: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 bg-white border border-[rgba(18,18,18,0.10)] hover:border-near-black p-3 transition-colors"
    >
      <div className="w-8 h-8 flex items-center justify-center bg-cream flex-shrink-0">
        <Icon size={14} className="text-near-black" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-near-black">{label}</p>
        <p className="text-[10px] text-muted-text mt-0.5 truncate">{teaser}</p>
      </div>
      <ChevronRight size={14} className="text-muted-text group-hover:text-near-black flex-shrink-0" />
    </Link>
  )
}

// ── Booking volume area chart ─────────────────────────────────────────────────

function BookingVolumeChart({ series }: { series: AdminDashboardTrends['daily_bookings'] }) {
  const W = 800, H = 160
  const padding = { top: 10, right: 6, bottom: 6, left: 6 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom
  const n = series.length

  if (n === 0) {
    return <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-text">No data.</div>
  }

  // If we have ≥160 points (snapshot bumped to 180-day window), split
  // into current 90d + prior 90d for the WoW overlay. Older snapshots
  // with only ~90 points render single-series only.
  const SPLIT_THRESHOLD = 160
  const hasOverlay = n >= SPLIT_THRESHOLD
  // currentLen = ceil(n/2). priorLen mirrors but won't overshoot.
  const currentLen = Math.ceil(n / 2)
  const current = hasOverlay ? series.slice(n - currentLen) : series
  const prior   = hasOverlay ? series.slice(0, n - currentLen).slice(-currentLen) : []

  const cN = current.length
  const maxCurrent = Math.max(1, ...current.map(p => p.count))
  const maxPrior   = prior.length ? Math.max(1, ...prior.map(p => p.count)) : 0
  const max = Math.max(maxCurrent, maxPrior)

  // Both series are plotted on the same 0..cN-1 x scale so prior week
  // sits directly behind the current week visually.
  const x = (i: number) => padding.left + (cN <= 1 ? innerW / 2 : innerW * (i / (cN - 1)))
  const y = (v: number) => padding.top + innerH * (1 - v / max)
  const baseY = padding.top + innerH

  const curPath = current.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
  const curArea = `${curPath} L${x(cN - 1).toFixed(1)},${baseY.toFixed(1)} L${x(0).toFixed(1)},${baseY.toFixed(1)} Z`

  const priorPath = hasOverlay
    ? prior.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
    : ''

  // Hover surface uses CURRENT-period dates but reports both values so
  // the operator can compare "today vs same day last quarter" at a glance.
  const hoverPoints = current.map((p, i) => ({
    date: p.date,
    y:    y(p.count),
    rows: hasOverlay && prior[i] !== undefined
      ? [
          { label: 'Current', value: String(p.count) },
          { label: 'Prior',   value: String(prior[i].count) },
        ]
      : [{ label: 'Bookings', value: String(p.count) }],
  }))

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
        {[0.5].map(f => (
          <line key={f}
            x1={padding.left} x2={W - padding.right}
            y1={padding.top + innerH * f} y2={padding.top + innerH * f}
            stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
        ))}
        {/* Prior period (faint dashed line behind). */}
        {priorPath && (
          <path
            d={priorPath} fill="none"
            stroke="rgba(18,18,18,0.30)" strokeWidth="1" strokeLinejoin="round"
            strokeDasharray="3 3"
          />
        )}
        {/* Current period. */}
        <path d={curArea} fill="rgba(18,18,18,0.06)" />
        <path d={curPath} fill="none" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
        <ChartHover
          width={W} height={H} padding={padding}
          points={hoverPoints}
          primaryColor="#121212"
        />
      </svg>
      {hasOverlay && (
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-text">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-near-black" />
            Current 90 days
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0 border-t border-dashed border-near-black/50" />
            Prior 90 days
          </span>
        </div>
      )}
    </div>
  )
}

// ── Top tenants (horizontal bars) ─────────────────────────────────────────────

function TopTenants({ rows }: { rows: AdminDashboardTrends['top_tenants'] }) {
  if (rows.length === 0) {
    return <p className="text-[12px] text-muted-text">No bookings in the last 30 days yet.</p>
  }
  const max = Math.max(...rows.map(r => r.bookings_30d), 1)
  return (
    <div className="space-y-2">
      {rows.map(r => {
        const delta = pctDelta(r.bookings_7d, r.bookings_prior_7d)
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
                className="absolute inset-y-0 left-0 bg-[#B98AA8]"
                style={{ width: `${(r.bookings_30d / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-near-black w-8 text-right flex-shrink-0">
              {r.bookings_30d}
            </span>
            <span className="w-14 text-right flex-shrink-0" title="7d vs prior 7d">
              <DeltaChip delta={delta} compact />
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity heatmap (CSS tile grid) ──────────────────────────────────────────

function Heatmap({ tiles }: { tiles: AdminDashboardTrends['heatmap'] }) {
  if (tiles.length === 0) {
    return <p className="text-[12px] text-muted-text">No tenants.</p>
  }
  // Sort alive → slowing → dormant so the lit tiles cluster at the top-left.
  const rank: Record<ActivityTier, number> = { alive: 0, slowing: 1, dormant: 2 }
  const sorted = [...tiles].sort((a, b) => rank[a.tier] - rank[b.tier])
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map(t => (
          <Link
            key={t.id}
            href={`/admin/tenants/${t.id}`}
            title={`${t.id} · ${t.bookings_30d} bookings/30d · last ${relativeTime(t.last_booking_at)}`}
            className="w-7 h-7 rounded-sm hover:ring-2 hover:ring-near-black/30 transition-shadow"
            style={{ background: TIER_COLOR[t.tier] }}
          />
        ))}
      </div>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {(['alive', 'slowing', 'dormant'] as ActivityTier[]).map(tier => (
          <span key={tier} className="inline-flex items-center gap-1.5 text-[11px] text-muted-text">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: TIER_COLOR[tier] }} />
            {TIER_LABEL[tier]}
          </span>
        ))}
      </div>
    </div>
  )
}
