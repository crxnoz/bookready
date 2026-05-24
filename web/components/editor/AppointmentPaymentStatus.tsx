'use client'

import type { Appointment } from '@/lib/types'
import { cn } from '@/lib/cn'

// Payment status → label + chip style. Mirrors the StatusPill design but
// with a quieter palette so it never out-shouts the booking-status pill.
const PAYMENT_CFG: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: 'Deposit pending', cls: 'bg-white border border-[rgba(180,120,0,0.35)] text-[#8a5a00]' },
  deposit_paid:    { label: 'Deposit paid',    cls: 'bg-white border border-[rgba(20,140,80,0.40)] text-[#0f6f3d]' },
  paid:            { label: 'Paid',            cls: 'bg-white border border-[rgba(20,140,80,0.40)] text-[#0f6f3d]' },
  failed:          { label: 'Payment failed',  cls: 'bg-white border border-[rgba(180,40,40,0.40)] text-[#b42828]' },
  refunded:        { label: 'Refunded',        cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text' },
}

/**
 * Inline pill showing the appointment's payment status. Renders nothing
 * when no payment is required (status missing / null / 'none') so old
 * appointments don't get a redundant chip.
 */
export function PaymentPill({ appt }: { appt: Appointment }) {
  const status = appt.payment_status
  if (!status || status === 'none') return null
  const cfg = PAYMENT_CFG[status] ?? { label: status, cls: 'bg-white border border-[rgba(18,18,18,0.12)] text-near-black' }
  return (
    <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 flex-shrink-0 whitespace-nowrap', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

/**
 * One-line summary of deposit / paid / balance amounts. Renders nothing
 * when payment isn't relevant for this appointment.
 */
export function PaymentSummary({ appt }: { appt: Appointment }) {
  const status = appt.payment_status
  if (!status || status === 'none') return null
  const cur = (appt.currency ?? 'USD').toUpperCase()
  const sym = cur === 'USD' ? '$' : ''
  const dep   = appt.deposit_amount       ?? null
  const depPd = appt.deposit_paid_amount  ?? null
  const due   = appt.amount_due           ?? null
  const parts: string[] = []
  if (dep != null) parts.push(`Deposit ${sym}${dep.toFixed(2)}`)
  if (depPd != null && depPd > 0 && status !== 'pending_payment') {
    parts.push(`paid ${sym}${depPd.toFixed(2)}`)
  }
  if (due != null && due > 0) parts.push(`balance ${sym}${due.toFixed(2)}`)
  if (parts.length === 0) return null
  return (
    <p className="text-[11px] text-muted-text truncate mt-0.5">
      {parts.join(' · ')}
    </p>
  )
}
