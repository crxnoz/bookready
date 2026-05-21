'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'
import AuthShell from '@/components/auth/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ email, password })
      setToken(res.token)
      const tenantId = res.tenant_id ?? res.user.tenant_id
      setTenantId(tenantId)
      router.push('/editor/business')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-2">
          Welcome back.
        </h1>
        <p className="text-sm text-muted-text leading-relaxed">
          Log in to manage your bookings, website, and clients.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@yourbusiness.com"
          />
        </AuthField>

        <AuthField label="Password">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </AuthField>

        <button
          type="submit"
          disabled={loading}
          className={submitCls}
        >
          {loading ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      {/* Footer link */}
      <p className="text-xs text-muted-text mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-near-black font-semibold underline underline-offset-2 hover:text-[#2a2a2a]">
          Get started free
        </Link>
      </p>
    </AuthShell>
  )
}

function AuthField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-near-black mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[10px] text-muted-text">{hint}</p>}
    </div>
  )
}

const inputCls =
  'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-3 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black transition-colors'

const submitCls =
  'w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3.5 mt-2 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
