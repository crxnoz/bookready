'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ExternalLink, Trash2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
} from 'lucide-react'
import type { AdminTenantTrendRow } from '@/lib/api'
import type { AdminTenantRow } from '@/lib/types'
import { Card, Td, Th, relTime } from './_parts'
import { cn } from '@/lib/cn'

/**
 * Sortable + paginated tenant table. Built to handle hundreds of tenants
 * without bogging the page down: pagination keeps the DOM small, sorting
 * is a single useMemo over the already-filtered list, and the sticky
 * header keeps column meaning visible while scrolling long lists.
 *
 * Sort + page state lives here (route-local) — the parent only owns the
 * source data + the filtered slice.
 */

type SortKey = 'slug' | 'plan' | 'mrr' | 'bookings_30d' | 'last_booking_at' | 'created_at'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

export function TenantTable({
  rows, myTenantId, trendByTenant, onDelete, emptyMessage,
}: {
  rows:          AdminTenantRow[]
  myTenantId:    string | null
  trendByTenant: Map<string, AdminTenantTrendRow>
  onDelete:      (t: AdminTenantRow) => void
  emptyMessage?: string
}) {
  const [sortKey, setSortKey] = useState<SortKey>('bookings_30d')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page,    setPage]    = useState(0)

  const sorted = useMemo(() => {
    // Resolve every sort field through the trends map (with sane fallbacks)
    // so a tenant missing snapshot data sorts predictably to the bottom.
    function key(t: AdminTenantRow): number | string {
      const tr = trendByTenant.get(t.id)
      switch (sortKey) {
        case 'slug':            return t.id
        case 'plan':            return t.plan ?? 'zzz'
        case 'mrr':             return tr?.mrr_cents ?? 0
        case 'bookings_30d':    return tr?.bookings_30d ?? -1
        case 'last_booking_at': return tr?.last_booking_at ? new Date(tr.last_booking_at).getTime() : 0
        case 'created_at':      return t.created_at ? new Date(t.created_at).getTime() : 0
      }
    }
    const copy = rows.slice()
    copy.sort((a, b) => {
      const ka = key(a), kb = key(b)
      let cmp: number
      if (typeof ka === 'number' && typeof kb === 'number') cmp = ka - kb
      else cmp = String(ka).localeCompare(String(kb))
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, trendByTenant, sortKey, sortDir])

  // If the source list shrinks past the current page, snap back.
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage  = Math.min(page, pageCount - 1)
  const start = safePage * PAGE_SIZE
  const visible = sorted.slice(start, start + PAGE_SIZE)

  function clickHeader(k: SortKey) {
    if (k === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(k)
      // Sensible defaults per column: text asc, numeric/dates desc.
      setSortDir(k === 'slug' || k === 'plan' ? 'asc' : 'desc')
    }
    setPage(0)
  }

  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-[12px] text-muted-text">
          {emptyMessage ?? 'No tenants. (How are you even reading this?)'}
        </p>
      </Card>
    )
  }

  return (
    <>
      <div className="bg-white border border-[rgba(18,18,18,0.10)] overflow-x-auto">
        <table className="w-full text-[12px] min-w-[820px]">
          <thead className="sticky top-0 z-10 bg-cream">
            <tr className="border-b border-[rgba(18,18,18,0.08)]">
              <SortableTh label="Slug" k="slug" sortKey={sortKey} sortDir={sortDir} onClick={clickHeader} />
              <Th>Owner</Th>
              <SortableTh label="Plan" k="plan" sortKey={sortKey} sortDir={sortDir} onClick={clickHeader} />
              <SortableTh label="MRR" k="mrr" sortKey={sortKey} sortDir={sortDir} onClick={clickHeader} className="text-right" />
              <SortableTh label="Bookings 30d" k="bookings_30d" sortKey={sortKey} sortDir={sortDir} onClick={clickHeader} className="text-right" />
              <SortableTh label="Last booking" k="last_booking_at" sortKey={sortKey} sortDir={sortDir} onClick={clickHeader} />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map(t => {
              const isMine = myTenantId === t.id
              const tr = trendByTenant.get(t.id)
              return (
                <tr key={t.id} className="border-b border-[rgba(18,18,18,0.06)] last:border-b-0 hover:bg-cream/30">
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <Link
                        href={`/admin/tenants/${t.id}`}
                        className="text-near-black font-semibold hover:underline"
                      >
                        {t.id}
                      </Link>
                      <a
                        href={`https://${t.id}.bkrdy.me`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open public site"
                        className="text-muted-text hover:text-near-black"
                      >
                        <ExternalLink size={10} />
                      </a>
                    </span>
                    <p className="text-[10px] text-muted-text mt-0.5">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                    </p>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      <p className="text-near-black truncate">{t.owner_name ?? '—'}</p>
                      <p className="text-muted-text truncate">{t.owner_email ?? '—'}</p>
                    </div>
                  </Td>
                  <Td>
                    <span className="capitalize">{t.plan ?? '—'}</span>
                    {tr?.state && tr.state !== 'active' && (
                      <span className="block text-[10px] text-muted-text capitalize">{tr.state}</span>
                    )}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {tr ? (tr.mrr_cents > 0 ? '$' + Math.round(tr.mrr_cents / 100) : '—') : '—'}
                  </Td>
                  <Td className="text-right tabular-nums">
                    {tr ? (tr.bookings_30d > 0 ? tr.bookings_30d.toLocaleString() : '—') : '…'}
                  </Td>
                  <Td className="text-muted-text">
                    {tr ? relTime(tr.last_booking_at) : '…'}
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(t)}
                      disabled={isMine}
                      title={isMine ? "Can't delete the tenant you're signed in as." : 'Delete tenant'}
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] border px-2.5 py-1.5',
                        isMine
                          ? 'border-[rgba(18,18,18,0.10)] bg-cream text-muted-text cursor-not-allowed'
                          : 'border-[rgba(180,40,40,0.40)] bg-white text-[#b42828] hover:bg-[rgba(180,40,40,0.05)]',
                      )}
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </Td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <p className="text-[11px] text-muted-text">
            Showing <strong className="text-near-black">{start + 1}</strong>–
            <strong className="text-near-black">{Math.min(start + PAGE_SIZE, sorted.length)}</strong>
            {' '}of <strong className="text-near-black">{sorted.length.toLocaleString()}</strong>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:border-near-black"
            >
              <ChevronLeft size={12} /> Prev
            </button>
            <span className="text-[11px] text-muted-text px-2 tabular-nums">
              Page {safePage + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:border-near-black"
            >
              Next <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function SortableTh({
  label, k, sortKey, sortDir, onClick, className,
}: {
  label:   string
  k:       SortKey
  sortKey: SortKey
  sortDir: SortDir
  onClick: (k: SortKey) => void
  className?: string
}) {
  const active = k === sortKey
  return (
    <Th
      onClick={() => onClick(k)}
      ariaSort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('text-left', className)}
    >
      <span className={cn('inline-flex items-center gap-1', className?.includes('text-right') && 'flex-row-reverse')}>
        {label}
        {active && (sortDir === 'asc'
          ? <ChevronUp size={10} className="text-near-black" />
          : <ChevronDown size={10} className="text-near-black" />)}
      </span>
    </Th>
  )
}
