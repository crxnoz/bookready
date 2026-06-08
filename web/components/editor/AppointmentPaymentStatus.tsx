'use client'

import type { Appointment } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'

// Open dispute statuses we treat as live ("there's a chargeback in flight").
// `won` / `lost` / `warning_closed` are resolved and shouldn't paint the pill.
const ACTIVE_DISPUTE_STATUSES = new Set([
  'warning_needs_response', 'warning_under_review',
  'needs_response',         'under_review',
])

/**
 * Inline pill showing the appointment's payment status. Delegates to the
 * shared registry-driven <StatusBadge domain="payment"> so payment badges
 * read identically across Appointments, Payments, and the Dashboard.
 * Renders nothing when no payment is required. An active dispute outranks
 * everything → a single 'Disputed' chip.
 */
export function PaymentPill({ appt }: { appt: Appointment }) {
  const status = appt.payment_status
  if (!status || status === 'none') return null
  if (appt.dispute_status && ACTIVE_DISPUTE_STATUSES.has(appt.dispute_status)) {
    return <StatusBadge domain="payment" status="disputed" />
  }
  return <StatusBadge domain="payment" status={status} />
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
    <p className="text-2xs text-muted-text truncate mt-0.5">
      {parts.join(' · ')}
    </p>
  )
}
