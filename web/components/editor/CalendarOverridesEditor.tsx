'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Loader2, AlertCircle, X, Plus, Minus,
  Trash2, Save, Sparkles, Info, CalendarDays, Clock, CalendarOff,
} from 'lucide-react'
import {
  getEditorCalendarOverrides, getEditorCalendarOverride,
  upsertEditorCalendarOverride, deleteEditorCalendarOverride,
  getEditorHours, getEditorStaff, getEditorServices,
  getEditorReleaseState, getEditorCalendarCounts,
  type CalendarOverride, type ReleaseState, type CalendarCount, type CalendarCountsResponse,
} from '@/lib/api'
import type { HoursEntry, Service, ApiStaffMember } from '@/lib/types'
import { cn } from '@/lib/cn'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { TabShell, TabIntro, Section } from '@/components/editor/AvailabilitySections'

/**
 * Availability 2.0 · Phase 1 · Smart Calendar
 *
 * Calendar-first availability editor. Owners pick a date → set hours,
 * break, staff, services, notes for that specific date. The override
 * layers on top of the weekly schedule (`/editor/availability` tab
 * "Weekly") which remains the fallback per the founder spec.
 *
 * Reads:
 *   - GET /editor/hours                              (weekly defaults)
 *   - GET /editor/calendar-overrides?from&to         (overrides this month)
 *   - GET /editor/staff?active=true                  (staff list)
 *   - GET /editor/services                           (services list)
 *
 * Writes:
 *   - PUT    /editor/calendar-overrides/{date}       upsert
 *   - DELETE /editor/calendar-overrides/{date}       clear (fall back to weekly)
 *
 * The grid is monthly, 7 columns x 6 rows. Each cell renders the EFFECTIVE
 * state (override wins, weekly fills in) so the owner sees the day as the
 * customer will see it.
 */

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function CalendarOverridesEditor() {
  const [cursor,      setCursor]      = useState<Date>(firstOfMonth(new Date()))
  const [weekly,      setWeekly]      = useState<HoursEntry[]>([])
  const [overrides,   setOverrides]   = useState<CalendarOverride[]>([])
  const [staff,       setStaff]       = useState<ApiStaffMember[]>([])
  const [services,    setServices]    = useState<Service[]>([])
  const [releaseState, setReleaseState] = useState<ReleaseState | null>(null)
  const [counts,      setCounts]      = useState<CalendarCountsResponse | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState<string | null>(null)
  const [editingDate, setEditingDate] = useState<string | null>(null)

  // Av2.0 §8: Release strategy moved to its own "Date Drops" tab. The
  // calendar still reads release state (below) to tint un-released cells;
  // it re-fetches on mount, so switching back from the Date Drops tab
  // (which remounts this component) reflects any strategy change.

  // Bootstrap — weekly schedule + staff + services load once, overrides
  // re-fetch when the month changes.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorHours().catch(() => [] as HoursEntry[]),
      getEditorStaff({ active: true }).catch(() => [] as ApiStaffMember[]),
      getEditorServices().catch(() => [] as Service[]),
      getEditorReleaseState().catch(() => null),
    ]).then(([h, s, sv, rs]) => {
      if (cancelled) return
      setWeekly(h); setStaff(s); setServices(sv); setReleaseState(rs)
    }).catch(() => {
      if (! cancelled) setError('Could not load weekly hours.')
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const from = formatDate(firstOfMonth(cursor))
    const to   = formatDate(lastOfMonth(cursor))
    setLoading(true)
    Promise.all([
      getEditorCalendarOverrides(from, to),
      // Counts powers the per-cell capacity badge + tint. Failures
      // are silently absorbed — calendar still renders without badges.
      getEditorCalendarCounts(from, to).catch(() => null),
    ])
      .then(([o, c]) => {
        if (cancelled) return
        setOverrides(o.overrides)
        setCounts(c)
      })
      .catch(e => { if (! cancelled) setError(e instanceof Error ? e.message : 'Failed to load overrides') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cursor])

  const overridesByDate = useMemo(() => {
    const m = new Map<string, CalendarOverride>()
    for (const o of overrides) m.set(o.date, o)
    return m
  }, [overrides])

  const weeklyByDow = useMemo(() => {
    const m = new Map<number, HoursEntry>()
    for (const w of weekly) m.set(w.day_of_week, w)
    return m
  }, [weekly])

  // Av2.0 P3 — counts per date for the badge. We only get rows for
  // dates that have either bookings or an explicit cap; for everything
  // else the default applies.
  const countByDate = useMemo(() => {
    const m = new Map<string, CalendarCount>()
    for (const c of counts?.counts ?? []) m.set(c.date, c)
    return m
  }, [counts])
  const defaultCapacity = counts?.default_capacity ?? null

  // Build the 6-row grid of dates for the cursor month, padding with
  // outside-month days so every row has 7 cells.
  const cells = useMemo(() => buildMonthCells(cursor), [cursor])

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const today = formatDate(new Date())

  function navigate(delta: number) {
    const d = new Date(cursor)
    d.setMonth(d.getMonth() + delta)
    setCursor(firstOfMonth(d))
  }

  async function handleSaved() {
    // Refresh overrides + counts for the visible month, close modal.
    setEditingDate(null)
    const from = formatDate(firstOfMonth(cursor))
    const to   = formatDate(lastOfMonth(cursor))
    try {
      const [o, c] = await Promise.all([
        getEditorCalendarOverrides(from, to),
        getEditorCalendarCounts(from, to).catch(() => null),
      ])
      setOverrides(o.overrides)
      if (c) setCounts(c)
    } catch { /* swallow — next mount refetches */ }
  }

  return (
    <TabShell>
      {/* Av2.0 P2 — diagonal-stripe overlay for un-released dates. Tailwind
          doesn't express repeating-linear-gradient ergonomically, so a tiny
          scoped style block sits here instead of polluting global CSS. */}
      <style>{`
        .cal-unreleased {
          background-image: repeating-linear-gradient(
            -45deg,
            rgba(201, 168, 118, 0.18) 0,
            rgba(201, 168, 118, 0.18) 4px,
            transparent 4px,
            transparent 10px
          );
        }
      `}</style>
      <TabIntro>Click any date to set hours, breaks, available staff, or close the day — falls back to your weekly schedule for any date you haven&rsquo;t touched.</TabIntro>
      <Section
        icon={CalendarDays}
        title="Smart Calendar"
        subtitle="Per-date hours, capacity, and release windows."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-9 h-9 inline-flex items-center justify-center bg-white border border-hairline-strong text-near-black hover:border-near-black"
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="text-sm font-bold text-near-black tracking-tight w-36 text-center">
              {monthLabel}
            </div>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="w-9 h-9 inline-flex items-center justify-center bg-white border border-hairline-strong text-near-black hover:border-near-black"
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => setCursor(firstOfMonth(new Date()))}
              className="text-2xs font-semibold tracking-[0.06em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black"
            >
              Today
            </button>
          </div>
        }
      >

      {error && (
        <div className="bg-white border border-danger p-3 text-xs text-danger flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Day-of-week row */}
      <div className="grid grid-cols-7 mb-1.5">
        {DOW_LABELS.map(d => (
          <div key={d} className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text text-center py-1.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-[rgba(18,18,18,0.10)] border border-hairline-soft">
        {cells.map((cell, i) => {
          // Av2.0 P2 — un-released = date is past the resolved release window.
          // Strictly greater-than: if releasedUntil = Jun 15, Jun 15 itself IS bookable.
          const unreleased =
            releaseState?.released_until != null
            && cell.dateStr > releaseState.released_until

          // Av2.0 P3 — count + effective capacity for this date.
          // Effective cap: override row's max_appointments > the per-date
          // count payload's `capacity` (which already merges override +
          // global default backend-side). Falls back to the global default
          // when the date has no count row at all.
          const override = overridesByDate.get(cell.dateStr)
          const countRow = countByDate.get(cell.dateStr)
          const count    = countRow?.appointment_count ?? 0
          const capacity =
            (override?.max_appointments ?? null)
            ?? countRow?.capacity
            ?? defaultCapacity

          return (
            <CalendarCell
              key={i}
              cell={cell}
              today={today}
              cursorMonth={cursor.getMonth()}
              override={override}
              weekly={weeklyByDow.get(cell.dow)}
              unreleased={unreleased}
              count={count}
              capacity={capacity}
              onClick={() => setEditingDate(cell.dateStr)}
            />
          )
        })}
      </div>

      {loading && (
        <p className="text-eyebrow text-muted-text mt-2 inline-flex items-center gap-1.5">
          <Loader2 size={10} className="animate-spin" /> Loading overrides…
        </p>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-eyebrow text-muted-text">
        <Legend swatchClass="bg-white border border-hairline-strong" label="Default — weekly schedule applies" />
        <Legend swatchClass="bg-cream border border-[rgba(180,138,184,0.6)]" label="Custom — date override set" />
        <Legend swatchClass="bg-[rgba(180,40,40,0.10)] border border-[rgba(180,40,40,0.40)]" label="Closed by override" />
        <Legend swatchClass="bg-[rgba(18,18,18,0.06)] border border-hairline-strong" label="Weekly default: closed" />
        <Legend swatchClass="cal-unreleased border border-hairline-strong" label="Not released for booking yet" />
        <Legend swatchClass="bg-[rgba(15,111,61,0.06)] border border-hairline-strong" label="Has space (under 70% booked)" />
        <Legend swatchClass="bg-[rgba(201,168,118,0.14)] border border-hairline-strong" label="Nearly full (70-99%)" />
        <Legend swatchClass="bg-[rgba(180,40,40,0.08)] border border-hairline-strong" label="Full (capacity reached)" />
      </div>

      {releaseState?.released_until && (
        <p className="text-2xs text-muted-text mt-2">
          Currently bookable through{' '}
          <strong className="text-near-black">
            {new Date(releaseState.released_until + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </strong>
          {' '}({releaseState.mode} strategy).
        </p>
      )}

      {/* Where the fallbacks live — any date you don't customize uses your
          weekly Regular Hours, and Blocked Dates close days entirely. Both
          are managed on the Advanced tab. */}
      <div className="mt-4 pt-3 border-t border-hairline-soft flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xs text-muted-text">
        <span>Untouched dates fall back to your weekly schedule — manage it in Advanced:</span>
        <Link href="/editor/availability?tab=advanced" className="inline-flex items-center gap-1 font-semibold text-near-black hover:underline">
          <Clock size={11} /> Regular Hours
        </Link>
        <Link href="/editor/availability?tab=advanced" className="inline-flex items-center gap-1 font-semibold text-near-black hover:underline">
          <CalendarOff size={11} /> Blocked Dates
        </Link>
      </div>
      </Section>

      {editingDate && (
        <OverrideEditorDialog
          date={editingDate}
          weekly={weeklyByDow.get(dowOf(editingDate))}
          staff={staff}
          services={services}
          defaultCapacity={defaultCapacity}
          onClose={() => setEditingDate(null)}
          onSaved={handleSaved}
        />
      )}
    </TabShell>
  )
}

// ── Cell ──────────────────────────────────────────────────────────────────────

interface CellModel { date: Date; dateStr: string; dow: number; outsideMonth: boolean }

function CalendarCell({
  cell, today, cursorMonth, override, weekly, unreleased, count, capacity, onClick,
}: {
  cell:         CellModel
  today:        string
  cursorMonth:  number
  override?:    CalendarOverride
  weekly?:      HoursEntry
  unreleased?:  boolean
  /** Av2.0 P3: appointments booked so far on this date. */
  count?:       number
  /** Av2.0 P3: effective daily cap (null = unlimited). */
  capacity?:    number | null
  onClick:      () => void
}) {
  const isToday   = cell.dateStr === today
  const isPast    = cell.dateStr <  today
  const isOutside = cell.date.getMonth() !== cursorMonth

  // Closed state (weekly is_closed or override force-closed) is independent
  // of capacity — even fully-booked-on-paper closed days stay gray.
  const isClosed = (! override && (! weekly || ! weekly.is_open))
    || (override && ! override.is_available)

  // Effective state
  let bg = 'bg-white'
  let border = 'border-transparent'
  let label = ''
  let labelTone = 'text-muted-text'

  // Default (no override) — derive from weekly
  if (! override) {
    if (! weekly || ! weekly.is_open) {
      bg = 'bg-[rgba(18,18,18,0.04)]'
      label = 'Closed'
    } else {
      label = `${shortTime(weekly.open_time)}–${shortTime(weekly.close_time)}`
    }
  } else if (! override.is_available) {
    bg = 'bg-[rgba(180,40,40,0.06)]'
    border = 'border-[rgba(180,40,40,0.35)]'
    label = 'Closed (override)'
    labelTone = 'text-danger'
  } else {
    // Available override — render effective hours (override fills weekly)
    bg = 'bg-cream'
    border = 'border-[rgba(180,138,184,0.55)]'
    const o = override.open_time  ?? weekly?.open_time  ?? null
    const c = override.close_time ?? weekly?.close_time ?? null
    label = o && c ? `${shortTime(o)}–${shortTime(c)}` : 'Custom'
    labelTone = 'text-near-black font-semibold'
  }

  // Av2.0 P3 — capacity tint. Only meaningful when the day is open AND a
  // capacity is set. Layers OVER the base bg via a translucent stripe so
  // override colors still read underneath.
  let capacityTint = ''
  const hasBookings = (count ?? 0) > 0
  if (! isClosed && (capacity ?? null) !== null && hasBookings) {
    const pct = (count ?? 0) / (capacity as number)
    if (pct >= 1)        capacityTint = 'bg-[rgba(180,40,40,0.08)]'
    else if (pct >= 0.7) capacityTint = 'bg-[rgba(201,168,118,0.14)]'
    else                 capacityTint = 'bg-[rgba(15,111,61,0.06)]'
  }

  // Av2.0 P2 — un-released cells get a diagonal-stripe overlay regardless
  // of the override state below them. Owners can still click to set an
  // override; the date just isn't bookable yet for customers.
  const capLabel = (capacity ?? null) !== null
    ? `${count ?? 0}/${capacity}`
    : ((count ?? 0) > 0 ? `${count}` : null)

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative text-left p-2 min-h-[72px] transition-colors',
        bg,
        capacityTint,
        border !== 'border-transparent' && 'border-2',
        border,
        isToday && 'ring-2 ring-near-black ring-inset',
        isOutside && 'opacity-40',
        isPast && ! isToday && 'opacity-60',
        unreleased && 'cal-unreleased',
        'hover:bg-blush focus:outline-none focus:bg-blush',
      )}
      aria-label={`Edit ${cell.dateStr}${unreleased ? ' (not released)' : ''}${capLabel ? ` — ${capLabel} booked` : ''}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={cn(
          'block text-2xs font-bold tabular-nums',
          isToday ? 'text-near-black' : 'text-near-black/80',
        )}>
          {cell.date.getDate()}
        </span>
        {capLabel && ! isClosed && (
          <span className="text-eyebrow font-bold tabular-nums text-near-black/70 leading-none mt-0.5">
            {capLabel}
          </span>
        )}
      </div>
      <span className={cn('block text-eyebrow mt-1 leading-tight truncate', labelTone)}>
        {unreleased ? 'Not released' : label}
      </span>
      {override?.notes && (
        <span className="absolute bottom-1 right-1 w-1.5 h-1.5  bg-[#B98AA8]" title={override.notes} />
      )}
    </button>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend({ swatchClass, label }: { swatchClass: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-3 h-3', swatchClass)} />
      <span>{label}</span>
    </span>
  )
}

// ── Override Editor Dialog ────────────────────────────────────────────────────

function OverrideEditorDialog({
  date, weekly, staff, services, defaultCapacity, onClose, onSaved,
}: {
  date:             string
  weekly?:          HoursEntry
  staff:            ApiStaffMember[]
  services:         Service[]
  defaultCapacity?: number | null
  onClose:          () => void
  onSaved:          () => Promise<void> | void
}) {
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [deleting,   setDeleting]   = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [hasExisting, setHasExisting] = useState(false)
  const confirm = useConfirm()

  const [isAvailable, setIsAvailable] = useState(true)
  const [openTime,    setOpenTime]    = useState('')
  const [closeTime,   setCloseTime]   = useState('')
  const [breakStart,  setBreakStart]  = useState('')
  const [breakEnd,    setBreakEnd]    = useState('')
  const [maxAppts,    setMaxAppts]    = useState<string>('') // string for blank/empty-input UX
  const [staffIds,    setStaffIds]    = useState<number[] | null>(null)
  const [serviceIds,  setServiceIds]  = useState<number[] | null>(null)
  const [notes,       setNotes]       = useState('')

  // Fetch the existing override (if any) on mount.
  useEffect(() => {
    let cancelled = false
    getEditorCalendarOverride(date)
      .then(o => {
        if (cancelled) return
        if (o) {
          setHasExisting(true)
          setIsAvailable(o.is_available)
          setOpenTime  (o.open_time   ?? '')
          setCloseTime (o.close_time  ?? '')
          setBreakStart(o.break_start ?? '')
          setBreakEnd  (o.break_end   ?? '')
          setMaxAppts  (o.max_appointments !== null ? String(o.max_appointments) : '')
          setStaffIds  (o.staff_ids)
          setServiceIds(o.service_ids)
          setNotes     (o.notes ?? '')
        }
      })
      .catch(e => { if (! cancelled) setError(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [date])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const weeklyDesc = weekly?.is_open
    ? `Weekly default: ${shortTime(weekly.open_time)}–${shortTime(weekly.close_time)}${weekly.break_start ? ` (break ${shortTime(weekly.break_start)}–${shortTime(weekly.break_end)})` : ''}`
    : 'Weekly default: closed'

  async function save() {
    setSaving(true); setError(null)
    try {
      const maxApptsParsed = maxAppts.trim() === '' ? null : Math.max(1, Math.min(500, parseInt(maxAppts, 10) || 0))
      await upsertEditorCalendarOverride(date, {
        is_available:     isAvailable,
        open_time:        emptyToNull(openTime),
        close_time:       emptyToNull(closeTime),
        break_start:      emptyToNull(breakStart),
        break_end:        emptyToNull(breakEnd),
        max_appointments: maxApptsParsed,
        staff_ids:        staffIds,
        service_ids:      serviceIds,
        notes:            notes.trim() === '' ? null : notes.trim(),
      })
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  async function clearOverride() {
    const ok = await confirm({
      title: 'Clear this override?',
      message: 'This day falls back to your weekly schedule.',
      confirmLabel: 'Clear',
      tone: 'danger',
    })
    if (! ok) return
    setDeleting(true); setError(null)
    try {
      await deleteEditorCalendarOverride(date)
      await onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="relative bg-white border border-hairline-soft w-full max-w-md max-h-[92vh] overflow-y-auto shadow-xl"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-hairline-soft sticky top-0 bg-white z-10">
          <div>
            <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">Day override</p>
            <h2 className="text-base font-bold text-near-black mt-0.5">{dateLabel}</h2>
            <p className="text-2xs text-muted-text mt-1 inline-flex items-center gap-1">
              <Info size={11} /> {weeklyDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center text-muted-text hover:text-near-black"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        {loading ? (
          <div className="p-6 flex items-center gap-2 text-xs text-muted-text">
            <Loader2 size={14} className="animate-spin" /> Loading override…
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Available toggle */}
            <div className="flex gap-2">
              <PillToggle on={isAvailable}  onClick={() => setIsAvailable(true)}  label="Available"  tone="good" />
              <PillToggle on={!isAvailable} onClick={() => setIsAvailable(false)} label="Closed"     tone="bad" />
            </div>

            {isAvailable && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <TimeField label="Open"  value={openTime}  onChange={setOpenTime}  placeholder={weekly?.open_time ?? '10:00'} />
                  <TimeField label="Close" value={closeTime} onChange={setCloseTime} placeholder={weekly?.close_time ?? '18:00'} />
                </div>
                <p className="text-eyebrow text-muted-text -mt-1">
                  Leave a time blank to inherit the weekly default.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <TimeField label="Break starts" value={breakStart} onChange={setBreakStart} placeholder={weekly?.break_start ?? '—'} />
                  <TimeField label="Break ends"   value={breakEnd}   onChange={setBreakEnd}   placeholder={weekly?.break_end ?? '—'} />
                </div>

                <div>
                  <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
                    Max appointments for this day
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={maxAppts}
                    onChange={e => setMaxAppts(e.target.value)}
                    placeholder={defaultCapacity !== null && defaultCapacity !== undefined ? `Default: ${defaultCapacity}` : 'Default: no limit'}
                    className="w-32 bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black tabular-nums"
                  />
                  <p className="text-eyebrow text-muted-text mt-1">
                    Leave blank to use the default cap from booking settings. Set a number to cap THIS date specifically.
                  </p>
                </div>

                <MultiSelect
                  label="Available staff"
                  helper={staffIds === null ? 'All staff' : `${staffIds.length} selected`}
                  options={staff.map(s => ({ id: s.id, label: s.name }))}
                  selected={staffIds}
                  onChange={setStaffIds}
                />

                <MultiSelect
                  label="Available services"
                  helper={serviceIds === null ? 'All services' : `${serviceIds.length} selected`}
                  options={services.map(s => ({ id: s.id, label: s.name }))}
                  selected={serviceIds}
                  onChange={setServiceIds}
                />

                <div>
                  <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    maxLength={200}
                    placeholder="e.g. holiday hours · staff training · special event"
                    className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-white border border-danger p-2.5 text-2xs text-danger flex items-center gap-2">
                <AlertCircle size={12} /> {error}
              </div>
            )}
          </div>
        )}

        <footer className="sticky bottom-0 bg-white border-t border-hairline-soft px-5 py-3 flex items-center justify-between gap-2">
          <div>
            {hasExisting && (
              <button
                type="button"
                onClick={clearOverride}
                disabled={deleting}
                className="text-2xs font-semibold tracking-[0.06em] uppercase text-danger hover:underline disabled:opacity-50 inline-flex items-center gap-1"
              >
                {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />} Clear override
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-2xs font-semibold tracking-[0.08em] uppercase text-muted-text hover:text-near-black px-2 py-2"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className={cn(
                'inline-flex items-center gap-1.5 text-2xs font-bold tracking-[0.08em] uppercase px-3.5 py-2 border',
                saving || loading
                  ? 'bg-cream border-hairline-soft text-muted-text cursor-wait'
                  : 'bg-near-black border-near-black text-white hover:opacity-90',
              )}
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              {hasExisting ? 'Save changes' : 'Save override'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

// ── Primitives ────────────────────────────────────────────────────────────────

function PillToggle({
  on, onClick, label, tone,
}: { on: boolean; onClick: () => void; label: string; tone: 'good' | 'bad' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-2xs font-bold tracking-[0.08em] uppercase border px-3.5 py-2',
        on
          ? tone === 'good'
            ? 'bg-[rgba(15,111,61,0.06)] border-success text-success'
            : 'bg-[rgba(180,40,40,0.06)] border-danger text-danger'
          : 'bg-white border-hairline-strong text-muted-text hover:border-near-black',
      )}
    >
      {label}
    </button>
  )
}

function TimeField({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">{label}</label>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? ''}
        className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
      />
    </div>
  )
}

interface MSOption { id: number; label: string }

function MultiSelect({
  label, helper, options, selected, onChange,
}: {
  label:    string
  helper:   string
  options:  MSOption[]
  selected: number[] | null
  onChange: (v: number[] | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isAll = selected === null
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{label}</label>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-eyebrow font-semibold text-muted-text hover:text-near-black inline-flex items-center gap-1"
        >
          {helper} {expanded ? <Minus size={10} /> : <Plus size={10} />}
        </button>
      </div>
      {! expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full text-left bg-white border border-hairline-strong px-3 py-2 text-xs text-muted-text hover:border-near-black"
        >
          {isAll ? `All ${label.toLowerCase()}` : `${selected!.length} selected — click to edit`}
        </button>
      ) : (
        <div className="bg-white border border-hairline-strong p-2 space-y-1 max-h-48 overflow-y-auto">
          <label className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:bg-cream">
            <input
              type="checkbox"
              checked={isAll}
              onChange={e => onChange(e.target.checked ? null : [])}
              className="h-3.5 w-3.5 accent-near-black"
            />
            <span className="text-xs text-near-black font-semibold">All {label.toLowerCase()}</span>
          </label>
          <div className="h-px bg-[rgba(18,18,18,0.08)]" />
          {options.map(opt => {
            const checked = ! isAll && selected!.includes(opt.id)
            return (
              <label key={opt.id} className="flex items-center gap-2 px-1 py-1 cursor-pointer hover:bg-cream">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isAll}
                  onChange={e => {
                    const cur = selected ?? []
                    if (e.target.checked) onChange([...cur, opt.id])
                    else                  onChange(cur.filter(id => id !== opt.id))
                  }}
                  className="h-3.5 w-3.5 accent-near-black"
                />
                <span className={cn('text-xs', isAll ? 'text-muted-text' : 'text-near-black')}>
                  {opt.label}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function lastOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}
function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}
function dowOf(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}
function shortTime(t: string | null | undefined): string {
  if (! t) return '—'
  // HH:MM → "10am" / "1:30pm"
  const [h, m] = t.slice(0, 5).split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`
}
function emptyToNull(s: string): string | null {
  const t = s.trim()
  return t === '' ? null : t
}

/**
 * 7 x 6 grid of cells covering the entire visible month, padded with
 * outside-month days so every row is full. Returns 42 cells regardless.
 */
function buildMonthCells(cursor: Date): CellModel[] {
  const first = firstOfMonth(cursor)
  const startOffset = first.getDay()                       // 0=Sun
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - startOffset)
  const cells: CellModel[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push({
      date: d,
      dateStr: formatDate(d),
      dow: d.getDay(),
      outsideMonth: d.getMonth() !== cursor.getMonth(),
    })
  }
  return cells
}
