'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { completeGoogleSignup } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'

const TEMPLATE_KEY = 'br_template'

/**
 * Deferred-name Google signup completion. The OAuth callback handler
 * parked the verified Google identity in the server cache under `handoff`
 * and redirected here. The user picks a business name and we POST
 * back to /auth/google/complete-signup to actually provision the tenant.
 */
export default function CompleteGoogleSignupPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <CompleteInner />
    </Suspense>
  )
}

function CompleteInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handoff = searchParams.get('handoff') ?? ''
  const email   = searchParams.get('email') ?? ''
  const googleName = searchParams.get('name') ?? ''

  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const slugPreview = useMemo(
    () => businessName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness',
    [businessName],
  )

  // Missing handoff means someone hit this URL directly (refresh, bookmark)
  // — bounce them back to /register instead of showing a broken form.
  if (! handoff) {
    return (
      <AuthShell>
        <div className="mb-6">
          <p className={eyebrow}>Sign up with Google</p>
          <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
            Session expired.
          </h1>
          <p className="text-sm text-muted-text">
            Start the Google sign-up again from the register page.
          </p>
        </div>
        <Link
          href="/register"
          className="inline-block bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase px-6 py-3 hover:bg-[#2a2a2a] transition-colors"
        >
          Back to sign up
        </Link>
      </AuthShell>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await completeGoogleSignup({
        handoff,
        business_name: businessName.trim(),
      })
      setToken(res.token)
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      // Default to The Fade Room template — only template available right now.
      localStorage.setItem(TEMPLATE_KEY, 'thefaderoom')
      router.push('/checkout?template=thefaderoom')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not finish signup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-6">
        <p className={eyebrow}>One last step</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          {googleName ? `Hi ${firstName(googleName)} —` : 'Almost there —'}
        </h1>
        <p className="text-sm text-muted-text">
          Name your business so we can spin up your booking site.
          {email && (
            <>
              {' '}You&rsquo;re signing in as{' '}
              <span className="text-near-black font-semibold">{email}</span>.
            </>
          )}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="Business name"
          hint={
            <span>
              Your site will be at{' '}
              <span className="font-semibold text-near-black">{slugPreview}.bkrdy.me</span>
              <span className="block text-[10px] text-muted-text mt-0.5">
                Letters and numbers only, no dashes.
              </span>
            </span>
          }
        >
          <input
            type="text"
            required
            autoFocus
            maxLength={100}
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className={inputCls}
            placeholder="Lush Studio"
          />
        </Field>

        <button
          type="submit"
          disabled={loading || ! businessName.trim()}
          className={submitCls}
        >
          {loading ? 'Creating workspace…' : 'Finish signup'}
        </button>

        <p className="text-[10px] text-center text-muted-text">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="underline underline-offset-2 hover:text-near-black">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-near-black">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      {/* Wrong account exit */}
      <p className="text-xs text-muted-text mt-6 text-center">
        Signed in with the wrong Google account?{' '}
        <Link href="/register" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Start over
        </Link>
      </p>
    </AuthShell>
  )
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] text-muted-text">{hint}</p>}
    </div>
  )
}

const eyebrow = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
