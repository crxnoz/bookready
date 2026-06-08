'use client'

import { useEffect, useState } from 'react'
import {
  getEditorAfterHours,
  updateEditorAfterHours,
  type AfterHoursConfig,
  type AfterHoursAccessTier,
} from '@/lib/api'
import { Moon, DollarSign, Users } from 'lucide-react'
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
  { id: 'everyone', label: 'Everyone',          hint: 'Any client can book a premium slot.' },
  { id: 'existing', label: 'Existing customers', hint: 'Only people who have booked before.' },
  { id: 'vip',      label: 'VIP customers',      hint: 'Only clients you\'ve marked VIP.' },
]

export default function AfterHoursPanel() {
  const [cfg,     setCfg]     = useState<AfterHoursConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [open,    setOpen]    = useState<'schedule' | 'pricing' | 'access' | null>('schedule')
  const toast = useToast()

  async function load() {
    setLoading(true); setError(null)
    try { setCfg(await getEditorAfterHours()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load after-hours settings.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  function patch<K extends keyof AfterHoursConfig>(k: K, v: AfterHoursConfig[K]) {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev)
  }

  async function save() {
    if (!cfg) return
    setSaving(true)
    try {
      setCfg(await updateEditorAfterHours(cfg))
      toast.success('After-hours saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabShell>
      <TabIntro>
        Open premium slots past your regular close — earn more from clients who can only come late.
      </TabIntro>

      <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading after-hours settings…">
        {cfg && (
          <>
            {/* ── Enable toggle ─────────────────────────────────────── */}
            <Section icon={Moon} title="After-hours booking" subtitle="Open bookable slots past your regular close time.">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={e => patch('enabled', e.target.checked)}
                  className="mt-1 size-4 accent-near-black"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-near-black">Enable after-hours booking</div>
                  <p className="text-xs text-muted-text mt-0.5">
                    Adds bookable slots past your regular close, each with the fee below.
                  </p>
                </div>
              </label>
            </Section>

            <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
              {/* ── Schedule / extension ──────────────────────────────── */}
              <CollapsibleSection
                icon={Moon}
                title="Schedule"
                subtitle="Extension window and latest booking cap."
                open={open === 'schedule'}
                onToggle={() => setOpen(o => o === 'schedule' ? null : 'schedule')}
              >
                <div className="space-y-4">
                  <Field label="Maximum extension" hint="How far past close you'll offer slots.">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={15}
                        max={480}
                        step={15}
                        value={cfg.max_extension_minutes}
                        onChange={e => patch('max_extension_minutes', parseInt(e.target.value, 10) || 0)}
                        className="w-24 bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                      />
                      <span className="text-sm text-muted-text">minutes</span>
                    </div>
                  </Field>
                  <Field label="Latest booking time" hint="A hard cap, even if the extension allows later. Optional.">
                    <input
                      type="time"
                      value={cfg.latest_booking_time ?? ''}
                      onChange={e => patch('latest_booking_time', e.target.value || null)}
                      className="w-full bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                    />
                  </Field>
                  <Field label="After-hours capacity" hint="Max premium bookings per day. Blank = no limit.">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={cfg.daily_capacity ?? ''}
                      onChange={e => patch('daily_capacity', e.target.value ? parseInt(e.target.value, 10) : null)}
                      placeholder="No limit"
                      className="w-28 bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                    />
                  </Field>
                </div>
              </CollapsibleSection>

              {/* ── Pricing ───────────────────────────────────────────── */}
              <CollapsibleSection
                icon={DollarSign}
                title="Pricing"
                subtitle="Fee added to the booking total for premium slots."
                open={open === 'pricing'}
                onToggle={() => setOpen(o => o === 'pricing' ? null : 'pricing')}
              >
                <Field label="After-hours fee" hint="Added to the booking total.">
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
                </Field>
              </CollapsibleSection>

              {/* ── Access tier ───────────────────────────────────────── */}
              <CollapsibleSection
                icon={Users}
                title="Access"
                subtitle="Who is eligible to book after-hours slots."
                open={open === 'access'}
                onToggle={() => setOpen(o => o === 'access' ? null : 'access')}
              >
                <div className="space-y-3">
                  <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                    Who can book after-hours
                  </span>
                  <div className="mt-1 space-y-2.5">
                    {TIERS.map(t => (
                      <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="ah-tier"
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
                </div>
              </CollapsibleSection>
            </div>

            <div className="px-5 pt-5">
              <Button onClick={save} loading={saving}>Save after-hours</Button>
            </div>
          </>
        )}
      </AsyncBoundary>
    </TabShell>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      {hint && <p className="text-xs text-muted-text mt-0.5 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
