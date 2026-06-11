'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { isLoggedIn, clearAuth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/api'
import AppShell from '@/components/app/AppShell'
import { RoleProvider } from '@/components/app/RoleContext'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import { staffCanAccess } from '@/lib/editorNav'

export default function EditorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [slug, setSlug] = useState<string | null>(null)
  // Wave D — resolved role + staff_id from /auth/me, shared via RoleProvider.
  const [role, setRole]       = useState<'owner' | 'staff' | 'admin'>('owner')
  const [staffId, setStaffId] = useState<number | null>(null)

  useEffect(() => {
    // Phase S6 — session auth is now cookie-based. We can't read the
    // httpOnly cookie from JS, so the guard checks the "br_authed"
    // sentinel flag (set after a successful login/register/exchange)
    // and verifies with /auth/me. If /auth/me 401s, the cookie is
    // missing or expired → bounce to /login.
    if (! isLoggedIn()) {
      router.replace('/login')
      return
    }

    // A5 — DON'T use cached getTenantId() to short-circuit slug-setting
    // here. We must wait for /auth/me so the redirect_url check below
    // can fire; rendering the editor on a stale cache would let an
    // unverified / cardless user see the editor for a frame before
    // being bounced. Spinner shown until /me resolves.

    getCurrentUser()
      .then(user => {
        // A5 — backend is the single source of truth for "where should
        // this user be right now?". If they're unverified or have no
        // card on file, /auth/me returns a redirect_url pointing at
        // the missing step. Bounce them there instead of rendering the
        // editor. Without this, a user could sign up → sign out → sign
        // back in → land in /editor without ever finishing setup.
        if (user.redirect_url && user.redirect_url !== '/editor' && ! pathname?.startsWith(user.redirect_url)) {
          router.replace(user.redirect_url)
          return
        }

        // Wave D — role-aware gate. A staff login may only view its own
        // scoped surfaces (schedule / hours / profile). On an owner-only
        // path we no longer hard-redirect (which stranded staff on a blank
        // frame); instead we render an "Owner only" notice inside the shell
        // with a clear link back to their schedule. Enforced here in
        // addition to the backend's per-row scoping so staff never render
        // an owner page's contents. Owners/admins are unaffected.
        const resolvedRole = user.role ?? 'owner'

        setRole(resolvedRole)
        setStaffId(user.staff_id ?? null)
        setSlug(user.tenant_id)
      })
      .catch(() => {
        clearAuth()
        router.replace('/login')
      })
  }, [router, pathname])

  if (!slug) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <span className="text-eyebrow font-bold tracking-[0.22em] uppercase text-muted-text">
          Loading…
        </span>
      </div>
    )
  }

  // Wave D — staff hitting an owner-only path see a notice (not a blank
  // frame) with a link back to their schedule. Rendered inside AppShell so
  // the sidebar stays available and they're never stranded.
  const staffBlocked = role === 'staff' && pathname != null && ! staffCanAccess(pathname)

  return (
    <RoleProvider role={role} staffId={staffId}>
      <AppShell slug={slug}>
        {staffBlocked ? (
          <div className="bg-cream min-h-full p-6 flex items-start justify-center">
            <EmptyState
              icon={Lock}
              title="Owner only"
              description="This area is managed by the business owner."
              className="mt-12 w-full max-w-md"
              action={
                <Link href="/editor/appointments?scope=mine">
                  <Button>Go to my schedule</Button>
                </Link>
              }
            />
          </div>
        ) : (
          children
        )}
      </AppShell>
    </RoleProvider>
  )
}
