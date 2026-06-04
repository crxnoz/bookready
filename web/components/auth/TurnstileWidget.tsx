'use client'

/**
 * #161 — Cloudflare Turnstile CAPTCHA widget.
 *
 * Used on signup + sensitive auth forms (owner /register, customer
 * /account/register, both forgot-password pages, verify-email resend).
 * Server-side verification lives in App\Http\Middleware\VerifyTurnstile
 * which 422s any request without a valid turnstile_token.
 *
 * Loading model: dynamically appends Cloudflare's script (idempotent —
 * we never inject it twice) and renders the widget into a stable div.
 * On verify, fires onVerify(token); the parent stashes the token in
 * form state and includes it in the POST payload.
 *
 * On submit failure, parent can call resetRef.current?.() to wipe the
 * stale token so the next attempt mints a fresh one — Cloudflare
 * tokens are single-use, so reusing one yields timeout-or-duplicate
 * on the server.
 *
 * Dev safety: if NEXT_PUBLIC_TURNSTILE_SITE_KEY isn't set we fall back
 * to Cloudflare's "always passes" test key (1x00000000000000000000AA)
 * so the build doesn't break before the real Cloudflare account is
 * provisioned. Don't deploy without setting the env in production.
 */

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react'

// Cloudflare's public "always passes" test key. Safe to ship — it
// only succeeds against the matching test secret on the backend
// (1x0000000000000000000000000000000AA), which is the fallback we use
// when TURNSTILE_SECRET is unset. Real key replaces this via env in prod.
const TEST_SITE_KEY = '1x00000000000000000000AA'
const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

// Cloudflare attaches `turnstile` to the global window once the script
// loads. We treat it as opaque from TS's perspective and call only the
// two methods we need.
declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement | string, opts: {
        sitekey: string
        callback: (token: string) => void
        // Cloudflare passes an error code string as the first argument
        // (e.g. "110200" = hostname not allowed for this sitekey).
        // See https://developers.cloudflare.com/turnstile/reference/client-side-errors/
        'error-callback'?: (errorCode?: string) => void
        'expired-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'compact' | 'flexible'
      }): string
      reset(widgetId?: string): void
      remove(widgetId?: string): void
    }
  }
}

let scriptLoadingPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  // Multiple widgets on the same page (rare, but possible — e.g. dev
  // mode StrictMode double-mounts) share one promise so the script
  // only ever inserts once.
  if (scriptLoadingPromise) return scriptLoadingPromise
  if (typeof window !== 'undefined' && window.turnstile) {
    return Promise.resolve()
  }

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src^="${TURNSTILE_SCRIPT_URL.split('?')[0]}"]`)
    if (existing) {
      // Script tag is there but window.turnstile may not be yet — wait
      // for the existing load event rather than inject again.
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')), { once: true })
      return
    }
    const s = document.createElement('script')
    s.src = TURNSTILE_SCRIPT_URL
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Turnstile script failed to load'))
    document.head.appendChild(s)
  })

  return scriptLoadingPromise
}

export interface TurnstileWidgetHandle {
  /** Wipe the current token + re-render the widget. Call after a failed
   *  submit so the next attempt isn't re-using a spent (single-use) token. */
  reset(): void
}

interface Props {
  onVerify: (token: string) => void
  /** Called when the token expires (Cloudflare expires them after ~5 min) or
   *  when the widget errors out — parent should clear any stored token. */
  onExpire?: () => void
}

const TurnstileWidget = forwardRef<TurnstileWidgetHandle, Props>(function TurnstileWidget(
  { onVerify, onExpire },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef  = useRef<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TEST_SITE_KEY

  useImperativeHandle(ref, () => ({
    reset() {
      if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }), [])

  useEffect(() => {
    let cancelled = false
    loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        if (! containerRef.current || ! window.turnstile) return
        // Idempotency: if a widget already exists (StrictMode re-mount),
        // remove it before rendering the new one to avoid duplicate
        // challenges stacking in the same container.
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onVerify(token),
          'error-callback': (errorCode) => {
            // Surface the Cloudflare error code so we can diagnose
            // hostname-allowlist mismatches (110200), invalid sitekey
            // (110100), etc. without making the user open dev tools.
            const codeSuffix = errorCode ? ` (Cloudflare code ${errorCode})` : ''
            setError(`CAPTCHA failed to load. Refresh the page and try again.${codeSuffix}`)
            // Also log for the dev-tools console — useful when the surfaced
            // string gets clipped or the screen reader skips it.
            console.warn('[Turnstile] error-callback fired', { errorCode, sitekey: siteKey })
            onExpire?.()
          },
          'expired-callback': () => {
            setError('CAPTCHA expired. Tap the box again.')
            onExpire?.()
          },
          theme: 'light',
          size: 'flexible',
        })
        widgetIdRef.current = id
      })
      .catch(() => {
        if (! cancelled) setError('CAPTCHA failed to load. Refresh the page and try again.')
      })

    return () => {
      cancelled = true
      // Tear down on unmount so navigating away doesn't leak widget
      // state into the next page mount.
      if (typeof window !== 'undefined' && window.turnstile && widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* noop */ }
        widgetIdRef.current = null
      }
    }
  }, [siteKey, onVerify, onExpire])

  return (
    <div className="mt-1">
      <div ref={containerRef} />
      {error && (
        <p className="mt-2 text-[11px] text-red-700">{error}</p>
      )}
    </div>
  )
})

export default TurnstileWidget
