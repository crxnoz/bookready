'use client'

/**
 * Phase S1 — public site lock screen.
 *
 * Shown when the API responds with status: 'locked'. Submitting the right
 * password hands back an unlock token; we redirect to the same URL with
 * ?unlock=<token> appended so SSR re-fetches the full payload with the
 * token attached. Token is short-lived (24h) and HMAC-signed server-side.
 *
 * If the site is private but has no password configured, the form is
 * hidden and the screen reads as "this site is currently private."
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Loader2 } from 'lucide-react'
import { unlockPublicSite } from '@/lib/api'

export default function SiteLockScreen({
  slug,
  businessName,
  hasPassword,
}: {
  slug:         string
  businessName: string | null
  hasPassword:  boolean
}) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (! password) return
    setBusy(true); setErr(null)
    try {
      const r = await unlockPublicSite(slug, password)
      if (r.token) {
        // Reload the page with the unlock token so SSR re-fetches.
        router.replace(`${window.location.pathname}?unlock=${encodeURIComponent(r.token)}`)
      } else if (r.error === 'wrong_password') {
        setErr('That password did not work.')
      } else {
        setErr('Could not check that password right now. Try again.')
      }
    } catch {
      setErr('Could not check that password right now. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <span style={styles.iconWrap}>
          <Lock size={20} strokeWidth={1.8} />
        </span>
        <p style={styles.eyebrow}>Private booking site</p>
        <h1 style={styles.heading}>{businessName ?? slug}</h1>
        {hasPassword ? (
          <>
            <p style={styles.body}>
              This site is password-protected. Enter the password you were given to continue.
            </p>
            <form onSubmit={submit} style={{ marginTop: 16 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                style={styles.input}
              />
              {err && <p style={styles.error}>{err}</p>}
              <button
                type="submit"
                disabled={busy || ! password}
                style={{
                  ...styles.button,
                  opacity: busy || ! password ? 0.6 : 1,
                  cursor:  busy || ! password ? 'not-allowed' : 'pointer',
                }}
              >
                {busy
                  ? <><Loader2 size={13} className="animate-spin" /> Checking…</>
                  : 'Unlock'}
              </button>
            </form>
          </>
        ) : (
          <p style={styles.body}>
            This site is currently private. Reach out to the owner directly if you need to book.
          </p>
        )}
        <p style={styles.footer}>Booking system by BookReady</p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#F8F6F2', fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '40px 16px',
  } as React.CSSProperties,
  card: {
    maxWidth: 440, width: '100%', padding: '40px 32px',
    background: '#fff', border: '1px solid rgba(18,18,18,0.10)',
    textAlign: 'center' as const,
  } as React.CSSProperties,
  iconWrap: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 44, height: 44, background: '#F8F6F2',
    border: '1px solid rgba(18,18,18,0.08)', color: '#121212', marginBottom: 18,
  } as React.CSSProperties,
  eyebrow: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
    textTransform: 'uppercase' as const, color: '#6B7280', marginBottom: 8,
  } as React.CSSProperties,
  heading: {
    fontSize: 22, fontWeight: 700, color: '#121212',
    letterSpacing: '-0.02em', margin: '0 0 12px',
  } as React.CSSProperties,
  body: { fontSize: 13, color: '#3A3A3A', lineHeight: 1.5, margin: 0 } as React.CSSProperties,
  input: {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '11px 14px', fontSize: 16,
    border: '1px solid rgba(18,18,18,0.20)', background: '#fff',
    color: '#121212', marginBottom: 12,
  } as React.CSSProperties,
  error: {
    fontSize: 11, color: '#b42828', margin: '0 0 12px',
    textAlign: 'left' as const,
  } as React.CSSProperties,
  button: {
    width: '100%', padding: '12px 18px',
    background: '#121212', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  } as React.CSSProperties,
  footer: {
    fontSize: 10, color: '#9AA0A6', marginTop: 24, letterSpacing: '0.08em',
  } as React.CSSProperties,
}
