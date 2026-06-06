'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { Appointment, MarkPaidPayload } from '@/lib/types'

interface MarkPaidDialogProps {
  appt: Appointment
  onClose: () => void
  onSubmit: (payload: MarkPaidPayload) => Promise<void>
}

const METHODS: { value: MarkPaidPayload['method']; label: string }[] = [
  { value: 'cash',  label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'other', label: 'Other' },
]

/**
 * Records a non-Stripe payment against an appointment. Used when a client
 * pays with cash / Venmo / Zelle / etc. The amount defaults to the full
 * service price, with method picker and an optional note.
 */
export default function MarkPaidDialog({ appt, onClose, onSubmit }: MarkPaidDialogProps) {
  const price    = appt.service_price ?? 0
  const currency = (appt.currency ?? 'USD').toUpperCase()
  const sym      = currency === 'USD' ? '$' : ''

  const [amount, setAmount] = useState<string>(price > 0 ? price.toFixed(2) : '')
  const [method, setMethod] = useState<MarkPaidPayload['method']>('cash')
  const [note,   setNote]   = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState('')

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

  const invalid = numericAmount <= 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (invalid) return
    setErr(''); setBusy(true)
    try {
      await onSubmit({
        amount: Number(numericAmount.toFixed(2)),
        method,
        note: note.trim() || undefined,
      })
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not record payment.')
    } finally {
      setBusy(false)
    }
  }

  const isDeposit = price > 0 && numericAmount + 0.001 < price

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
              Mark as paid
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
          {/* Service summary */}
          <div className="bg-[rgba(18,18,18,0.03)] border border-[rgba(18,18,18,0.08)] px-4 py-3">
            <p className="text-[11px] text-muted-text">{appt.service_name}</p>
            <p className="text-[11px] text-muted-text mt-0.5">
              {appt.appointment_date} · {appt.start_time}
            </p>
            {price > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-[rgba(18,18,18,0.08)] flex justify-between text-xs">
                <span className="text-muted-text">Service price</span>
                <span className="font-semibold text-near-black">{sym}{price.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
              Amount paid
            </label>
            <div className="flex items-center border border-[rgba(18,18,18,0.15)] focus-within:border-near-black">
              <span className="px-3 text-sm text-muted-text">{sym}</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 py-2.5 text-sm text-near-black bg-white outline-none"
                required
                autoFocus
              />
              <span className="px-3 text-xs text-muted-text">{currency}</span>
            </div>
            {isDeposit && (
              <p className="mt-1.5 text-[11px] text-muted-text">
                Less than the service price, so it will be recorded as a deposit. Balance of{' '}
                <span className="font-semibold text-near-black">{sym}{(price - numericAmount).toFixed(2)}</span> due at appointment.
              </p>
            )}
          </div>

          {/* Method */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
              Method
            </label>
            <div className="grid grid-cols-4 border border-[rgba(18,18,18,0.15)]">
              {METHODS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={
                    'py-2.5 text-[11px] font-bold tracking-[0.06em] uppercase transition-colors ' +
                    (method === m.value
                      ? 'bg-near-black text-white'
                      : 'bg-white text-muted-text hover:text-near-black')
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
              Note <span className="text-muted-text/60 normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              placeholder="Reference for your records"
              className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black transition-colors"
            />
          </div>

          {err && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700">
              {err}
            </div>
          )}

          <p className="text-[11px] text-muted-text">
            This payment is recorded for your records only. No card processing happens
            and it cannot be refunded through Stripe.
          </p>
        </form>

        {/* Footer */}
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
            disabled={busy || invalid}
            className="flex-1 bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving…' : 'Record payment'}
          </button>
        </div>
      </div>
    </div>
  )
}
