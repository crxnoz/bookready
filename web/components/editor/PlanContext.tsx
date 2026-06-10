'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { request } from '@/lib/api'

/**
 * Frontend mirror of the backend PlanFeatures snapshot.
 *
 * Wraps every editor surface so any component can branch on the
 * tenant's plan via `usePlan()`. The backend single source of truth
 * lives in api/app/Services/PlanFeatures.php — if you add a key to the
 * snapshot there, add it here too.
 *
 * Loading + missing-context handling:
 *   - During the initial fetch, `loading === true` and every predicate
 *     returns the Solo (most-restricted) value. Gates that hide team
 *     features will hide them briefly during mount — that's the
 *     correct fail-closed behavior. Don't show team features to a
 *     Solo owner because the fetch is slow.
 *   - When called outside PlanProvider, the same Solo-default fallback
 *     fires and a console.warn flags the missing provider. Defensive
 *     so we never accidentally unlock features.
 */

export interface PlanSnapshot {
  plan:                 'solo' | 'studio' | 'salon' | string
  plan_label:           string
  staff_seats:          number
  /** 'solo' renders the "your day" surface; 'team' renders the team grid. */
  dashboard_surface:    'solo' | 'team'
  allows_custom_domain: boolean
}

interface PlanContextValue {
  /** Snapshot from the API, or null during the initial load. */
  plan:    PlanSnapshot | null
  loading: boolean
  /** Convenience predicates so callers don't reach into snapshot. */
  isSolo():            boolean
  isStudio():          boolean
  isSalon():           boolean
  staffSeatsLimit():   number
  dashboardSurface():  'solo' | 'team'
  allowsCustomDomain(): boolean
}

const PlanContext = createContext<PlanContextValue | null>(null)

/**
 * Solo-default fallback. Used both during the initial load and when
 * usePlan() is called outside a PlanProvider. Errs toward fewer
 * features — the wrong direction would unlock paid features
 * accidentally.
 */
const SOLO_FALLBACK: PlanContextValue = {
  plan:    null,
  loading: true,
  isSolo:              () => true,
  isStudio:            () => false,
  isSalon:             () => false,
  staffSeatsLimit:     () => 1,
  dashboardSurface:    () => 'solo',
  allowsCustomDomain:  () => false,
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan,    setPlan]    = useState<PlanSnapshot | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    request<PlanSnapshot>('/editor/plan/features')
      .then(d => { if (! cancelled) setPlan(d) })
      .catch(() => {
        // Network/auth error — keep loading=false so the editor renders
        // with the Solo fallback. Better to under-feature than crash.
        if (! cancelled) setPlan(null)
      })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const value: PlanContextValue = plan
    ? {
        plan,
        loading,
        isSolo:             () => plan.plan === 'solo',
        isStudio:           () => plan.plan === 'studio',
        isSalon:            () => plan.plan === 'salon',
        staffSeatsLimit:    () => plan.staff_seats,
        dashboardSurface:   () => plan.dashboard_surface,
        allowsCustomDomain: () => plan.allows_custom_domain,
      }
    : { ...SOLO_FALLBACK, loading }

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (! ctx) {
    // Outside a PlanProvider — log once so developers notice during
    // local development, then return the safe Solo default so we
    // never accidentally unlock features.
    if (typeof window !== 'undefined' && ! (window as unknown as { __planContextWarned?: boolean }).__planContextWarned) {
      // eslint-disable-next-line no-console
      console.warn('usePlan() called outside PlanProvider — falling back to Solo defaults. Wrap the editor route with <PlanProvider>.')
      ;(window as unknown as { __planContextWarned?: boolean }).__planContextWarned = true
    }
    return SOLO_FALLBACK
  }
  return ctx
}
