'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, AlertCircle, Save, Plus, Trash2, Info, CalendarRange,
} from 'lucide-react'
import {
  getEditorBookingSettings, updateEditorBookingSettings,
  getEditorSlotReleaseDrops, createEditorSlotReleaseDrop, deleteEditorSlotReleaseDrop,
  type ReleaseMode, type SlotReleaseDrop,
} from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * Availability 2.0 · Phase 2 · Release Strategy panel.
 *
 * Sits atop the Smart Calendar. Lets owners pick how dates are released
 * for booking: Always Open / Weekly / Bi-Weekly / Monthly / Custom.
 * Cadence-specific sub-fields render conditionally based on the mode.
 *
 * When `mode = 'custom'`, a separate list editor lets the owner stack
 * explicit drops (e.g. "on July 1, release July 15–30").
 *
 * Calls onChange after saves so the parent (CalendarOverridesEditor) can
 * re-fetch the release-state and update un-released cell tints.
 */

const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DEFAULT_TIME = '09:00'

interface Settings {
  slot_release_mode:         ReleaseMode
  slot_release_window_days:  number | null
  slot_release_day_of_week:  number | null
  slot_release_day_of_month: number | null
  slot_release_time:         string | null
  slot_release_anchor_date:  string | null
}

export default function ReleaseStrategyPanel({ onChange }: { onChange?: () => void }) {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [drops,    setDrops]    = useState<SlotReleaseDrop[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [savedAt,  setSavedAt]  = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorBookingSettings(),
      getEditorSlotReleaseDrops().catch(() => ({ drops: [] as SlotReleaseDrop[] })),
    ])
      .then(([bs, d]) => {
        if (cancelled) return
        setSettings({
          slot_release_mode:         (bs.slot_release_mode as ReleaseMode) ?? 'always_open',
          slot_release_window_days:  bs.slot_release_window_days ?? null,
          slot_release_day_of_week:  bs.slot_release_day_of_week ?? null,
          slot_release_day_of_month: bs.slot_release_day_of_month ?? null,
          slot_release_time:         bs.slot_release_time ?? null,
          slot_release_anchor_date:  bs.slot_release_anchor_date ?? null,
        })
        setDrops(d.drops)
      })
      .catch(e => { if (! cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings(s => s ? { ...s, [key]: value } : s)
  }

  async function save() {
    if (! settings) return
    setSaving(true); setError(null)
    try {
      // Send only the fields relevant to the chosen mode — keeps the
      // payload focused and lets the backend leave irrelevant columns
      // alone (e.g. don't blank day_of_week when switching to monthly).
      const payload: Partial<Settings> = { slot_release_mode: settings.slot_release_mode }
      const m = settings.slot_release_mode
      if (m === 'weekly' || m === 'biweekly' || m === 'monthly') {
        payload.slot_release_window_days = settings.slot_release_window_days ?? defaultWindowFor(m)
        payload.slot_release_time        = settings.slot_release_time ?? DEFAULT_TIME
      }
      if (m === 'weekly') {
        payload.slot_release_day_of_week = settings.slot_release_day_of_week ?? 1
      }
      if (m === 'biweekly') {
        payload.slot_release_anchor_date = settings.slot_release_anchor_date
        // Bi-weekly also reuses day_of_week semantics for the cadence's "day."
        // We'll let the resolver use anchor's DoW; nothing else needed.
      }
      if (m === 'monthly') {
        payload.slot_release_day_of_month = settings.slot_release_day_of_month ?? 1
      }
      await updateEditorBookingSettings(payload as any)
      setSavedAt(Date.now())
      onChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function addDrop(p: { release_date: string; available_from: string; available_to: string }) {
    setError(null)
    try {
      const created = await createEditorSlotReleaseDrop(p)
      setDrops(d => [...d, created].sort((a, b) => a.release_date.localeCompare(b.release_date)))
      onChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add drop')
    }
  }

  async function removeDrop(id: number) {
    try {
      await deleteEditorSlotReleaseDrop(id)
      setDrops(d => d.filter(x => x.id !== id))
      onChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete drop')
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 flex items-center gap-2 text-xs text-muted-text mb-4">
        <Loader2 size={14} className="animate-spin" /> Loading release strategy…
      </div>
    )
  }
  if (! settings) return null

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 mb-4">
      <header className="mb-3 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[13px] font-bold text-near-black inline-flex items-center gap-1.5">
            <CalendarRange size={14} /> Release strategy
          </h3>
          <p className="text-[11px] text-muted-text mt-0.5">
            When customers can book future dates. Always Open allows booking up to your max-days-ahead immediately; recurring strategies release dates in batches.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && Date.now() - savedAt < 4000 && (
            <span className="text-[10px] text-[#0f6f3d] font-semibold">Saved.</span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase border px-3 py-1.5',
              saving
                ? 'bg-cream border-[rgba(18,18,18,0.10)] text-muted-text cursor-wait'
                : 'bg-near-black border-near-black text-white hover:bg-[#2a2a2a]',
            )}
          >
            {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-2.5 text-[11px] text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Mode picker */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-3">
        {(['always_open', 'weekly', 'biweekly', 'monthly', 'custom'] as ReleaseMode[]).map(m => (
          <ModePill
            key={m}
            active={settings.slot_release_mode === m}
            onClick={() => patch('slot_release_mode', m)}
            label={MODE_LABELS[m]}
          />
        ))}
      </div>

      {/* Cadence-specific controls */}
      {settings.slot_release_mode === 'always_open' && (
        <p className="text-[11px] text-muted-text inline-flex items-center gap-1.5">
          <Info size={11} /> Dates open immediately, capped by your max-days-ahead setting on the Weekly tab.
        </p>
      )}

      {settings.slot_release_mode === 'weekly' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Release every">
            <select
              value={settings.slot_release_day_of_week ?? 1}
              onChange={e => patch('slot_release_day_of_week', parseInt(e.target.value, 10))}
              className={inputCls}
            >
              {DOW_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </Field>
          <Field label="At">
            <input
              type="time"
              value={settings.slot_release_time ?? DEFAULT_TIME}
              onChange={e => patch('slot_release_time', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Releases the next">
            <DaysField
              value={settings.slot_release_window_days ?? 7}
              onChange={n => patch('slot_release_window_days', n)}
            />
          </Field>
        </div>
      )}

      {settings.slot_release_mode === 'biweekly' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Anchor date" hint="Any past or upcoming occurrence; cadence repeats every 14 days.">
            <input
              type="date"
              value={settings.slot_release_anchor_date ?? ''}
              onChange={e => patch('slot_release_anchor_date', e.target.value || null)}
              className={inputCls}
            />
          </Field>
          <Field label="At">
            <input
              type="time"
              value={settings.slot_release_time ?? DEFAULT_TIME}
              onChange={e => patch('slot_release_time', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Releases the next">
            <DaysField
              value={settings.slot_release_window_days ?? 14}
              onChange={n => patch('slot_release_window_days', n)}
            />
          </Field>
        </div>
      )}

      {settings.slot_release_mode === 'monthly' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Release on day">
            <select
              value={settings.slot_release_day_of_month ?? 1}
              onChange={e => patch('slot_release_day_of_month', parseInt(e.target.value, 10))}
              className={inputCls}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(n =>
                <option key={n} value={n}>{ordinal(n)} of the month</option>
              )}
            </select>
          </Field>
          <Field label="At">
            <input
              type="time"
              value={settings.slot_release_time ?? DEFAULT_TIME}
              onChange={e => patch('slot_release_time', e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Releases the next">
            <DaysField
              value={settings.slot_release_window_days ?? 30}
              onChange={n => patch('slot_release_window_days', n)}
            />
          </Field>
        </div>
      )}

      {settings.slot_release_mode === 'custom' && (
        <CustomDropsEditor drops={drops} onAdd={addDrop} onRemove={removeDrop} />
      )}
    </div>
  )
}

// ── Custom drops list ────────────────────────────────────────────────────────

function CustomDropsEditor({
  drops, onAdd, onRemove,
}: {
  drops:    SlotReleaseDrop[]
  onAdd:    (p: { release_date: string; available_from: string; available_to: string }) => void
  onRemove: (id: number) => void
}) {
  const [releaseDate,   setReleaseDate]   = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo,   setAvailableTo]   = useState('')

  const canAdd = releaseDate && availableFrom && availableTo
    && availableTo >= availableFrom
    && releaseDate <= availableFrom

  function submit() {
    if (! canAdd) return
    onAdd({ release_date: releaseDate, available_from: availableFrom, available_to: availableTo })
    setReleaseDate(''); setAvailableFrom(''); setAvailableTo('')
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-text inline-flex items-center gap-1.5">
        <Info size={11} /> Each drop releases a date range for booking on its release date. Stack multiple drops to release several blocks of dates.
      </p>

      {drops.length > 0 && (
        <ul className="space-y-1.5">
          {drops.map(d => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 bg-cream border border-[rgba(18,18,18,0.08)]">
              <div className="text-[11px] flex-1 min-w-0">
                <span className="text-near-black font-semibold">{prettyDate(d.release_date)}</span>
                <span className="text-muted-text"> releases </span>
                <span className="text-near-black font-semibold">
                  {prettyDate(d.available_from)} – {prettyDate(d.available_to)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(d.id)}
                title="Remove drop"
                className="w-7 h-7 inline-flex items-center justify-center text-muted-text hover:text-[#b42828]"
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <Field label="Release date">
          <input type="date" value={releaseDate}   onChange={e => setReleaseDate(e.target.value)}   className={inputCls} />
        </Field>
        <Field label="Available from">
          <input type="date" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Available to">
          <input type="date" value={availableTo}   onChange={e => setAvailableTo(e.target.value)}   className={inputCls} />
        </Field>
        <button
          type="button"
          onClick={submit}
          disabled={!canAdd}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 text-[11px] font-bold tracking-[0.08em] uppercase border px-3 py-2.5 h-[42px]',
            canAdd
              ? 'bg-near-black border-near-black text-white hover:bg-[#2a2a2a]'
              : 'bg-cream border-[rgba(18,18,18,0.10)] text-muted-text cursor-not-allowed',
          )}
        >
          <Plus size={11} /> Add drop
        </button>
      </div>
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

function ModePill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-[11px] font-bold tracking-[0.06em] uppercase border py-2 px-2.5',
        active
          ? 'bg-near-black border-near-black text-white'
          : 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black',
      )}
    >
      {label}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-muted-text mt-1">{hint}</span>}
    </label>
  )
}

function DaysField({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={1}
        max={365}
        value={value}
        onChange={e => onChange(Math.max(1, Math.min(365, parseInt(e.target.value || '0', 10))))}
        className={`${inputCls} w-20 text-right tabular-nums`}
      />
      <span className="text-[12px] text-muted-text">days</span>
    </div>
  )
}

const inputCls = 'bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black'

const MODE_LABELS: Record<ReleaseMode, string> = {
  always_open: 'Always open',
  weekly:      'Weekly',
  biweekly:    'Bi-weekly',
  monthly:     'Monthly',
  custom:      'Custom',
}

function defaultWindowFor(m: ReleaseMode): number {
  return m === 'weekly' ? 7 : m === 'biweekly' ? 14 : m === 'monthly' ? 30 : 30
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function prettyDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
