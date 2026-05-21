'use client'

import { useEffect, useState } from 'react'
import { HoursEntry, BookingSettings, AvailabilityData } from '@/lib/types'
import { getEditorAvailability, updateEditorAvailability } from '@/lib/api'
import Button from '@/components/ui/Button'
import {
  Clock,
  Calendar,
  Timer,
  Settings2,
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_SETTINGS: BookingSettings = {
  buffer_before_minutes: 0,
  buffer_after_minutes: 15,
  minimum_notice_minutes: 720,
  booking_interval_minutes: 30,
  max_days_ahead: 30,
  max_appointments_per_day: null,
  auto_confirm_bookings: false,
  slot_release_enabled: false,
  slot_release_frequency: null,
  slot_release_day_of_week: null,
  slot_release_day_of_month: null,
  slot_release_time: null,
  slot_release_window_days: null,
}

const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60]

const NOTICE_OPTIONS = [
  { value: 0,    label: 'No minimum' },
  { value: 60,   label: '1 hour' },
  { value: 180,  label: '3 hours' },
  { value: 360,  label: '6 hours' },
  { value: 720,  label: '12 hours' },
  { value: 1440, label: '24 hours' },
  { value: 2880, label: '48 hours' },
]

const INTERVAL_OPTIONS = [15, 30, 60]
const MAX_DAYS_OPTIONS  = [7, 14, 30, 60, 90]

const FREQ_OPTIONS = [
  { value: 'weekly',   label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly',  label: 'Monthly' },
  { value: 'custom',   label: 'Custom' },
]

// ── Primitives ────────────────────────────────────────────────────────────────

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 transition-colors duration-150 focus:outline-none ${
          on ? 'bg-near-black' : 'bg-[rgba(18,18,18,0.15)]'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 bg-white shadow transform transition-transform duration-150 m-0.5 ${
            on ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
      {label && <span className="text-sm font-medium text-near-black">{label}</span>}
    </label>
  )
}

function TimeInput({
  value,
  onChange,
  label,
}: {
  value: string | null
  onChange: (v: string | null) => void
  label?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
          {label}
        </span>
      )}
      <input
        type="time"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30 transition-colors"
      />
    </div>
  )
}

