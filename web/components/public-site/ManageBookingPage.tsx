'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, Loader2, XCircle, AlertCircle, RefreshCw,
} from 'lucide-react'
import {
  cancelManageBooking,
  getManageBooking,
  getPublicAvailability,
  rescheduleManageBooking,
} from '@/lib/api'
import type { AvailableSlot, ManageBookingView } from '@/lib/types'

type LoadState = 'loading' | 'loaded' | 'error' | 'not_found'
type ActionState = 'idle' | 'busy' | 'done' | 'error'
type Mode = 'view' | 'reschedule'

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}
function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default function ManageBookingPage({ slug, token }: { slug: string; token: string }) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadErr,   setLoadErr]   = useState<string | null>(null)
  const [appt,      setAppt]      = useState<ManageBookingView | null>(null)

  const [mode,      setMode]      = useState<Mode>('view')
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [actionErr,   setActionErr]   = useState<string | null>(null)
  const [actionMsg,   setActionMsg]   = useState<string | null>(null)

  // Reschedule state
  const [newDate,  setNewDate]  = useState('')
  const [newTime,  setNewTime]  = useState('')
  const [slots,    setSlots]    = useState<AvailableSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsMsg, setSlotsMsg] = useState<string | null>(null)
  const slotsReq = useRef(0)

  useEffect(() => {
    let cancelled = false
    getManageBooking(slug, token)
      .then(d => { if (!cancelled) { setAppt(d); setLoadState('loaded') } })
      .catch(e => {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : 'Booking not found'
        setLoadErr(msg)
        setLoadState(/not found/i.test(msg) ? 'not_found' : 'error')
      })
    return () => { cancelled = true }
  }, [slug, token])

  // Fetch slots whenever date changes (in reschedule mode)
  useEffect(() => {
    if (mode !== 'reschedule' || !appt || !newDate || appt.service_id == null) {
      setSlots([]); setSlotsMsg(null)
      return
    }
    const id = ++slotsReq.current
    setSlotsLoading(true); setSlotsMsg(null)
    getPublicAvailability(slug, appt.service_id, newDate)
      .then(res => {
        if (id !== slotsReq.current) return
        setSlots(res.slots ?? [])
        setSlotsMsg(res.message ?? null)
        // If old selected time isn't valid for new date, clear it.
        if (newTime && !res.slots.some(s => s.start_time === newTime)) setNewTime('')
      })
      .catch(err => {
        if (id !== slotsReq.current) return
        setSlots([])
        setSlotsMsg(err instanceof Error ? err.message : 'Could not load times.')
      })
      .finally(() => { if (id === slotsReq.current) setSlotsLoading(false) })
  }, [slug, mode, newDate, appt, newTime])

  async function handleCancel() {
    if (!appt) return
    if (!confirm('Cancel this appointment?')) return
    setActionState('busy'); setActionErr(null); setActionMsg(null)
    try {
      const res = await cancelManageBooking(slug, token)
      setActionMsg(res.message)
      setActionState('done')
      // Refresh underlying state
      setAppt(prev => prev ? { ...prev, status: 'cancelled', is_terminal: true, can_cancel: false, can_reschedule: false } : prev)
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Cancellation failed')
      setActionState('error')
    }
  }

  async function handleReschedule() {
    if (!appt || !newDate || !newTime) return
    setActionState('busy'); setActionErr(null); setActionMsg(null)
    try {
      const res = await rescheduleManageBooking(slug, token, {
        appointment_date: newDate,
        start_time:       newTime,
      })
      setActionMsg(res.message)
      setActionState('done')
      if (res.appointment) setAppt(res.appointment)
      setMode('view')
      setNewDate(''); setNewTime('')
    } catch (e) {
      setActionErr(e instanceof Error ? e.message : 'Reschedule failed')
      setActionState('error')
    }
  }

  // Build a simple date range for the date picker (today → +60 days)
  const dateOptions = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const arr: { iso: string; label: string }[] = []
    for (let i = 0; i < 60; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i)
      arr.push({
        iso:   dateKey(d),
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      })
    }
    return arr
  }, [])

  if (loadState === 'loading') {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-12">
          <Loader2 size={14} className="animate-spin" /> Loading your booking…
        </div>
      </Shell>
    )
  }

  if (loadState === 'not_found' || ! appt) {
    return (
      <Shell>
        <Card>
          <h1 className="text-base font-bold text-near-black mb-1">Booking not found</h1>
          <p className="text-[13px] text-muted-text">
            We couldn&rsquo;t find a booking for this link. It may have expired or already been cancelled.
          </p>
        </Card>
      </Shell>
    )
  }

  if (loadState === 'error') {
    return (
      <Shell>
        <Card tone="error">
          <p className="text-[13px] text-[#b42828] flex items-center gap-2">
            <AlertCircle size={14} /> {loadErr ?? 'Could not load this booking.'}
          </p>
        </Card>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Top: appointment card */}
      <Card>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">Your booking</p>
        <h1 className="text-lg font-bold text-near-black tracking-tight mb-3">
          {appt.service_name}
        </h1>

        <dl className="grid grid-cols-1 gap-2 text-[13px]">
          <Row label="Name"    value={appt.customer_name} />
          <Row label="Date"    value={fmtDate(appt.appointment_date)} icon={<Calendar size={12} />} />
          <Row label="Time"    value={`${fmt12(appt.start_time)} – ${fmt12(appt.end_time)}`} icon={<Clock size={12} />} />
          <Row label="Status"  value={statusLabel(appt.status)} />
        </dl>

        {actionMsg && (
          <div className="mt-4 px-3 py-2.5 bg-[rgba(20,140,80,0.06)] border border-[rgba(20,140,80,0.30)] text-[12px] text-[#0f6f3d] inline-flex items-center gap-1.5">
            <CheckCircle2 size={12} /> {actionMsg}
          </div>
        )}
        {actionErr && (
          <div className="mt-4 px-3 py-2.5 bg-[rgba(180,40,40,0.05)] border border-[rgba(180,40,40,0.30)] text-[12px] text-[#b42828] inline-flex items-center gap-1.5">
            <AlertCircle size={12} /> {actionErr}
          </div>
        )}

        {/* Actions */}
        {! appt.is_terminal && mode === 'view' && (
          <div className="mt-5 pt-4 border-t border-[rgba(18,18,18,0.08)] flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('reschedule')}
              disabled={! appt.can_reschedule}
              title={appt.can_reschedule ? '' : `Reschedules need ${appt.reschedule_window_hours}h notice.`}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2 hover:bg-white hover:text-near-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={11} /> Reschedule
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={! appt.can_cancel || actionState === 'busy'}
              title={appt.can_cancel ? '' : `Cancellations need ${appt.cancellation_window_hours}h notice.`}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-white text-[#b42828] border border-[rgba(180,40,40,0.40)] px-3 py-2 hover:bg-[rgba(180,40,40,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionState === 'busy'
                ? <><Loader2 size={11} className="animate-spin" /> Cancelling</>
                : <><XCircle size={11} /> Cancel</>}
            </button>
          </div>
        )}

        {appt.is_terminal && (
          <p className="mt-4 text-[12px] text-muted-text">
            This booking has been {statusLabel(appt.status).toLowerCase()} and can no longer be changed online.
            Reply to your confirmation email if you need help.
          </p>
        )}
      </Card>

      {/* Reschedule panel */}
      {mode === 'reschedule' && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">Pick a new time</p>
            <button
              type="button"
              onClick={() => { setMode('view'); setNewDate(''); setNewTime(''); setActionErr(null) }}
              className="text-[11px] font-semibold tracking-tight text-near-black hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeft size={11} /> Back
            </button>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">New date</span>
            <select
              value={newDate}
              onChange={e => { setNewDate(e.target.value); setNewTime('') }}
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            >
              <option value="">Choose a date…</option>
              {dateOptions.map(d => (
                <option key={d.iso} value={d.iso}>{d.label}</option>
              ))}
            </select>
          </label>

          {newDate && (
            <div className="mt-4">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-2">Available times</p>
              {slotsLoading ? (
                <p className="text-[12px] text-muted-text inline-flex items-center gap-1.5">
                  <Loader2 size={12} className="animate-spin" /> Loading…
                </p>
              ) : slots.length === 0 ? (
                <p className="text-[12px] text-muted-text">{slotsMsg ?? 'No available times.'}</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {slots.map(s => {
                    const active = newTime === s.start_time
                    return (
                      <button
                        key={s.start_time}
                        type="button"
                        onClick={() => setNewTime(s.start_time)}
                        className={
                          'px-2 py-1.5 text-[12px] font-semibold border ' +
                          (active
                            ? 'bg-near-black border-near-black text-white'
                            : 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black')
                        }
                      >
                        {fmt12(s.start_time)}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-[rgba(18,18,18,0.08)]">
            <button
              type="button"
              onClick={handleReschedule}
              disabled={! newDate || ! newTime || actionState === 'busy'}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2 hover:bg-white hover:text-near-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionState === 'busy'
                ? <><Loader2 size={11} className="animate-spin" /> Rescheduling</>
                : <>Confirm new time</>}
            </button>
          </div>
        </Card>
      )}
    </Shell>
  )
}

function statusLabel(s: string): string {
  if (s === 'pending')   return 'Pending'
  if (s === 'confirmed') return 'Confirmed'
  if (s === 'cancelled') return 'Cancelled'
  if (s === 'completed') return 'Completed'
  if (s === 'no_show')   return 'No-show'
  return s
}

// ── Layout primitives ──────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <header className="px-1">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-near-black">BookReady</p>
          <p className="text-[11px] text-muted-text">Manage your booking</p>
        </header>
        {children}
      </div>
    </div>
  )
}

function Card({ children, tone }: { children: React.ReactNode; tone?: 'error' }) {
  return (
    <section className={
      'bg-white border p-5 ' +
      (tone === 'error'
        ? 'border-[rgba(180,40,40,0.30)]'
        : 'border-[rgba(18,18,18,0.10)]')
    }>
      {children}
    </section>
  )
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[11px] text-muted-text uppercase tracking-[0.06em]">{label}</dt>
      <dd className="text-[13px] font-semibold text-near-black inline-flex items-center gap-1.5">
        {icon}{value}
      </dd>
    </div>
  )
}
