'use client'

import { useState, useEffect, useRef } from 'react'
import { getPublicAvailability, createPublicAppointment } from '@/lib/api'
import type { AvailableSlot, PublicBookingPayload, Service } from '@/lib/types'

interface Props {
  slug: string
  services: Service[]
}

type SlotState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; slots: AvailableSlot[]; message: string | null }
  | { status: 'error'; message: string }

export default function PublicBookingForm({ slug, services }: Props) {
  const active = services.filter(s => s.is_active)

  const [serviceId,     setServiceId]     = useState(active[0]?.id?.toString() ?? '')
  const [date,          setDate]          = useState('')
  const [slotState,     setSlotState]     = useState<SlotState>({ status: 'idle' })
  const [selectedSlot,  setSelectedSlot]  = useState<string>('')   // "HH:MM"
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [phone,         setPhone]         = useState('')
  const [notes,         setNotes]         = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [success,       setSuccess]       = useState(false)
  const [submitError,   setSubmitError]   = useState<string | null>(null)

  const today      = new Date().toISOString().slice(0, 10)
  const fetchRef   = useRef(0) // cancel stale fetches

  // Fetch slots whenever service or date changes
  useEffect(() => {
    if (!serviceId || !date) {
      setSlotState({ status: 'idle' })
      setSelectedSlot('')
      return
    }

    const id = ++fetchRef.current
    setSlotState({ status: 'loading' })
    setSelectedSlot('')

    getPublicAvailability(slug, parseInt(serviceId), date)
      .then(res => {
        if (id !== fetchRef.current) return // stale
        setSlotState({ status: 'loaded', slots: res.slots, message: res.message })
      })
      .catch(err => {
        if (id !== fetchRef.current) return
        setSlotState({ status: 'error', message: err instanceof Error ? err.message : 'Failed to load times.' })
      })
  }, [serviceId, date, slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!serviceId || !date || !selectedSlot) {
      setSubmitError('Please select a service, date, and time.')
      return
    }
    if (!name.trim()) {
      setSubmitError('Please enter your name.')
      return
    }

    setSubmitting(true)
    try {
      const payload: PublicBookingPayload = {
        service_id:       parseInt(serviceId),
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
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── No services ────────────────────────────────────────────────────────────
  if (active.length === 0) {
    return <p className="text-sm text-[#6B7280]">Services are not available yet.</p>
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="p-5 bg-[#F8F6F2] border-l-4 border-[#121212]">
        <p className="text-[13px] font-semibold text-[#121212] mb-1">Booking request sent</p>
        <p className="text-[12px] text-[#6B7280]">
          Your booking request was sent. The business will confirm your appointment.
        </p>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Service */}
      <Field label="Service" required>
        <select
          value={serviceId}
          onChange={e => setServiceId(e.target.value)}
          required
          className={inputCls}
          style={{ fontFamily: 'inherit' }}
        >
          {active.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes} min · ${Number(s.price).toFixed(2)}
            </option>
          ))}
        </select>
      </Field>

      {/* Date */}
      <Field label="Preferred Date" required>
        <input
          type="date"
          value={date}
          min={today}
          onChange={e => setDate(e.target.value)}
          required
          className={inputCls}
          style={{ fontFamily: 'inherit' }}
        />
      </Field>

      {/* Slot picker */}
      {(serviceId && date) && (
        <div>
          <p className={labelCls}>
            Available Times <span className="text-red-500">*</span>
          </p>

          {slotState.status === 'loading' && (
            <p className="text-[12px] text-[#6B7280] py-2">Loading available times…</p>
          )}

          {slotState.status === 'error' && (
            <p className="text-[12px] text-red-500 py-2">{slotState.message}</p>
          )}

          {slotState.status === 'loaded' && slotState.slots.length === 0 && (
            <div className="py-3 px-4 bg-[#F8F6F2] border border-[rgba(18,18,18,0.08)]">
              <p className="text-[12px] text-[#6B7280]">
                {slotState.message ?? 'No available times for this date. Try another day.'}
              </p>
            </div>
          )}

          {slotState.status === 'loaded' && slotState.slots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slotState.slots.map(slot => {
                const selected = selectedSlot === slot.start_time
                return (
                  <button
                    key={slot.start_time}
                    type="button"
                    onClick={() => setSelectedSlot(slot.start_time)}
                    className={[
                      'py-2.5 px-1 text-[12px] font-medium border transition-colors text-center',
                      selected
                        ? 'bg-[#121212] text-white border-[#121212]'
                        : 'bg-white text-[#121212] border-[rgba(18,18,18,0.15)] hover:border-[#121212]',
                    ].join(' ')}
                  >
                    {slot.label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Contact fields — always visible so user can fill while browsing */}
      <div className="pt-1 flex flex-col gap-4 border-t border-[rgba(18,18,18,0.08)]">
        <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-[#6B7280] pt-1">
          Your Details
        </p>

        <Field label="Full Name" required>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Full name"
            required
            className={inputCls}
            style={{ fontFamily: 'inherit' }}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
              style={{ fontFamily: 'inherit' }}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="555-555-5555"
              className={inputCls}
              style={{ fontFamily: 'inherit' }}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any notes or special requests…"
            rows={3}
            className={`${inputCls} resize-y`}
            style={{ fontFamily: 'inherit' }}
          />
        </Field>
      </div>

      {/* Submit error */}
      {submitError && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-[12px] text-red-600">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !selectedSlot || slotState.status === 'loading'}
        className="w-full py-3.5 bg-[#121212] text-white text-[11px] font-bold tracking-[0.12em] uppercase transition-colors hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending…' : 'Request Booking'}
      </button>

      <p className="text-[11px] text-[#9CA3AF] text-center -mt-1">
        No payment required — the business will confirm your appointment.
      </p>

    </form>
  )
}

// ── Shared atoms ───────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelCls}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const labelCls = 'text-[11px] font-semibold text-[#121212] tracking-wide'
const inputCls = 'w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212] placeholder:text-[#9CA3AF] outline-none focus:border-[#121212] transition-colors'