function SelectInput<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  label?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
          {label}
        </span>
      )}
      <select
        value={String(value)}
        onChange={e => {
          const raw = e.target.value
          const opt = options.find(o => String(o.value) === raw)
          if (opt !== undefined) onChange(opt.value)
        }}
        className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30 transition-colors appearance-none"
      >
        {options.map(o => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-muted-text" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-near-black tracking-tight">{title}</h3>
        {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

// ── DayCard ───────────────────────────────────────────────────────────────────

function DayCard({
  entry,
  onChange,
}: {
  entry: HoursEntry
  onChange: (updated: HoursEntry) => void
}) {
  const [showBreak, setShowBreak] = useState(!!(entry.break_start || entry.break_end))

  function set<K extends keyof HoursEntry>(field: K, value: HoursEntry[K]) {
    onChange({ ...entry, [field]: value })
  }

  function toggleBreak() {
    if (showBreak) onChange({ ...entry, break_start: null, break_end: null })
    setShowBreak(b => !b)
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-near-black w-28">{entry.day_name}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${entry.is_open ? 'text-near-black' : 'text-muted-text'}`}>
            {entry.is_open ? 'Open' : 'Closed'}
          </span>
          <Toggle on={entry.is_open} onChange={v => set('is_open', v)} />
        </div>
      </div>

      {/* Open times */}
      {entry.is_open && (
        <div className="px-4 pb-3 border-t border-[rgba(18,18,18,0.06)]">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <TimeInput label="Opens" value={entry.open_time} onChange={v => set('open_time', v)} />
            <TimeInput label="Closes" value={entry.close_time} onChange={v => set('close_time', v)} />
          </div>

          {showBreak && (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[rgba(18,18,18,0.06)]">
              <TimeInput label="Break start" value={entry.break_start} onChange={v => set('break_start', v)} />
              <TimeInput label="Break end" value={entry.break_end} onChange={v => set('break_end', v)} />
            </div>
          )}

          <button
            type="button"
            onClick={toggleBreak}
            className="mt-3 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text hover:text-near-black transition-colors"
          >
            {showBreak ? '− Remove break' : '+ Add break'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── SlotReleaseExample ────────────────────────────────────────────────────────

function SlotReleaseExample({ s }: { s: BookingSettings }) {
  if (!s.slot_release_enabled || !s.slot_release_frequency) return null

  const days  = s.slot_release_window_days ?? 14
  const time  = s.slot_release_time ? ` at ${s.slot_release_time}` : ''
  const dayAbbr = s.slot_release_day_of_week !== null
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.slot_release_day_of_week]
    : null

  let example = ''
  if (s.slot_release_frequency === 'weekly' && dayAbbr) {
    example = `Every ${dayAbbr}${time}, open the next ${days} days of availability.`
  } else if (s.slot_release_frequency === 'biweekly' && dayAbbr) {
    example = `Every other ${dayAbbr}${time}, open the next ${days} days of availability.`
  } else if (s.slot_release_frequency === 'monthly' && s.slot_release_day_of_month) {
    example = `On the ${s.slot_release_day_of_month}${ordinal(s.slot_release_day_of_month)} of each month${time}, open the next ${days} days.`
  } else if (s.slot_release_frequency === 'custom') {
    example = `Custom schedule: opens ${days} days of availability${time}.`
  }

  if (!example) return null

  return (
    <div className="mt-3 px-3 py-2.5 bg-lavender border border-[rgba(18,18,18,0.06)]">
      <p className="text-[11px] text-near-black font-medium">{example}</p>
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

// ── AvailabilityEditor ────────────────────────────────────────────────────────

type SaveState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

// Put Monday first in display order, Sunday at end
function sortedDisplay(hours: HoursEntry[]): HoursEntry[] {
  return [
    ...hours.filter(h => h.day_of_week !== 0),
    ...hours.filter(h => h.day_of_week === 0),
  ]
}

export default function AvailabilityEditor() {
  const [hours, setHours]       = useState<HoursEntry[]>([])
  const [settings, setSettings] = useState<BookingSettings>(DEFAULT_SETTINGS)
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [error, setError]         = useState<string | null>(null)

  // Section collapse state
  const [openSection, setOpenSection] = useState<'hours' | 'rules' | 'release' | null>('hours')

  useEffect(() => {
    getEditorAvailability()
      .then(data => {
        setHours(data.hours)
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings })
        setSaveState('idle')
      })
      .catch(err => {
        setError(err.message ?? 'Failed to load availability')
        setSaveState('error')
      })
  }, [])

  function updateDay(updated: HoursEntry) {
    setHours(prev => prev.map(h => h.day_of_week === updated.day_of_week ? updated : h))
    if (saveState === 'saved') setSaveState('idle')
  }

  function setSetting<K extends keyof BookingSettings>(key: K, value: BookingSettings[K]) {
    setSettings(prev => ({ ...prev, [key]: value }))
    if (saveState === 'saved') setSaveState('idle')
  }

  // ── Quick actions ──────────────────────────────────────────────────────────

  function copyMondayToWeekdays() {
    const mon = hours.find(h => h.day_of_week === 1)
    if (!mon) return
    setHours(prev => prev.map(h =>
      h.day_of_week >= 1 && h.day_of_week <= 5
        ? { ...mon, id: h.id, day_of_week: h.day_of_week, day_name: h.day_name }
        : h
    ))
  }

  function closeWeekend() {
    setHours(prev => prev.map(h =>
      h.day_of_week === 0 || h.day_of_week === 6
        ? { ...h, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null }
        : h
    ))
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaveState('saving')
    setError(null)
    try {
      const result = await updateEditorAvailability({ hours, settings })
      setHours(result.hours)
      setSettings({ ...DEFAULT_SETTINGS, ...result.settings })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setSaveState('error')
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (saveState === 'loading') {
    return (
      <div className="p-6">
        <p className="text-xs text-muted-text">Loading availability…</p>
      </div>
    )
  }

  const displayed = sortedDisplay(hours)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {/* Page heading */}
      <div className="px-5 pt-5 pb-4 border-b border-[rgba(18,18,18,0.08)]">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1">Availability</p>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">When you&apos;re open</h2>
        <p className="text-xs text-muted-text">Set your weekly hours, booking rules, and how clients book with you.</p>
      </div>

      {error && saveState === 'error' && (
        <div className="mx-5 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* ─── Section 1: Regular Hours ─── */}
      <CollapsibleSection
        icon={Clock}
        title="Regular Hours"
        subtitle="Your weekly open and closed schedule."
        open={openSection === 'hours'}
        onToggle={() => setOpenSection(s => s === 'hours' ? null : 'hours')}
      >
        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={copyMondayToWeekdays}
            className="text-[10px] font-bold tracking-[0.08em] uppercase px-3 py-1.5 border border-[rgba(18,18,18,0.12)] text-muted-text hover:text-near-black hover:border-near-black/30 transition-colors"
          >
            Copy Mon → Weekdays
          </button>
          <button
            onClick={closeWeekend}
            className="text-[10px] font-bold tracking-[0.08em] uppercase px-3 py-1.5 border border-[rgba(18,18,18,0.12)] text-muted-text hover:text-near-black hover:border-near-black/30 transition-colors"
          >
            Close Weekend
          </button>
        </div>

        <div className="space-y-2">
          {displayed.map(entry => (
            <DayCard key={entry.day_of_week} entry={entry} onChange={updateDay} />
          ))}
        </div>
      </CollapsibleSection>

      {/* ─── Section 2: Booking Rules ─── */}
      <CollapsibleSection
        icon={Settings2}
        title="Booking Rules"
        subtitle="Control how and when clients can book."
        open={openSection === 'rules'}
        onToggle={() => setOpenSection(s => s === 'rules' ? null : 'rules')}
      >
        <div className="space-y-5">
          {/* Buffer before / after */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-3">
              Appointment buffers
            </p>
            <p className="text-xs text-muted-text mb-3">
              Extra time reserved before and after each appointment. Useful for prep, cleanup, or travel.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput
                label="Buffer before"
                value={settings.buffer_before_minutes}
                onChange={v => setSetting('buffer_before_minutes', v)}
                options={BUFFER_OPTIONS.map(n => ({ value: n, label: n === 0 ? 'None' : `${n} min` }))}
              />
              <SelectInput
                label="Buffer after"
                value={settings.buffer_after_minutes}
                onChange={v => setSetting('buffer_after_minutes', v)}
                options={BUFFER_OPTIONS.map(n => ({ value: n, label: n === 0 ? 'None' : `${n} min` }))}
              />
            </div>
            {(settings.buffer_before_minutes > 0 || settings.buffer_after_minutes > 0) && (
              <p className="text-[11px] text-muted-text mt-2">
                A 45-min service blocks{' '}
                <span className="font-semibold text-near-black">
                  {settings.buffer_before_minutes + 45 + settings.buffer_after_minutes} min
                </span>{' '}
                total on your calendar.
              </p>
            )}
          </div>

          <hr className="border-[rgba(18,18,18,0.08)]" />

          {/* Minimum notice */}
          <SelectInput
            label="Minimum notice"
            value={settings.minimum_notice_minutes}
            onChange={v => setSetting('minimum_notice_minutes', v)}
            options={NOTICE_OPTIONS}
          />

          {/* Booking interval */}
          <SelectInput
            label="Booking slot interval"
            value={settings.booking_interval_minutes}
            onChange={v => setSetting('booking_interval_minutes', v)}
            options={INTERVAL_OPTIONS.map(n => ({ value: n, label: `${n} min` }))}
          />

          {/* Max days ahead */}
          <SelectInput
            label="How far ahead clients can book"
            value={settings.max_days_ahead}
            onChange={v => setSetting('max_days_ahead', v)}
            options={MAX_DAYS_OPTIONS.map(n => ({ value: n, label: `${n} days` }))}
          />

          <hr className="border-[rgba(18,18,18,0.08)]" />

          {/* Max per day */}
          <div>
            <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5 block">
              Max appointments per day
            </label>
            <input
              type="number"
              min={1}
              placeholder="Unlimited"
              value={settings.max_appointments_per_day ?? ''}
              onChange={e => setSetting(
                'max_appointments_per_day',
                e.target.value ? parseInt(e.target.value, 10) : null,
              )}
              className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black/30 transition-colors"
            />
            <p className="text-xs text-muted-text mt-1">Leave blank for no limit.</p>
          </div>

          {/* Auto confirm */}
          <div className="flex items-start gap-3 pt-1">
            <Toggle
              on={settings.auto_confirm_bookings}
              onChange={v => setSetting('auto_confirm_bookings', v)}
            />
            <div>
              <p className="text-sm font-medium text-near-black">Auto-confirm bookings</p>
              <p className="text-xs text-muted-text mt-0.5">
                Bookings are confirmed instantly without manual approval.
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* ─── Section 3: Slot Release ─── */}
      <CollapsibleSection
        icon={Timer}
        title="Slot Release"
        subtitle="Open your calendar on a schedule instead of anytime."
        open={openSection === 'release'}
        onToggle={() => setOpenSection(s => s === 'release' ? null : 'release')}
      >
        <div className="space-y-5">
          {/* Main toggle */}
          <div className="flex items-start gap-3">
            <Toggle
              on={settings.slot_release_enabled}
              onChange={v => setSetting('slot_release_enabled', v)}
            />
            <div>
              <p className="text-sm font-medium text-near-black">Release booking slots on a schedule</p>
              <p className="text-xs text-muted-text mt-0.5">
                Use this if you open your books weekly, bi-weekly, or monthly rather than letting clients book anytime.
              </p>
            </div>
          </div>

          {settings.slot_release_enabled && (
            <div className="space-y-4 pt-1">
              {/* Frequency */}
              <SelectInput
                label="Release frequency"
                value={settings.slot_release_frequency ?? 'weekly'}
                onChange={v => setSetting('slot_release_frequency', v as BookingSettings['slot_release_frequency'])}
                options={FREQ_OPTIONS}
              />

              {/* Day of week — shown for weekly / biweekly */}
              {(settings.slot_release_frequency === 'weekly' || settings.slot_release_frequency === 'biweekly') && (
                <SelectInput
                  label="Release on day"
                  value={settings.slot_release_day_of_week ?? 1}
                  onChange={v => setSetting('slot_release_day_of_week', v)}
                  options={DAY_NAMES.map((d, i) => ({ value: i, label: d }))}
                />
              )}

              {/* Day of month — shown for monthly */}
              {settings.slot_release_frequency === 'monthly' && (
                <div>
                  <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5 block">
                    Release on day of month
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="1"
                    value={settings.slot_release_day_of_month ?? ''}
                    onChange={e => setSetting(
                      'slot_release_day_of_month',
                      e.target.value ? parseInt(e.target.value, 10) : null,
                    )}
                    className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black/30 transition-colors"
                  />
                </div>
              )}

              {/* Release time */}
              <TimeInput
                label="Release at time"
                value={settings.slot_release_time}
                onChange={v => setSetting('slot_release_time', v)}
              />

              {/* Window days */}
              <div>
                <label className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5 block">
                  Open how many days of availability
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="14"
                  value={settings.slot_release_window_days ?? ''}
                  onChange={e => setSetting(
                    'slot_release_window_days',
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )}
                  className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2.5 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black/30 transition-colors"
                />
              </div>

              {/* Live example */}
              <SlotReleaseExample s={settings} />
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* ─── Section 4: Blocked Dates (coming soon) ─── */}
      <div className="mx-5 mb-5">
        <div className="border border-[rgba(18,18,18,0.10)] bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 bg-lavender border border-[rgba(18,18,18,0.08)] flex items-center justify-center flex-shrink-0">
              <Lock size={14} className="text-[rgba(18,18,18,0.45)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold text-near-black">Blocked Dates</h3>
                <span className="text-[9px] font-bold tracking-[0.10em] uppercase bg-lavender text-[rgba(18,18,18,0.5)] px-1.5 py-0.5">
                  Coming soon
                </span>
              </div>
              <p className="text-xs text-muted-text">
                Block vacations, holidays, or personal days so clients can&apos;t book during those times.
              </p>
            </div>
          </div>
          <button
            disabled
            className="text-[10px] font-bold tracking-[0.12em] uppercase border border-[rgba(18,18,18,0.10)] px-3 py-2 text-muted-text cursor-not-allowed opacity-50"
          >
            <Calendar size={11} className="inline mr-1.5 mb-0.5" />
            Add blocked date
          </button>
        </div>
      </div>

      {/* ─── Save bar ─── */}
      <div className="px-5">
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} size="md" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : 'Save Availability'}
          </Button>
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
          {saveState === 'error' && error && (
            <span className="text-xs text-red-500">{error}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  icon: React.ElementType
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-[rgba(18,18,18,0.08)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(18,18,18,0.02)] transition-colors"
      >
        <div className="w-7 h-7 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center justify-center flex-shrink-0">
          <Icon size={13} className="text-muted-text" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-near-black">{title}</p>
          {subtitle && !open && (
            <p className="text-xs text-muted-text mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-muted-text flex-shrink-0" /> : <ChevronDown size={15} className="text-muted-text flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1">
          {children}
        </div>
      )}
    </div>
  )
}
