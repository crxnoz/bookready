'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, Clock, X } from 'lucide-react'
import {
  cancelCustomerBooking,
  getCustomerBooking,
  rescheduleCustomerBooking,
  type CustomerBookingDetail,
} from '@/lib/customerApi'
import AccountShell from '@/components/account/AccountShell'

/**
 * Phase 4 — booking detail at /account/bookings/{tenant}/{id}.
 *
 * Mirrors the data shape from PublicManageBookingController's manage
 * page (which the customer used to land on via the token-in-email
 * link) — same window-enforcement labels, same can_cancel / can_reschedule
 * flags computed server-side. Cancel + Reschedule actions live in
 * inline modals rather than separate pages so the customer doesn't
 * lose context.
 *
 * IDOR-safe — the server enforces clients.customer_user_id matches
 * before returning anything (BookingsController::loadContext). The
 * tenant+id in the URL is not load-bearing for authorization.
 */
export default function CustomerBookingDetailPage() {
  return (
    <AccountShell>
      <Inner />
    </AccountShell>
  )
}

function Inner() {
  const params = useParams<{ tenant: string; id: string }>()
  const router = useRouter()
  const tenant = String(params?.tenant ?? '')
  const id     = Number(params?.id ?? 0)

  const [booking, setBooking] = useState<CustomerBookingDetail | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const [modal,   setModal]   = useState<'none' | 'cancel' | 'reschedule'>('none')
  const [actionError, setActionError] = useState<string | null>(null)
  const [acting, setActing] = useState(false)

  async function reload() {
    setError(null)
    try {
      const b = await getCustomerBooking(tenant, id)
      setBooking(b)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load booking.')
    }
  }

  useEffect(() => { reload() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [tenant, id])

  async function handleCancel() {
    if (!booking) return
    setActing(true)
    setActionError(null)
    try {
      await cancelCustomerBooking(tenant, id)
      setModal('none')
      await reload()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not cancel booking.')
    } finally {
      setActing(false)
    }
  }

  if (error) {
    return (
      <div className="px-4 py-4 bg-red-50 border border-red-200 text-xs text-red-700">
        {error}
      </div>
    )
  }

  if (!booking) {
    return <p className="text-xs text-muted-text">Loading booking…</p>
  }

  return (
    <>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-xs text-muted-text hover:text-near-black transition-colors mb-6"
      >
        <ArrowLeft size={12} /> Back to bookings
      </Link>

      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 sm:p-8">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-2">
          {booking.business_name}
        </p>
        <h1 className="text-[24px] sm:text-[28px] font-bold tracking-tight text-near-black mb-1">
          {booking.service_name}
        </h1>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-text">
          <span className="inline-flex items-center gap-2">
            <Calendar size={14} aria-hidden />
            {formatLongDate(booking.appointment_date)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock size={14} aria-hidden />
            {booking.start_time}–{booking.end_time}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <Detail label="Status">
            <span className={booking.status === 'cancelled' ? 'line-through text-muted-text' : ''}>
              {prettyStatus(booking.status)}
            </span>
          </Detail>
          {booking.service_duration_minutes !== null && (
            <Detail label="Duration">{booking.service_duration_minutes} min</Detail>
          )}
          {booking.service_price !== null && (
            <Detail label="Price">${booking.service_price.toFixed(2)}</Detail>
          )}
          {booking.notes && <Detail label="Notes" wide>{booking.notes}</Detail>}
        </dl>

        {booking.is_terminal ? (
          <p className="mt-8 text-xs text-muted-text">
            This booking is {booking.status} and can no longer be changed.
          </p>
        ) : (
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              disabled={!booking.can_reschedule}
              onClick={() => { setModal('reschedule'); setActionError(null) }}
              className={'px-4 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase border ' + (
                booking.can_reschedule
                  ? 'border-near-black text-near-black hover:bg-near-black hover:text-white transition-colors'
                  : 'border-[rgba(18,18,18,0.15)] text-muted-text cursor-not-allowed'
              )}
              title={booking.can_reschedule
                ? undefined
                : `Reschedules require at least ${booking.reschedule_window_hours} hour${booking.reschedule_window_hours === 1 ? '' : 's'} notice.`}
            >
              Reschedule
            </button>
            <button
              disabled={!booking.can_cancel}
              onClick={() => { setModal('cancel'); setActionError(null) }}
              className={'px-4 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase border ' + (
                booking.can_cancel
                  ? 'border-red-600 text-red-700 hover:bg-red-50 transition-colors'
                  : 'border-[rgba(18,18,18,0.15)] text-muted-text cursor-not-allowed'
              )}
              title={booking.can_cancel
                ? undefined
                : `Cancellations require at least ${booking.cancellation_window_hours} hour${booking.cancellation_window_hours === 1 ? '' : 's'} notice.`}
            >
              Cancel booking
            </button>
          </div>
        )}
      </div>

      {/* Cancel modal */}
      {modal === 'cancel' && (
        <Modal onClose={() => setModal('none')}>
          <h2 className="text-lg font-bold tracking-tight mb-2">Cancel this booking?</h2>
          <p className="text-sm text-muted-text mb-6">
            You&rsquo;ll get a cancellation email and {booking.business_name} will be notified.
          </p>
          {actionError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
              {actionError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModal('none')} className="px-4 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase text-muted-text hover:text-near-black">
              Keep booking
            </button>
            <button
              onClick={handleCancel}
              disabled={acting}
              className="px-4 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {acting ? 'Cancelling…' : 'Yes, cancel'}
            </button>
          </div>
        </Modal>
      )}

      {/* Reschedule modal */}
      {modal === 'reschedule' && (
        <RescheduleModal
          booking={booking}
          tenant={tenant}
          id={id}
          onError={setActionError}
          actionError={actionError}
          onDone={async () => { setModal('none'); await reload() }}
          onClose={() => setModal('none')}
        />
      )}
    </>
  )
}

function Detail({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <dt className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1">{label}</dt>
      <dd className="text-near-black">{children}</dd>
    </div>
  )
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white max-w-md w-full p-6 sm:p-8 border border-[rgba(18,18,18,0.10)] relative"
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-text hover:text-near-black p-1" aria-label="Close">
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  )
}

function RescheduleModal({
  booking, tenant, id, onDone, onClose, onError, actionError,
}: {
  booking:     CustomerBookingDetail
  tenant:      string
  id:          number
  onDone:      () => void | Promise<void>
  onClose:     () => void
  onError:     (msg: string | null) => void
  actionError: string | null
}) {
  const [date, setDate]   = useState(booking.appointment_date)
  const [time, setTime]   = useState(booking.start_time)
  const [acting, setActing] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setActing(true)
    onError(null)
    try {
      await rescheduleCustomerBooking(tenant, id, date, time)
      await onDone()
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not reschedule.')
    } finally {
      setActing(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-bold tracking-tight mb-2">Reschedule</h2>
      <p className="text-sm text-muted-text mb-6">
        Pick a new date and time. The business will be notified.
      </p>
      {actionError && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {actionError}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New date">
          <input type="date" required value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
        </Field>
        <Field label="New start time">
          <input type="time" required value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
        </Field>
        <p className="text-[11px] text-muted-text">
          Rescheduling is subject to availability. You&rsquo;ll get a confirmation email.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase text-muted-text hover:text-near-black">
            Cancel
          </button>
          <button
            type="submit"
            disabled={acting}
            className="px-4 py-2.5 text-[11px] font-bold tracking-[0.10em] uppercase bg-near-black text-white hover:bg-[#2a2a2a] disabled:opacity-50"
          >
            {acting ? 'Saving…' : 'Reschedule'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function formatLongDate(d: string): string {
  try {
    const dt = new Date(`${d}T12:00:00`)
    return dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  } catch { return d }
}

function prettyStatus(s: string): string {
  return s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())
}

const inputCls = 'w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black transition-colors'
