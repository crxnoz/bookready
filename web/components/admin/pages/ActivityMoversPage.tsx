'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ArrowLeft, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { Card, Td, Th } from '../_parts'
import type { AdminTenantTrendRow } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * /admin/activity/movers — tenants ranked by WoW booking change.
 *
 * Computed entirely from trends.tenants on the client — no new endpoint.
 * Surfaces the operator's most-asked-during-an-incident question:
 * "who's quietly dying" and "who's blowing up".
 *
 * Tenants with zero history (no current and no prior) are filtered out
 * so the lists don't get drowned in dormants. The "newcomers" section
 * separately surfaces tenants whose first non-zero week was this one —
 * they're real signal but distort the % math.
 */

type Mode = 'surging' | 'declining' | 'newcomers'

interface Mover {
  tenant: AdminTenantTrendRow
  /** Percent change vs prior 7d. null = newcomer (no prior baseline). */
  pct:    number | null
  /** Absolute delta in bookings (current - prior). */
  delta:  number
}

export default function ActivityMoversPage() {
  const { trends } = useAdmin()
  const [mode, setMode] = useState<Mode>('surging')

  const tenants = trends.data?.tenants ?? []

  const { surging, declining, newcomers } = useMemo(() => {
    const surge:  Mover[] = []
    const declin: Mover[] = []
    const newc:   Mover[] = []
    for (const t of tenants) {
      const cur = t.bookings_7d
      const pri = t.bookings_prior_7d
      const delta = cur - pri
      if (cur === 0 && pri === 0) continue          // dormant — filter out
      if (pri === 0 && cur > 0) {
        newc.push({ tenant: t, pct: null, delta })
        continue
      }
      const pct = pri > 0 ? ((cur - pri) / pri) * 100 : 0
      if (pct > 5)  surge.push({ tenant: t, pct, delta })
      if (pct < -5) declin.push({ tenant: t, pct, delta })
    }
    surge.sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
    declin.sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))
    newc.sort((a, b) => b.delta - a.delta)
    return { surging: surge, declining: declin, newcomers: newc }
  }, [tenants])

  const current = mode === 'surging' ? surging : mode === 'declining' ? declining : newcomers

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
          <TrendingUp size={18} /> Tenant movers
        </h1>
        <p className="text-xs text-muted-text mt-1">
          Week-over-week change in bookings · top 7 days vs the 7 days before
        </p>
      </header>

      {trends.loading && tenants.length === 0 && (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {trends.error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {trends.error}
        </div>
      )}

      {tenants.length > 0 && (
        <>
          {/* Mode chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            <ModeChip
              active={mode === 'surging'}    onClick={() => setMode('surging')}
              icon={ArrowUpRight} label="Surging"   count={surging.length}    tone="good"
            />
            <ModeChip
              active={mode === 'declining'}  onClick={() => setMode('declining')}
              icon={ArrowDownRight} label="Declining" count={declining.length}  tone="bad"
            />
            <ModeChip
              active={mode === 'newcomers'}  onClick={() => setMode('newcomers')}
              icon={Minus} label="Newcomers" count={newcomers.length}  tone="neutral"
            />
          </div>

          {/* Table */}
          {current.length === 0 ? (
            <Card>
              <p className="text-[12px] text-muted-text">
                {mode === 'surging'   && 'No tenants are surging (>5% WoW).'}
                {mode === 'declining' && 'No tenants are declining (<-5% WoW).'}
                {mode === 'newcomers' && 'No tenants booked their first week this week.'}
              </p>
            </Card>
          ) : (
            <MoversTable rows={current} mode={mode} />
          )}
        </>
      )}
    </AdminShell>
  )
}

function ModeChip({
  active, onClick, icon: Icon, label, count, tone,
}: {
  active:  boolean
  onClick: () => void
  icon:    React.ElementType
  label:   string
  count:   number
  tone:    'good' | 'bad' | 'neutral'
}) {
  const toneColor =
    tone === 'good' ? 'text-[#0f6f3d]' :
    tone === 'bad'  ? 'text-[#b42828]' :
                      'text-muted-text'
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border px-3 py-2',
        active
          ? 'bg-near-black border-near-black text-white'
          : 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black',
      )}
    >
      <Icon size={11} className={active ? 'text-white' : toneColor} />
      {label}
      <span className={cn(
        'ml-1 text-[10px] tabular-nums',
        active ? 'text-white/80' : 'text-muted-text',
      )}>
        ({count})
      </span>
    </button>
  )
}

function MoversTable({ rows, mode }: { rows: Mover[]; mode: Mode }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] overflow-x-auto">
      <table className="w-full text-[12px] min-w-[600px]">
        <thead>
          <tr className="border-b border-[rgba(18,18,18,0.08)] bg-cream">
            <Th>Tenant</Th>
            <Th className="text-right">Bookings (7d)</Th>
            <Th className="text-right">Prior 7d</Th>
            <Th className="text-right">Δ</Th>
            <Th className="text-right">WoW %</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ tenant: t, pct, delta }) => (
            <tr key={t.id} className="border-b border-[rgba(18,18,18,0.06)] last:border-b-0 hover:bg-cream/30">
              <Td>
                <Link href={`/admin/tenants/${t.id}`} className="text-near-black font-semibold hover:underline">
                  {t.id}
                </Link>
                <p className="text-[10px] text-muted-text mt-0.5 truncate">
                  {t.owner_email ?? '—'}
                </p>
              </Td>
              <Td className="text-right tabular-nums font-semibold">{t.bookings_7d}</Td>
              <Td className="text-right tabular-nums text-muted-text">{t.bookings_prior_7d}</Td>
              <Td className={cn(
                'text-right tabular-nums font-semibold',
                delta > 0 ? 'text-[#0f6f3d]' : delta < 0 ? 'text-[#b42828]' : 'text-muted-text',
              )}>
                {delta > 0 ? '+' : ''}{delta}
              </Td>
              <Td className="text-right tabular-nums font-bold">
                {pct === null
                  ? <span className="text-[10px] uppercase tracking-[0.08em] text-[#0f6f3d]">NEW</span>
                  : <span className={cn(
                      pct > 0 ? 'text-[#0f6f3d]' : pct < 0 ? 'text-[#b42828]' : 'text-muted-text',
                    )}>
                      {pct > 0 ? '+' : ''}{pct.toFixed(pct > 999 || pct < -999 ? 0 : 0)}%
                    </span>}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
