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
import Toggle from '@/components/ui/Toggle'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { CollapsibleSection } from '@/components/editor/AvailabilitySections'

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

// ── Primitives ────────────────────────────────────────────────────────────────

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
        <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
          {label}
        </span>
      )}
      <input
        type="time"
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        className="w-full bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30 transition-colors"
      />
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
    <div className="bg-white border border-hairline-soft overflow-hidden">
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-bold text-near-black w-28">{entry.day_name}</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${entry.is_open ? 'text-near-black' : 'text-muted-text'}`}>
            {entry.is_open ? 'Open' : 'Closed'}
          </span>
          <Toggle checked={entry.is_open} onChange={v => set('is_open', v)} />
        </div>
      </div>

      {/* Open times */}
      {entry.is_open && (
        <div className="px-4 pb-3 border-t border-hairline-soft">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <TimeInput label="Opens" value={entry.open_time} onChange={v => set('open_time', v)} />
            <TimeInput label="Closes" value={entry.close_time} onChange={v => set('close_time', v)} />
          </div>

          {showBreak && (
            <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-hairline-soft">
              <TimeInput label="Break start" value={entry.break_start} onChange={v => set('break_start', v)} />
              <TimeInput label="Break end" value={entry.break_end} onChange={v => set('break_end', v)} />
            </div>
          )}

          <button
            type="button"
            onClick={toggleBreak}
            className="mt-3 text-eyebrow font-bold tracking-[0.12em] uppercase text-muted-text hover:text-near-black transition-colors"
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
  const [openSection, setOpenSection] = useState<'hours' | 'blocked' | null>('hours')

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
    <div className="space-y-4">
      {error && saveState === 'error' && (
        <div className="px-4 py-3 bg-danger-bg border border-danger text-xs text-danger">
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
            className="text-eyebrow font-bold tracking-[0.08em] uppercase px-3 py-1.5 border border-hairline text-muted-text hover:text-near-black hover:border-near-black/30 transition-colors"
          >
            Copy Mon → Weekdays
          </button>
          <button
            onClick={closeWeekend}
            className="text-eyebrow font-bold tracking-[0.08em] uppercase px-3 py-1.5 border border-hairline text-muted-text hover:text-near-black hover:border-near-black/30 transition-colors"
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

      {/* ─── Section 2: Blocked Dates ─── */}
      <CollapsibleSection
        icon={Calendar}
        title="Blocked Dates"
        subtitle="Holidays, vacations, and full studio closures."
        open={openSection === 'blocked'}
        onToggle={() => setOpenSection(s => s === 'blocked' ? null : 'blocked')}
      >
        <BlockedDatesPanel />
      </CollapsibleSection>

      {/* ─── Save bar ─── */}
      <div className="pt-1">
        <div className="flex items-center gap-4">
          <Button onClick={handleSave} size="md" disabled={saveState === 'saving'}>
            {saveState === 'saving' ? 'Saving…' : 'Save Availability'}
          </Button>
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-success font-semibold">
              <CheckCircle2 size={13} />
              Saved
            </span>
          )}
          {saveState === 'error' && error && (
            <span className="text-xs text-danger">{error}</span>
          )}
        </div>
      </div>
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
  const confirm = useConfirm()

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
    const ok = await confirm({ title: 'Remove this blocked date?', confirmLabel: 'Remove', tone: 'danger' })
    if (! ok) return
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
      <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap bg-cream border border-hairline-soft p-3">
        <div>
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">From</label>
          <input
            type="date" required
            value={start}
            onChange={e => setStart(e.target.value)}
            className="border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <div>
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">To (optional)</label>
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={e => setEnd(e.target.value)}
            className="border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={200}
            placeholder="Holiday, vacation, private event…"
            className="w-full border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <button
          type="submit"
          disabled={! start || adding}
          className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Block
        </button>
      </form>

      {addErr && (
        <p className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={11} /> {addErr}
        </p>
      )}
      {loadErr && (
        <p className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={11} /> {loadErr}
        </p>
      )}

      {loading && <p className="text-2xs text-muted-text">Loading…</p>}

      {rows && rows.length === 0 && ! loading && (
        <p className="text-2xs text-muted-text italic">No blocked dates yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-near-black">{rangeLabel(r)}</p>
                {r.reason && (
                  <p className="text-eyebrow text-muted-text truncate">{r.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger flex-shrink-0"
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
