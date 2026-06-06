'use client'

import Link from 'next/link'
import { AlertCircle, Loader2 } from 'lucide-react'
import type { AdminDashboardTrends, ActivityTier } from '@/lib/api'
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

// ── Booking volume area chart ─────────────────────────────────────────────────

function BookingVolumeChart({ series }: { series: AdminDashboardTrends['daily_bookings'] }) {
  const W = 800, H = 160, padT = 10, padB = 6, padL = 6, padR = 6
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = series.length
  const max = Math.max(...series.map(p => p.count), 1)

  if (n === 0) {
    return <div className="h-[120px] flex items-center justify-center text-[12px] text-muted-text">No data.</div>
  }

  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padT + innerH * (1 - v / max)

  const top = series.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.count).toFixed(1)}`).join(' ')
  const area = `${top} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" preserveAspectRatio="none">
      {[0.5].map(f => (
        <line key={f} x1={padL} x2={W - padR} y1={padT + innerH * f} y2={padT + innerH * f}
          stroke="rgba(18,18,18,0.06)" strokeWidth="1" />
      ))}
      <path d={area} fill="rgba(18,18,18,0.06)" />
      <path d={top} fill="none" stroke="#121212" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
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
      {rows.map(r => (
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
        </div>
      ))}
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
