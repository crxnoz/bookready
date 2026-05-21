'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { register } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'

const TEMPLATE_KEY = 'br_template'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateSlug = searchParams.get('template') ?? 'thefaderoom'

  const [form, setForm] = useState({
    owner_name: '',
    email: '',
    password: '',
    password_confirmation: '',
    business_name: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function set(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  const slugPreview = form.business_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'yourbusiness'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await register({
        owner_name: form.owner_name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        business_name: form.business_name,
      })
      setToken(res.token)
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      localStorage.setItem(TEMPLATE_KEY, templateSlug)
      router.push(`/checkout?template=${templateSlug}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Mode switch */}
      <div className="grid grid-cols-2 border border-[rgba(18,18,18,0.12)] mb-7 overflow-hidden">
        <Link
          href="/login"
          className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase text-muted-text hover:text-near-black transition-colors"
        >
          Log in
        </Link>
        <span className="text-center py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-near-black text-white">
          Sign up
        </span>
      </div>

      {/* Heading */}
      <div className="mb-6">
        <p className={eyebrow}>Create account</p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Start your booking website.
        </h1>
        <p className="text-sm text-muted-text">
          Create your BookReady account and launch your client-ready booking site.
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
        <Field label="Owner name">
          <input
            type="text"
            required
            autoComplete="name"
            value={form.owner_name}
            onChange={set('owner_name')}
            className={inputCls}
            placeholder="Ava Mendez"
          />
        </Field>

        <Field label="Email address">
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            className={inputCls}
            placeholder="you@studio.com"
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={set('password')}
            className={inputCls}
            placeholder="At least 8 characters"
          />
        </Field>

        <Field label="Confirm password">
          <input
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            value={form.password_confirmation}
            onChange={set('password_confirmation')}
            className={inputCls}
            placeholder="Repeat your password"
          />
        </Field>

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
            value={form.business_name}
            onChange={set('business_name')}
            className={inputCls}
            placeholder="Lush Studio"
          />
        </Field>

        <button type="submit" disabled={loading} className={submitCls}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-[10px] text-center text-muted-text">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">or</span>
        <div className="flex-1 h-px bg-[rgba(18,18,18,0.10)]" />
      </div>

      {/* Google placeholder */}
      <button
        type="button"
        disabled
        className="w-full flex items-center justify-center gap-3 border border-[rgba(18,18,18,0.12)] bg-white py-3 text-sm font-medium text-muted-text cursor-not-allowed opacity-60"
        title="Google signup coming soon"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      {/* Footer */}
      <p className="text-xs text-muted-text mt-6 text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
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
