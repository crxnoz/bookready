'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ShieldCheck, AlertCircle, AlertTriangle, CreditCard, ExternalLink, Loader2, RefreshCw,
} from 'lucide-react'
import {
  getEditorPaymentSettings,
  getStripeConnectStatus,
  startStripeConnect,
  refreshStripeConnectOnboarding,
} from '@/lib/api'
import type { PaymentSettings, StripeConnectStatus } from '@/lib/types'
import { cn } from '@/lib/cn'

/**
 * Self-contained Stripe Connect onboarding card. Owns its own payment-
 * settings load + the start / continue / refresh handlers, so it's the
 * single home for Stripe setup (the Integrations hub). Auto-syncs when the
 * owner returns from Stripe onboarding (?stripe_connect=return|refresh).
 *
 * Extracted out of SettingsHub's Payments tab so setup lives in Integrations
 * only; the Payments tab keeps the deposit/fee usage settings.
 */
export default function StripeConnectCard() {
  const sp = useSearchParams()
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [loadErr,  setLoadErr]  = useState<string | null>(null)
  const [busy, setBusy] = useState<'idle' | 'starting' | 'refreshing' | 'syncing'>('idle')
  const [err,  setErr]  = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorPaymentSettings()
      .then(d => { if (! cancelled) setSettings(d) })
      .catch(e => { if (! cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Stripe redirects back here after onboarding → resync the live status.
  useEffect(() => {
    const flag = sp?.get('stripe_connect')
    if (flag === 'return' || flag === 'refresh') void sync()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  async function sync() {
    setBusy('syncing'); setErr(null)
    try {
      const next = await getStripeConnectStatus()
      setSettings(d => (d ? { ...d, ...next } as PaymentSettings : (next as unknown as PaymentSettings)))
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not refresh Stripe status')
    } finally {
      setBusy('idle')
    }
  }

  async function start() {
    setBusy('starting'); setErr(null)
    try {
      const { onboarding_url } = await startStripeConnect()
      window.location.href = onboarding_url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not start Stripe Connect')
      setBusy('idle')
    }
  }

  async function continueOnboarding() {
    setBusy('refreshing'); setErr(null)
    try {
      const { onboarding_url } = await refreshStripeConnectOnboarding()
      window.location.href = onboarding_url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not refresh onboarding link')
      setBusy('idle')
    }
  }

  if (loading) {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 flex items-center gap-2 text-xs text-muted-text">
        <Loader2 size={14} className="animate-spin" /> Loading Stripe status…
      </section>
    )
  }
  if (loadErr || ! settings) {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load Stripe status'}
      </section>
    )
  }

  return (
    <StripeConnectBlock
      settings={settings}
      busy={busy}
      error={err}
      onStart={start}
      onContinue={continueOnboarding}
      onRefresh={sync}
    />
  )
}

// ── Presentational block ────────────────────────────────────────────────────

interface ConnectBlockProps {
  settings:   PaymentSettings
  busy:       'idle' | 'starting' | 'refreshing' | 'syncing'
  error:      string | null
  onStart:    () => void
  onContinue: () => void
  onRefresh:  () => void
}

function StripeConnectBlock({
  settings, busy, error, onStart, onContinue, onRefresh,
}: ConnectBlockProps) {
  const status: StripeConnectStatus = (settings.stripe_connect_status ?? 'not_connected')

  const meta = (() => {
    switch (status) {
      case 'active':
        return {
          tone:  'positive' as const,
          icon:  ShieldCheck,
          title: 'Stripe is connected',
          body:  'Customer payments are ready. Deposits route to your Stripe account and then to your bank.',
        }
      case 'pending':
        return {
          tone:  'warn' as const,
          icon:  AlertCircle,
          title: 'Pending review',
          body:  'You finished setup. Stripe is verifying your details. Payments will turn on once they finish.',
        }
      case 'onboarding_started':
        return {
          tone:  'warn' as const,
          icon:  AlertCircle,
          title: 'Setup in progress',
          body:  'You started your Stripe setup but haven’t finished yet. Continue where you left off.',
        }
      case 'restricted':
        return {
          tone:  'danger' as const,
          icon:  AlertTriangle,
          title: 'Action required',
          body:  'Stripe needs more information before your account can accept payments. Continue setup to resolve.',
        }
      case 'not_connected':
      default:
        return {
          tone:  'neutral' as const,
          icon:  CreditCard,
          title: 'Set up Stripe',
          body:  'Set up a Stripe account so customer deposits and payments land in your bank.',
        }
    }
  })()

  const Icon = meta.icon

  const borderCls = {
    positive: 'border-[rgba(20,140,80,0.40)]',
    warn:     'border-[rgba(180,120,0,0.35)]',
    danger:   'border-[rgba(180,40,40,0.40)]',
    neutral:  'border-hairline-soft',
  }[meta.tone]

  const iconCls = {
    positive: 'text-success',
    warn:     'text-warning',
    danger:   'text-danger',
    neutral:  'text-near-black',
  }[meta.tone]

  return (
    <section className={cn('bg-white border p-3.5 space-y-3', borderCls)}>
      <div className="flex items-start gap-3">
        <span className={cn('w-8 h-8 flex items-center justify-center bg-cream border border-hairline-soft flex-shrink-0', iconCls)}>
          <Icon size={14} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-near-black">{meta.title}</p>
            <span className={cn(
              'text-eyebrow font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 whitespace-nowrap',
              meta.tone === 'positive' ? 'bg-white border-[rgba(20,140,80,0.40)] text-success'
                : meta.tone === 'warn' ? 'bg-white border-[rgba(180,120,0,0.35)] text-warning'
                : meta.tone === 'danger' ? 'bg-white border-[rgba(180,40,40,0.40)] text-danger'
                : 'bg-cream border-hairline-strong text-muted-text',
            )}>{statusLabel(status)}</span>
          </div>
          <p className="text-2xs text-muted-text mt-1">{meta.body}</p>

          {(settings.stripe_connect_account_id || settings.stripe_connect_last_checked_at) && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-2xs">
              {settings.stripe_connect_account_id && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Stripe reference</dt>
                  <dd className="font-mono text-near-black truncate">{settings.stripe_connect_account_id}</dd>
                </div>
              )}
              {settings.stripe_details_submitted !== undefined && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Setup</dt>
                  <dd className="text-near-black">{settings.stripe_details_submitted ? 'Done' : 'Not done'}</dd>
                </div>
              )}
              {settings.stripe_charges_enabled !== undefined && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Accepting payments</dt>
                  <dd className="text-near-black">{settings.stripe_charges_enabled ? 'Yes' : 'No'}</dd>
                </div>
              )}
              {settings.stripe_payouts_enabled !== undefined && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Bank deposits</dt>
                  <dd className="text-near-black">{settings.stripe_payouts_enabled ? 'Yes' : 'No'}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {error && (
        <div className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-hairline-soft">
        {status === 'not_connected' && (
          <button
            type="button"
            onClick={onStart}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black border border-near-black disabled:opacity-60"
          >
            {busy === 'starting'
              ? <><Loader2 size={11} className="animate-spin" /> Starting</>
              : <><CreditCard size={12} /> Set up Stripe</>}
          </button>
        )}
        {(status === 'onboarding_started' || status === 'pending' || status === 'restricted') && (
          <button
            type="button"
            onClick={onContinue}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black border border-near-black disabled:opacity-60"
          >
            {busy === 'refreshing'
              ? <><Loader2 size={11} className="animate-spin" /> Opening</>
              : <><ExternalLink size={12} /> Continue setup</>}
          </button>
        )}
        {settings.stripe_connect_account_id && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-60"
          >
            {busy === 'syncing'
              ? <><Loader2 size={11} className="animate-spin" /> Refreshing</>
              : <><RefreshCw size={12} /> Refresh status</>}
          </button>
        )}
      </div>
    </section>
  )
}

function statusLabel(status: StripeConnectStatus): string {
  switch (status) {
    case 'active':             return 'Active'
    case 'pending':            return 'Pending'
    case 'onboarding_started': return 'In progress'
    case 'restricted':         return 'Restricted'
    default:                   return 'Not connected'
  }
}
