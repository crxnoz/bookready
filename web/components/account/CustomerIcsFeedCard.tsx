'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle, Check, Copy, ExternalLink, Loader2, RefreshCw, Rss,
} from 'lucide-react'
import {
  getCustomerIcsFeed,
  regenerateCustomerIcsFeed,
  type CustomerIcsFeedInfo,
} from '@/lib/customerApi'

/**
 * T1.3 — customer-facing calendar-feed card. Lives on /account.
 *
 * Subscribes the customer to a single iCalendar URL aggregating every
 * upcoming booking across every BookReady business they've used. The
 * persistent-login + cross-tenant nature of customer accounts is what
 * makes this work — without an account, there's no "one feed for
 * everything you booked."
 *
 * No toast/confirm providers are mounted on the account surface, so
 * regenerate uses an inline two-click confirm ("Click again to
 * confirm") instead of `useConfirm`. Same end behavior, zero providers.
 */
export default function CustomerIcsFeedCard() {
  const [info,    setInfo]    = useState<CustomerIcsFeedInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy,    setBusy]    = useState(false)
  const [copied,  setCopied]  = useState(false)
  const [confirmingRegen, setConfirmingRegen] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCustomerIcsFeed()
      .then(d => { if (! cancelled) setInfo(d) })
      .catch(e => { if (! cancelled) setLoadErr(e instanceof Error ? e.message : 'Could not load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function copyUrl() {
    if (! info?.url) return
    try {
      await navigator.clipboard.writeText(info.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setActionErr('Could not copy — copy the URL manually.')
    }
  }

  async function handleRegenerate() {
    if (! confirmingRegen) { setConfirmingRegen(true); return }
    setBusy(true); setActionErr(null)
    try {
      const next = await regenerateCustomerIcsFeed()
      setInfo(next)
      setCopied(false)
      setConfirmingRegen(false)
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Could not regenerate.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-4 flex items-center gap-2 text-xs text-muted-text">
        <Loader2 size={14} className="animate-spin" /> Loading calendar feed…
      </section>
    )
  }
  if (loadErr) {
    return (
      <section className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-red-700 flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr}
      </section>
    )
  }
  if (info && info.available === false) {
    // Migration hasn't run yet — degrade calmly.
    return (
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-4 flex items-start gap-3">
        <IconChip><Rss size={14} strokeWidth={1.8} /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-near-black">Subscribe to your bookings</p>
          <p className="text-[11px] text-muted-text mt-1">
            {info.message ?? 'Calendar feed isn’t available here yet.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white border border-[rgba(18,18,18,0.10)] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <IconChip><Rss size={14} strokeWidth={1.8} /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-near-black">Subscribe to your bookings</p>
          <p className="text-[11px] text-muted-text mt-1">
            Add this URL to any calendar app — Apple Calendar, Google Calendar,
            Outlook — and every booking you make across every BookReady business
            appears automatically. New bookings show up within 10 minutes.
          </p>
        </div>
      </div>

      {info?.url && (
        <div className="border border-[rgba(18,18,18,0.08)] bg-cream/40 px-3 py-2.5">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
            Your calendar URL
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 min-w-0 text-[11px] font-mono text-near-black break-all bg-white border border-[rgba(18,18,18,0.08)] px-2 py-1.5 select-all"
              title="Copy this URL into any calendar app to subscribe."
            >
              {info.url}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className={[
                'inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-2 border whitespace-nowrap flex-shrink-0',
                copied
                  ? 'bg-white border-[rgba(20,140,80,0.40)] text-[#1a8050]'
                  : 'bg-near-black border-near-black text-white hover:bg-white hover:text-near-black',
              ].join(' ')}
            >
              {copied
                ? <><Check size={11} /> Copied</>
                : <><Copy size={11} /> Copy</>}
            </button>
          </div>
        </div>
      )}

      <details className="text-[11px] text-muted-text">
        <summary className="cursor-pointer text-near-black font-semibold hover:underline inline-flex items-center gap-1">
          How to subscribe <ExternalLink size={10} />
        </summary>
        <div className="mt-2 space-y-1.5 pl-1">
          <p><strong className="text-near-black">Google Calendar</strong> · Settings → Add calendar → From URL → paste.</p>
          <p><strong className="text-near-black">Apple Calendar (Mac)</strong> · File → New Calendar Subscription → paste.</p>
          <p><strong className="text-near-black">Apple Calendar (iPhone)</strong> · Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste.</p>
          <p><strong className="text-near-black">Outlook</strong> · Calendar → Add calendar → Subscribe from web → paste.</p>
        </div>
      </details>

      {actionErr && (
        <p className="text-[11px] text-red-700 flex items-center gap-1.5">
          <AlertCircle size={11} /> {actionErr}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[rgba(18,18,18,0.08)]">
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={busy}
          className={[
            'inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase px-3 py-2 border disabled:opacity-60',
            confirmingRegen
              ? 'bg-white border-[rgba(180,120,0,0.40)] text-[#8a6a00] hover:bg-[#fef9ef]'
              : 'bg-white border-[rgba(18,18,18,0.30)] text-near-black hover:border-near-black',
          ].join(' ')}
        >
          {busy
            ? <><Loader2 size={11} className="animate-spin" /> Working</>
            : confirmingRegen
              ? <><RefreshCw size={11} /> Click again to confirm</>
              : <><RefreshCw size={11} /> Get new URL</>}
        </button>
        {confirmingRegen && ! busy && (
          <button
            type="button"
            onClick={() => setConfirmingRegen(false)}
            className="text-[11px] text-muted-text hover:text-near-black underline"
          >
            Cancel
          </button>
        )}
        {confirmingRegen && (
          <p className="text-[10px] text-muted-text basis-full">
            Your current subscription will stop working. You’ll need to re-subscribe in any calendar app using the old link.
          </p>
        )}
      </div>
    </section>
  )
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-8 h-8 flex items-center justify-center bg-cream border border-[rgba(18,18,18,0.08)] text-near-black flex-shrink-0">
      {children}
    </span>
  )
}
