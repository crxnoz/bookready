'use client'

import { useEffect, useState } from 'react'
import {
  getEditorAfterHours,
  updateEditorAfterHours,
  type AfterHoursConfig,
  type AfterHoursAccessTier,
} from '@/lib/api'
import { AlertCircle, Check, Loader2, Moon } from 'lucide-react'

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
  const [saved,   setSaved]   = useState(false)

  useEffect(() => {
    getEditorAfterHours()
      .then(setCfg)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load after-hours settings.'))
      .finally(() => setLoading(false))
  }, [])

  function patch<K extends keyof AfterHoursConfig>(k: K, v: AfterHoursConfig[K]) {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev)
  }

  async function save() {
    if (! cfg) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const res = await updateEditorAfterHours(cfg)
      setCfg(res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || ! cfg) {
    return <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-6 text-center text-sm text-muted-text">Loading…</div>
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-text mb-5">
        Earn more by opening premium slots just past your normal close. Clients see them
        with a small fee added — perfect for clients who can only come late.
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2 mb-4">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      {/* Enable toggle */}
      <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.enabled}
            onChange={e => patch('enabled', e.target.checked)}
            className="mt-1 size-4 accent-near-black"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 font-medium text-near-black"><Moon className="size-4" /> Enable after-hours booking</div>
            <p className="text-[13px] text-muted-text mt-0.5">Adds bookable slots past your regular close, each with the fee below.</p>
          </div>
        </label>
      </section>

      <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
        <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4 space-y-4">
          <Field label="After-hours fee" hint="Added to the booking total.">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-text">$</span>
              <input type="number" min={0} step="0.5" value={cfg.fee}
                onChange={e => patch('fee', parseFloat(e.target.value) || 0)}
                className="w-28 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black" />
            </div>
          </Field>

          <Field label="Maximum extension" hint="How far past close you'll offer slots.">
            <div className="flex items-center gap-2">
              <input type="number" min={15} max={480} step={15} value={cfg.max_extension_minutes}
                onChange={e => patch('max_extension_minutes', parseInt(e.target.value, 10) || 0)}
                className="w-24 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black" />
              <span className="text-sm text-muted-text">minutes</span>
            </div>
          </Field>

          <Field label="Latest booking time" hint="A hard cap, even if the extension allows later. Optional.">
            <input type="time" value={cfg.latest_booking_time ?? ''}
              onChange={e => patch('latest_booking_time', e.target.value || null)}
              className="rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black" />
          </Field>

          <Field label="After-hours capacity" hint="Max premium bookings per day. Blank = no limit.">
            <input type="number" min={1} max={1000} value={cfg.daily_capacity ?? ''}
              onChange={e => patch('daily_capacity', e.target.value ? parseInt(e.target.value, 10) : null)}
              placeholder="No limit"
              className="w-28 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black" />
          </Field>
        </section>

        <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4">
          <h3 className="font-medium text-near-black mb-1">Who can book after-hours</h3>
          <div className="mt-2 space-y-2">
            {TIERS.map(t => (
              <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                <input type="radio" name="ah-tier" checked={cfg.access_tier === t.id}
                  onChange={() => patch('access_tier', t.id)}
                  className="mt-1 size-4 accent-near-black" />
                <div>
                  <div className="text-sm text-near-black">{t.label}</div>
                  <div className="text-[12px] text-muted-text">{t.hint}</div>
                </div>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-near-black px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save after-hours'}
        </button>
        {saved && <span className="inline-flex items-center gap-1.5 text-sm text-near-black"><Check className="size-4" /> Saved</span>}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium text-near-black">{label}</div>
      {hint && <p className="text-[12px] text-muted-text mt-0.5 mb-1.5">{hint}</p>}
      {children}
    </div>
  )
}
