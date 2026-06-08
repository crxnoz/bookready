'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Calendar, Clock, Hourglass } from 'lucide-react'
import {
  getPublicAvailabilityRequest,
  acceptPublicAvailabilityRequest,
  type PublicAvailabilityRequestView,
} from '@/lib/api'

type Load =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; view: PublicAvailabilityRequestView }

type Action =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'done'; date: string; time: string; message: string }
  | { kind: 'error'; message: string; status?: number }

function fmtDate(iso: string | null): string {
  if (! iso) return '—'
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) }
  catch { return iso }
}
function fmt12(t: string | null): string {
  if (! t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

export default function AvailabilityRequestPage({ slug, token }: { slug: string; token: string }) {
  const [load,   setLoad]   = useState<Load>({ kind: 'loading' })
  const [action, setAction] = useState<Action>({ kind: 'idle' })

  useEffect(() => {
    let cancelled = false
    getPublicAvailabilityRequest(slug, token)
      .then(v => { if (! cancelled) setLoad({ kind: 'loaded', view: v }) })
      .catch(e => { if (! cancelled) setLoad({ kind: 'error', message: e instanceof Error ? e.message : 'Request not found' }) })
    return () => { cancelled = true }
  }, [slug, token])

  async function accept() {
    setAction({ kind: 'busy' })
    try {
      const res = await acceptPublicAvailabilityRequest(slug, token)
      setAction({ kind: 'done', date: res.appointment_date, time: res.start_time, message: res.message })
    } catch (e) {
      const err = e as Error & { status?: number }
      setAction({ kind: 'error', message: err.message || 'Could not accept.', status: err.status })
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-start sm:items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        {load.kind === 'loading' && (
          <div className="rounded-3xl border border-near-black/10 bg-white p-10 text-center shadow-sm">
            <Loader2 className="size-6 animate-spin mx-auto text-muted-text" />
          </div>
        )}

        {load.kind === 'error' && (
          <Card icon={<AlertCircle className="size-7" />} tone="error" title="Request not found">
            <p className="text-muted-text">{load.message}</p>
            <BackLink slug={slug} />
          </Card>
        )}

        {load.kind === 'loaded' && action.kind === 'done' && (
          <Card icon={<CheckCircle2 className="size-7" />} tone="ok" title="You're booked">
            <p className="text-muted-text">{action.message}</p>
            <div className="mt-6 rounded-2xl border border-near-black/10 bg-cream/70 p-4 text-left">
              <div className="flex items-start gap-3">
                <Calendar className="size-5 mt-0.5 text-near-black" />
                <div className="text-sm">
                  <div className="font-medium text-near-black">{fmtDate(action.date)}</div>
                  <div className="text-muted-text">{fmt12(action.time)}</div>
                </div>
              </div>
            </div>
            <p className="mt-6 text-xs text-muted-text">A confirmation has been emailed to you.</p>
          </Card>
        )}

        {load.kind === 'loaded' && action.kind !== 'done' && (
          <RequestBody
            view={load.view}
            action={action}
            slug={slug}
            onAccept={accept}
          />
        )}
      </div>
    </div>
  )
}

function RequestBody({
  view, action, slug, onAccept,
}: {
  view: PublicAvailabilityRequestView
  action: Action
  slug: string
  onAccept: () => void
}) {
  // Owner suggested an alternative — show accept CTA.
  if (view.status === 'suggested' && view.suggested_date) {
    return (
      <Card icon={<Clock className="size-7" />} tone="ok" title="A new time for you">
        <p className="text-muted-text">
          {view.service_name} — here&apos;s a time that works. Accept it to lock it in.
        </p>
        <div className="mt-6 rounded-2xl border border-near-black/10 bg-cream/70 p-4 text-left">
          <div className="flex items-start gap-3">
            <Calendar className="size-5 mt-0.5 text-near-black" />
            <div className="text-sm">
              <div className="font-medium text-near-black">{fmtDate(view.suggested_date)}</div>
              <div className="text-muted-text">{fmt12(view.suggested_time)}</div>
            </div>
          </div>
          {view.owner_note && <p className="mt-3 text-[13px] text-muted-text italic">&ldquo;{view.owner_note}&rdquo;</p>}
        </div>
        {action.kind === 'error' && (
          <p className="mt-4 text-sm text-red-700">{action.message}</p>
        )}
        <button
          onClick={onAccept}
          disabled={action.kind === 'busy'}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-near-black px-6 py-3 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
        >
          {action.kind === 'busy' && <Loader2 className="size-4 animate-spin" />}
          {action.kind === 'busy' ? 'Booking…' : 'Accept this time'}
        </button>
      </Card>
    )
  }

  if (view.status === 'approved' || view.status === 'accepted') {
    return (
      <Card icon={<CheckCircle2 className="size-7" />} tone="ok" title="You're booked">
        <p className="text-muted-text">Your appointment for {view.service_name} is confirmed. Check your email for details.</p>
        <BackLink slug={slug} />
      </Card>
    )
  }

  if (view.status === 'declined') {
    return (
      <Card icon={<AlertCircle className="size-7" />} tone="error" title="Couldn't make that work">
        <p className="text-muted-text">
          Unfortunately your request for {view.service_name} couldn&apos;t be accommodated.
        </p>
        {view.owner_note && <p className="mt-2 text-[13px] text-muted-text italic">&ldquo;{view.owner_note}&rdquo;</p>}
        <BackLink slug={slug} />
      </Card>
    )
  }

  // pending
  return (
    <Card icon={<Hourglass className="size-7" />} tone="ok" title="Request received">
      <p className="text-muted-text">
        Your request for {view.service_name} on {fmtDate(view.preferred_date)} is in.
        We&apos;ll email you as soon as there&apos;s a decision.
      </p>
      <BackLink slug={slug} />
    </Card>
  )
}

function Card({
  icon, tone, title, children,
}: {
  icon: React.ReactNode
  tone: 'ok' | 'error'
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-3xl border border-near-black/10 bg-white p-8 sm:p-10 text-center shadow-sm">
      <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${tone === 'ok' ? 'bg-blush text-near-black' : 'bg-red-50 text-red-700'}`}>
        {icon}
      </div>
      <h1 className="text-2xl font-semibold text-near-black">{title}</h1>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function BackLink({ slug }: { slug: string }) {
  return (
    <a
      href={`/site/${slug}`}
      className="mt-6 inline-flex items-center justify-center rounded-full border border-near-black/15 bg-white px-5 py-2 text-sm font-medium text-near-black hover:bg-near-black/5"
    >
      Back to booking page
    </a>
  )
}
