'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Calendar, Sparkles } from 'lucide-react'
import { claimPublicWaitlist } from '@/lib/api'

type State =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; date: string; time: string; appointmentId: number; message: string }
  | { kind: 'error'; status?: number; message: string }

function fmtDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
  } catch {
    return iso
  }
}
function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function WaitlistClaimPage({ slug, token }: { slug: string; token: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function onClaim() {
    setState({ kind: 'busy' })
    try {
      const res = await claimPublicWaitlist(slug, token)
      setState({
        kind:          'done',
        date:          res.appointment_date,
        time:          res.start_time,
        appointmentId: res.appointment_id,
        message:       res.message,
      })
    } catch (e) {
      const err = e as Error & { status?: number }
      setState({ kind: 'error', status: err.status, message: err.message || 'Could not claim this spot.' })
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {state.kind === 'done' ? (
          <div className="rounded-3xl border border-near-black/10 bg-white p-8 sm:p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blush text-near-black">
              <CheckCircle2 className="size-7" />
            </div>
            <h1 className="text-2xl font-semibold text-near-black">You got the spot</h1>
            <p className="mt-2 text-muted-text">{state.message}</p>
            <div className="mt-6 rounded-2xl border border-near-black/10 bg-cream/70 p-4 text-left">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 mt-0.5 text-near-black" />
                <div className="text-sm">
                  <div className="font-medium text-near-black">{fmtDate(state.date)}</div>
                  <div className="text-muted-text">{fmt12(state.time)}</div>
                </div>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-text">
              A confirmation has been emailed to you. We'll see you then!
            </p>
          </div>
        ) : state.kind === 'error' ? (
          <div className="rounded-3xl border border-near-black/10 bg-white p-8 sm:p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-700">
              <AlertCircle className="size-7" />
            </div>
            <h1 className="text-2xl font-semibold text-near-black">
              {state.status === 410 ? "This link has expired" :
               state.status === 409 ? "Someone got there first" :
               state.status === 404 ? "Link no longer valid" :
                                      "Something went wrong"}
            </h1>
            <p className="mt-2 text-muted-text">{state.message}</p>
            <p className="mt-5 text-sm text-muted-text">
              You're still on the waitlist — we'll email you when the next matching slot opens.
            </p>
            <a
              href={`/site/${slug}`}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-near-black/15 bg-white px-5 py-2 text-sm font-medium text-near-black hover:bg-near-black/5"
            >
              Back to booking page
            </a>
          </div>
        ) : (
          <div className="rounded-3xl border border-near-black/10 bg-white p-8 sm:p-10 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blush text-near-black">
              <Sparkles className="size-7" />
            </div>
            <h1 className="text-2xl font-semibold text-near-black">A spot just opened</h1>
            <p className="mt-2 text-muted-text">
              Tap below to claim it. The first person to claim gets the slot, so don't wait!
            </p>
            <button
              onClick={onClaim}
              disabled={state.kind === 'busy'}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-near-black px-6 py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
            >
              {state.kind === 'busy' && <Loader2 className="size-4 animate-spin" />}
              {state.kind === 'busy' ? 'Claiming…' : 'Claim my spot'}
            </button>
            <p className="mt-5 text-xs text-muted-text">
              Claim links expire 2 hours after they're sent.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
