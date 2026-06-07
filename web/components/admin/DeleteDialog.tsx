'use client'

import { useState } from 'react'
import { AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { deleteAdminTenant } from '@/lib/api'
import type { AdminTenantRow } from '@/lib/types'
import { cn } from '@/lib/cn'

/**
 * Confirmation dialog for dropping a tenant DB + owner + R2 uploads.
 * Requires typing the slug to enable the destructive button.
 */
export function DeleteDialog({
  tenant, onClose, onDeleted,
}: {
  tenant:    AdminTenantRow
  onClose:   () => void
  onDeleted: () => void
}) {
  const [typed,  setTyped]  = useState('')
  const [busy,   setBusy]   = useState(false)
  const [error,  setError]  = useState<string | null>(null)
  const matches = typed === tenant.id

  async function doDelete() {
    if (! matches) return
    setBusy(true); setError(null)
    try {
      await deleteAdminTenant(tenant.id, tenant.id)
      onDeleted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white border border-[rgba(18,18,18,0.15)] w-full max-w-md">
        <header className="px-4 py-3 border-b border-[rgba(18,18,18,0.08)]">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#b42828]">Danger zone</p>
          <h2 className="text-base font-bold text-near-black mt-1">Delete tenant</h2>
        </header>
        <div className="px-4 py-4 space-y-3">
          <p className="text-[13px] text-near-black">
            This drops the tenant database, removes the owner account, and clears
            their uploaded files from R2.
          </p>
          <p className="text-[12px] text-muted-text">
            Tenant: <strong className="text-near-black">{tenant.id}</strong>
            {tenant.owner_email && <> &middot; Owner: <strong className="text-near-black">{tenant.owner_email}</strong></>}
          </p>
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
              Type the slug to confirm
            </span>
            <input
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder={tenant.id}
              autoFocus
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black font-mono focus:outline-none focus:border-near-black"
            />
          </label>
          {error && (
            <p className="text-[11px] text-[#b42828] inline-flex items-center gap-1">
              <AlertCircle size={11} /> {error}
            </p>
          )}
        </div>
        <footer className="px-4 py-3 border-t border-[rgba(18,18,18,0.08)] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={doDelete}
            disabled={! matches || busy}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2 border',
              matches
                ? 'bg-[#b42828] border-[#b42828] text-white hover:bg-[#9a1f1f]'
                : 'bg-cream border-[rgba(18,18,18,0.10)] text-muted-text cursor-not-allowed',
            )}
          >
            {busy
              ? <><Loader2 size={11} className="animate-spin" /> Deleting</>
              : <><Trash2 size={11} /> Delete tenant</>}
          </button>
        </footer>
      </div>
    </div>
  )
}
