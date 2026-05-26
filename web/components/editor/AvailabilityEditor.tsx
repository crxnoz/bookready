'use client'

import { useEffect, useState } from 'react'
import { HoursEntry, AvailabilitySettings, AvailabilityData, BlockedDate } from '@/lib/types'
import {
  getEditorAvailability,
  updateEditorAvailability,
  getEditorBlockedDates,
  createEditorBlockedDate,
  deleteEditorBlockedDate,
} from '@/lib/api'
import Button from '@/components/ui/Button'
import {
  Clock,
  Calendar,
  Settings2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  Users,
  Moon,
  Repeat,
} from 'lucide-react'
import { ComingSoonCard } from '@/components/editor/ComingSoonPanel'

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const DEFAULT_SETTINGS: AvailabilitySettings = {
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
  const [settings, setSettings] = useState<AvailabilitySettings>(DEFAULT_SETTINGS)
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [error, setError]         = useState<string | null>(null)

  // Section collapse state
  const [openSection, setOpenSection] = useState<'hours' | 'limits' | 'blocked' | null>('hours')

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

  function setSetting<K extends keyof AvailabilitySettings>(key: K, value: AvailabilitySettings[K]) {
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
      {/* Page heading — section + title live in EditorShell */}
      <div className="px-5 pt-5 pb-4 border-b border-[rgba(18,18,18,0.08)]">
        <p className="text-xs text-muted-text">Set your weekly hours, breaks, and per-day capacity.</p>
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
        title="Schedule Limits"
        subtitle="Per-appointment buffers and daily capacity."
        open={openSection === 'limits'}
        onToggle={() => setOpenSection(s => s === 'limits' ? null : 'limits')}
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
        </div>
      </CollapsibleSection>

      {/* ─── Section 4: Blocked Dates ─── */}
      <CollapsibleSection
        icon={Calendar}
        title="Blocked Dates"
        subtitle="Holidays, vacations, and full studio closures."
        open={openSection === 'blocked'}
        onToggle={() => setOpenSection(s => s === 'blocked' ? null : 'blocked')}
      >
        <BlockedDatesPanel />
      </CollapsibleSection>

      {/* Phase 18 — Coming-soon teasers. Three side-by-side cards under
          the existing sections so owners can see what is next without
          competing with live settings. */}
      <div className="px-5 pt-5">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-2">
          Coming next for availability
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ComingSoonCard
            icon={Users}
            tone="accent"
            title="Group appointments"
            description="One slot, multiple clients. Perfect for classes or workshops."
            bullets={[
              'Set a min + max headcount per slot',
              'Auto-confirm once the minimum is hit',
              'One shared calendar event for the studio',
            ]}
          />
          <ComingSoonCard
            icon={Moon}
            title="After hours"
            description="Open select dates outside your normal hours for VIPs or special events."
            bullets={[
              'Charge a premium for after-hours slots',
              'Pick which staff can take them',
              'Auto-revert to regular hours the next day',
            ]}
          />
          <ComingSoonCard
            icon={Repeat}
            title="Recurring appointments"
            description="Let regulars book the same time every week or month, automatically."
            bullets={[
              'Weekly, biweekly, or monthly cadences',
              'Pause or skip individual occurrences',
              'Owner-side bulk reschedule for studio holidays',
            ]}
          />
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

// ── Blocked dates panel ──────────────────────────────────────────────────────

/**
 * Tenant-wide blocked dates. Per-staff vacations live on each staff
 * card under /editor/staff (Phase 2); this panel covers full-shop
 * closures: holidays, family emergencies, special-event closures, etc.
 * SlotGenerator short-circuits when a requested date falls inside any
 * row here, so bookings can't sneak through.
 */
function BlockedDatesPanel() {
  const [rows,    setRows]    = useState<BlockedDate[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [start,   setStart]   = useState('')
  const [end,     setEnd]     = useState('')
  const [reason,  setReason]  = useState('')
  const [adding,  setAdding]  = useState(false)
  const [addErr,  setAddErr]  = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setLoadErr(null)
    getEditorBlockedDates()
      .then(r => { if (! cancelled) setRows(r) })
      .catch(e => { if (! cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load blocked dates') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (! start) return
    setAdding(true); setAddErr(null)
    try {
      const created = await createEditorBlockedDate({
        start_date: start,
        end_date:   end || null,
        reason:     reason.trim() || null,
      })
      setRows(prev => [...(prev ?? []), created].sort((a, b) => a.start_date.localeCompare(b.start_date)))
      setStart(''); setEnd(''); setReason('')
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Failed to add blocked date')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    if (! confirm('Remove this blocked date?')) return
    try {
      await deleteEditorBlockedDate(id)
      setRows(prev => (prev ?? []).filter(r => r.id !== id))
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to remove')
    }
  }

  function rangeLabel(r: BlockedDate): string {
    return r.end_date && r.end_date !== r.start_date
      ? `${r.start_date} → ${r.end_date}`
      : r.start_date
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-text">
        Block vacations, holidays, or full studio closures. Bookings on these days are rejected with a friendly message.
        Need to mark <em>just one staff member</em> unavailable? Open that staff member&apos;s Schedule panel under{' '}
        <span className="font-semibold text-near-black">Editor → Staff</span>.
      </p>

      {/* Add row */}
      <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap bg-cream border border-[rgba(18,18,18,0.08)] p-3">
        <div>
          <label className="block text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">From</label>
          <input
            type="date" required
            value={start}
            onChange={e => setStart(e.target.value)}
            className="border border-[rgba(18,18,18,0.15)] bg-white px-2 py-1.5 text-[11px] text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">To (optional)</label>
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={e => setEnd(e.target.value)}
            className="border border-[rgba(18,18,18,0.15)] bg-white px-2 py-1.5 text-[11px] text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[9px] font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={200}
            placeholder="Holiday, vacation, private event…"
            className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-2 py-1.5 text-[11px] text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <button
          type="submit"
          disabled={! start || adding}
          className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.08em] uppercase bg-near-black text-white px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Block
        </button>
      </form>

      {addErr && (
        <p className="text-[11px] text-red-700 flex items-center gap-1.5">
          <AlertCircle size={11} /> {addErr}
        </p>
      )}
      {loadErr && (
        <p className="text-[11px] text-red-700 flex items-center gap-1.5">
          <AlertCircle size={11} /> {loadErr}
        </p>
      )}

      {loading && <p className="text-[11px] text-muted-text">Loading…</p>}

      {rows && rows.length === 0 && ! loading && (
        <p className="text-[11px] text-muted-text italic">No blocked dates yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="bg-white border border-[rgba(18,18,18,0.08)] divide-y divide-[rgba(18,18,18,0.06)]">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-near-black">{rangeLabel(r)}</p>
                {r.reason && (
                  <p className="text-[10px] text-muted-text truncate">{r.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 flex-shrink-0"
                title="Remove"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
