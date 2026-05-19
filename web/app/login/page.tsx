'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { login } from '@/lib/api'
import { setToken, setTenantId } from '@/lib/auth'

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
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-near-black">
            BookReady
          </span>
        </div>

        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-8">
          <h1 className="text-xl font-bold text-near-black tracking-tight mb-1">
            Welcome back
          </h1>
          <p className="text-xs text-muted-text mb-7">Sign in to your dashboard.</p>

          {error && (
            <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-near-black mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-cream border border-[rgba(18,18,18,0.15)] px-4 py-2.5 text-sm text-near-black placeholder:text-[#b0a99f] focus:outline-none focus:ring-2 focus:ring-near-black/10"
                placeholder="you@yourbusiness.com"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-near-black mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-cream border border-[rgba(18,18,18,0.15)] px-4 py-2.5 text-sm text-near-black placeholder:text-[#b0a99f] focus:outline-none focus:ring-2 focus:ring-near-black/10"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-text mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-near-black font-semibold underline underline-offset-2">
            Get started
          </Link>
        </p>
      </div>
    </div>
  )
}
