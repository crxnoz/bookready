'use client'

import {
  Loader2, AlertCircle, AlertTriangle, Mail, GitCommit, Layers,
} from 'lucide-react'
import type { AdminDashboardHealth, HealthStatus } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * System-health card — 4 independently-probed metrics (API errors, queue,
 * last deploy, mailer). Props-driven; the global <AdminProvider> owns
 * the fetch.
 */

const DOT: Record<HealthStatus, string> = {
  ok:      'bg-[#0f6f3d]',
  warn:    'bg-[#C9A876]',
  bad:     'bg-[#b42828]',
  unknown: 'bg-[rgba(18,18,18,0.25)]',
}

export default function DashboardSystemHealth({
  data, loading, error,
}: {
  data:    AdminDashboardHealth | null
  loading: boolean
  error:   string | null
}) {
  return (
    <section className="mb-2">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-near-black tracking-tight">System health</h2>
        <p className="text-xs text-muted-text">Live operational probes · refreshed every 2 minutes</p>
      </header>

      {error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && ! data && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Probing…
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HealthCard
            icon={AlertTriangle}
            label="API errors (24h)"
            status={data.api_errors.status}
            value={data.api_errors.count_24h === null ? '—' : String(data.api_errors.count_24h)}
            note={data.api_errors.note}
          />
          <HealthCard
            icon={Layers}
            label="Queue"
            status={data.queue.status}
            value={data.queue.depth === null ? data.queue.connection : String(data.queue.depth)}
            note={data.queue.note}
          />
          <HealthCard
            icon={GitCommit}
            label="Last deploy"
            status={data.deploy.status}
            value={data.deploy.commit ?? '—'}
            note={data.deploy.note}
            mono
          />
          <HealthCard
            icon={Mail}
            label="Mailer"
            status={data.mailer.status}
            value={data.mailer.status === 'ok' ? 'Resend' : '—'}
            note={data.mailer.note}
          />
        </div>
      )}
    </section>
  )
}

function HealthCard({
  icon: Icon, label, status, value, note, mono,
}: {
  icon: React.ElementType
  label: string
  status: HealthStatus
  value: string
  note: string
  mono?: boolean
}) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{label}</p>
        <Icon size={14} className="text-muted-text" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', DOT[status])} />
        <p className={cn('text-xl font-bold text-near-black tracking-tight leading-none truncate', mono && 'font-mono text-base')}>
          {value}
        </p>
      </div>
      <p className="text-[11px] text-muted-text mt-2 leading-snug">{note}</p>
    </div>
  )
}
