'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { login } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'
const GOOGLE_REDIRECT_URL = `${API_BASE}/auth/google/redirect`

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Surface any error returned from the Google OAuth bridge.
  useEffect(() => {
    const gerr = searchParams?.get('google_error')
    if (gerr) setError(gerr)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ email, password })
      setToken()
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      router.push('/editor/website?tab=business')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Mode switch */}
      <div className="grid grid-cols-2 border border-[rgba(18,18,18,0.12)] mb-7 overflow-hidden">
        <span className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-near-black text-white">
          Log in
        </span>
        <Link
          href="/register"
          className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase text-muted-text hover:text-near-black transition-colors"
        >
          Sign up
        </Link>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <p className={eyebrow}>Sign in</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Welcome back.
        </h1>
        <p className="text-sm text-muted-text">
          Log in to manage your bookings, website, and clients.
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
        <Field label="Email address">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@studio.com"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </Field>

        {/* Remember me + forgot */}
        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-text cursor-pointer select-none">
            <input type="checkbox" className="accent-[#121212]" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-muted-text hover:text-near-black transition-colors">
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading} className={submitCls}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">or</span>
        <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
      </div>

      {/* Google sign-in (existing accounts only) */}
      <a
        href={GOOGLE_REDIRECT_URL}
        className="w-full flex items-center justify-center gap-3 border border-[rgba(18,18,18,0.15)] bg-white py-3 text-sm font-medium text-near-black hover:border-near-black transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </a>

      {/* Footer */}
      <p className="text-xs text-muted-text mt-6 text-center">
        New to BookReady?{' '}
        <Link href="/register" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Create an account
        </Link>
      </p>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted-text">
        <Link href="/terms" className="hover:text-near-black">Terms</Link>
        <Link href="/privacy" className="hover:text-near-black">Privacy</Link>
        <a href="mailto:hello@mybookready.com" className="hover:text-near-black">Help</a>
      </div>
    </AuthShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.31a3.68 3.68 0 0 1-1.6 2.41v2h2.58c1.51-1.39 2.39-3.44 2.39-5.87Z" fill="#4285F4" />
      <path d="M8 16c2.16 0 3.97-.72 5.3-1.95l-2.58-2a4.8 4.8 0 0 1-7.17-2.52H.88v2.07A8 8 0 0 0 8 16Z" fill="#34A853" />
      <path d="M3.55 9.53A4.8 4.8 0 0 1 3.3 8c0-.53.1-1.05.25-1.53V4.4H.88A8 8 0 0 0 0 8c0 1.29.31 2.51.88 3.6l2.67-2.07Z" fill="#FBBC04" />
      <path d="M8 3.2c1.22 0 2.31.42 3.17 1.24L13.35 2.2A8 8 0 0 0 .88 4.4l2.67 2.07A4.77 4.77 0 0 1 8 3.2Z" fill="#EA4335" />
    </svg>
  )
}

const eyebrow = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const labelCls = 'block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5'
const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'
const submitCls = 'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-1 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
