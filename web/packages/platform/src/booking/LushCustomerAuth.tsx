'use client'

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from 'react'
import { X, UserCircle, Loader2 } from 'lucide-react'
import {
  customerMe, customerLogin, customerRegister, customerLogout,
  type CustomerProfile,
} from '@/lib/customerApi'

/**
 * Phase 7b — in-page customer auth for tenant booking sites.
 *
 * Previously the FadeRoom widget linked off to app.bkrdy.me/account/login
 * and bounced back via return_to. That works but it's a navigation
 * round-trip — the customer loses any in-progress booking state, and
 * for a visitor mid-booking the friction is real.
 *
 * Instead: a Context provider mounts a modal at the template root.
 * The widget and the booking form both call open('signin' | 'signup')
 * via the useLushCustomerAuth() hook. On success the modal calls
 * customerMe() again, updates the context user, and closes itself.
 * Because the booking form's auto-fill effect depends on the context
 * user, the visitor's name/email/phone populate the form the instant
 * they sign in.
 *
 * Why this works cross-origin from {slug}.bkrdy.me → api.bkrdy.me:
 *
 *   - CORS allows *.bkrdy.me with supports_credentials: true
 *     (api/config/cors.php)
 *   - The customer cookie is host-only on api.bkrdy.me but the browser
 *     still SENDS it on any fetch to api.bkrdy.me with
 *     credentials: 'include'
 *
 * So the auth subdomain never has to be visited — the tenant site can
 * mint and consume the session purely via XHR.
 *
 * The auth pages at app.bkrdy.me/account/login + /account/register
 * still exist for verify-email + claim-booking entry points. This is
 * just an additional, friction-free entry point for tenant visitors.
 */

type Mode = 'signin' | 'signup'

type Ctx = {
  user:         CustomerProfile | null
  authChecked:  boolean
  open:         (mode?: Mode) => void
  signOut:      () => Promise<void>
  /**
   * Imperative setter used by LushAuthModal after a successful
   * login/register so we don't need a second /auth/me round-trip
   * just to learn what we already know from the response body.
   * Closing the modal alone wouldn't push the user into context.
   */
  setUserFromAuth: (u: CustomerProfile) => void
}

const CustomerAuthCtx = createContext<Ctx | null>(null)

export function useLushCustomerAuth(): Ctx {
  const c = useContext(CustomerAuthCtx)
  if (! c) {
    throw new Error('useLushCustomerAuth must be used inside LushCustomerAuthProvider')
  }
  return c
}

