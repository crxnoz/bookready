'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, Clock } from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { getAdminActivityPatterns, type AdminActivityPatterns } from '@/lib/api'
import { Card } from '../_parts'
import { cn } from '@/lib/cn'

/**
 * /admin/activity/patterns — day-of-week × hour-of-day heatmap + DOW
 * and HOD marginals + lead-time histogram. All computed during the
 * nightly snapshot so the page is one central JSON read.
 */

const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ActivityPatternsPage() {
  const { auth } = useAdmin()
  const [data,    setData]    = useState<AdminActivityPatterns | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (auth !== 'ready') return
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminActivityPatterns()
        if (! cancelled) setData(d)
      } catch (e) {
        if (! cancelled) setErr(e instanceof Error ? e.message : 'Failed to load patterns')
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
          <Clock size={18} /> Booking patterns
        </h1>
        <p className="text-xs text-muted-text mt-1">
          When bookings actually happen across the platform · last 30 days
          {data?.snapshot_date && <> · snapshot {new Date(data.snapshot_date).toLocaleDateString()}</>}
        </p>
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Computing patterns…
        </div>
      )}

      {data && ! data.matrix && (
        <Card>
          <p className="text-[13px] text-near-black">No pattern data in the latest snapshot.</p>
          <p className="text-[11px] text-muted-text mt-1">
            Re-run <code className="font-mono">php artisan admin:snapshot</code> to populate
            (the matrix is only captured in snapshots written after this feature shipped).
          </p>
        </Card>
      )}

      {data && data.matrix && (
        <div className="space-y-3">
          <DowHodHeatmap matrix={data.matrix} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <LeadTimeHistogram series={data.lead_time} />
            <DowDistribution matrix={data.matrix} />
          </div>
        </div>
      )}
    </AdminShell>
  )
}

// ── DOW × HOD heatmap ────────────────────────────────────────────────────────

function DowHodHeatmap({ matrix }: { matrix: number[][] }) {
  const max = Math.max(1, ...matrix.flat())
  const rowSums = matrix.map(row => row.reduce((s, v) => s + v, 0))
  const colSums = Array.from({ length: 24 }, (_, h) =>
    matrix.reduce((s, row) => s + row[h], 0))
  const total = rowSums.reduce((s, v) => s + v, 0)

  // Tints from cream → plum based on intensity.
  function tile(v: number): string {
    if (v === 0) return '#F5EFE6'
    const t = v / max
    // Interpolate between blush (#E6B8C8) and plum (#7A5B86)
    const lerp = (a: number, b: number) => Math.round(a + (b - a) * t)
    const r = lerp(230, 122)
    const g = lerp(184, 91)
    const b = lerp(200, 134)
    return `rgb(${r},${g},${b})`
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="flex items-baseline justify-between mb-3">
        <p className="text-[13px] font-bold text-near-black">When do bookings happen?</p>
        <p className="text-[11px] text-muted-text">
          {total.toLocaleString()} bookings · darker = busier
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Hour header */}
          <div className="flex pl-10 pr-10">
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} className="flex-1 text-[9px] text-muted-text text-center min-w-[18px]">
                {h % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>
          {/* Rows */}
          {DOW_LABELS.map((dow, di) => (
            <div key={dow} className="flex items-center mt-0.5">
              <div className="w-10 text-[10px] font-bold text-muted-text uppercase tracking-[0.1em]">{dow}</div>
              <div className="flex flex-1 gap-[1px]">
                {Array.from({ length: 24 }, (_, h) => {
                  const v = matrix[di]?.[h] ?? 0
                  return (
                    <div
                      key={h}
                      title={`${dow} ${String(h).padStart(2, '0')}:00 — ${v} booking${v === 1 ? '' : 's'}`}
                      className="flex-1 h-5 min-w-[14px]"
                      style={{ background: tile(v) }}
                    />
                  )
                })}
              </div>
              <div className="w-10 text-right text-[10px] font-bold text-near-black tabular-nums pr-0 pl-2">
                {rowSums[di].toLocaleString()}
              </div>
            </div>
          ))}
          {/* Hour totals */}
          <div className="flex pl-10 mt-1.5">
            <div className="flex flex-1 gap-[1px]">
              {colSums.map((c, h) => (
                <div key={h} className="flex-1 text-[9px] tabular-nums text-muted-text text-center min-w-[14px]">
                  {h % 3 === 0 ? c : ''}
                </div>
              ))}
            </div>
            <div className="w-10" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-text">
        <span>Less</span>
        <div className="flex gap-[1px]">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(t => (
            <div key={t} className="w-4 h-3" style={{
              background: t === 0 ? '#F5EFE6'
                : `rgb(${Math.round(230 + (122 - 230) * t)},${Math.round(184 + (91 - 184) * t)},${Math.round(200 + (134 - 200) * t)})`,
            }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  )
}

// ── Lead-time histogram ──────────────────────────────────────────────────────

function LeadTimeHistogram({ series }: { series: AdminActivityPatterns['lead_time'] }) {
  const max = Math.max(1, ...series.map(s => s.count))
  const total = series.reduce((s, b) => s + b.count, 0)
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <p className="text-[13px] font-bold text-near-black">Lead time</p>
      <p className="text-[11px] text-muted-text mt-0.5 mb-3">
        How far in advance customers book · last 30 days
      </p>
      <div className="space-y-1.5">
        {series.map(b => (
          <div key={b.label} className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-near-black w-14 text-right">{b.label}</span>
            <div className="flex-1 h-5 bg-cream relative overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#B98AA8]"
                style={{ width: `${(b.count / max) * 100}%` }}
              />
            </div>
            <span className="text-[11px] tabular-nums text-near-black w-10 text-right">
              {b.count.toLocaleString()}
            </span>
            <span className="text-[10px] tabular-nums text-muted-text w-10 text-right">
              {total > 0 ? Math.round((b.count / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day-of-week distribution (marginal of the heatmap) ──────────────────────

function DowDistribution({ matrix }: { matrix: number[][] }) {
  const sums = matrix.map(row => row.reduce((s, v) => s + v, 0))
  const max = Math.max(1, ...sums)
  const total = sums.reduce((s, v) => s + v, 0)
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <p className="text-[13px] font-bold text-near-black">By day of week</p>
      <p className="text-[11px] text-muted-text mt-0.5 mb-3">
        Which days drive volume · last 30 days
      </p>
      <div className="space-y-1.5">
        {DOW_LABELS.map((dow, i) => {
          const v = sums[i]
          const pct = total > 0 ? Math.round((v / total) * 100) : 0
          return (
            <div key={dow} className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-near-black w-9">{dow}</span>
              <div className="flex-1 h-5 bg-cream relative overflow-hidden">
                <div
                  className={cn(
                    'absolute inset-y-0 left-0',
                    pct >= 18 ? 'bg-[#7A5B86]'
                      : pct >= 12 ? 'bg-[#B98AA8]'
                      : 'bg-[#E6B8C8]',
                  )}
                  style={{ width: `${(v / max) * 100}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-near-black w-10 text-right">
                {v.toLocaleString()}
              </span>
              <span className="text-[10px] tabular-nums text-muted-text w-10 text-right">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
