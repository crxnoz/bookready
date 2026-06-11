'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

/**
 * Wave D — the signed-in user's role + staff_id, resolved once by the
 * EditorGuard's /auth/me call and shared down the editor tree. Lets the
 * sidebar, shell, and pages branch between the full owner editor and the
 * scoped staff view without each re-fetching /auth/me.
 *
 * Defaults to 'owner' (the pre-Wave-D behavior) when read outside a
 * provider — fail toward the existing experience, never accidentally
 * hide owner chrome.
 */

export interface RoleContextValue {
  role:    'owner' | 'staff' | 'admin'
  staffId: number | null
  isStaff: boolean
}

const FALLBACK: RoleContextValue = { role: 'owner', staffId: null, isStaff: false }

const RoleContext = createContext<RoleContextValue>(FALLBACK)

export function RoleProvider({
  role,
  staffId,
  children,
}: {
  role:    'owner' | 'staff' | 'admin'
  staffId: number | null
  children: ReactNode
}) {
  const value: RoleContextValue = {
    role,
    staffId,
    isStaff: role === 'staff',
  }
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole(): RoleContextValue {
  return useContext(RoleContext)
}
