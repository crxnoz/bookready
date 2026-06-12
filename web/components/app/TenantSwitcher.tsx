'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { getCurrentUser, switchTenant } from '@/lib/api'
import type { LinkedTenant } from '@/lib/types'
import { cn } from '@/lib/cn'

/**
 * v2 Theme 1 — sidebar tenant switcher.
 *
 * Renders the "Working at: {tenant}" indicator at the top of the
 * editor sidebar. When the identity is linked to more than one
 * tenant (the chair-renter case), an inline dropdown reveals the
 * other businesses and an "Email us" overflow link for the cap
 * exception path. When the identity is single-tenant or the
 * /auth/me payload pre-dates the multi-tenant rollout, the
 * dropdown collapses to a static label.
 *
 * No floating UI on purpose — the inline expansion pattern matches
 * the rest of the BookReady editor and avoids absolute-positioning
 * edge cases inside the scroll container.
 */
export default function TenantSwitcher() {
  const [tenants,   setTenants]   = useState<LinkedTenant[]>([])
  const [loading,   setLoading]   = useState(true)
  const [open,      setOpen]      = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCurrentUser()
      .then(u => { if (! cancelled) setTenants(u.linked_tenants ?? []) })
      .catch(() => { if (! cancelled) setTenants([]) })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // While loading + when the user has no linked_tenants payload at all
  // (legacy session pre-deploy), render nothing. The sidebar still works;
  // it just doesn't show the indicator.
  if (loading || tenants.length === 0) return null

  const current = tenants.find(t => t.is_current) ?? tenants[0]
  const others  = tenants.filter(t => t.tenant_id !== current.tenant_id)

  // Single-tenant case: static label, no dropdown. Useful for clarity
  // even when there's nothing to switch — at a glance the staff member
  // can confirm which business they're in.
  if (others.length === 0) {
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
      // Hard reload so EditorContext + RoleContext rebind to the new
      // tenant_id. A soft router.replace would leave React state
      // stale on the previous tenant's payload.
      window.location.href = '/editor'
    } catch {
      setSwitching(null)
    }
  }

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
          <p className="text-sm font-semibold text-near-black truncate">{current.business_name}</p>
          <ChevronDown
            size={13}
            className={cn(
              'text-muted-text flex-shrink-0 transition-transform',
              open && 'rotate-180',
            )}
          />
        </div>
        <p className="text-2xs text-muted-text mt-0.5">
          {tierLabel(current.plan)}{current.role === 'staff' ? ' · Staff' : ''} · {tenants.length} businesses
        </p>
      </button>

      {open && (
        <div className="bg-cream/30 border-t border-hairline-soft">
          <ul className="divide-y divide-[rgba(18,18,18,0.06)]">
            {others.map(t => {
              const isSwitching = switching === t.tenant_id
              const isAnySwitching = switching !== null
              return (
                <li key={t.tenant_id}>
                  <button
                    type="button"
                    onClick={() => handleSwitch(t)}
                    disabled={isAnySwitching}
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
