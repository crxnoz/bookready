'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isLoggedIn, getTenantId, clearAuth } from '@/lib/auth'
import { getCurrentUser } from '@/lib/api'
import AppShell from '@/components/app/AppShell'

export default function EditorGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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

    const cached = getTenantId()
    if (cached) setSlug(cached)

    getCurrentUser()
      .then(user => setSlug(user.tenant_id))
      .catch(() => {
        clearAuth()
        router.replace('/login')
      })
  }, [router])

  if (!slug) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-muted-text">
          Loading…
        </span>
      </div>
    )
  }

  return <AppShell slug={slug}>{children}</AppShell>
}
