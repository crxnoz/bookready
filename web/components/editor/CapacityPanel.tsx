'use client'

import { useEffect, useState } from 'react'
import {
  getEditorCapacity,
  updateEditorCapacity,
  type CapacitySettings,
} from '@/lib/api'
import { Users, CalendarRange, Timer } from 'lucide-react'
import Button from '@/components/ui/Button'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { useToast } from '@/components/ui/Toast'
import {
  TabShell,
  TabIntro,
  CollapsibleSection,
} from '@/components/editor/AvailabilitySections'

const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60]

/**
 * Availability 2.0 · Capacity tab. Two of the three capacity layers
 * (per-date lives on the Smart Calendar). Cohesion v1: Card/Button/
 * AsyncBoundary + toast on save.
 */
export default function CapacityPanel() {
  const [data,    setData]    = useState<CapacitySettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [defaultCap, setDefaultCap] = useState<string>('')
  const [staffCaps,  setStaffCaps]  = useState<Record<number, string>>({})
  const [bufferBefore, setBufferBefore] = useState(0)
  const [bufferAfter,  setBufferAfter]  = useState(0)
  const [open, setOpen] = useState<'default' | 'gaps' | 'staff' | null>('default')
  const toast = useToast()

  async function load() {
    setLoading(true); setError(null)
    try {
      const d = await getEditorCapacity()
      setData(d)
      setDefaultCap(d.default_capacity !== null ? String(d.default_capacity) : '')
      const sc: Record<number, string> = {}
      for (const s of d.staff) sc[s.id] = s.default_daily_capacity !== null ? String(s.default_daily_capacity) : ''
      setStaffCaps(sc)
      setBufferBefore(d.buffer_before_minutes ?? 0)
      setBufferAfter(d.buffer_after_minutes ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load capacity settings.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  function toCapValue(s: string): number | null {
    const n = parseInt(s, 10)
    return Number.isFinite(n) && n >= 1 ? n : null
  }

  async function save() {
    setSaving(true)
    try {
      const staff_caps: Record<number, number | null> = {}
      for (const [id, v] of Object.entries(staffCaps)) staff_caps[Number(id)] = toCapValue(v)
      const res = await updateEditorCapacity({
        default_capacity:      toCapValue(defaultCap),
        buffer_before_minutes: bufferBefore,
        buffer_after_minutes:  bufferAfter,
        staff_caps,
      })
      setData(res)
      toast.success('Capacity saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save capacity settings.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30'

  return (
    <TabShell>
      <TabIntro>
        Cap how many appointments you&apos;ll take — without touching your hours. Per-date caps
        are set on the Smart Calendar; these are your everyday defaults.
      </TabIntro>

      <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading capacity settings…">
        {/* Global default */}
        <CollapsibleSection
          icon={CalendarRange}
          title="Maximum per day"
          subtitle="Shop-wide daily cap — applies to every day unless a date override takes over."
          open={open === 'default'}
          onToggle={() => setOpen(o => o === 'default' ? null : 'default')}
        >
          <div className="bg-white border border-hairline-soft p-4">
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-3">
              Daily appointment limit
            </p>
            <p className="text-xs text-muted-text mb-3">
              Applies to every day unless a specific date overrides it. Leave blank for no limit.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number" min={1} max={1000} value={defaultCap}
                onChange={e => setDefaultCap(e.target.value)} placeholder="No limit"
                className={inputCls}
                style={{ maxWidth: '8rem' }}
              />
              <span className="text-sm text-muted-text whitespace-nowrap">appointments / day</span>
            </div>
          </div>
        </CollapsibleSection>

        {/* Gaps between appointments (buffers) — moved here from the Advanced schedule */}
        <CollapsibleSection
          icon={Timer}
          title="Gaps between appointments"
          subtitle="Extra time reserved before and after each appointment — for prep, cleanup, or travel."
          open={open === 'gaps'}
          onToggle={() => setOpen(o => o === 'gaps' ? null : 'gaps')}
        >
          <div className="bg-white border border-hairline-soft p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Gap before</span>
                <select
                  value={bufferBefore}
                  onChange={e => setBufferBefore(parseInt(e.target.value, 10))}
                  className={`${inputCls} appearance-none`}
                >
                  {BUFFER_OPTIONS.map(n => <option key={n} value={n}>{n === 0 ? 'None' : `${n} min`}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Gap after</span>
                <select
                  value={bufferAfter}
                  onChange={e => setBufferAfter(parseInt(e.target.value, 10))}
                  className={`${inputCls} appearance-none`}
                >
                  {BUFFER_OPTIONS.map(n => <option key={n} value={n}>{n === 0 ? 'None' : `${n} min`}</option>)}
                </select>
              </label>
            </div>
            {(bufferBefore > 0 || bufferAfter > 0) && (
              <p className="text-2xs text-muted-text mt-3">
                A 45-min service blocks{' '}
                <span className="font-semibold text-near-black">{bufferBefore + 45 + bufferAfter} min</span>{' '}
                total on your calendar.
              </p>
            )}
          </div>
        </CollapsibleSection>

        {/* Per-staff — only rendered when there is staff */}
        {data && data.staff.length > 0 && (
          <CollapsibleSection
            icon={Users}
            title="Per-staff limits"
            subtitle="Override the shop cap for individual providers."
            open={open === 'staff'}
            onToggle={() => setOpen(o => o === 'staff' ? null : 'staff')}
          >
            <div className="bg-white border border-hairline-soft">
              <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text px-4 pt-4 pb-2">
                Provider caps
              </p>
              <p className="text-xs text-muted-text px-4 pb-3">
                Cap an individual provider&apos;s day. The tighter of this and the shop default wins.
              </p>
              <div className="divide-y divide-hairline-soft">
                {data.staff.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-near-black">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min={1} max={1000} value={staffCaps[s.id] ?? ''}
                        onChange={e => setStaffCaps(prev => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="No limit"
                        className="bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                        style={{ width: '6rem' }}
                      />
                      <span className="text-xs text-muted-text w-10">/ day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}

        <div className="pt-1">
          <Button onClick={save} loading={saving}>Save capacity</Button>
        </div>
      </AsyncBoundary>
    </TabShell>
  )
}
