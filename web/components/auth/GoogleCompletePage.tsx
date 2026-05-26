'use client'

/**
 * Phase S4 — Google OAuth complete page.
 *
 * The backend used to base64-encode the Sanctum token into the URL
 * fragment. That left the token in browser history and (briefly) the
 * referrer header for any redirect. We now receive a short-lived
 * single-use `?code=` query param and POST it to /auth/google/exchange
 * to read the real auth payload. Burn after read on the backend.
 */

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { setToken, setTenantId } from '@/lib/auth'

interface Payload {
  token:     string
  tenant_id: string
  user?: {
    id:        number
    name:      string
    email:     string
    tenant_id: string
    is_owner?: boolean
    is_admin?: boolean
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export default function GoogleCompletePage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function run() {
      const code = searchParams?.get('code')
      if (! code) {
        setError('Missing sign-in code. Try again.')
        return
      }

      try {
        const res = await fetch(`${API_BASE}/auth/google/exchange`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body:    JSON.stringify({ code }),
        })
        const body = await res.json().catch(() => ({}))
        if (cancelled) return

        if (! res.ok || ! body?.token || ! body?.tenant_id) {
          setError((body && body.message) || 'Sign-in session expired. Try again.')
          return
        }

        const payload = body as Payload
        setToken(payload.token)
        setTenantId(payload.tenant_id)

        // Wipe the code from the URL before navigating away so it never
        // lingers in browser history (the code is single-use server-side
        // anyway, but defense in depth).
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', '/auth/google/complete')
        }

        const dest = payload.user?.is_admin ? '/admin' : '/editor'
        router.replace(dest)
      } catch (e) {
        if (! cancelled) setError(e instanceof Error ? e.message : 'Could not finish Google sign-in.')
      }
    }
    run()
    return () => { cancelled = true }
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-[rgba(18,18,18,0.10)] p-6 text-center">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-near-black">BookReady</p>
        {error ? (
          <>
            <div className="mt-4 inline-flex items-center gap-2 text-[13px] text-[#b42828]">
              <AlertCircle size={14} />
              {error}
            </div>
            <div className="mt-4">
              <a
                href="/login"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2"
              >
                Back to sign in
              </a>
            </div>
          </>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 text-[13px] text-muted-text">
            <Loader2 size={14} className="animate-spin" /> Finishing sign-in…
          </p>
        )}
      </div>
    </div>
  )
}
