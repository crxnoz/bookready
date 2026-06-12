'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2, Mail } from 'lucide-react'
import { getCurrentUser, switchTenant, getPendingInvites, acceptInvite } from '@/lib/api'
import type { LinkedTenant, PendingInvite } from '@/lib/types'
import { cn } from '@/lib/cn'

/**
 * v2 Theme 1 — sidebar tenant switcher + invite inbox.
 *
 * Top of the editor sidebar. Three rendering modes:
 *
 *   1. Single-tenant, no pending invites → static "Working at: X" label.
 *   2. Multi-tenant → inline dropdown listing every linked tenant +
 *      an "Email us" overflow link for cap exceptions.
 *   3. Pending invites present → adds an "Invites" section at the top
 *      of the dropdown with an Accept button per row. Accepting drops
 *      the invite and refreshes the linked-tenants list so the new
 *      business appears for switching.
 *
 * The badge on the main button counts pending invites; clicking the
 * button always opens the dropdown even when there's only one tenant,
 * so an invitee with a single tenant + pending invite has somewhere to
 * accept from.
 *
 * No floating UI — inline expansion matches the rest of the BookReady
 * editor and avoids absolute-positioning edge cases inside the scroll
 * container.
 */
export default function TenantSwitcher() {
  const [tenants,    setTenants]    = useState<LinkedTenant[]>([])
  const [invites,    setInvites]    = useState<PendingInvite[]>([])
  const [loading,    setLoading]    = useState(true)
  const [open,       setOpen]       = useState(false)
  const [switching,  setSwitching]  = useState<string | null>(null)
  const [accepting,  setAccepting]  = useState<number | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  async function loadAll() {
    try {
      const [user, inviteRes] = await Promise.all([
        getCurrentUser(),
        getPendingInvites().catch(() => ({ invites: [] as PendingInvite[] })),
      ])
      setTenants(user.linked_tenants ?? [])
      setInvites(inviteRes.invites ?? [])
    } catch {
      setTenants([])
      setInvites([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [])

  // While loading + when the user has no linked tenants AND no invites
  // (legacy session pre-deploy, or an unauthed render that got this
  // far), render nothing. The sidebar still works; it just doesn't
  // show the indicator.
  if (loading || (tenants.length === 0 && invites.length === 0)) return null

  const current = tenants.find(t => t.is_current) ?? tenants[0] ?? null
  const others  = current ? tenants.filter(t => t.tenant_id !== current.tenant_id) : []
  const hasDropdownContent = others.length > 0 || invites.length > 0

  // Single-tenant, no invites: static label.
  if (! hasDropdownContent && current) {
    return (
      <div className="px-4 py-3 border-b border-hairline-soft">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Working at</p>
        <p className="text-sm font-semibold text-near-black mt-0.5 truncate">{current.business_name}</p>
        <p className="text-2xs text-muted-text mt-0.5">{tierLabel(current.plan)}{current.role === 'staff' ? ' · Staff' : ''}</p>
      </div>
    )
  }

  async function handleSwitch(target: LinkedTenant) {
    if (switching || target.is_current) return
    setSwitching(target.tenant_id)
    try {
      await switchTenant(target.tenant_id)
      window.location.href = '/editor'
    } catch {
      setSwitching(null)
    }
  }

  async function handleAccept(invite: PendingInvite) {
    if (accepting !== null) return
    setAccepting(invite.id)
    setError(null)
    try {
      await acceptInvite(invite.id)
      // Refresh the dropdown — the new tenant should now appear in
      // linked_tenants and the invite should be gone from pending.
      await loadAll()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept this invite.')
      setAccepting(null)
    } finally {
      setAccepting(null)
    }
  }

  const inviteCount = invites.length

  return (
    <div className="border-b border-hairline-soft">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full text-left px-4 py-3 hover:bg-cream/40 transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Working at</p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm font-semibold text-near-black truncate">
            {current?.business_name ?? 'Signed in'}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {inviteCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 bg-blush text-near-black text-[10px] font-bold">
                {inviteCount}
              </span>
            )}
            <ChevronDown
              size={13}
              className={cn(
                'text-muted-text transition-transform',
                open && 'rotate-180',
              )}
            />
          </div>
        </div>
        {current && (
          <p className="text-2xs text-muted-text mt-0.5">
            {tierLabel(current.plan)}{current.role === 'staff' ? ' · Staff' : ''} · {tenants.length} business{tenants.length === 1 ? '' : 'es'}
            {inviteCount > 0 && ` · ${inviteCount} new invite${inviteCount === 1 ? '' : 's'}`}
          </p>
        )}
      </button>

      {open && (
        <div className="bg-cream/30 border-t border-hairline-soft">
          {/* Pending invites — render above linked tenants so they
              dominate the visual hierarchy when present. */}
          {invites.length > 0 && (
            <>
              <p className="px-4 py-2 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text bg-cream/60">
                Pending invites
              </p>
              <ul className="divide-y divide-[rgba(18,18,18,0.06)]">
                {invites.map(inv => {
                  const isAccepting = accepting === inv.id
                  const anyAccepting = accepting !== null
                  return (
                    <li key={inv.id} className="px-4 py-2.5 bg-cream/40">
                      <div className="flex items-start gap-2">
                        <Mail size={11} className="text-near-black mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-near-black truncate">{inv.business_name}</p>
                          <p className="text-2xs text-muted-text">Invited you as staff</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAccept(inv)}
                        disabled={anyAccepting}
                        className="w-full mt-2 inline-flex items-center justify-center gap-1.5 bg-near-black text-white text-2xs font-semibold tracking-[0.04em] py-1.5 hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors"
                      >
                        {isAccepting
                          ? <><Loader2 size={11} className="animate-spin" /> Accepting…</>
                          : 'Accept invite'}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {error && (
                <p className="px-4 py-2 text-2xs text-danger bg-danger-bg border-t border-danger/20">
                  {error}
                </p>
              )}
            </>
          )}

          {/* Linked tenants — anything besides the current one. */}
          {others.length > 0 && (
            <>
              {invites.length > 0 && (
                <p className="px-4 py-2 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text bg-cream/60 border-t border-hairline-soft">
                  Switch business
                </p>
              )}
              <ul className="divide-y divide-[rgba(18,18,18,0.06)]">
                {others.map(t => {
                  const isSwitching = switching === t.tenant_id
                  const anySwitching = switching !== null
                  return (
                    <li key={t.tenant_id}>
                      <button
                        type="button"
                        onClick={() => handleSwitch(t)}
                        disabled={anySwitching}
                        className="w-full text-left px-4 py-2.5 hover:bg-cream/60 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-near-black truncate">{t.business_name}</p>
                          <p className="text-2xs text-muted-text">
                            {tierLabel(t.plan)}{t.role === 'staff' ? ' · Staff' : ''}
                          </p>
                        </div>
                        {isSwitching && <Loader2 size={12} className="animate-spin text-muted-text flex-shrink-0" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}

          <a
            href="mailto:hello@mybookready.com?subject=Need%20access%20to%20another%20business"
            className="block px-4 py-2.5 text-2xs text-muted-text border-t border-hairline-soft hover:bg-cream/60 transition-colors"
          >
            Need access to another business? <span className="font-semibold text-near-black">Email us</span>
          </a>
        </div>
      )}
    </div>
  )
}

function tierLabel(plan: LinkedTenant['plan']): string {
  if (plan === 'studio') return 'Studio'
  if (plan === 'salon')  return 'Salon'
  return 'Solo'
}
