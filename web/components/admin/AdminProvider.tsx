'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  getCurrentUser, getAdminTenants,
  getAdminDashboardSummary, getAdminDashboardTrends,
  getAdminDashboardInsights, getAdminDashboardHealth, getAdminHealthSparklines,
  type AdminDashboardSummary, type AdminDashboardTrends,
  type AdminDashboardInsights, type AdminDashboardHealth, type AdminHealthSparklines,
  type AdminTenantTrendRow,
} from '@/lib/api'
import { isLoggedIn } from '@/lib/auth'
import type { AdminTenantRow, AuthUser } from '@/lib/types'

/**
 * Single source of truth for the admin dashboard.
 *
 * Replaces the per-component fetches each Phase-1/2/3 widget used to do
 * on its own. One reason: the user-facing "Refresh" button now actually
 * refreshes everything in one click, and "last refreshed Xs ago" is a
 * single timestamp the whole page agrees on.
 *
 * Each endpoint has its own loading / error slot so a slow probe doesn't
 * block the rest of the page rendering — the layout shows everything that
 * has landed and spinners where it hasn't.
 *
 * Auth + tenant identity is also owned here so layout-level guards can
 * gate the whole admin tree without each route re-running /auth/me.
 */

export type AdminAuthState = 'loading' | 'ready' | 'denied' | 'login_required'

interface Slot<T> {
  data:    T | null
  loading: boolean
  error:   string | null
}

interface AdminCtx {
  // Auth
  auth:      AdminAuthState
  me:        AuthUser | null
  authError: string | null

  // Data slots
  summary:    Slot<AdminDashboardSummary>
  trends:     Slot<AdminDashboardTrends>
  insights:   Slot<AdminDashboardInsights>
  health:     Slot<AdminDashboardHealth>
  sparklines: Slot<AdminHealthSparklines>
  tenants:    Slot<AdminTenantRow[]>

  // Per-tenant snapshot lookup (derived from trends.data.tenants).
  trendByTenant: Map<string, AdminTenantTrendRow>

  // Global refresh state
  refreshing:    boolean
  lastRefreshAt: number | null
  refreshAll:    () => Promise<void>
  refreshTenants: () => Promise<void>   // used after delete
}

const Ctx = createContext<AdminCtx | null>(null)

function emptySlot<T>(): Slot<T> { return { data: null, loading: true, error: null } }

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [auth,      setAuth]      = useState<AdminAuthState>('loading')
  const [me,        setMe]        = useState<AuthUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const [summary,    setSummary]    = useState<Slot<AdminDashboardSummary>>(emptySlot())
  const [trends,     setTrends]     = useState<Slot<AdminDashboardTrends>>(emptySlot())
  const [insights,   setInsights]   = useState<Slot<AdminDashboardInsights>>(emptySlot())
  const [health,     setHealth]     = useState<Slot<AdminDashboardHealth>>(emptySlot())
  const [sparklines, setSparklines] = useState<Slot<AdminHealthSparklines>>(emptySlot())
  const [tenants,    setTenants]    = useState<Slot<AdminTenantRow[]>>(emptySlot())

  const [refreshing,    setRefreshing]    = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null)

  // Track in-flight to avoid duplicate clicks racing.
  const inFlight = useRef(false)

  const trendByTenant = useMemo(() => {
    const m = new Map<string, AdminTenantTrendRow>()
    for (const r of trends.data?.tenants ?? []) m.set(r.id, r)
    return m
  }, [trends.data])

  // Generic loader for one slot — keeps stale data visible while refetching
  // (no flash) and only flips loading when the slot is empty.
  async function loadSlot<T>(
    fn: () => Promise<T>,
    setter: React.Dispatch<React.SetStateAction<Slot<T>>>,
    isInitial: boolean,
  ) {
    setter(prev => ({ data: prev.data, loading: isInitial && prev.data === null, error: null }))
    try {
      const data = await fn()
      setter({ data, loading: false, error: null })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load'
      setter(prev => ({ data: prev.data, loading: false, error: msg }))
    }
  }

  const refreshTenants = useCallback(async () => {
    await loadSlot(async () => (await getAdminTenants()).tenants, setTenants, false)
  }, [])

  const refreshAll = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    try {
      // Fire all 6 endpoints in parallel — they're independent.
      await Promise.all([
        loadSlot(() => getAdminDashboardSummary(),  setSummary,    false),
        loadSlot(() => getAdminDashboardTrends(),   setTrends,     false),
        loadSlot(() => getAdminDashboardInsights(), setInsights,   false),
        loadSlot(() => getAdminDashboardHealth(),   setHealth,     false),
        loadSlot(() => getAdminHealthSparklines(),  setSparklines, false),
        loadSlot(async () => (await getAdminTenants()).tenants, setTenants, false),
      ])
      setLastRefreshAt(Date.now())
    } finally {
      setRefreshing(false)
      inFlight.current = false
    }
  }, [])

  // Auth gate + initial load.
  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (! isLoggedIn()) {
        if (! cancelled) setAuth('login_required')
        return
      }
      try {
        const user = await getCurrentUser()
        if (cancelled) return
        setMe(user)
        if (! user.is_admin) {
          setAuth('denied')
          return
        }
        setAuth('ready')
        // Initial fetch: tenants first (table is most-asked-for above the
        // fold on /admin/tenants), then the four widgets in parallel.
        await loadSlot(async () => (await getAdminTenants()).tenants, setTenants, true)
        if (cancelled) return
        await Promise.all([
          loadSlot(() => getAdminDashboardSummary(),  setSummary,    true),
          loadSlot(() => getAdminDashboardTrends(),   setTrends,     true),
          loadSlot(() => getAdminDashboardInsights(), setInsights,   true),
          loadSlot(() => getAdminDashboardHealth(),   setHealth,     true),
          loadSlot(() => getAdminHealthSparklines(),  setSparklines, true),
        ])
        if (! cancelled) setLastRefreshAt(Date.now())
      } catch (e) {
        if (cancelled) return
        setAuthError(e instanceof Error ? e.message : 'Failed to load')
        setAuth('denied')
      }
    }
    boot()
    return () => { cancelled = true }
  }, [])

  const value: AdminCtx = {
    auth, me, authError,
    summary, trends, insights, health, sparklines, tenants,
    trendByTenant,
    refreshing, lastRefreshAt,
    refreshAll, refreshTenants,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAdmin(): AdminCtx {
  const v = useContext(Ctx)
  if (! v) throw new Error('useAdmin must be used inside <AdminProvider>')
  return v
}
