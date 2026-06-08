'use client'

import { useEffect, useState } from 'react'
import {
  getEditorCapacity,
  updateEditorCapacity,
  type CapacitySettings,
} from '@/lib/api'
import { Users, CalendarRange } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { useToast } from '@/components/ui/Toast'

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
      const res = await updateEditorCapacity({ default_capacity: toCapValue(defaultCap), staff_caps })
      setData(res)
      toast.success('Capacity saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save capacity settings.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black'

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-text mb-5">
        Cap how many appointments you&apos;ll take — without touching your hours. Per-date caps
        are set on the Smart Calendar; these are your everyday defaults.
      </p>

      <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading capacity settings…">
        {/* Global default */}
        <Card className="mb-4">
          <div className="flex items-start gap-3">
            <CalendarRange className="size-5 text-near-black mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-near-black">Maximum customers per day</h3>
              <p className="text-sm text-muted-text mt-0.5">
                Applies to every day unless a specific date overrides it. Leave blank for no limit.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number" min={1} max={1000} value={defaultCap}
                  onChange={e => setDefaultCap(e.target.value)} placeholder="No limit"
                  className={`w-28 ${inputCls}`}
                />
                <span className="text-sm text-muted-text">appointments / day</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Per-staff */}
        {data && data.staff.length > 0 && (
          <Card className="mb-4">
            <div className="flex items-start gap-3">
              <Users className="size-5 text-near-black mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-near-black">Per-staff daily limit</h3>
                <p className="text-sm text-muted-text mt-0.5">
                  Cap an individual provider&apos;s day. The tighter of this and the shop default wins.
                </p>
                <div className="mt-3 divide-y divide-hairline-soft">
                  {data.staff.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2.5">
                      <span className="text-sm text-near-black">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number" min={1} max={1000} value={staffCaps[s.id] ?? ''}
                          onChange={e => setStaffCaps(prev => ({ ...prev, [s.id]: e.target.value }))}
                          placeholder="No limit"
                          className={`w-24 ${inputCls.replace('py-2', 'py-1.5')}`}
                        />
                        <span className="text-xs text-muted-text w-10">/ day</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}

        <Button onClick={save} loading={saving}>Save capacity</Button>
      </AsyncBoundary>
    </div>
  )
}
