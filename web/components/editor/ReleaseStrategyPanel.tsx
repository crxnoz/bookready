'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, AlertCircle, Save, Plus, Trash2, Info, CalendarCheck, Rocket,
} from 'lucide-react'
import {
  getEditorBookingSettings, updateEditorBookingSettings,
  getEditorSlotReleaseDrops, createEditorSlotReleaseDrop, deleteEditorSlotReleaseDrop,
  type ReleaseMode, type SlotReleaseDrop,
} from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  TabShell, TabIntro, CollapsibleSection,
} from '@/components/editor/AvailabilitySections'

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
  // Booking window — orthogonal to release mode. Lives here (Date Drops)
  // because owners think about "when can a customer book?" as a single
  // mental model rather than splitting it across two settings pages.
  minimum_notice_minutes:    number
  max_days_ahead:            number
  // Release mode + cadence-specific fields.
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

  // Accordion: strategy open by default; drops section open when custom is active
  const [openSection, setOpenSection] = useState<'strategy' | 'drops' | null>('strategy')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorBookingSettings(),
      getEditorSlotReleaseDrops().catch(() => ({ drops: [] as SlotReleaseDrop[] })),
    ])
      .then(([bs, d]) => {
        if (cancelled) return
        setSettings({
          minimum_notice_minutes:    bs.minimum_notice_minutes ?? 120,
          max_days_ahead:            bs.max_days_ahead ?? 30,
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
      // Booking-window fields always go regardless of mode.
      const payload: Partial<Settings> = {
        minimum_notice_minutes: settings.minimum_notice_minutes,
        max_days_ahead:         settings.max_days_ahead,
        slot_release_mode:      settings.slot_release_mode,
      }
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
      <TabShell>
        <div className="flex items-center gap-2 text-xs text-muted-text">
          <Loader2 size={14} className="animate-spin" /> Loading release strategy…
        </div>
      </TabShell>
    )
  }
  if (! settings) return null

  const isCustom = settings.slot_release_mode === 'custom'

  // Save action slotted into the CollapsibleSection header
  const saveAction = (
    <div className="flex items-center gap-2 flex-shrink-0">
      {savedAt && Date.now() - savedAt < 4000 && (
        <span className="text-eyebrow text-success font-semibold">Saved.</span>
      )}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); save() }}
        disabled={saving}
        className={cn(
          'inline-flex items-center gap-1.5 text-2xs font-bold tracking-[0.08em] uppercase border px-3 py-1.5',
          saving
            ? 'bg-cream border-hairline-soft text-muted-text cursor-wait'
            : 'bg-near-black border-near-black text-white hover:opacity-90',
        )}
      >
        {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Save
      </button>
    </div>
  )

  // Step 1 of the two-step UX: "Always open" vs "Custom schedule".
  // Anything that isn't always_open is custom (Step 2 reveals the cadence).
  const step1IsCustom = settings.slot_release_mode !== 'always_open'

  // Step 1 click handlers. Switching to custom defaults to weekly (a sensible
  // most-common starting point); switching back to always_open just flips the
  // mode and leaves the cadence config alone so re-toggling is non-destructive.
  function selectAlwaysOpen() {
    patch('slot_release_mode', 'always_open')
  }
  function selectCustomSchedule() {
    if (settings.slot_release_mode === 'always_open') {
      patch('slot_release_mode', 'weekly')
    }
  }

  return (
    <TabShell>
      <TabIntro>
        Set when customers can book and how new dates open up.
      </TabIntro>

      {error && (
        <div className="bg-danger-bg border border-danger p-2.5 text-2xs text-danger flex items-center gap-2">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      {/* Booking window — orthogonal to release mode. */}
      <div className="border border-hairline-soft bg-white px-5 py-4 space-y-3">
        <p className="text-sm font-bold text-near-black">Booking window</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Minimum notice (minutes)"
            hint="How far ahead a customer must book (e.g. 120 = 2 hours)."
          >
            <input
              type="number"
              min={0}
              max={10080}
              value={settings.minimum_notice_minutes}
              onChange={e => patch('minimum_notice_minutes', Math.max(0, parseInt(e.target.value || '0', 10)))}
              className={inputCls}
            />
          </Field>
          <Field
            label="Max days ahead"
            hint="How far in the future bookings can be made."
          >
            <input
              type="number"
              min={1}
              max={365}
              value={settings.max_days_ahead}
              onChange={e => patch('max_days_ahead', Math.max(1, parseInt(e.target.value || '1', 10)))}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      {/* Release strategy — two-step: always open or custom schedule */}
      <div className="border border-hairline-soft bg-white">
        {/* Custom header with action button using the section chrome manually
            so the save button doesn't trigger the accordion toggle */}
        <div className="flex items-center gap-3 px-5 py-4">
          {/* icon box */}
          <div className="bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0 w-7 h-7">
            <Rocket size={13} className="text-muted-text" />
          </div>
          <button
            type="button"
            onClick={() => setOpenSection(o => o === 'strategy' ? null : 'strategy')}
            className="flex-1 min-w-0 text-left"
          >
            <p className="text-sm font-bold text-near-black">How dates open</p>
            {openSection !== 'strategy' && (
              <p className="text-xs text-muted-text mt-0.5 truncate">
                {step1IsCustom ? `Custom · ${MODE_LABELS[settings.slot_release_mode]}` : MODE_LABELS.always_open}
              </p>
            )}
          </button>
          {saveAction}
        </div>
        {openSection === 'strategy' && (
          <div className="px-5 pb-5 pt-1 space-y-4">
            {/* Step 1: always open or custom schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              <ModePill
                active={! step1IsCustom}
                onClick={selectAlwaysOpen}
                label="Always open"
              />
              <ModePill
                active={step1IsCustom}
                onClick={selectCustomSchedule}
                label="Custom schedule"
              />
            </div>

            {/* Always-open branch: just a hint, nothing else to configure. */}
            {! step1IsCustom && (
              <p className="text-2xs text-muted-text inline-flex items-center gap-1.5">
                <Info size={11} /> Every future date inside your booking window is bookable right away.
              </p>
            )}

            {/* Step 2: custom schedule cadence picker (only when Custom). */}
            {step1IsCustom && (
              <>
                <div className="pt-2 border-t border-hairline-soft">
                  <p className="text-eyebrow tracking-eyebrow uppercase font-bold text-muted-text mb-2">
                    Release cadence
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {(['weekly', 'biweekly', 'monthly', 'custom'] as ReleaseMode[]).map(m => (
                      <ModePill
                        key={m}
                        active={settings.slot_release_mode === m}
                        onClick={() => patch('slot_release_mode', m)}
                        label={MODE_LABELS[m]}
                      />
                    ))}
                  </div>
                </div>
              </>
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
              <p className="text-2xs text-muted-text inline-flex items-center gap-1.5">
                <Info size={11} /> Manage individual date drops in the section below.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Custom drops — only rendered when mode is 'custom' */}
      {isCustom && (
        <CollapsibleSection
          icon={CalendarCheck}
          title="Custom drops"
          subtitle="Stack explicit release dates to open specific date ranges for booking."
          open={openSection === 'drops'}
          onToggle={() => setOpenSection(o => o === 'drops' ? null : 'drops')}
        >
          <CustomDropsEditor drops={drops} onAdd={addDrop} onRemove={removeDrop} />
        </CollapsibleSection>
      )}
    </TabShell>
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
      <p className="text-2xs text-muted-text inline-flex items-center gap-1.5">
        <Info size={11} /> Each drop releases a date range for booking on its release date. Stack multiple drops to release several blocks of dates.
      </p>

      {drops.length > 0 && (
        <ul className="space-y-1.5">
          {drops.map(d => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2 bg-cream border border-hairline-soft">
              <div className="text-2xs flex-1 min-w-0">
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
                className="w-7 h-7 inline-flex items-center justify-center text-muted-text hover:text-danger"
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
            'inline-flex items-center justify-center gap-1.5 text-2xs font-bold tracking-[0.08em] uppercase border px-3 py-2.5 h-[42px]',
            canAdd
              ? 'bg-near-black border-near-black text-white hover:opacity-90'
              : 'bg-cream border-hairline-soft text-muted-text cursor-not-allowed',
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
        'text-2xs font-bold tracking-[0.06em] uppercase border py-2 px-2.5',
        active
          ? 'bg-near-black border-near-black text-white'
          : 'bg-white border-hairline-strong text-near-black hover:border-near-black',
      )}
    >
      {label}
    </button>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-eyebrow text-muted-text mt-1">{hint}</span>}
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
      <span className="text-xs text-muted-text">days</span>
    </div>
  )
}

const inputCls = 'bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black'

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
