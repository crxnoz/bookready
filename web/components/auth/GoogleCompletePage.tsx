'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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

export default function GoogleCompletePage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      // Token is in the URL fragment (after #) so it never hits server logs.
      const raw = typeof window !== 'undefined' ? window.location.hash : ''
      const fragment = raw.startsWith('#') ? raw.slice(1) : raw
      if (! fragment) {
        setError('Missing sign-in payload. Try again.')
        return
      }

      const json = atob(fragment)
      const payload = JSON.parse(json) as Payload
      if (! payload.token || ! payload.tenant_id) {
        setError('Sign-in payload looked malformed.')
        return
      }

      setToken(payload.token)
      setTenantId(payload.tenant_id)

      // Wipe the hash from the URL before navigating away so the token
      // never lingers in browser history.
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/auth/google/complete')
      }

      // Admins go straight to /admin; everyone else lands in the editor.
      const dest = payload.user?.is_admin ? '/admin' : '/editor'
      router.replace(dest)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish Google sign-in.')
    }
  }, [router])

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
