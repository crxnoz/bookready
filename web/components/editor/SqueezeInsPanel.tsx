'use client'

import { useEffect, useState } from 'react'
import {
  getEditorSqueezeIns,
  updateEditorSqueezeIns,
  type SqueezeInConfig,
  type AfterHoursAccessTier,
} from '@/lib/api'
import AvailabilityRequestsEditor from './AvailabilityRequestsEditor'
import { Zap, Users, Inbox } from 'lucide-react'
import Button from '@/components/ui/Button'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { useToast } from '@/components/ui/Toast'
import {
  TabShell,
  TabIntro,
  CollapsibleSection,
  Section,
} from '@/components/editor/AvailabilitySections'

const TIERS: { id: AfterHoursAccessTier; label: string; hint: string }[] = [
  { id: 'everyone', label: 'Everyone',           hint: 'Anyone can request a squeeze-in.' },
  { id: 'existing', label: 'Existing customers', hint: 'Recommended — only people who have booked before.' },
  { id: 'vip',      label: 'VIP customers',      hint: 'Only clients you\'ve marked VIP.' },
]

const INPUT = 'w-full bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30'

/**
 * §6 — Squeeze-Ins tab. Config panel on top, then the squeeze-in request
 * queue (the same inbox component, filtered to kind=squeeze_in).
 */
export default function SqueezeInsPanel() {
  const [cfg,     setCfg]     = useState<SqueezeInConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>('config')
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
    <TabShell>
      <TabIntro>
        Sell a limited number of premium &ldquo;fit me in&rdquo; spots on fully-booked days — clients request, you approve.
      </TabIntro>

      <CollapsibleSection
        icon={Zap}
        title="Squeeze-In Settings"
        subtitle="Enable, set a fee, and cap daily spots"
        open={open === 'config'}
        onToggle={() => setOpen(o => o === 'config' ? null : 'config')}
      >
        <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading squeeze-in settings…">
          {cfg && (
            <div className="space-y-5">

              {/* Enable toggle */}
              <div className="bg-white border border-hairline-soft p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={e => patch('enabled', e.target.checked)}
                    className="mt-1 size-4 accent-near-black"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-near-black">Enable squeeze-ins</div>
                    <p className="text-xs text-muted-text mt-0.5">
                      Shows a &ldquo;Request a squeeze-in&rdquo; option to clients on fully-booked days.
                    </p>
                  </div>
                </label>
              </div>

              {/* Fee + daily limit */}
              <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <div className="bg-white border border-hairline-soft p-4 space-y-4">

                  <div>
                    <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1">
                      Squeeze-in fee
                    </p>
                    <p className="text-xs text-muted-text mb-2">
                      Added to the booking total when you approve.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-text">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={cfg.fee}
                        onChange={e => patch('fee', parseFloat(e.target.value) || 0)}
                        className="w-28 bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1">
                      Maximum per day
                    </p>
                    <p className="text-xs text-muted-text mb-2">
                      How many squeeze-ins you&apos;ll allow on a full day (independent of normal capacity).
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={cfg.daily_limit}
                      onChange={e => patch('daily_limit', parseInt(e.target.value, 10) || 1)}
                      className="w-24 bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Button onClick={save} loading={saving}>Save squeeze-ins</Button>
              </div>
            </div>
          )}
        </AsyncBoundary>
      </CollapsibleSection>

      <CollapsibleSection
        icon={Users}
        title="Who Can Request"
        subtitle="Restrict squeeze-ins by client tier"
        open={open === 'access'}
        onToggle={() => setOpen(o => o === 'access' ? null : 'access')}
      >
        <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading squeeze-in settings…">
          {cfg && (
            <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
              <div className="bg-white border border-hairline-soft p-4 space-y-3">
                {TIERS.map(t => (
                  <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="sq-tier"
                      checked={cfg.access_tier === t.id}
                      onChange={() => patch('access_tier', t.id)}
                      className="mt-1 size-4 accent-near-black"
                    />
                    <div>
                      <div className="text-sm text-near-black">{t.label}</div>
                      <div className="text-xs text-muted-text">{t.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <Button onClick={save} loading={saving}>Save squeeze-ins</Button>
              </div>
            </div>
          )}
        </AsyncBoundary>
      </CollapsibleSection>

      {/* The squeeze-in request queue */}
      <Section icon={Inbox} title="Squeeze-In Requests" subtitle="Pending requests from clients on fully-booked days">
        <AvailabilityRequestsEditor kind="squeeze_in" />
      </Section>
    </TabShell>
  )
}
