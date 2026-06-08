'use client'

import { useEffect, useState } from 'react'
import {
  getEditorCapacity,
  updateEditorCapacity,
  type CapacitySettings,
} from '@/lib/api'
import { AlertCircle, Check, Loader2, Users, CalendarRange } from 'lucide-react'

/**
 * Availability 2.0 · Capacity tab.
 *
 * Two of the three capacity layers (the third — per-date — lives on the
 * Smart Calendar). Global default caps the whole shop's daily bookings;
 * per-staff caps a single provider's day. The tighter of the two wins
 * (see App\Services\CapacityResolver).
 */
export default function CapacityPanel() {
  const [data,    setData]    = useState<CapacitySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [saved,   setSaved]   = useState(false)

  // Local editable copies (empty string = no cap).
  const [defaultCap, setDefaultCap] = useState<string>('')
  const [staffCaps,  setStaffCaps]  = useState<Record<number, string>>({})

  useEffect(() => {
    getEditorCapacity()
      .then(d => {
        setData(d)
        setDefaultCap(d.default_capacity !== null ? String(d.default_capacity) : '')
        const sc: Record<number, string> = {}
        for (const s of d.staff) sc[s.id] = s.default_daily_capacity !== null ? String(s.default_daily_capacity) : ''
        setStaffCaps(sc)
      })
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load capacity settings.'))
      .finally(() => setLoading(false))
  }, [])

  function toCapValue(s: string): number | null {
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n >= 1 ? n : null
  }

  async function save() {
    setSaving(true); setError(null); setSaved(false)
    try {
      const staff_caps: Record<number, number | null> = {}
      for (const [id, v] of Object.entries(staffCaps)) staff_caps[Number(id)] = toCapValue(v)
      const res = await updateEditorCapacity({
        default_capacity: toCapValue(defaultCap),
        staff_caps,
      })
      setData(res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save capacity settings.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-6 text-center text-sm text-muted-text">
        Loading capacity settings…
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-text mb-5">
        Cap how many appointments you&apos;ll take — without touching your hours. Per-date caps
        are set on the Smart Calendar; these are your everyday defaults.
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2 mb-4">
          <AlertCircle className="size-4" /> {error}
        </div>
      )}

      {/* Global default */}
      <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4">
        <div className="flex items-start gap-3">
          <CalendarRange className="size-5 text-near-black mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-near-black">Maximum customers per day</h3>
            <p className="text-[13px] text-muted-text mt-0.5">
              Applies to every day unless a specific date overrides it. Leave blank for no limit.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={1000}
                value={defaultCap}
                onChange={e => setDefaultCap(e.target.value)}
                placeholder="No limit"
                className="w-28 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
              />
              <span className="text-sm text-muted-text">appointments / day</span>
            </div>
          </div>
        </div>
      </section>

      {/* Per-staff */}
      {data && data.staff.length > 0 && (
        <section className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-5 mb-4">
          <div className="flex items-start gap-3">
            <Users className="size-5 text-near-black mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-near-black">Per-staff daily limit</h3>
              <p className="text-[13px] text-muted-text mt-0.5">
                Cap an individual provider&apos;s day. The tighter of this and the shop default wins.
              </p>
              <div className="mt-3 divide-y divide-[rgba(18,18,18,0.06)]">
                {data.staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-near-black">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        value={staffCaps[s.id] ?? ''}
                        onChange={e => setStaffCaps(prev => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="No limit"
                        className="w-24 rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-1.5 text-sm text-near-black focus:outline-none focus:border-near-black"
                      />
                      <span className="text-[12px] text-muted-text w-10">/ day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-near-black px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90 disabled:opacity-50"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? 'Saving…' : 'Save capacity'}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-near-black">
            <Check className="size-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