export function LushCustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<CustomerProfile | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [modalMode,   setModalMode]   = useState<Mode | null>(null)

  // Initial auth probe. Same pattern as the widget had before, lifted
  // up so it runs once per page load (not once per consumer).
  useEffect(() => {
    let cancelled = false
    customerMe()
      .then(u => {
        if (cancelled) return
        setUser(u)
        setAuthChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setAuthChecked(true)
      })
    return () => { cancelled = true }
  }, [])

  const open = useCallback((mode: Mode = 'signin') => {
    setModalMode(mode)
  }, [])

  const close = useCallback(() => setModalMode(null), [])

  const setUserFromAuth = useCallback((u: CustomerProfile) => {
    setUser(u)
  }, [])

  const signOut = useCallback(async () => {
    try { await customerLogout() } catch { /* fail open */ }
    setUser(null)
  }, [])

  return (
    <CustomerAuthCtx.Provider value={{ user, authChecked, open, signOut, setUserFromAuth }}>
      {children}
      {modalMode && (
        <LushAuthModal
          initialMode={modalMode}
          onClose={close}
          onSuccess={(u) => { setUserFromAuth(u); close() }}
        />
      )}
    </CustomerAuthCtx.Provider>
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────

function LushAuthModal({
  initialMode, onClose, onSuccess,
}: {
  initialMode: Mode
  onClose:     () => void
  /**
   * Called with the fresh CustomerProfile straight from the
   * login/register response — NOT via a follow-up /auth/me. Eliminates
   * a class of bugs where the cookie hadn't fully propagated by the
   * time we re-probed, causing the modal to close but the auth state
   * to never update.
   */
  onSuccess:   (user: CustomerProfile) => void
}) {
  const [mode,     setMode]     = useState<Mode>(initialMode)
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // M5: ref on the modal panel so we can scope focus trapping + initial
  // focus to its descendants. Without this ref the focus search runs
  // against document.body, which lets focus escape to the page beneath.
  const modalRef = useRef<HTMLDivElement | null>(null)

  // Escape to close + body scroll lock + focus trap while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // M5 focus trap. Tab / Shift+Tab on the boundary focusable cycles
      // back into the modal instead of leaving it. Critical for screen-
      // reader + keyboard-only users; without this, Tab takes them onto
      // the (still rendered) tenant site behind the backdrop.
      if (e.key !== 'Tab') return
      const root = modalRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last  = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || ! root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Initial focus — first focusable inside the modal — so a screen
    // reader announces the dialog contents immediately.
    queueMicrotask(() => {
      const root = modalRef.current
      if (!root) return
      const first = root.querySelector<HTMLElement>(
        'input,button:not([disabled]),a[href]',
      )
      first?.focus()
    })

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user: CustomerProfile
      if (mode === 'signin') {
        const r = await customerLogin({ email, password })
        user = r.user
      } else {
        // Backend requires password_confirmation; we send the same
        // value twice and skip the "re-enter password" UI to keep the
        // modal short. Same field, identical value — no UX cost.
        const r = await customerRegister({
          name,
          email,
          password,
          password_confirmation: password,
        })
        user = r.user
      }
      onSuccess(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="lush-auth-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signin' ? 'Sign in to BookReady' : 'Create a BookReady account'}
    >
      <div className="lush-auth-modal" ref={modalRef} onClick={e => e.stopPropagation()}>

        {/* BookReady brand bar — makes it unambiguous what the user is
            authenticating INTO. Sharp dark strip across the top with
            the wordmark and a close button. */}
        <div className="lush-auth-modal-brand">
          <span className="lush-auth-modal-wordmark">BookReady</span>
          <button
            type="button"
            className="lush-auth-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sign in / Sign up tab strip — mirrors the AuthShell tabs on
            /login and /account/login: 2-col grid, active = bg-near-black
            text-white, no border-radius. */}
        <div className="lush-auth-modal-tabs">
          <button
            type="button"
            className={`lush-auth-modal-tab${mode === 'signin' ? ' is-active' : ''}`}
            onClick={() => { setMode('signin'); setError('') }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`lush-auth-modal-tab${mode === 'signup' ? ' is-active' : ''}`}
            onClick={() => { setMode('signup'); setError('') }}
          >
            Sign up
          </button>
        </div>

        <div className="lush-auth-modal-body">
          <p className="lush-auth-modal-eyebrow">
            {mode === 'signin' ? 'Your bookings' : 'Create account'}
          </p>
          <h2 className="lush-auth-modal-title">
            {mode === 'signin' ? 'Welcome back.' : 'One login. Every booking.'}
          </h2>
          <p className="lush-auth-modal-tag">
            {mode === 'signin'
              ? 'Sign in to autofill your details and manage your bookings across every BookReady business.'
              : 'Sign up once to see every booking you make on BookReady in one place.'}
          </p>

          {error && (
            <div className="lush-auth-modal-error">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="lush-auth-modal-form">
            {mode === 'signup' && (
              <label className="lush-auth-modal-field">
                <span>Name</span>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                  autoFocus
                />
              </label>
            )}
            <label className="lush-auth-modal-field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus={mode === 'signin'}
              />
            </label>
            <label className="lush-auth-modal-field">
              <span>Password</span>
              <input
                type="password"
                placeholder={mode === 'signin' ? '••••••••' : 'At least 8 characters'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={mode === 'signup' ? 8 : undefined}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="lush-auth-modal-submit"
            >
              {loading
                ? <Loader2 size={14} className="lush-spin" />
                : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>

          {mode === 'signin' ? (
            <p className="lush-auth-modal-foot">
              <a
                href="https://app.bkrdy.me/account/forgot-password"
                target="_blank"
                rel="noopener noreferrer"
              >
                Forgot password?
              </a>
            </p>
          ) : (
            <p className="lush-auth-modal-foot lush-auth-modal-fineprint">
              By continuing you agree to our{' '}
              <a href="https://app.bkrdy.me/terms" target="_blank" rel="noopener noreferrer">Terms</a>
              {' '}and{' '}
              <a href="https://app.bkrdy.me/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Lightweight named export — convenience for callers that just want
// to bring up the modal without reading user state.
export function useOpenLushAuth() {
  return useLushCustomerAuth().open
}
