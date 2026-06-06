'use client'

import type { Appointment } from '@/lib/types'
import { cn } from '@/lib/cn'

// Payment status → label + chip style. Mirrors the StatusPill design but
// with a quieter palette so it never out-shouts the booking-status pill.
const PAYMENT_CFG: Record<string, { label: string; cls: string }> = {
  pending_payment:     { label: 'Deposit pending',     cls: 'bg-white border border-[rgba(180,120,0,0.35)] text-[#8a5a00]' },
  deposit_paid:        { label: 'Deposit paid',        cls: 'bg-white border border-[rgba(20,140,80,0.40)] text-[#0f6f3d]' },
  paid:                { label: 'Paid',                cls: 'bg-white border border-[rgba(20,140,80,0.40)] text-[#0f6f3d]' },
  failed:              { label: 'Payment failed',      cls: 'bg-white border border-[rgba(180,40,40,0.40)] text-[#b42828]' },
  refunded:            { label: 'Refunded',            cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text' },
  partially_refunded:  { label: 'Partially refunded',  cls: 'bg-white border border-[rgba(18,18,18,0.20)] text-muted-text' },
}

// Open dispute statuses we treat as live ("there's a chargeback in flight").
// `won` / `lost` / `warning_closed` are resolved and shouldn't paint the pill.
const ACTIVE_DISPUTE_STATUSES = new Set([
  'warning_needs_response', 'warning_under_review',
  'needs_response',         'under_review',
])

/**
 * Inline pill showing the appointment's payment status. Renders nothing
 * when no payment is required (status missing / null / 'none') so old
 * appointments don't get a redundant chip. An active dispute outranks
 * everything — we paint a single loud red 'Disputed' chip instead.
 */
export function PaymentPill({ appt }: { appt: Appointment }) {
  const status = appt.payment_status
  if (!status || status === 'none') return null

  // Disputes win the pill — owner needs to see it before anything else.
  if (appt.dispute_status && ACTIVE_DISPUTE_STATUSES.has(appt.dispute_status)) {
    return (
      <span className={cn('text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 flex-shrink-0 whitespace-nowrap', 'bg-[#fff3f3] border border-[rgba(180,40,40,0.55)] text-[#b42828]')}>
        Disputed
      </span>
    )
  }

  const cfg = PAYMENT_CFG[status] ?? { label: status.replace(/_/g, ' '), cls: 'bg-white border border-[rgba(18,18,18,0.12)] text-near-black' }
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
  const refunded = appt.refunded_amount     ?? null
  const balPaid  = appt.balance_paid_amount ?? null
  const tip      = appt.tip_amount          ?? null
  const lateFee  = appt.late_fee_amount     ?? null
  if (dep != null) parts.push(`Deposit ${sym}${dep.toFixed(2)}`)
  if (depPd != null && depPd > 0 && status !== 'pending_payment') {
    parts.push(`paid ${sym}${depPd.toFixed(2)}`)
  }
  if (balPaid != null && balPaid > 0) {
    parts.push(`balance paid ${sym}${balPaid.toFixed(2)}`)
  } else if (due != null && due > 0) {
    parts.push(`balance ${sym}${due.toFixed(2)}${appt.balance_checkout_session_id ? ' · link sent' : ''}`)
  }
  if (tip != null && tip > 0) parts.push(`tip ${sym}${tip.toFixed(2)}`)
  if (lateFee != null && lateFee > 0) {
    const label = appt.late_fee_type === 'no_show' ? 'no-show fee' : 'late-cancel fee'
    parts.push(`${label} ${sym}${lateFee.toFixed(2)}`)
  }
  if (refunded != null && refunded > 0) parts.push(`refunded ${sym}${refunded.toFixed(2)}`)
  if (parts.length === 0) return null
  return (
    <p className="text-[11px] text-muted-text truncate mt-0.5">
      {parts.join(' · ')}
    </p>
  )
}
