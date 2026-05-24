'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight,
  Clock, Heart, CalendarCheck,
} from 'lucide-react'
import { getPublicAvailability, createPublicAppointment } from '@/lib/api'
import type {
  AvailableSlot, PublicBookingPayload, Service,
  AvailabilityData, PublicPaymentSettings,
} from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function dateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function fmt12(t: string): string {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function fmtDateDisplay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4

type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; slots: AvailableSlot[]; message: string | null }
  | { status: 'error'; message: string }

const STEPS: [Step, string][] = [[1, 'Service'], [2, 'Date & Time'], [3, 'Details'], [4, 'Confirm']]

// ── Component ─────────────────────────────────────────────────────────────────

export default function TheFadeRoomBooking({
  slug,
  services,
  displayName,
  availability,
  paymentSettings,
}: {
  slug: string
  services: Service[]
  displayName: string
  availability: AvailabilityData | null
  paymentSettings: PublicPaymentSettings | null
}) {
  const [step,         setStep]         = useState<Step>(1)
  const [serviceId,    setServiceId]    = useState<number | null>(null)
  const [date,         setDate]         = useState('')
  const [slotState,    setSlotState]    = useState<SlotState>({ status: 'idle' })
  const [selectedSlot, setSelectedSlot] = useState('')
  const [name,         setName]         = useState('')
  const [email,        setEmail]        = useState('')
  const [phone,        setPhone]        = useState('')
  const [notes,        setNotes]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)
  const fetchRef = useRef(0)

  const selectedService = services.find(s => s.id === serviceId) ?? null

  // ── Calendar state ──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Availability helpers — day_of_week: 0=Sunday matches JS Date.getDay()
  const openByDow: Record<number, boolean> = (() => {
    const map: Record<number, boolean> = { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true }
    if (availability?.hours && availability.hours.length > 0) {
      // Default to false when we have hours data, then mark open days
      for (let i = 0; i < 7; i++) map[i] = false
      for (const h of availability.hours) {
        if (h.is_open) map[h.day_of_week] = true
      }
    }
    return map
  })()

  const maxDaysAhead = availability?.settings?.max_days_ahead ?? null
  const maxDate = maxDaysAhead != null
    ? (() => { const d = new Date(today); d.setDate(d.getDate() + maxDaysAhead); return d })()
    : null

  function isDateBlocked(d: Date): boolean {
    if (d < today) return true
    if (!openByDow[d.getDay()]) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  // Same stale-fetch protection pattern as before
  useEffect(() => {
    if (!serviceId || !date) {
      setSlotState({ status: 'idle' })
      setSelectedSlot('')
      return
    }
    const id = ++fetchRef.current
    setSlotState({ status: 'loading' })
    setSelectedSlot('')

    getPublicAvailability(slug, serviceId, date)
      .then(res => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'loaded', slots: res.slots, message: res.message })
      })
      .catch(err => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load times.' })
      })
  }, [serviceId, date, slug])

  // Compute a preview of the deposit the client will be charged. Used to
  // show the deposit notice on the Confirm step. Authoritative calc still
  // runs on the server — this is just a friendly heads-up.
  const depositPreview: number | null = (() => {
    if (!paymentSettings) return null
    if (!paymentSettings.payments_enabled) return null
    if (!paymentSettings.deposits_enabled) return null
    const amount = paymentSettings.deposit_amount
    if (amount == null || amount <= 0) return null
    if (paymentSettings.deposit_type === 'flat') {
      return Math.round(amount * 100) / 100
    }
    if (paymentSettings.deposit_type === 'percent') {
      const price = selectedService?.price ?? null
      if (price == null || price <= 0) return null
      const pct = Math.max(0, Math.min(100, amount))
      const dep = Math.min(price, (price * pct) / 100)
      return Math.round(dep * 100) / 100
    }
    return null
  })()

  const depositRequired = depositPreview != null

  async function handleSubmit() {
    if (!serviceId || !date || !selectedSlot || !name.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload: PublicBookingPayload = {
        service_id:       serviceId,
        appointment_date: date,
        start_time:       selectedSlot,
        customer_name:    name.trim(),
        customer_email:   email.trim()  || undefined,
        customer_phone:   phone.trim()  || undefined,
        notes:            notes.trim()  || undefined,
      }
      const res = await createPublicAppointment(slug, payload)
      if (res.checkout_url) {
        // Hand control off to Stripe — webhook will finalize the booking
        // once payment completes.
        window.location.href = res.checkout_url
        return
      }
      setSuccess(true)
    } catch (err) {
      const raw = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      const isConflict = /no longer available|not available|slot|conflict|422/i.test(raw)
      setSubmitError(
        isConflict
          ? 'This time is no longer available. Please go back and choose another slot.'
          : raw
      )
    } finally {
      setSubmitting(false)
    }
  }

  function gotoPrevMonth() {
    setViewMonth(m => {
      if (m === 0) { setViewYear(y => y - 1); return 11 }
      return m - 1
    })
  }
  function gotoNextMonth() {
    setViewMonth(m => {
      if (m === 11) { setViewYear(y => y + 1); return 0 }
      return m + 1
    })
  }

  const isPrevMonthDisabled = (() => {
    const lastOfPrev = new Date(viewYear, viewMonth, 0)
    return lastOfPrev < today
  })()
  const isNextMonthDisabled = (() => {
    if (!maxDate) return false
    const firstOfNext = new Date(viewYear, viewMonth + 1, 1)
    return firstOfNext > maxDate
  })()

  // ── Success ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="tfr-booking-success">
        <div className="tfr-booking-success-icon" aria-hidden="true">
          <Heart size={48} fill="currentColor" />
        </div>
        <p className="tfr-booking-eyebrow">Booking request sent</p>
        <h3>You&apos;re on the books</h3>
        <p className="tfr-booking-success-copy">
          Your request was sent to <strong>{displayName}</strong>.
          They will confirm your appointment shortly.
        </p>
        {selectedService && date && selectedSlot && (
          <div className="tfr-booking-success-summary">
            <span>{selectedService.name}</span>
            <span className="tfr-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmtDateDisplay(date)}</span>
            <span className="tfr-booking-success-dot" aria-hidden="true">·</span>
            <span>{fmt12(selectedSlot)}</span>
          </div>
        )}
        <p className="tfr-booking-success-note">
          No payment required — payment is handled at the appointment.
        </p>
      </div>
    )
  }

  // ── Guards ─────────────────────────────────────────────────────────────────

  const canStep2 = serviceId !== null
  const canStep3 = canStep2 && !!date && !!selectedSlot
  const canStep4 = canStep3 && name.trim().length > 0

  function stepClass(n: Step) {
    if (step === n) return 'tfr-booking-step is-active'
    if (step > n)  return 'tfr-booking-step is-done'
    return 'tfr-booking-step'
  }

  // ── Calendar grid build ──
  const firstDay   = startOfMonth(viewYear, viewMonth)
  const startWeekday = firstDay.getDay() // 0=Sun
  const daysCount  = daysInMonth(viewYear, viewMonth)
  const cells: ({ d: Date } | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysCount; day++) cells.push({ d: new Date(viewYear, viewMonth, day) })
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <section className="tfr-booking-section">

      {/* ── Progress header ── */}
      <div className="tfr-booking-head">
        <span className="tfr-booking-eyebrow">Book Online</span>
        <h2>Reserve Your Appointment</h2>
        <div className="tfr-booking-progress" role="tablist">
          {STEPS.map(([n, label]) => (
            <button
              key={n}
              role="tab"
              aria-selected={step === n}
              className={stepClass(n)}
              onClick={() => { if (n < step) setStep(n) }}
            >
              <span className="tfr-booking-step-num">
                {step > n ? <Check size={12} strokeWidth={3} /> : n}
              </span>
              <span className="tfr-booking-step-label">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="tfr-booking-slides">

        {/* ── Step 1: Service ── */}
        <div className={`tfr-booking-slide${step === 1 ? ' is-active' : ''}`}>
          {services.length === 0 ? (
            <p style={{ color: 'var(--tfr-muted)', fontSize: 14 }}>No services available yet.</p>
          ) : (
            <>
              <div className="tfr-booking-services">
                {services.map(s => (
                  <div
                    key={s.id}
                    className={`tfr-booking-service-card${serviceId === s.id ? ' is-selected' : ''}`}
                  >
                    <div className="tfr-booking-service-top">
                      <h3>{s.name}</h3>
                      <span className="tfr-booking-price">${Number(s.price).toFixed(2)}</span>
                    </div>
                    {s.description && <p className="tfr-booking-desc">{s.description}</p>}
                    <p className="tfr-booking-meta">
                      <Clock size={12} /> {s.duration_minutes} min
                    </p>
                    <button
                      className="tfr-booking-pick"
                      onClick={() => { setServiceId(s.id); setStep(2) }}
                    >
                      Select <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="tfr-booking-nav" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  className="tfr-booking-next"
                  disabled={!canStep2}
                  onClick={() => setStep(2)}
                >
                  Continue <ArrowRight size={12} />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Step 2: Date & Time ── */}
        <div className={`tfr-booking-slide${step === 2 ? ' is-active' : ''}`}>
          <div className="tfr-booking-datetime">

            <div className="tfr-booking-block">
              <span className="tfr-booking-block-label">Pick a Day</span>

              {/* Calendar */}
              <div className="tfr-booking-calendar">
                <div className="tfr-calendar-head">
                  <button
                    type="button"
                    className="tfr-calendar-nav"
                    onClick={gotoPrevMonth}
                    disabled={isPrevMonthDisabled}
                    aria-label="Previous month"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="tfr-calendar-title">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <button
                    type="button"
                    className="tfr-calendar-nav"
                    onClick={gotoNextMonth}
                    disabled={isNextMonthDisabled}
                    aria-label="Next month"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                <div className="tfr-calendar-dow">
                  {DAY_SHORT.map(d => <span key={d}>{d}</span>)}
                </div>

                <div className="tfr-calendar-grid" role="grid">
                  {cells.map((c, i) => {
                    if (!c) return <span key={i} className="tfr-calendar-day tfr-calendar-day--empty" aria-hidden="true" />
                    const blocked  = isDateBlocked(c.d)
                    const isToday  = isSameDay(c.d, today)
                    const key      = dateKey(c.d)
                    const selected = date === key
                    return (
                      <button
                        key={i}
                        type="button"
                        role="gridcell"
                        className={
                          'tfr-calendar-day'
                          + (blocked  ? ' tfr-calendar-day--blocked'  : '')
                          + (isToday  ? ' tfr-calendar-day--today'    : '')
                          + (selected ? ' tfr-calendar-day--selected' : '')
                        }
                        disabled={blocked}
                        aria-label={c.d.toDateString() + (blocked ? ' (closed)' : '')}
                        onClick={() => { if (!blocked) setDate(key) }}
                      >
                        {c.d.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="tfr-booking-block">
              <span className="tfr-booking-block-label">Available Times</span>
              {!date && (
                <p className="tfr-slot-msg">Select a day above to see available times.</p>
              )}
              {slotState.status === 'loading' && (
                <p className="tfr-slot-msg">Loading times…</p>
              )}
              {slotState.status === 'error' && (
                <p className="tfr-slot-msg tfr-slot-error">{slotState.message}</p>
              )}
              {slotState.status === 'loaded' && slotState.slots.length === 0 && (
                <p className="tfr-slot-msg">{slotState.message ?? 'No times available. Try another day.'}</p>
              )}
              {slotState.status === 'loaded' && slotState.slots.length > 0 && (
                <div className="tfr-booking-times">
                  {slotState.slots.map(slot => (
                    <button
                      key={slot.start_time}
                      className={`tfr-booking-time${selectedSlot === slot.start_time ? ' is-selected' : ''}`}
                      onClick={() => setSelectedSlot(slot.start_time)}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="tfr-booking-nav">
              <button className="tfr-booking-back" onClick={() => setStep(1)}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="tfr-booking-next"
                disabled={!canStep3}
                onClick={() => setStep(3)}
              >
                Continue <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 3: Details ── */}
        <div className={`tfr-booking-slide${step === 3 ? ' is-active' : ''}`}>
          <div className="tfr-booking-fields">
            <label>
              <span>Full Name *</span>
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              <span>Email</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              <span>Phone</span>
              <input
                type="tel"
                placeholder="(000) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label>
              <span>Notes</span>
              <textarea
                placeholder="Any special requests or notes…"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                className="tfr-booking-textarea"
              />
            </label>
          </div>
          <div className="tfr-booking-nav" style={{ marginTop: 20 }}>
            <button className="tfr-booking-back" onClick={() => setStep(2)}>
              <ArrowLeft size={12} /> Back
            </button>
            <button
              className="tfr-booking-next"
              disabled={!name.trim()}
              onClick={() => setStep(4)}
            >
              Review <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* ── Step 4: Confirm ── */}
        <div className={`tfr-booking-slide${step === 4 ? ' is-active' : ''}`}>
          <div className="tfr-booking-confirm">

            <div className="tfr-booking-summary">
              <span className="tfr-booking-block-label">Your Appointment</span>
              <dl>
                {selectedService && (
                  <div><dt>Service</dt><dd>{selectedService.name}</dd></div>
                )}
                <div><dt>Date</dt><dd>{date ? fmtDateDisplay(date) : '—'}</dd></div>
                <div><dt>Time</dt><dd>{selectedSlot ? fmt12(selectedSlot) : '—'}</dd></div>
                {selectedService && (
                  <div><dt>Duration</dt><dd>{selectedService.duration_minutes} min</dd></div>
                )}
                {selectedService && (
                  <div className="tfr-booking-total">
                    <dt>Total</dt>
                    <dd>${Number(selectedService.price).toFixed(2)}</dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="tfr-booking-summary" style={{ marginTop: 12 }}>
              <span className="tfr-booking-block-label">Your Info</span>
              <dl>
                <div><dt>Name</dt><dd>{name}</dd></div>
                {email && <div><dt>Email</dt><dd>{email}</dd></div>}
                {phone && <div><dt>Phone</dt><dd>{phone}</dd></div>}
                {notes && <div><dt>Notes</dt><dd>{notes}</dd></div>}
              </dl>
            </div>

            {depositRequired && (
              <div className="tfr-booking-summary" style={{ marginTop: 12 }}>
                <span className="tfr-booking-block-label">Deposit Required</span>
                <dl>
                  <div className="tfr-booking-total">
                    <dt>Deposit due now</dt>
                    <dd>${depositPreview!.toFixed(2)}</dd>
                  </div>
                  {selectedService && selectedService.price > depositPreview! && (
                    <div>
                      <dt>Balance at appointment</dt>
                      <dd>${(selectedService.price - depositPreview!).toFixed(2)}</dd>
                    </div>
                  )}
                </dl>
                <p style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  You&apos;ll be sent to a secure Stripe page to pay your deposit. Your booking is reserved once the deposit clears.
                </p>
              </div>
            )}

            {submitError && (
              <div className="tfr-booking-error">{submitError}</div>
            )}

            <div className="tfr-booking-nav">
              <button className="tfr-booking-back" onClick={() => setStep(3)}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="tfr-booking-confirm-btn"
                disabled={submitting || !canStep4}
                onClick={handleSubmit}
              >
                {submitting
                  ? (depositRequired ? 'Redirecting to payment…' : 'Sending…')
                  : depositRequired
                    ? <>Pay Deposit & Book <Check size={14} strokeWidth={3} /></>
                    : <>Confirm Booking <Check size={14} strokeWidth={3} /></>
                }
              </button>
            </div>

            <p className="tfr-booking-disclaimer">
              <CalendarCheck size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
              {depositRequired
                ? 'A deposit is required to reserve your appointment.'
                : 'No payment required — the business will confirm your appointment.'}
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
