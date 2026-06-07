'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, AlertTriangle, Mail, GitCommit, Layers, Database,
  HardDrive, Lock, Clock, Activity, Globe, RefreshCw, Camera, Trash2,
  Wrench, CheckCircle2, Terminal, ArrowRight,
} from 'lucide-react'
import type {
  AdminDashboardHealth, HealthStatus, HealthProbe, AdminQuickAction,
} from '@/lib/api'
import { runAdminAction } from '@/lib/api'
import { useAdmin } from './AdminProvider'
import { cn } from '@/lib/cn'

/**
 * System Health page — operational status across 10 probes, grouped into
 * 4 sections (reliability / background / reachability / deploy).
 *
 * Each card shows status color + headline value + one-line note. When a
 * probe is not OK, its runbook hint surfaces below — the "first thing to
 * check" so a red card answers "what do I run next" without an SSH detour.
 *
 * Quick Actions panel at the bottom is for safe, idempotent operations
 * the operator might want one click from the dashboard. Anything
 * destructive stays SSH-only.
 */

const DOT: Record<HealthStatus, string> = {
  ok:      'bg-[#0f6f3d]',
  warn:    'bg-[#C9A876]',
  bad:     'bg-[#b42828]',
  unknown: 'bg-[rgba(18,18,18,0.25)]',
}

const RING: Record<HealthStatus, string> = {
  ok:      'border-[rgba(18,18,18,0.10)]',
  warn:    'border-[rgba(201,168,118,0.55)]',
  bad:     'border-[rgba(180,40,40,0.45)]',
  unknown: 'border-[rgba(18,18,18,0.10)]',
}

// Per-probe display config — icon + label + optional drill-down route.
// Keyed by probe slug the backend returns. New probes need entries here;
// missing ones fall back to a generic icon + the slug as the label.
const PROBE_META: Record<string, { icon: React.ElementType; label: string; linkTo?: string }> = {
  api_errors:         { icon: AlertTriangle, label: 'API errors (24h)',  linkTo: '/admin/system/errors' },
  database:           { icon: Database,      label: 'Database' },
  disk:               { icon: HardDrive,     label: 'Disk usage' },
  ssl:                { icon: Lock,          label: 'SSL cert' },
  queue:              { icon: Layers,        label: 'Queue',             linkTo: '/admin/system/queue' },
  snapshot_freshness: { icon: Camera,        label: 'Snapshot freshness' },
  scheduler:          { icon: Clock,         label: 'Scheduler' },
  public_site:        { icon: Globe,         label: 'Public site' },
  mailer:             { icon: Mail,          label: 'Mailer' },
  last_deploy:        { icon: GitCommit,     label: 'Last deploy',       linkTo: '/admin/system/deploys' },
}

const SECTION_META: Record<string, { label: string; sub: string }> = {
  reliability:  { label: 'Reliability',  sub: 'Things that take everything down when they break' },
  background:   { label: 'Background work', sub: 'Scheduled jobs + queue' },
  reachability: { label: 'Reachability', sub: 'What users + outbound integrations actually see' },
  deploy:       { label: 'Deploy',       sub: 'Last shipped' },
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
      <header className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-near-black tracking-tight">System health</h2>
          <p className="text-xs text-muted-text">
            Live operational probes · refreshed every 2 minutes
            {data && <> · computed {new Date(data.computed_at).toLocaleTimeString()}</>}
          </p>
        </div>
        <Summary data={data} />
      </header>

      {error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && ! data && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Probing…
        </div>
      )}

      {data && Object.entries(data.sections).map(([key, probes]) => (
        <SectionBlock key={key} sectionKey={key} probes={probes} />
      ))}

      <QuickActions />
    </section>
  )
}

// ── At-a-glance summary chip ──────────────────────────────────────────────────

function Summary({ data }: { data: AdminDashboardHealth | null }) {
  if (! data) return null
  const all: HealthProbe[] = []
  Object.values(data.sections).forEach(s => all.push(...Object.values(s)))
  const counts = { ok: 0, warn: 0, bad: 0, unknown: 0 }
  for (const p of all) counts[p.status]++
  const allOk = counts.warn === 0 && counts.bad === 0
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {allOk
        ? <span className="inline-flex items-center gap-1.5 text-[#0f6f3d] font-semibold">
            <CheckCircle2 size={12} /> All systems normal
          </span>
        : <>
            {counts.bad > 0 && (
              <span className="inline-flex items-center gap-1 text-[#b42828] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#b42828]" /> {counts.bad} bad
              </span>
            )}
            {counts.warn > 0 && (
              <span className="inline-flex items-center gap-1 text-[#8a5a00] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#C9A876]" /> {counts.warn} warn
              </span>
            )}
            <span className="text-muted-text">· {counts.ok} ok</span>
          </>}
    </div>
  )
}

// ── Section block ─────────────────────────────────────────────────────────────

function SectionBlock({
  sectionKey, probes,
}: { sectionKey: string; probes: Record<string, HealthProbe> }) {
  const meta = SECTION_META[sectionKey] ?? { label: sectionKey, sub: '' }
  const entries = Object.entries(probes)
  return (
    <div className="mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase text-near-black">{meta.label}</h3>
        <p className="text-[10px] text-muted-text">{meta.sub}</p>
      </div>
      <div className={cn(
        'grid gap-3',
        entries.length === 1 ? 'grid-cols-1'
          : entries.length === 2 ? 'grid-cols-1 sm:grid-cols-2'
          : entries.length === 3 ? 'grid-cols-1 sm:grid-cols-3'
          : 'grid-cols-2 lg:grid-cols-4',
      )}>
        {entries.map(([key, probe]) => (
          <ProbeCard key={key} probeKey={key} probe={probe} wide={entries.length === 1} />
        ))}
      </div>
    </div>
  )
}

