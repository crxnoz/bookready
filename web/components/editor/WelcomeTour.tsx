'use client'

import { useEffect, useState } from 'react'
import {
  X, ArrowRight, ArrowLeft, Sparkles, LayoutGrid, ExternalLink,
  CreditCard, Check,
} from 'lucide-react'
import { getWelcomeState, markWelcomed } from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * First-run welcome tour shown ONCE on the /editor dashboard.
 *
 * Gating: GET /editor/account/welcome-state on mount. If welcomed=false
 * (only true for fresh signups — the migration backfilled all existing
 * users), the overlay renders. On dismiss (X / Skip / Done), we POST
 * /welcomed so it never shows again.
 *
 * Why centered modal vs guided element-by-element tour:
 *   The owner just finished the 5-step /editor/onboard wizard. Throwing
 *   another guided experience at them would feel like more homework.
 *   A short, dismissible welcome covers the orientation without making
 *   them click through highlighted regions.
 *
 * Props: caller supplies `firstName` + `subdomain` so the copy reads
 * personal without this component needing to fetch the user separately.
 */
export default function WelcomeTour({
  firstName, subdomain,
}: {
  firstName: string | null
  subdomain: string | null
}) {
  // 'checking' = waiting for welcome-state response
  // 'show'     = render the modal
  // 'closed'   = either user dismissed or wasn't a first-runner
  type State = 'checking' | 'show' | 'closed'
  const [state, setState] = useState<State>('checking')
  const [step,  setStep]  = useState(0)

  useEffect(() => {
    let cancelled = false
    getWelcomeState()
      .then(r => { if (! cancelled) setState(r.welcomed ? 'closed' : 'show') })
      .catch(() => { if (! cancelled) setState('closed') })
    return () => { cancelled = true }
  }, [])

  async function dismiss() {
    setState('closed')
    // Fire-and-forget: even if the POST fails (offline, etc.), the user
    // closed the modal. Next page load will re-show, but that's fine —
    // recovery is automatic.
    try { await markWelcomed() } catch { /* ignore */ }
  }

  if (state !== 'show') return null

  const totalSteps = STEPS.length
  const current = STEPS[step]
  const isLast = step === totalSteps - 1

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="relative bg-white border border-[rgba(18,18,18,0.10)] w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
      >
        {/* Close (top-right) */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close welcome tour"
          className="absolute top-2.5 right-2.5 w-8 h-8 inline-flex items-center justify-center text-muted-text hover:text-near-black"
        >
          <X size={16} />
        </button>

        {/* Step dots (top) */}
        <div className="flex items-center justify-center gap-1.5 pt-5 pb-1">
          {STEPS.map((_, i) => (
            <span key={i} className={cn(
              'w-1.5 h-1.5 rounded-full transition-colors',
              i === step ? 'bg-near-black' : 'bg-[rgba(18,18,18,0.15)]',
            )} />
          ))}
        </div>

        {/* Body */}
        <div className="px-6 pt-3 pb-5">
          <div className="w-12 h-12 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center justify-center mb-4">
            <current.icon size={20} className="text-near-black" />
          </div>

          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
            {current.eyebrow}
          </p>
          <h2 id="welcome-tour-title" className="text-xl font-bold text-near-black tracking-tight leading-tight mb-2">
            {current.title({ firstName, subdomain })}
          </h2>
          <p className="text-[13px] text-muted-text leading-relaxed">
            {current.body({ firstName, subdomain })}
          </p>

          {/* Optional inline list */}
          {current.bullets && (
            <ul className="mt-3 space-y-1.5">
              {current.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-near-black">
                  <Check size={12} className="text-[#0f6f3d] flex-shrink-0 mt-1" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer / actions */}
        <div className="border-t border-[rgba(18,18,18,0.08)] px-4 py-3 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-text hover:text-near-black px-2 py-2"
            >
              <ArrowLeft size={11} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={dismiss}
              className="text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black px-2 py-2"
            >
              Skip tour
            </button>
          )}

          <button
            type="button"
            onClick={() => isLast ? dismiss() : setStep(s => Math.min(totalSteps - 1, s + 1))}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-near-black border border-near-black text-white px-3.5 py-2 hover:bg-[#2a2a2a]"
          >
            {isLast ? <><Check size={11} /> Get started</> : <>Next <ArrowRight size={11} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

interface StepCtx {
  firstName: string | null
  subdomain: string | null
}

interface Step {
  icon:    React.ElementType
  eyebrow: string
  title:   (ctx: StepCtx) => string
  body:    (ctx: StepCtx) => React.ReactNode
  bullets?: string[]
}

const STEPS: Step[] = [
  {
    icon:    Sparkles,
    eyebrow: 'Welcome',
    title:   ({ firstName }) => firstName ? `Hi ${firstName}, you're in.` : "You're in.",
    body:    () => (
      <>
        Your BookReady site is live and ready to take bookings. This quick tour
        covers the three things to know about your new editor.
      </>
    ),
  },
  {
    icon:    LayoutGrid,
    eyebrow: 'Step 1 of 3',
    title:   () => 'Everything lives in the left sidebar',
    body:    () => 'The sidebar is your home base — anything you change here goes live on your booking site within seconds.',
    bullets: [
      'Website — what customers see on your booking site',
      'Bookings + Customers — manage appointments',
      'Settings — preferences, hours, notifications',
    ],
  },
  {
    icon:    ExternalLink,
    eyebrow: 'Step 2 of 3',
    title:   ({ subdomain }) => subdomain
      ? `Your site is at ${subdomain}.bkrdy.me`
      : 'Your site is live',
    body:    ({ subdomain }) => (
      <>
        Share this URL with customers — they can book through it 24/7. You can
        also add a custom domain later in <strong className="text-near-black">Settings → Domain</strong>.
        {subdomain && (
          <span className="block mt-2 text-[11px]">
            Tip: open{' '}
            <a
              href={`https://${subdomain}.bkrdy.me`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-near-black font-semibold underline underline-offset-2"
            >
              {subdomain}.bkrdy.me
            </a>
            {' '}in a second tab to see your changes as you make them.
          </span>
        )}
      </>
    ),
  },
  {
    icon:    CreditCard,
    eyebrow: 'Step 3 of 3',
    title:   () => "You're on a free trial",
    body:    () => 'Your trial lasts 14 days. Add a plan anytime from the Billing tab — no charge until you choose to upgrade. Drop your card on file early to skip the interruption when your trial ends.',
  },
]
