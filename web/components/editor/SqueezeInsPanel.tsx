'use client'

import { useEffect, useState } from 'react'
import {
  getEditorSqueezeIns,
  updateEditorSqueezeIns,
  type SqueezeInConfig,
  type AfterHoursAccessTier,
} from '@/lib/api'
import AvailabilityRequestsEditor from './AvailabilityRequestsEditor'
import { AlertCircle, Check, Loader2, Zap } from 'lucide-react'

const TIERS: { id: AfterHoursAccessTier; label: string; hint: string }[] = [
  { id: 'everyone', label: 'Everyone',           hint: 'Anyone can request a squeeze-in.' },
  { id: 'existing', label: 'Existing customers', hint: 'Recommended — only people who have booked before.' },
  { id: 'vip',      label: 'VIP customers',      hint: 'Only clients you\'ve marked VIP.' },
]

/**
 * §6 — Squeeze-Ins tab. Config panel on top, then the squeeze-in request
 * queue (the same inbox component, filtered to kind=squeeze_in).
 */
export default function SqueezeInsPanel() {
  const [cfg,     setCfg]     = useState<SqueezeInConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    getEditorSqueezeIns()
      .then(setCfg)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load squeeze-in settings.'))
      .finally(() => setLoading(false))
  }, [])

  function patch<K extends keyof SqueezeInConfig>(k: K, v: SqueezeInConfig[K]) {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev)
  }

  async function save() {
    if (! cfg) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await updateEditorSqueezeIns(cfg)
      setCfg(res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-sm text-muted-text mb-5">
          Sell a limited number of premium &ldquo;fit me in&rdquo; spots on fully-booked days.
          Clients request, you approve — and the fee is added to their booking.
        </p>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2 mb-4">
            <AlertCircle className="size-4" /> {error}
          </div>
        )}

        {(loading || ! cfg) ? (
          <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-6 text-center text-sm text-muted-text">Loading…</div>
        ) : (
          <>
            <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={cfg.enabled} onChange={e => patch('enabled', e.target.checked)} className="mt-1 size-4 accent-near-black" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 font-medium text-near-black"><Zap className="size-4" /> Enable squeeze-ins</div>
                  <p className="text-[13px] text-muted-text mt-0.5">Shows a &ldquo;Request a squeeze-in&rdquo; option to clients on fully-booked days.</p>
                </div>
              </label>
            </section>

            <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
              <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4 space-y-4">
                <div>
                  <div className="text-sm font-medium text-near-black">Squeeze-in fee</div>
                  <p className="text-[12px] text-muted-text mt-0.5 mb-1.5">Added to the booking total when you approve.</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-muted-text">$</span>
                    <input type="number" min={0} step="0.5" value={cfg.fee} onChange={e => patch('fee', parseFloat(e.target.value) || 0)}
                      className="w-28 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-near-black">Maximum per day</div>
                  <p className="text-[12px] text-muted-text mt-0.5 mb-1.5">How many squeeze-ins you&apos;ll allow on a full day (independent of normal capacity).</p>
                  <input type="number" min={1} max={100} value={cfg.daily_limit} onChange={e => patch('daily_limit', parseInt(e.target.value, 10) || 1)}
                    className="w-24 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black" />
                </div>
              </section>

              <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4">
                <h3 className="font-medium text-near-black mb-1">Who can request a squeeze-in</h3>
                <div className="mt-2 space-y-2">
                  {TIERS.map(t => (
                    <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                      <input type="radio" name="sq-tier" checked={cfg.access_tier === t.id} onChange={() => patch('access_tier', t.id)} className="mt-1 size-4 accent-near-black" />
                      <div>
                        <div className="text-sm text-near-black">{t.label}</div>
                        <div className="text-[12px] text-muted-text">{t.hint}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </section>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-near-black px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {saving ? 'Saving…' : 'Save squeeze-ins'}
              </button>
              {saved && <span className="inline-flex items-center gap-1.5 text-sm text-near-black"><Check className="size-4" /> Saved</span>}
            </div>
          </>
        )}
      </div>

      {/* The squeeze-in request queue. */}
      <div className="border-t border-[rgba(18,18,18,0.10)] pt-6">
        <h3 className="text-near-black font-medium mb-3">Squeeze-in requests</h3>
        <AvailabilityRequestsEditor kind="squeeze_in" />
      </div>
    </div>
  )
}