// ── Individual probe card ─────────────────────────────────────────────────────

function ProbeCard({
  probeKey, probe, wide,
}: { probeKey: string; probe: HealthProbe; wide?: boolean }) {
  const meta = PROBE_META[probeKey] ?? { icon: Activity, label: probeKey }
  const Icon = meta.icon
  const showRunbook = probe.status !== 'ok' && probe.runbook && probe.runbook.trim() !== ''
  const Wrapper = meta.linkTo ? Link : 'div'
  const wrapperProps = meta.linkTo
    ? { href: meta.linkTo as string }
    : {}
  return (
    <Wrapper
      {...wrapperProps as any}
      className={cn(
        'block bg-white border p-4 transition-colors',
        RING[probe.status],
        meta.linkTo && 'hover:border-near-black cursor-pointer',
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">{meta.label}</p>
        <span className="inline-flex items-center gap-1 text-muted-text">
          {meta.linkTo && <ArrowRight size={11} />}
          <Icon size={14} />
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', DOT[probe.status])} />
        <p className={cn(
          'font-bold text-near-black tracking-tight leading-none truncate',
          wide ? 'text-2xl' : 'text-xl',
          probeKey === 'last_deploy' && 'font-mono text-base',
        )}>
          {probe.value}
        </p>
      </div>
      <p className="text-[11px] text-muted-text mt-2 leading-snug">{probe.note}</p>

      {showRunbook && (
        <div className="mt-2 pt-2 border-t border-[rgba(18,18,18,0.06)]">
          <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1 inline-flex items-center gap-1">
            <Terminal size={9} /> Runbook
          </p>
          <code className="block text-[10px] font-mono text-near-black bg-cream px-2 py-1.5 leading-relaxed whitespace-pre-wrap break-all">
            {probe.runbook}
          </code>
        </div>
      )}
    </Wrapper>
  )
}

// ── Quick actions panel ──────────────────────────────────────────────────────

interface ActionDef {
  id:       AdminQuickAction
  icon:     React.ElementType
  label:    string
  detail:   string
  /** Set when the action mutates data the dashboard cares about. */
  refresh?: boolean
}

const ACTIONS: ActionDef[] = [
  {
    id: 'reprobe',
    icon: RefreshCw,
    label: 'Re-probe now',
    detail: 'Bust the 2-minute cache and re-run every probe immediately.',
    refresh: true,
  },
  {
    id: 'snapshot',
    icon: Camera,
    label: 'Run snapshot',
    detail: 'Walk every tenant DB and write a fresh cross-tenant snapshot. Slow at scale.',
    refresh: true,
  },
  {
    id: 'clear-cache',
    icon: Trash2,
    label: 'Clear Laravel cache',
    detail: 'php artisan optimize:clear (config + route + view cache).',
  },
]

function QuickActions() {
  const { refreshAll } = useAdmin()
  // Per-action transient state — busy + last-result message.
  const [busy,   setBusy]   = useState<AdminQuickAction | null>(null)
  const [result, setResult] = useState<{ id: AdminQuickAction; ok: boolean; note: string } | null>(null)

  async function run(action: ActionDef) {
    setBusy(action.id)
    setResult(null)
    try {
      const r = await runAdminAction(action.id)
      setResult({ id: action.id, ok: r.ok, note: r.note })
      if (action.refresh) await refreshAll()
    } catch (e) {
      setResult({ id: action.id, ok: false, note: e instanceof Error ? e.message : 'Action failed' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-6 bg-white border border-[rgba(18,18,18,0.10)] p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="text-[13px] font-bold text-near-black inline-flex items-center gap-1.5">
          <Wrench size={13} /> Quick actions
        </h3>
        <p className="text-[10px] text-muted-text">
          Safe + idempotent only. Destructive ops stay SSH-only.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {ACTIONS.map(a => {
          const Icon = a.icon
          const isBusy = busy === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => run(a)}
              disabled={busy !== null}
              className={cn(
                'text-left bg-cream border border-[rgba(18,18,18,0.10)] p-3 hover:border-near-black disabled:opacity-50 disabled:cursor-wait',
                isBusy && 'border-near-black',
              )}
            >
              <div className="flex items-center gap-2 text-near-black">
                {isBusy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                <span className="text-[12px] font-bold tracking-tight">{a.label}</span>
              </div>
              <p className="text-[11px] text-muted-text mt-1 leading-snug">{a.detail}</p>
            </button>
          )
        })}
      </div>
      {result && (
        <div className={cn(
          'mt-3 px-3 py-2 border text-[11px] flex items-start gap-2',
          result.ok
            ? 'border-[rgba(15,111,61,0.25)] bg-[rgba(15,111,61,0.05)] text-[#0f6f3d]'
            : 'border-[rgba(180,40,40,0.25)] bg-[rgba(180,40,40,0.05)] text-[#b42828]',
        )}>
          {result.ok ? <CheckCircle2 size={12} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />}
          <span className="font-mono whitespace-pre-wrap break-all">{result.note}</span>
        </div>
      )}
    </div>
  )
}
