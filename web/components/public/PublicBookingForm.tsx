'use client'

import { useState } from 'react'
import { createPublicAppointment } from '@/lib/api'
import type { PublicBookingPayload, Service } from '@/lib/types'

interface Props {
  slug: string
  services: Service[]
}

export default function PublicBookingForm({ slug, services }: Props) {
  const active = services.filter(s => s.is_active)

  const [serviceId, setServiceId] = useState(active[0]?.id?.toString() ?? '')
  const [date,      setDate]      = useState('')
  const [time,      setTime]      = useState('')
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [notes,     setNotes]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!serviceId || !date || !time || !name.trim()) {
      setError('Please fill in all required fields.')
      return
    }

    setLoading(true)
    try {
      const payload: PublicBookingPayload = {
        service_id:       parseInt(serviceId),
        appointment_date: date,
        start_time:       time,
        customer_name:    name.trim(),
        customer_email:   email.trim()  || undefined,
        customer_phone:   phone.trim()  || undefined,
        notes:            notes.trim()  || undefined,
      }
      await createPublicAppointment(slug, payload)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (active.length === 0) {
    return (
      <p className="text-sm text-[#6B7280]">Services are not available yet.</p>
    )
  }

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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-[12px] text-red-600">
          {error}
        </div>
      )}

      {/* Service */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[#121212] tracking-wide">
          Service <span className="text-red-500">*</span>
        </label>
        <select
          value={serviceId}
          onChange={e => setServiceId(e.target.value)}
          required
          className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212] appearance-auto"
          style={{ fontFamily: 'inherit' }}
        >
          {active.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.duration_minutes} min · ${Number(s.price).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {/* Date + Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[#121212] tracking-wide">
            Preferred Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212]"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[#121212] tracking-wide">
            Preferred Time <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212]"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[#121212] tracking-wide">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full name"
          required
          className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212] placeholder:text-[#9CA3AF]"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[#121212] tracking-wide">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212] placeholder:text-[#9CA3AF]"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-semibold text-[#121212] tracking-wide">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="555-555-5555"
            className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212] placeholder:text-[#9CA3AF]"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold text-[#121212] tracking-wide">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Any notes or special requests…"
          rows={3}
          className="w-full px-3 py-2.5 border border-[rgba(18,18,18,0.15)] bg-white text-[13px] text-[#121212] placeholder:text-[#9CA3AF] resize-y"
          style={{ fontFamily: 'inherit' }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 bg-[#121212] text-white text-[11px] font-bold tracking-[0.12em] uppercase hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending…' : 'Request Booking'}
      </button>

      <p className="text-[11px] text-[#9CA3AF] text-center">
        No payment required — the business will confirm your appointment.
      </p>
    </form>
  )
}
