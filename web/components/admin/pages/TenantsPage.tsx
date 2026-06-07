'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'
import { AdminShell } from '../AdminShell'
import { useAdmin } from '../AdminProvider'
import { TenantTable } from '../TenantTable'
import { DeleteDialog } from '../DeleteDialog'
import type { AdminTenantRow } from '@/lib/types'

/**
 * /admin/tenants — the full tenant list with search, sort, and pagination.
 *
 * Search stays client-side: at our scale (hundreds to a few thousand
 * rows) a simple string-contains filter beats the round-trip cost of a
 * server `?q=` search, and the user gets instant feedback. We'll move
 * to server-side when the central table genuinely hurts.
 */
export default function TenantsPage() {
  const { me, tenants, trendByTenant, refreshTenants } = useAdmin()
  const [query, setQuery] = useState('')
  const [confirmTarget, setConfirmTarget] = useState<AdminTenantRow | null>(null)

  const rows = tenants.data ?? []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '') return rows
    return rows.filter(t =>
      t.id.toLowerCase().includes(q) ||
      (t.owner_name?.toLowerCase().includes(q) ?? false) ||
      (t.owner_email?.toLowerCase().includes(q) ?? false) ||
      (t.plan?.toLowerCase().includes(q) ?? false) ||
      (t.domain?.toLowerCase().includes(q) ?? false)
    )
  }, [rows, query])

  return (
    <AdminShell tab="tenants">
      <header className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-near-black tracking-tight">Tenants</h1>
          <p className="text-xs text-muted-text">
            {query.trim() === ''
              ? <>{rows.length.toLocaleString()} tenant{rows.length === 1 ? '' : 's'} on BookReady. Click a slug to drill in.</>
              : <>Showing {filtered.length.toLocaleString()} of {rows.length.toLocaleString()}.</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search slug, owner, email, plan…"
            className="bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-[12px] text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black w-64"
          />
          {query.trim() !== '' && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Clear search"
              className="w-8 h-8 inline-flex items-center justify-center border border-[rgba(18,18,18,0.15)] bg-white text-near-black hover:border-near-black"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </header>

      {tenants.error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {tenants.error}
        </div>
      )}

      {tenants.loading && rows.length === 0 ? (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Loading tenants…
        </div>
      ) : (
        <TenantTable
          rows={filtered}
          myTenantId={me?.tenant_id ?? null}
          trendByTenant={trendByTenant}
          onDelete={(t) => setConfirmTarget(t)}
          emptyMessage={query.trim() !== '' ? `No tenants match "${query.trim()}".` : undefined}
        />
      )}

      {confirmTarget && (
        <DeleteDialog
          tenant={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onDeleted={async () => {
            setConfirmTarget(null)
            await refreshTenants()
          }}
        />
      )}
    </AdminShell>
  )
}
