'use client'

import { useEffect, useState } from 'react'
import {
  Clock, Calendar, Plus, Trash2, AlertCircle, Loader2, CheckCircle,
} from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import { useRole } from '@/components/app/RoleContext'
import {
  getEditorStaffHours,
  updateEditorStaffHours,
  getEditorStaffBlockedDates,
  createEditorStaffBlockedDate,
  deleteEditorStaffBlockedDate,
} from '@/lib/api'
import type { StaffHoursEntry, StaffBlockedDate } from '@/lib/types'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'

/**
 * Wave D — the staff member's own working hours + blocked dates. Both back
 * onto the self-scoped tenant_member endpoints (staff/{staffId}/hours and
 * staff/{staffId}/blocked-dates), so a staff login can only ever read/write
 * their own rows. Owners are routed elsewhere by the sidebar.
 */
export default function MyHoursPage() {
  return (
    <EditorShell title="My hours" subtitle="Set your working hours and block days off.">
      <MyHoursInner />
    </EditorShell>
  )
}

function MyHoursInner() {
  const { staffId } = useRole()

  if (staffId == null) {
    return (
      <div className="p-6">
        <div className="bg-white border border-hairline-soft px-4 py-12 text-center">
          <Clock size={24} className="text-muted-text mx-auto mb-3" />
          <p className="text-sm font-semibold text-near-black mb-1">No schedule to show</p>
          <p className="text-xs text-muted-text">Your hours are not available right now.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-5 max-w-2xl">
      <MyHoursPanel staffId={staffId} />
      <MyBlockedDatesPanel staffId={staffId} />
    </div>
  )
}

// ── Working hours ────────────────────────────────────────────────────────────

function MyHoursPanel({ staffId }: { staffId: number }) {
  const toast = useToast()
  const [hours,   setHours]   = useState<StaffHoursEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [dirty,   setDirty]   = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getEditorStaffHours(staffId)
      .then(rows => { if (!cancelled) { setHours(rows); setDirty(false) } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load hours') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [staffId])

  function patchDay(dow: number, p: Partial<StaffHoursEntry>) {
    setHours(prev => (prev ?? []).map(h => h.day_of_week === dow ? { ...h, ...p } : h))
    setDirty(true)
    if (saved) setSaved(false)
  }

  async function save() {
    if (!hours) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const next = await updateEditorStaffHours(staffId, hours)
      setHours(next)
      setDirty(false)
      setSaved(true)
      toast.success('Hours saved.')
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save hours')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-hairline-soft p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1.5">
          <Clock size={11} /> Working hours
        </p>
        {hours && (
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <><Loader2 size={10} className="animate-spin" /> Saving</>
              : saved
              ? <><CheckCircle size={11} /> Saved</>
              : 'Save'
            }
          </button>
        )}
      </div>

      {loading && <p className="text-2xs text-muted-text">Loading hours…</p>}
      {error && (
        <p className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {hours && (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {hours.map(day => (
            <div key={day.day_of_week} className="flex items-center gap-2 px-3 py-2 flex-wrap">
              <div className="flex items-center gap-2 w-24 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={e => patchDay(day.day_of_week, { is_open: e.target.checked })}
                  className="w-4 h-4 accent-near-black"
                />
                <span className="text-2xs font-semibold text-near-black">{day.day_name.slice(0, 3)}</span>
              </div>
              {day.is_open ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="time"
                    value={day.open_time ?? ''}
                    onChange={e => patchDay(day.day_of_week, { open_time: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                  <span className="text-muted-text text-eyebrow">to</span>
                  <input
                    type="time"
                    value={day.close_time ?? ''}
                    onChange={e => patchDay(day.day_of_week, { close_time: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                  <span className="text-muted-text text-eyebrow ml-1">break</span>
                  <input
                    type="time"
                    value={day.break_start ?? ''}
                    onChange={e => patchDay(day.day_of_week, { break_start: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                  <span className="text-muted-text text-eyebrow">to</span>
                  <input
                    type="time"
                    value={day.break_end ?? ''}
                    onChange={e => patchDay(day.day_of_week, { break_end: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                </div>
              ) : (
                <span className="text-2xs text-muted-text italic">Off</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Blocked dates ────────────────────────────────────────────────────────────

function MyBlockedDatesPanel({ staffId }: { staffId: number }) {
  const confirm = useConfirm()
  const toast = useToast()
  const [rows,    setRows]    = useState<StaffBlockedDate[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [start,  setStart]  = useState('')
  const [end,    setEnd]    = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getEditorStaffBlockedDates(staffId)
      .then(r => { if (!cancelled) setRows(r) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load blocked dates') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [staffId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!start) return
    setAdding(true); setError(null)
    try {
      const created = await createEditorStaffBlockedDate(staffId, {
        start_date: start,
        end_date:   end || null,
        reason:     reason.trim() || null,
      })
      setRows(prev => [...(prev ?? []), created].sort((a, b) => a.start_date.localeCompare(b.start_date)))
      setStart(''); setEnd(''); setReason('')
      toast.success('Date blocked.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add blocked date')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({ title: 'Remove this blocked date?', message: 'This date will become bookable again.', confirmLabel: 'Remove', tone: 'danger' })
    if (!ok) return
    try {
      await deleteEditorStaffBlockedDate(staffId, id)
      setRows(prev => (prev ?? []).filter(r => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove')
    }
  }

  function rangeLabel(r: StaffBlockedDate): string {
    return r.end_date && r.end_date !== r.start_date
      ? `${r.start_date} → ${r.end_date}`
      : r.start_date
  }

  return (
    <div className="bg-white border border-hairline-soft p-4">
      <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1.5 mb-3">
        <Calendar size={11} /> Blocked dates
      </p>

      <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap mb-2">
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
        <div className="flex-1 min-w-[140px]">
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={200}
            placeholder="Vacation, sick, personal…"
            className="w-full border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <button
          type="submit"
          disabled={!start || adding}
          className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Block
        </button>
      </form>

      {error && (
        <p className="text-2xs text-danger flex items-center gap-1.5 mb-2">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {loading && <p className="text-2xs text-muted-text">Loading…</p>}

      {rows && rows.length === 0 && !loading && (
        <p className="text-2xs text-muted-text italic">No blocked dates yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-near-black">{rangeLabel(r)}</p>
                {r.reason && <p className="text-eyebrow text-muted-text truncate">{r.reason}</p>}
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
