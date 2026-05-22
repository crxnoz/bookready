'use client'

import { useState, useEffect, useRef } from 'react'
import { getPublicAvailability, createPublicAppointment } from '@/lib/api'
import type { AvailableSlot, PublicBookingPayload, Service } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getNext14Days(): Date[] {
  const days: Date[] = []
  const now = new Date()
  for (let i = 0; i < 14; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    days.push(d)
  }
  return days
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
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
}: {
  slug: string
  services: Service[]
  displayName: string
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
  const days = getNext14Days()

  // Same stale-fetch protection pattern as PublicBookingForm
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
      await createPublicAppointment(slug, payload)
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

  // ── Success ────────────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="tfr-booking-success">
        <div className="tfr-booking-success-icon">♥</div>
        <p className="tfr-booking-eyebrow">Booking request sent</p>
        <h3>You&apos;re on the books</h3>
        <p className="tfr-booking-success-copy">
          Your request was sent to <strong>{displayName}</strong>.
          They will confirm your appointment shortly.
        </p>
        {selectedService && date && selectedSlot && (
          <div className="tfr-booking-success-summary">
            <span>{selectedService.name}</span>
            <span className="tfr-booking-success-dot">·</span>
            <span>{fmtDateDisplay(date)}</span>
            <span className="tfr-booking-success-dot">·</span>
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
              <span className="tfr-booking-step-num">{step > n ? '✓' : n}</span>
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
                    <p className="tfr-booking-meta">⏱ {s.duration_minutes} min</p>
                    <button
                      className="tfr-booking-pick"
                      onClick={() => { setServiceId(s.id); setStep(2) }}
                    >
                      Select →
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
                  Continue →
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
              <div className="tfr-booking-days">
                {days.map(d => {
                  const key = dateKey(d)
                  return (
                    <button
                      key={key}
                      className={`tfr-booking-day${date === key ? ' is-selected' : ''}`}
                      onClick={() => setDate(key)}
                    >
                      <span>{DAY_SHORT[d.getDay()]}</span>
                      <strong>{d.getDate()}</strong>
                    </button>
                  )
                })}
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
              <button className="tfr-booking-back" onClick={() => setStep(1)}>← Back</button>
              <button
                className="tfr-booking-next"
                disabled={!canStep3}
                onClick={() => setStep(3)}
              >
                Continue →
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
            <button className="tfr-booking-back" onClick={() => setStep(2)}>← Back</button>
            <button
              className="tfr-booking-next"
              disabled={!name.trim()}
              onClick={() => setStep(4)}
            >
              Review →
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

            {submitError && (
              <div className="tfr-booking-error">{submitError}</div>
            )}

            <div className="tfr-booking-nav">
              <button className="tfr-booking-back" onClick={() => setStep(3)}>← Back</button>
              <button
                className="tfr-booking-confirm-btn"
                disabled={submitting || !canStep4}
                onClick={handleSubmit}
              >
                {submitting ? 'Sending…' : 'Confirm Booking ✓'}
              </button>
            </div>

            <p className="tfr-booking-disclaimer">
              No payment required — the business will confirm your appointment.
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}
