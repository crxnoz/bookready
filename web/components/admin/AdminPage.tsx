'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertCircle, Loader2, ShieldAlert, Trash2, RefreshCw, LogOut, ExternalLink,
} from 'lucide-react'
import { getCurrentUser, getAdminTenants, deleteAdminTenant } from '@/lib/api'
import { getToken, clearAuth } from '@/lib/auth'
import type { AdminTenantRow, AuthUser } from '@/lib/types'
import { cn } from '@/lib/cn'

type LoadState = 'loading' | 'ready' | 'denied' | 'login_required'

export default function AdminPage() {
  const router = useRouter()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [me,        setMe]        = useState<AuthUser | null>(null)
  const [tenants,   setTenants]   = useState<AdminTenantRow[]>([])
  const [loadErr,   setLoadErr]   = useState<string | null>(null)

  const [confirmTarget, setConfirmTarget] = useState<AdminTenantRow | null>(null)

  async function loadTenants() {
    try {
      const res = await getAdminTenants()
      setTenants(res.tenants)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Could not load tenants')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (! getToken()) {
        if (! cancelled) setLoadState('login_required')
        return
      }
      try {
        const user = await getCurrentUser()
        if (cancelled) return
        setMe(user)
        if (! user.is_admin) {
          setLoadState('denied')
          return
        }
        await loadTenants()
        if (! cancelled) setLoadState('ready')
      } catch (e) {
        if (cancelled) return
        // 401 → token invalid; otherwise generic error.
        setLoadErr(e instanceof Error ? e.message : 'Failed to load')
        setLoadState('denied')
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  function signOut() {
    clearAuth()
    router.push('/login')
  }

  if (loadState === 'loading') {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-10">
          <Loader2 size={14} className="animate-spin" /> Loading admin…
        </div>
      </Shell>
    )
  }

  if (loadState === 'login_required') {
    return (
      <Shell>
        <Card>
          <h1 className="text-base font-bold text-near-black mb-2">Sign in required</h1>
          <p className="text-[13px] text-muted-text mb-4">
            You need to be signed in as a BookReady platform admin to view this page.
          </p>
          <a
            href="/login?next=/admin"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2"
          >
            Go to Sign In
          </a>
        </Card>
      </Shell>
    )
  }

  if (loadState === 'denied') {
    return (
      <Shell signedInAs={me?.email}>
        <Card tone="warn">
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="text-[#8a5a00] flex-shrink-0 mt-0.5" />
            <div>
              <h1 className="text-base font-bold text-near-black mb-1">Admin access required</h1>
              <p className="text-[13px] text-muted-text">
                Your account doesn&rsquo;t have BookReady admin privileges. If this is a
                mistake, ask another admin to flip the is_admin flag on your user.
              </p>
              {loadErr && (
                <p className="text-[11px] text-[#b42828] mt-2 inline-flex items-center gap-1">
                  <AlertCircle size={11} /> {loadErr}
                </p>
              )}
            </div>
          </div>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell signedInAs={me?.email} onSignOut={signOut}>
      <header className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h1 className="text-xl font-bold text-near-black tracking-tight">Tenants</h1>
          <p className="text-xs text-muted-text">
            {tenants.length} tenant{tenants.length === 1 ? '' : 's'} on BookReady. Click delete to drop a test tenant.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadTenants()}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </header>

      {loadErr && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {loadErr}
        </div>
      )}

      <TenantTable
        rows={tenants}
        myTenantId={me?.tenant_id ?? null}
        onDelete={(t) => setConfirmTarget(t)}
      />

      {confirmTarget && (
        <DeleteDialog
          tenant={confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onDeleted={async () => {
            setConfirmTarget(null)
            await loadTenants()
          }}
        />
      )}
    </Shell>
  )
}

// ── Table ───────────────────────────────────────────────────────────────────

function TenantTable({
  rows, myTenantId, onDelete,
}: {
  rows:        AdminTenantRow[]
  myTenantId:  string | null
  onDelete:    (t: AdminTenantRow) => void
}) {
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-[12px] text-muted-text">No tenants. (How are you even reading this?)</p>
      </Card>
    )
  }
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] overflow-x-auto">
      <table className="w-full text-[12px] min-w-[640px]">
        <thead>
          <tr className="border-b border-[rgba(18,18,18,0.08)] bg-cream">
            <Th>Slug</Th>
            <Th>Owner</Th>
            <Th>Created</Th>
            <Th>Plan</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => {
            const isMine = myTenantId === t.id
            return (
              <tr key={t.id} className="border-b border-[rgba(18,18,18,0.06)] last:border-b-0">
                <Td>
                  <a
                    href={`https://${t.id}.bkrdy.me`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-near-black font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    {t.id} <ExternalLink size={10} className="text-muted-text" />
                  </a>
                </Td>
                <Td>
                  <div className="min-w-0">
                    <p className="text-near-black truncate">{t.owner_name ?? '—'}</p>
                    <p className="text-muted-text truncate">{t.owner_email ?? '—'}</p>
                  </div>
                </Td>
                <Td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}</Td>
                <Td>{t.plan ?? '—'}</Td>
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
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cn('text-left px-3 py-2 text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text', className)}>
      {children}
    </th>
  )
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5 align-top', className)}>{children}</td>
}

// ── Delete dialog ───────────────────────────────────────────────────────────

function DeleteDialog({
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

// ── Shell ───────────────────────────────────────────────────────────────────

function Shell({
  children, signedInAs, onSignOut,
}: {
  children:    React.ReactNode
  signedInAs?: string
  onSignOut?:  () => void
}) {
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-[rgba(18,18,18,0.10)] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-near-black">BookReady</p>
            <p className="text-[11px] text-muted-text">Platform admin</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {signedInAs && <span className="text-[11px] text-muted-text hidden sm:inline">{signedInAs}</span>}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="text-[11px] font-semibold tracking-tight text-muted-text hover:text-near-black inline-flex items-center gap-1"
            >
              <LogOut size={11} /> Sign out
            </button>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-5 md:p-6">
        {children}
      </main>
    </div>
  )
}

function Card({ children, tone }: { children: React.ReactNode; tone?: 'warn' }) {
  return (
    <section className={cn(
      'bg-white border p-5',
      tone === 'warn' ? 'border-[rgba(180,120,0,0.30)]' : 'border-[rgba(18,18,18,0.10)]',
    )}>
      {children}
    </section>
  )
}
