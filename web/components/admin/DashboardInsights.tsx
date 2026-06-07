'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, AlertTriangle, Info, Sparkles, CheckCircle2,
} from 'lucide-react'
import type { AdminDashboardInsights, InsightSeverity } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Insights panel — rule-based triage list. Props-driven; the global
 * <AdminProvider> owns the fetch.
 *
 * At hundreds-of-tenants scale a "never_booked" insight would emit one
 * chip per tenant and visually drown the panel. CHIP_CAP collapses
 * everything past 10 behind a "+N more" toggle.
 */

const CHIP_CAP = 10

const SEV: Record<InsightSeverity, { icon: React.ElementType; ring: string; dot: string; chip: string }> = {
  warn: {
    icon: AlertTriangle,
    ring: 'border-[rgba(180,40,40,0.25)]',
    dot:  'text-[#b42828]',
    chip: 'border-[rgba(180,40,40,0.25)] bg-[rgba(180,40,40,0.05)] text-[#b42828]',
  },
  good: {
    icon: Sparkles,
    ring: 'border-[rgba(15,111,61,0.25)]',
    dot:  'text-[#0f6f3d]',
    chip: 'border-[rgba(15,111,61,0.25)] bg-[rgba(15,111,61,0.05)] text-[#0f6f3d]',
  },
  info: {
    icon: Info,
    ring: 'border-[rgba(18,18,18,0.12)]',
    dot:  'text-muted-text',
    chip: 'border-[rgba(18,18,18,0.12)] bg-cream text-[rgba(18,18,18,0.65)]',
  },
}

export default function DashboardInsights({
  data, loading, error,
}: {
  data:    AdminDashboardInsights | null
  loading: boolean
  error:   string | null
}) {
  return (
    <section className="mb-2">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-near-black tracking-tight">Insights</h2>
        <p className="text-xs text-muted-text">
          What needs attention, computed from the latest snapshot
          {data?.snapshot_date && <> · {new Date(data.snapshot_date).toLocaleDateString()}</>}
        </p>
      </header>

      {error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {loading && ! data && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Computing insights…
        </div>
      )}

      {data && data.insights.length === 0 && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-[13px] text-near-black">
          <CheckCircle2 size={16} className="text-[#0f6f3d]" /> All clear — nothing needs attention right now.
        </div>
      )}

      {data && data.insights.length > 0 && (
        <div className="space-y-2.5">
          {data.insights.map(ins => <InsightCard key={ins.id} insight={ins} />)}
        </div>
      )}
    </section>
  )
}

function InsightCard({ insight }: { insight: AdminDashboardInsights['insights'][number] }) {
  const sev = SEV[insight.severity]
  const Icon = sev.icon
  const [expanded, setExpanded] = useState(false)

  const visibleTenants = expanded ? insight.tenants : insight.tenants.slice(0, CHIP_CAP)
  const overflow = insight.tenants.length - visibleTenants.length

  return (
    <div className={cn('bg-white border p-4', sev.ring)}>
      <div className="flex items-start gap-3">
        <Icon size={16} className={cn('flex-shrink-0 mt-0.5', sev.dot)} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-near-black">{insight.title}</p>
          <p className="text-[12px] text-muted-text mt-0.5 leading-relaxed">{insight.detail}</p>
          {insight.tenants.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {visibleTenants.map(t => (
                <Link
                  key={t}
                  href={`/admin/tenants/${t}`}
                  className={cn(
                    'text-[10px] font-semibold tracking-[0.04em] px-2 py-0.5 border hover:underline',
                    sev.chip,
                  )}
                >
                  {t}
                </Link>
              ))}
              {overflow > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="text-[10px] font-semibold tracking-[0.04em] px-2 py-0.5 border border-[rgba(18,18,18,0.12)] bg-white text-muted-text hover:text-near-black hover:border-near-black"
                >
                  +{overflow} more
                </button>
              )}
              {expanded && insight.tenants.length > CHIP_CAP && (
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="text-[10px] font-semibold tracking-[0.04em] px-2 py-0.5 border border-[rgba(18,18,18,0.12)] bg-white text-muted-text hover:text-near-black hover:border-near-black"
                >
                  Show less
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
