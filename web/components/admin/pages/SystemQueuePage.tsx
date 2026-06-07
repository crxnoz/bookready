'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ArrowLeft, Layers, ChevronDown, ChevronRight, XCircle,
} from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { getAdminDashboardQueue, type AdminQueueReport, type FailedJob } from '@/lib/api'
import { Card, relTime } from '../_parts'

/**
 * /admin/system/queue — drill-down for the Queue probe.
 *
 * Pending jobs are what's queued right now (top of LRANGE on the redis
 * queue) — useful to see if a specific job class is jamming things up.
 * Failed jobs are the historical record of what's broken before. Both
 * lists answer different questions; both belong here.
 */
export default function SystemQueuePage() {
  const { auth } = useAdmin()
  const [data,    setData]    = useState<AdminQueueReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [err,     setErr]     = useState<string | null>(null)

  useEffect(() => {
    if (auth !== 'ready') return
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminDashboardQueue()
        if (! cancelled) setData(d)
      } catch (e) {
        if (! cancelled) setErr(e instanceof Error ? e.message : 'Failed to load queue')
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
          <Layers size={18} /> Queue
        </h1>
        {data && (
          <p className="text-xs text-muted-text mt-1">
            {data.connection} · {data.depth.toLocaleString()} pending · {data.failed.length} failed (last 25)
          </p>
        )}
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Reading queue…
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Panel title="Pending" subtitle={`Top ${data.pending.length} on the ${data.connection} queue`}>
            {data.pending.length === 0 ? (
              <p className="text-[12px] text-muted-text">Queue is empty.</p>
            ) : (
              <ul className="divide-y divide-[rgba(18,18,18,0.06)] -my-2">
                {data.pending.map((p, i) => (
                  <li key={i} className="py-2.5">
                    <p className="text-[12px] font-mono font-bold text-near-black truncate">{p.display_name}</p>
                    <p className="text-[10px] text-muted-text mt-0.5">
                      {p.pushed_at ? `pushed ${relTime(p.pushed_at)}` : 'pushed —'}
                      {p.attempts > 0 && <> · {p.attempts} attempt{p.attempts === 1 ? '' : 's'}</>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Recent failures" subtitle={data.failed_table_exists ? 'From failed_jobs table' : 'failed_jobs table missing'}>
            {! data.failed_table_exists ? (
              <p className="text-[12px] text-muted-text">
                The <code className="font-mono">failed_jobs</code> table doesn&rsquo;t exist yet. Run the
                pending migration to start capturing.
              </p>
            ) : data.failed.length === 0 ? (
              <p className="text-[12px] text-muted-text">No failures captured.</p>
            ) : (
              <ul className="divide-y divide-[rgba(18,18,18,0.06)] -my-2">
                {data.failed.map(f => <FailedRow key={f.uuid} f={f} />)}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </AdminShell>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="mb-3">
        <p className="text-[13px] font-bold text-near-black">{title}</p>
        <p className="text-[11px] text-muted-text mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function FailedRow({ f }: { f: FailedJob }) {
  const [open, setOpen] = useState(false)
  return (
    <li className="py-2.5">
      <button type="button" onClick={() => setOpen(o => ! o)} className="w-full text-left flex items-start gap-2 group">
        <span className="flex-shrink-0 mt-0.5">
          {open
            ? <ChevronDown size={12} className="text-muted-text" />
            : <ChevronRight size={12} className="text-muted-text" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-mono font-bold text-near-black truncate group-hover:underline">{f.display_name}</p>
          <p className="text-[11px] text-[#b42828] mt-0.5 inline-flex items-center gap-1">
            <XCircle size={11} /> {f.exception}
          </p>
          <p className="text-[10px] text-muted-text/80 mt-0.5">
            Failed {relTime(f.failed_at)} · {f.queue}
          </p>
        </div>
      </button>
      {open && f.trace_head && (
        <pre className="mt-2 ml-5 text-[10px] font-mono text-muted-text bg-cream p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
          {f.trace_head}
        </pre>
      )}
    </li>
  )
}
