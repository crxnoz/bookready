'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { isLoggedIn, getTenantId, clearAuth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/api'
import AppShell from '@/components/app/AppShell'

export default function EditorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [slug, setSlug] = useState<string | null>(null)

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

  return <AppShell slug={slug}>{children}</AppShell>
}
