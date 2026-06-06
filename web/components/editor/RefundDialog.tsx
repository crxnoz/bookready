'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Appointment, RefundPayload } from '@/lib/types'

interface RefundDialogProps {
  appt: Appointment
  onClose: () => void
  onSubmit: (payload: RefundPayload) => Promise<void>
}

/**
 * Owner-initiated refund confirmation. Defaults to a FULL refund of the
 * remaining refundable balance; the owner can switch to "Partial" and
 * type a smaller amount. Reason is optional — when set, it maps to one
 * of Stripe's enum reasons that show up in the Stripe dashboard.
 */
export default function RefundDialog({ appt, onClose, onSubmit }: RefundDialogProps) {
  const paid       = (appt.deposit_paid_amount ?? 0) + (appt.balance_paid_amount ?? 0)
  const alreadyR   = appt.refunded_amount     ?? 0
  const refundable = Math.max(0, +(paid - alreadyR).toFixed(2))
  const currency   = (appt.currency ?? 'USD').toUpperCase()
  const sym        = currency === 'USD' ? '$' : ''
  // Manual payments don't get a real Stripe refund — we just record it.
  const isStripe   = !! appt.stripe_payment_intent_id
  const methodLbl  = appt.payment_method ? appt.payment_method.charAt(0).toUpperCase() + appt.payment_method.slice(1) : ''

  const [mode, setMode]     = useState<'full' | 'partial'>('full')
  const [amount, setAmount] = useState<string>(refundable.toFixed(2))
  const [reason, setReason] = useState<RefundPayload['reason']>(null)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')

  // Lock body scroll & ESC-to-close while dialog is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, busy])

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount)
    return Number.isFinite(n) ? n : 0
  }, [amount])

  const partialInvalid = mode === 'partial'
    && (numericAmount <= 0 || numericAmount > refundable + 0.001)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (partialInvalid) return
    setErr(''); setBusy(true)
    try {
      await onSubmit({
        amount: mode === 'full' ? null : Number(numericAmount.toFixed(2)),
        reason: reason ?? null,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Refund failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-near-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-[440px] bg-white border-t sm:border border-[rgba(18,18,18,0.10)] flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(18,18,18,0.10)]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1">
              Issue refund
            </p>
            <h2 className="text-base font-bold text-near-black tracking-tight">
              {appt.customer_name}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => { if (!busy) onClose() }}
            disabled={busy}
            className="p-1.5 hover:bg-[rgba(18,18,18,0.05)] transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary card */}
          <div className="bg-[rgba(18,18,18,0.03)] border border-[rgba(18,18,18,0.08)] px-4 py-3">
            <p className="text-[11px] text-muted-text">{appt.service_name}</p>
            <p className="text-[11px] text-muted-text mt-0.5">
              {appt.appointment_date} · {appt.start_time}
            </p>
            <div className="mt-2.5 pt-2.5 border-t border-[rgba(18,18,18,0.08)] flex justify-between text-xs">
              <span className="text-muted-text">Paid</span>
              <span className="font-semibold text-near-black">{sym}{paid.toFixed(2)}</span>
            </div>
            {alreadyR > 0 && (
              <div className="mt-1 flex justify-between text-xs">
                <span className="text-muted-text">Previously refunded</span>
                <span className="text-near-black">{sym}{alreadyR.toFixed(2)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-muted-text">Refundable balance</span>
              <span className="font-bold text-near-black">{sym}{refundable.toFixed(2)}</span>
            </div>
          </div>

          {/* Mode picker */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
              Refund amount
            </label>
            <div className="grid grid-cols-2 border border-[rgba(18,18,18,0.15)]">
              {(['full', 'partial'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    'py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase transition-colors ' +
                    (mode === m
                      ? 'bg-near-black text-white'
                      : 'bg-white text-muted-text hover:text-near-black')
                  }
                >
                  {m === 'full' ? `Full (${sym}${refundable.toFixed(2)})` : 'Partial'}
                </button>
              ))}
            </div>

            {mode === 'partial' && (
              <div className="mt-3">
                <div className="flex items-center border border-[rgba(18,18,18,0.15)] focus-within:border-near-black">
                  <span className="px-3 text-sm text-muted-text">{sym}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundable}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="flex-1 py-2.5 text-sm text-near-black bg-white outline-none"
                    autoFocus
                  />
                  <span className="px-3 text-xs text-muted-text">{currency}</span>
                </div>
                {partialInvalid && (
                  <p className="mt-1.5 text-[11px] text-[#b42828]">
                    Enter an amount between {sym}0.01 and {sym}{refundable.toFixed(2)}.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reason — only meaningful for Stripe refunds. */}
          {isStripe && (
            <div>
              <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
                Reason <span className="text-muted-text/60 normal-case tracking-normal font-normal">(optional, shows in Stripe)</span>
              </label>
              <select
                value={reason ?? ''}
                onChange={e => setReason((e.target.value || null) as RefundPayload['reason'])}
                className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black transition-colors"
              >
                <option value="">No reason given</option>
                <option value="requested_by_customer">Requested by customer</option>
                <option value="duplicate">Duplicate charge</option>
                <option value="fraudulent">Fraudulent</option>
              </select>
            </div>
          )}

          {err && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700">
              {err}
            </div>
          )}

          {isStripe ? (
            <p className="text-[11px] text-muted-text">
              The customer will receive an email confirming the refund. Card refunds take
              5&ndash;10 business days to land on their statement.
            </p>
          ) : (
            <p className="text-[11px] text-muted-text">
              You&rsquo;re recording a refund of a {methodLbl || 'manual'} payment. No
              money moves through Stripe. Refund the customer however you took
              the payment (cash back, Venmo, etc), then click confirm.
            </p>
          )}
        </form>

        {/* Footer actions */}
        <div className="flex gap-2 p-5 border-t border-[rgba(18,18,18,0.10)]">
          <button
            type="button"
            onClick={() => { if (!busy) onClose() }}
            disabled={busy}
            className="flex-1 border border-[rgba(18,18,18,0.20)] bg-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 text-near-black hover:border-near-black transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={busy || partialInvalid || refundable <= 0}
            className="flex-1 bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Refunding…' : 'Confirm refund'}
          </button>
        </div>
      </div>
    </div>
  )
}
