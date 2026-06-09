'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle, Check, Copy, ExternalLink, Loader2, RefreshCw, Rss,
} from 'lucide-react'
import {
  getEditorIcsFeed,
  regenerateEditorIcsFeed,
  type IcsFeedInfo,
} from '@/lib/api'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

/**
 * T1.1 — owner-facing calendar-feed card. Lives in the Integrations hub,
 * Calendars category.
 *
 * Self-loads its URL on mount (the backend lazy-mints the token on first
 * request, so just calling GET is enough to show the URL). Copy + Regenerate
 * are the two actions; instructions block tells the owner how to subscribe
 * in Google / Apple / Outlook.
 *
 * Mirrors the chrome of StripeConnectCard so the Integrations page reads
 * with a single visual rhythm (icon-box + header + meta + action row).
 */
export default function IcsFeedCard() {
  const [info,    setInfo]    = useState<IcsFeedInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [busy,    setBusy]    = useState<'idle' | 'regenerating'>('idle')
  const [copied,  setCopied]  = useState(false)
  const confirm = useConfirm()
  const toast   = useToast()

  useEffect(() => {
    let cancelled = false
    getEditorIcsFeed()
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
      toast.error('Could not copy — copy the URL manually.')
    }
  }

  async function regenerate() {
    const ok = await confirm({
      title:        'Get a new calendar URL?',
      message:      'Your current subscription stops working immediately. You’ll need to re-subscribe in any calendar app that was using the old link.',
      confirmLabel: 'Get new URL',
      tone:         'default',
    })
    if (! ok) return
    setBusy('regenerating')
    try {
      const next = await regenerateEditorIcsFeed()
      setInfo(next)
      setCopied(false)
      toast.success('New calendar URL ready.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not regenerate.')
    } finally {
      setBusy('idle')
    }
  }

  if (loading) {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 flex items-center gap-2 text-xs text-muted-text">
        <Loader2 size={14} className="animate-spin" /> Loading calendar feed…
      </section>
    )
  }
  if (loadErr) {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr}
      </section>
    )
  }
  if (info && info.available === false) {
    // Dev-box fallback — migration hasn't run. Don't error, just inform.
    return (
      <section className="bg-white border border-hairline-soft p-3.5 flex items-start gap-3">
        <IconChip><Rss size={14} strokeWidth={1.8} /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-near-black">Calendar feed</p>
          <p className="text-2xs text-muted-text mt-1">
            {info.message ?? 'Calendar feed isn’t available here yet.'}
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
      <div className="flex items-start gap-3">
        <IconChip><Rss size={14} strokeWidth={1.8} /></IconChip>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-near-black">Calendar feed</h3>
            <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 whitespace-nowrap bg-white border-[rgba(20,140,80,0.40)] text-success">
              Live
            </span>
          </div>
          <p className="text-2xs text-muted-text mt-1">
            Subscribe to your bookings from any calendar app — Apple Calendar,
            Google Calendar, Outlook, Fantastical. New bookings appear within
            10 minutes. Cancellations disappear automatically.
          </p>
        </div>
      </div>

      {info?.url && (
        <div className="border border-hairline-soft bg-cream/40 px-3 py-2.5">
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
            Your calendar URL
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 min-w-0 text-2xs font-mono text-near-black break-all bg-white border border-hairline-soft px-2 py-1.5 select-all"
              title="Copy this URL into any calendar app to subscribe."
            >
              {info.url}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className={cn(
                'inline-flex items-center gap-1 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2 border whitespace-nowrap flex-shrink-0',
                copied
                  ? 'bg-white border-[rgba(20,140,80,0.40)] text-success'
                  : 'bg-near-black border-near-black text-white hover:bg-white hover:text-near-black',
              )}
              title="Copy URL"
            >
              {copied
                ? <><Check size={11} /> Copied</>
                : <><Copy size={11} /> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* How to use it — keep the instructions one click away in a
          <details> so the card stays compact for repeat visits. */}
      <details className="text-2xs text-muted-text">
        <summary className="cursor-pointer text-near-black font-semibold hover:underline inline-flex items-center gap-1">
          How to subscribe <ExternalLink size={10} />
        </summary>
        <div className="mt-2 space-y-2 pl-1">
          <p><strong className="text-near-black">Google Calendar</strong> · Settings → Add calendar → From URL → paste.</p>
          <p><strong className="text-near-black">Apple Calendar (Mac)</strong> · File → New Calendar Subscription → paste.</p>
          <p><strong className="text-near-black">Apple Calendar (iPhone)</strong> · Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste.</p>
          <p><strong className="text-near-black">Outlook</strong> · Calendar → Add calendar → Subscribe from web → paste.</p>
        </div>
      </details>

      {/* Action row — single Regenerate button (Copy lives next to the URL).
          Matches the StripeConnectCard pattern with a top hairline divider. */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-hairline-soft">
        <button
          type="button"
          onClick={regenerate}
          disabled={busy !== 'idle'}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-60"
        >
          {busy === 'regenerating'
            ? <><Loader2 size={11} className="animate-spin" /> Working</>
            : <><RefreshCw size={11} /> Get new URL</>}
        </button>
      </div>
    </section>
  )
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-8 h-8 flex items-center justify-center bg-cream border border-hairline-soft text-near-black flex-shrink-0">
      {children}
    </span>
  )
}
