'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import type { Appointment } from '@/lib/types'

interface ChargeBalanceDialogProps {
  appt: Appointment
  /** Returns the checkout URL on success so we can show "copy link". */
  onSubmit: () => Promise<{ checkout_url: string; email_sent: boolean; message: string }>
  onClose: () => void
}

/**
 * Two-step UI:
 *   1. Confirm — show what we're about to do (amount + recipient email)
 *   2. Sent    — show success + copy-link button (Stripe URLs are single-
 *      shot per session but valid for 24h; the owner may want to share it
 *      out-of-band via SMS as well)
 */
export default function ChargeBalanceDialog({ appt, onSubmit, onClose }: ChargeBalanceDialogProps) {
  // Same dialog covers two flows: deposit_paid → charges the balance;
  // none/failed → charges the full service price.
  const isBalanceFlow = appt.payment_status === 'deposit_paid'
  const amount   = isBalanceFlow ? (appt.amount_due ?? 0) : (appt.service_price ?? 0)
  const currency = (appt.currency ?? 'USD').toUpperCase()
  const sym      = currency === 'USD' ? '$' : ''

  const [busy, setBusy]       = useState(false)
  const [err,  setErr]        = useState('')
  const [sent, setSent]       = useState<{ url: string; emailed: boolean; message: string } | null>(null)
  const [copied, setCopied]   = useState(false)
  const isResend = isBalanceFlow
    ? !! appt.balance_checkout_session_id
    : !! appt.stripe_checkout_session_id

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, busy])

  async function handleConfirm() {
    setErr(''); setBusy(true)
    try {
      const res = await onSubmit()
      setSent({ url: res.checkout_url, emailed: res.email_sent, message: res.message })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not send payment link.')
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {/* ignore — older browsers */}
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
              {sent
                ? 'Link sent'
                : (isResend ? 'Resend payment link' : (isBalanceFlow ? 'Charge balance' : 'Send payment link'))}
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

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Summary card */}
          <div className="bg-[rgba(18,18,18,0.03)] border border-[rgba(18,18,18,0.08)] px-4 py-3">
            <p className="text-[11px] text-muted-text">{appt.service_name}</p>
            <p className="text-[11px] text-muted-text mt-0.5">
              {appt.appointment_date} · {appt.start_time}
            </p>
            <div className="mt-2.5 pt-2.5 border-t border-[rgba(18,18,18,0.08)] flex justify-between text-xs">
              <span className="text-muted-text">{isBalanceFlow ? 'Balance owed' : 'Amount to charge'}</span>
              <span className="font-bold text-near-black">{sym}{amount.toFixed(2)} {currency}</span>
            </div>
          </div>

          {!sent ? (
            <>
              <p className="text-sm text-near-black leading-relaxed">
                We&rsquo;ll email <span className="font-semibold">{appt.customer_email || 'the customer'}</span> a
                secure Stripe Checkout link for{' '}
                {isBalanceFlow ? 'the remaining balance' : 'the full service price'}. You&rsquo;ll
                also get a copy you can share over text or DM.
              </p>
              {isResend && (
                <div className="px-3 py-2 bg-[rgba(180,120,0,0.06)] border border-[rgba(180,120,0,0.30)] text-xs text-[#8a5a00]">
                  A previous link was already sent. Sending again invalidates the old one.
                </div>
              )}
              {err && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700">
                  {err}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-near-black leading-relaxed">
                {sent.message}
              </p>
              {/* Copy-link block */}
              <div>
                <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
                  Payment link
                </label>
                <div className="flex items-stretch border border-[rgba(18,18,18,0.15)]">
                  <input
                    type="text"
                    readOnly
                    value={sent.url}
                    className="flex-1 px-3 py-2.5 text-xs text-near-black bg-white outline-none truncate"
                    onClick={e => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(sent.url)}
                    className="px-3 border-l border-[rgba(18,18,18,0.15)] bg-white hover:bg-[rgba(18,18,18,0.04)] flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-text">
                  The link expires in 24 hours. Resend any time to create a new one.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-5 border-t border-[rgba(18,18,18,0.10)]">
          {!sent ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="flex-1 border border-[rgba(18,18,18,0.20)] bg-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 text-near-black hover:border-near-black transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy || amount <= 0}
                className="flex-1 bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? 'Sending…' : (isResend ? 'Resend link' : `Send ${sym}${amount.toFixed(2)} link`)}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-near-black text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#2a2a2a] transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
