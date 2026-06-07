'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ArrowLeft, AlertTriangle, ChevronDown, ChevronRight,
} from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { getAdminDashboardErrors, type AdminErrorReport, type ErrorGroup } from '@/lib/api'
import { Card } from '../_parts'
import { cn } from '@/lib/cn'

/**
 * /admin/system/errors — drill-down for the "API errors (24h)" probe.
 *
 * Shows a 24-hour hourly histogram (so you can tell "started 2h ago" vs
 * "steady stream") plus the top error groups, clustered by exception
 * class + first line of message. Each group is collapsible to reveal a
 * sample stack-trace head.
 */
export default function SystemErrorsPage() {
  const { auth } = useAdmin()
  const [data,    setData]    = useState<AdminErrorReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (auth !== 'ready') return
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminDashboardErrors()
        if (! cancelled) setData(d)
      } catch (e) {
        if (! cancelled) setErr(e instanceof Error ? e.message : 'Failed to load errors')
      } finally {
        if (! cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [auth])

  return (
    <AdminShell tab="system">
      <Link
        href="/admin/system"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black mb-4"
      >
        <ArrowLeft size={12} /> System health
      </Link>

      <header className="mb-4">
        <h1 className="text-xl font-bold text-near-black tracking-tight inline-flex items-center gap-2">
          <AlertTriangle size={18} /> API errors (24h)
        </h1>
        <p className="text-xs text-muted-text mt-1">
          Parsed from <code className="font-mono text-[11px]">storage/logs/laravel.log</code>.
          Grouped by exception class + message digest so recurring errors collapse to one row.
        </p>
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Parsing log…
        </div>
      )}

      {data && (
        <>
          <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 mb-3">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[13px] font-bold text-near-black">Hourly distribution</p>
              <p className="text-[11px] text-muted-text">{data.total} error{data.total === 1 ? '' : 's'} in the last 24h</p>
            </div>
            <Histogram series={data.histogram} />
          </div>

          {data.groups.length === 0 ? (
            <Card>
              <p className="text-[13px] text-near-black inline-flex items-center gap-2">
                ✓ Clean — no ERROR+ entries in the last 24h.
              </p>
            </Card>
          ) : (
            <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
              {data.groups.map((g, i) => <GroupRow key={i} g={g} />)}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}

// ── Histogram (24 hourly buckets) ─────────────────────────────────────────────

function Histogram({ series }: { series: AdminErrorReport['histogram'] }) {
  const max = Math.max(...series.map(p => p.count), 1)
  const totalNonZero = series.filter(p => p.count > 0).length
  return (
    <div>
      <div className="flex items-end gap-[2px] h-[80px]">
        {series.map(p => {
          const h = (p.count / max) * 100
          const isEmpty = p.count === 0
          return (
            <div
              key={p.hour}
              title={`${new Date(p.hour).toLocaleString()} — ${p.count} error${p.count === 1 ? '' : 's'}`}
              className="flex-1 flex items-end h-full"
            >
              <div
                className={cn(
                  'w-full rounded-sm',
                  isEmpty ? 'bg-cream' : (p.count >= max * 0.7 ? 'bg-[#b42828]' : 'bg-[#C9A876]'),
                )}
                style={{ height: isEmpty ? '2px' : `${Math.max(8, h)}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[10px] text-muted-text">24h ago</span>
        <span className="text-[10px] text-muted-text">{totalNonZero}/24 hours had errors</span>
        <span className="text-[10px] text-muted-text">now</span>
      </div>
    </div>
  )
}

// ── One grouped error row ─────────────────────────────────────────────────────

function GroupRow({ g }: { g: ErrorGroup }) {
  const [open, setOpen] = useState(false)
  const isCritical = g.level === 'CRITICAL' || g.level === 'EMERGENCY'
  const tone = isCritical ? '#b42828' : (g.level === 'ERROR' ? '#b42828' : '#8a5a00')
  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen(o => ! o)}
        className="w-full text-left flex items-start gap-3 group"
      >
        <span className="flex-shrink-0 mt-1">
          {open
            ? <ChevronDown size={14} className="text-muted-text" />
            : <ChevronRight size={14} className="text-muted-text" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-[12px] font-mono font-bold text-near-black truncate group-hover:underline">
              {g.class}
            </p>
            <span className="text-[10px] tabular-nums font-bold uppercase tracking-[0.06em]"
              style={{ color: tone }}>
              ×{g.count}
            </span>
          </div>
          <p className="text-[11px] text-muted-text mt-0.5 line-clamp-2">{g.message}</p>
          <p className="text-[10px] text-muted-text/80 mt-1">
            Latest: {new Date(g.latest_at).toLocaleString()}
          </p>
        </div>
      </button>
      {open && g.sample_trace && (
        <pre className="mt-2 ml-7 text-[10px] font-mono text-muted-text bg-cream p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          {g.sample_trace}
        </pre>
      )}
    </div>
  )
}
