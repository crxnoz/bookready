'use client'

import { useEffect, useState } from 'react'
import {
  getEditorSqueezeIns,
  updateEditorSqueezeIns,
  type SqueezeInConfig,
  type AfterHoursAccessTier,
} from '@/lib/api'
import AvailabilityRequestsEditor from './AvailabilityRequestsEditor'
import { Zap } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { useToast } from '@/components/ui/Toast'

const TIERS: { id: AfterHoursAccessTier; label: string; hint: string }[] = [
  { id: 'everyone', label: 'Everyone',           hint: 'Anyone can request a squeeze-in.' },
  { id: 'existing', label: 'Existing customers', hint: 'Recommended — only people who have booked before.' },
  { id: 'vip',      label: 'VIP customers',      hint: 'Only clients you\'ve marked VIP.' },
]

const INPUT = 'border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black'

/**
 * §6 — Squeeze-Ins tab. Config panel on top, then the squeeze-in request
 * queue (the same inbox component, filtered to kind=squeeze_in).
 */
export default function SqueezeInsPanel() {
  const [cfg,     setCfg]     = useState<SqueezeInConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const toast = useToast()

  async function load() {
    setLoading(true); setError(null)
    try { setCfg(await getEditorSqueezeIns()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load squeeze-in settings.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  function patch<K extends keyof SqueezeInConfig>(k: K, v: SqueezeInConfig[K]) {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev)
  }

  async function save() {
    if (! cfg) return
    setSaving(true)
    try {
      setCfg(await updateEditorSqueezeIns(cfg))
      toast.success('Squeeze-ins saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.')
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

        <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading squeeze-in settings…">
          {cfg && (
            <>
              <Card className="mb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={cfg.enabled} onChange={e => patch('enabled', e.target.checked)} className="mt-1 size-4 accent-near-black" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 font-medium text-near-black"><Zap className="size-4" /> Enable squeeze-ins</div>
                    <p className="text-sm text-muted-text mt-0.5">Shows a &ldquo;Request a squeeze-in&rdquo; option to clients on fully-booked days.</p>
                  </div>
                </label>
              </Card>

              <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <Card className="mb-4 space-y-4">
                  <div>
                    <div className="text-sm font-medium text-near-black">Squeeze-in fee</div>
                    <p className="text-xs text-muted-text mt-0.5 mb-1.5">Added to the booking total when you approve.</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-text">$</span>
                      <input type="number" min={0} step="0.5" value={cfg.fee} onChange={e => patch('fee', parseFloat(e.target.value) || 0)} className={`w-28 ${INPUT}`} />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-near-black">Maximum per day</div>
                    <p className="text-xs text-muted-text mt-0.5 mb-1.5">How many squeeze-ins you&apos;ll allow on a full day (independent of normal capacity).</p>
                    <input type="number" min={1} max={100} value={cfg.daily_limit} onChange={e => patch('daily_limit', parseInt(e.target.value, 10) || 1)} className={`w-24 ${INPUT}`} />
                  </div>
                </Card>

                <Card className="mb-4">
                  <h3 className="font-medium text-near-black mb-1">Who can request a squeeze-in</h3>
                  <div className="mt-2 space-y-2">
                    {TIERS.map(t => (
                      <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                        <input type="radio" name="sq-tier" checked={cfg.access_tier === t.id} onChange={() => patch('access_tier', t.id)} className="mt-1 size-4 accent-near-black" />
                        <div>
                          <div className="text-sm text-near-black">{t.label}</div>
                          <div className="text-xs text-muted-text">{t.hint}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </Card>
              </div>

              <div className="mb-8">
                <Button onClick={save} loading={saving}>Save squeeze-ins</Button>
              </div>
            </>
          )}
        </AsyncBoundary>
      </div>

      {/* The squeeze-in request queue. */}
      <div className="border-t border-hairline-soft pt-6">
        <h3 className="text-near-black font-medium mb-3">Squeeze-in requests</h3>
        <AvailabilityRequestsEditor kind="squeeze_in" />
      </div>
    </div>
  )
}
