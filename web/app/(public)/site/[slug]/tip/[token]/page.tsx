'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, Check, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

interface TipView {
  business_name: string
  customer_name: string
  service_name: string
  service_price: number | null
  appointment_date: string
  start_time: string
  currency: string
  tip_amount: number | null
  tip_paid_at: string | null
}

const PERCENT_PRESETS = [15, 18, 20, 25] as const
const FLAT_PRESETS = [5, 10, 20] as const

export default function Page({ params }: { params: { slug: string; token: string } }) {
  return (
    <Suspense fallback={<Shell><CenterSpinner /></Shell>}>
      <TipPage slug={params.slug} token={params.token} />
    </Suspense>
  )
}

function TipPage({ slug, token }: { slug: string; token: string }) {
  const searchParams = useSearchParams()
  const paid = searchParams.get('paid') === '1'
  const cancelled = searchParams.get('cancelled') === '1'

  const [data, setData] = useState<TipView | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Picker state
  const [selectedKind, setSelectedKind] = useState<'percent' | 'flat' | 'custom' | null>(null)
  const [selectedValue, setSelectedValue] = useState<number | null>(null)
  const [customInput, setCustomInput] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/public/sites/${slug}/tip/${token}`, {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        })
        if (res.status === 404) {
          if (!cancelled) setStatus('not_found')
          return
        }
        if (!res.ok) throw new Error(`Request failed (${res.status})`)
        const json = (await res.json()) as TipView
        if (!cancelled) {
          setData(json)
          setStatus('ready')
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message ?? 'Something went wrong')
          setStatus('error')
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [slug, token])

  const symbol = data?.currency === 'USD' ? '$' : ''

  const computedAmount = useMemo<number | null>(() => {
    if (selectedKind === 'percent' && selectedValue != null && data?.service_price) {
      return roundCents((data.service_price * selectedValue) / 100)
    }
    if (selectedKind === 'flat' && selectedValue != null) {
      return selectedValue
    }
    if (selectedKind === 'custom') {
      const n = parseFloat(customInput)
      if (Number.isFinite(n) && n >= 1) return roundCents(n)
      return null
    }
    return null
  }, [selectedKind, selectedValue, customInput, data?.service_price])

  async function handleSubmit() {
    if (!computedAmount || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`${API_BASE}/public/sites/${slug}/tip/${token}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ amount: computedAmount }),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        throw new Error(text || `Could not start checkout (${res.status})`)
      }
      const json = (await res.json()) as { checkout_url: string }
      window.location.href = json.checkout_url
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Could not start checkout')
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <Shell>
        <CenterSpinner />
      </Shell>
    )
  }

  if (status === 'not_found') {
    return (
      <Shell>
        <Card>
          <Eyebrow>Tip</Eyebrow>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.1] mb-3 text-near-black">
            Link expired or invalid
          </h1>
          <p className="text-[15px] leading-[1.6] text-muted-text">
            Reach out to the business directly to tip.
          </p>
        </Card>
      </Shell>
    )
  }

  if (status === 'error' || !data) {
    return (
      <Shell>
        <Card>
          <Eyebrow>Tip</Eyebrow>
          <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.1] mb-3 text-near-black">
            Something went wrong
          </h1>
          <p className="text-[15px] leading-[1.6] text-muted-text">
            {errorMsg ?? 'Please try again in a moment.'}
          </p>
        </Card>
      </Shell>
    )
  }

  const alreadyTipped = !!data.tip_paid_at
  const showSuccess = paid || alreadyTipped

  if (showSuccess) {
    const amount = data.tip_amount
    return (
      <Shell>
        <Card>
          <div className="w-12 h-12 bg-blush flex items-center justify-center mb-5">
            <Check className="w-6 h-6 text-near-black" strokeWidth={2.5} />
          </div>
          <Eyebrow>Thank you</Eyebrow>
          <h1 className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-[1.1] mb-3 text-near-black">
            {paid && !alreadyTipped ? 'Thank you! Your tip helps.' : 'You already tipped.'}
          </h1>
          <p className="text-[15px] leading-[1.6] text-muted-text">
            {amount != null
              ? `${data.business_name} received ${symbol}${formatAmount(amount)}.`
              : `${data.business_name} appreciates it.`}
          </p>
        </Card>
      </Shell>
    )
  }

  const appointmentLabel = `${formatDate(data.appointment_date)} at ${formatTime(data.start_time)}`

  return (
    <Shell>
      <Card>
        <Eyebrow>Tip</Eyebrow>
        <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight leading-[1.05] mb-2 text-near-black">
          Tip {data.business_name}
        </h1>
        <p className="text-[14px] sm:text-[15px] leading-[1.55] text-muted-text mb-7">
          for your {data.service_name} on {appointmentLabel}
        </p>

        {cancelled && (
          <div className="mb-6 border border-[rgba(18,18,18,0.10)] bg-cream px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-near-black flex-shrink-0 mt-0.5" />
            <p className="text-[13px] leading-[1.5] text-near-black">
              Checkout cancelled — try again below.
            </p>
          </div>
        )}

        {/* Percent presets (only if we have a service price) */}
        {data.service_price != null && data.service_price > 0 && (
          <>
            <SectionLabel>Percent of service</SectionLabel>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {PERCENT_PRESETS.map((pct) => {
                const isSelected = selectedKind === 'percent' && selectedValue === pct
                const dollars = roundCents((data.service_price! * pct) / 100)
                return (
                  <PresetButton
                    key={pct}
                    selected={isSelected}
                    onClick={() => {
                      setSelectedKind('percent')
                      setSelectedValue(pct)
                    }}
                  >
                    <span className="block text-[15px] font-bold">{pct}%</span>
                    <span className="block text-[11px] mt-0.5 text-muted-text">
                      {symbol}
                      {formatAmount(dollars)}
                    </span>
                  </PresetButton>
                )
              })}
            </div>
          </>
        )}

        {/* Flat presets */}
        <SectionLabel>Flat amount</SectionLabel>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {FLAT_PRESETS.map((amt) => {
            const isSelected = selectedKind === 'flat' && selectedValue === amt
            return (
              <PresetButton
                key={amt}
                selected={isSelected}
                onClick={() => {
                  setSelectedKind('flat')
                  setSelectedValue(amt)
                }}
              >
                <span className="block text-[15px] font-bold py-1">
                  {symbol}
                  {amt}
                </span>
              </PresetButton>
            )
          })}
          <PresetButton
            selected={selectedKind === 'custom'}
            onClick={() => {
              setSelectedKind('custom')
              setSelectedValue(null)
            }}
          >
            <span className="block text-[15px] font-bold py-1">Other</span>
          </PresetButton>
        </div>

        {selectedKind === 'custom' && (
          <div className="mb-5">
            <label className="block text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">
              Custom amount
            </label>
            <div className="relative">
              {symbol && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted-text">
                  {symbol}
                </span>
              )}
              <input
                type="number"
                inputMode="decimal"
                step="0.50"
                min="1"
                autoFocus
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="0.00"
                className={`w-full ${symbol ? 'pl-7' : 'pl-3'} pr-3 py-3 bg-cream border border-[rgba(18,18,18,0.10)] text-[15px] text-near-black focus:outline-none focus:border-near-black transition-colors`}
              />
            </div>
          </div>
        )}

        {submitError && (
          <div className="mb-4 border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" />
            <p className="text-[13px] leading-[1.5] text-red-800">{submitError}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!computedAmount || submitting}
          className="w-full mt-2 bg-near-black text-cream py-4 text-[12px] font-bold tracking-[0.16em] uppercase hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Redirecting…
            </>
          ) : computedAmount ? (
            <>Tip {symbol}{formatAmount(computedAmount)}</>
          ) : (
            <>Choose an amount</>
          )}
        </button>

        <p className="text-[11px] text-muted-text mt-4 text-center">
          You'll be redirected to Stripe to complete payment securely.
        </p>
      </Card>
    </Shell>
  )
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-[520px]">{children}</div>
      </main>
      <footer className="px-4 pb-8 flex items-center justify-center gap-2 text-[11px] tracking-[0.14em] uppercase text-muted-text">
        <div className="w-4 h-4 bg-near-black flex items-center justify-center flex-shrink-0">
          <img src="/logo.svg" alt="" className="w-2.5 h-2.5 invert" />
        </div>
        <span className="font-bold">Powered by BookReady</span>
      </footer>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-7 sm:p-10">
      {children}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
      {children}
    </p>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">
      {children}
    </p>
  )
}

function PresetButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-center py-3 px-2 border transition-colors ${
        selected
          ? 'bg-near-black text-cream border-near-black'
          : 'bg-cream text-near-black border-[rgba(18,18,18,0.10)] hover:border-near-black'
      }`}
    >
      {children}
    </button>
  )
}

function CenterSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-text" />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundCents(n: number): number {
  return Math.round(n * 100) / 100
}

function formatAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatDate(ymd: string): string {
  // Parse as local date to avoid TZ shift from new Date('YYYY-MM-DD')
  const [y, m, d] = ymd.split('-').map(Number)
  if (!y || !m || !d) return ymd
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatTime(hm: string): string {
  const [hStr, mStr] = hm.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h) || Number.isNaN(m)) return hm
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = ((h + 11) % 12) + 1
  return m === 0 ? `${h12} ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`
}
