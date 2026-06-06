'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, AlertTriangle, Info, Sparkles, CheckCircle2,
} from 'lucide-react'
import {
  getAdminDashboardInsights, type AdminDashboardInsights, type InsightSeverity,
} from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Platform admin dashboard — Phase 3 insights panel.
 *
 * Rule-based triage list. Each insight only appears when it has something
 * to say (computed server-side), so an empty list genuinely means "all
 * clear." Self-contained fetch, matching DashboardSummary's pattern.
 */

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

export default function DashboardInsights() {
  const [data,    setData]    = useState<AdminDashboardInsights | null>(null)
  const [err,     setErr]     = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const d = await getAdminDashboardInsights()
        if (! cancelled) setData(d)
      } catch (e) {
        if (! cancelled) setErr(e instanceof Error ? e.message : 'Could not load insights')
      } finally {
        if (! cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <section className="mb-2 mt-8">
      <header className="mb-4">
        <h2 className="text-xl font-bold text-near-black tracking-tight">Insights</h2>
        <p className="text-xs text-muted-text">What needs attention, computed from the latest snapshot</p>
      </header>

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {loading && (
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
          {data.insights.map(ins => {
            const sev = SEV[ins.severity]
            const Icon = sev.icon
            return (
              <div key={ins.id} className={cn('bg-white border p-4', sev.ring)}>
                <div className="flex items-start gap-3">
                  <Icon size={16} className={cn('flex-shrink-0 mt-0.5', sev.dot)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-near-black">{ins.title}</p>
                    <p className="text-[12px] text-muted-text mt-0.5 leading-relaxed">{ins.detail}</p>
                    {ins.tenants.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {ins.tenants.map(t => (
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
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
