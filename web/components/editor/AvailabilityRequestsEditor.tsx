'use client'

import { useEffect, useState } from 'react'
import {
  getEditorAvailabilityRequests,
  approveAvailabilityRequest,
  suggestAvailabilityRequest,
  declineAvailabilityRequest,
  type AvailabilityRequest,
} from '@/lib/api'
import {
  AlertCircle, Check, X, CalendarClock, Mail, Phone, Inbox, Loader2,
} from 'lucide-react'

function fmtDate(d: string | null): string {
  if (! d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) }
  catch { return d }
}
function fmt12(t: string | null): string {
  if (! t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function StatusChip({ status }: { status: AvailabilityRequest['status'] }) {
  const map: Record<string, string> = {
    pending:   'bg-blush text-near-black border-near-black/15',
    suggested: 'bg-lavender text-near-black border-near-black/15',
    approved:  'bg-near-black/5 text-muted-text border-near-black/10',
    accepted:  'bg-near-black/5 text-muted-text border-near-black/10',
    declined:  'bg-near-black/5 text-muted-text border-near-black/10',
    cancelled: 'bg-near-black/5 text-muted-text border-near-black/10',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${map[status] ?? map.pending}`}>
      {status}
    </span>
  )
}

export default function AvailabilityRequestsEditor({ kind = 'standard' }: { kind?: 'standard' | 'squeeze_in' }) {
  const isSqueeze = kind === 'squeeze_in'
  const [items,   setItems]   = useState<AvailabilityRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [busyId,  setBusyId]  = useState<number | null>(null)

  // Inline action panels keyed by request id.
  const [panel, setPanel] = useState<{ id: number; mode: 'approve' | 'suggest' | 'decline' } | null>(null)
  const [fTime, setFTime] = useState('')
  const [fDate, setFDate] = useState('')
  const [fNote, setFNote] = useState('')

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await getEditorAvailabilityRequests(kind)
      setItems(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load requests.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [kind])

  function openPanel(r: AvailabilityRequest, mode: 'approve' | 'suggest' | 'decline') {
    setPanel({ id: r.id, mode })
    setFTime(r.preferred_time ?? '')
    setFDate(r.preferred_date ?? '')
    setFNote('')
  }

  async function submitPanel(r: AvailabilityRequest) {
    if (! panel) return
    setBusyId(r.id)
    try {
      if (panel.mode === 'approve') {
        if (! fTime) { alert('Pick a confirmed time.'); setBusyId(null); return }
        await approveAvailabilityRequest(r.id, fTime)
      } else if (panel.mode === 'suggest') {
        if (! fDate || ! fTime) { alert('Pick a date and time to suggest.'); setBusyId(null); return }
        await suggestAvailabilityRequest(r.id, { date: fDate, time: fTime, note: fNote || undefined })
      } else {
        await declineAvailabilityRequest(r.id, fNote || undefined)
      }
      setPanel(null)
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <p className="text-sm text-muted-text mb-4">
        {isSqueeze
          ? 'Customers asking to be squeezed in on a fully-booked day. Approving books them and adds the squeeze-in fee. Approve, suggest a time, or decline.'
          : 'Customers who asked for a time that wasn’t open. Approve to book them instantly, suggest a different time, or decline. No charge is taken until you approve.'}
      </p>

      {loading && (
        <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-6 text-center text-sm text-muted-text">Loading requests…</div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-center gap-2"><AlertCircle className="size-4" /> {error}</div>
      )}

      {! loading && ! error && items.length === 0 && (
        <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-8 text-center">
          <Inbox className="size-7 mx-auto text-muted-text mb-2" />
          <h3 className="text-near-black font-medium">No {isSqueeze ? 'squeeze-in requests' : 'requests'} yet</h3>
          <p className="mt-1.5 text-sm text-muted-text">
            {isSqueeze
              ? 'When a client asks to be fit in on a fully-booked day, it lands here.'
              : 'When a client asks for a date that isn’t bookable, it lands here for you to decide.'}
          </p>
        </div>
      )}

      {! loading && ! error && items.length > 0 && (
        <div className="space-y-3">
          {items.map(r => {
            const decided = ! ['pending', 'suggested'].includes(r.status)
            const open = panel?.id === r.id
            return (
              <div key={r.id} className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-near-black">{r.customer_name}</span>
                      <StatusChip status={r.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted-text">
                      <a href={`mailto:${r.customer_email}`} className="flex items-center gap-1 hover:text-near-black"><Mail className="size-3" /> {r.customer_email}</a>
                      {r.customer_phone && <a href={`tel:${r.customer_phone}`} className="flex items-center gap-1 hover:text-near-black"><Phone className="size-3" /> {r.customer_phone}</a>}
                    </div>
                    <div className="mt-2 text-sm text-near-black">
                      <span className="font-medium">{r.service_name || `Service #${r.service_id}`}</span>
                      {r.staff_name && <span className="text-muted-text"> · with {r.staff_name}</span>}
                      {isSqueeze && r.fee > 0 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-lavender border border-near-black/10 px-2 py-0.5 text-[11px] font-semibold">+${r.fee}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-text">
                      <CalendarClock className="size-3.5" />
                      Wants {fmtDate(r.preferred_date)}{r.preferred_time ? ` at ${fmt12(r.preferred_time)}` : ''}
                    </div>
                    {r.notes && <div className="mt-1.5 text-[13px] text-muted-text italic">&ldquo;{r.notes}&rdquo;</div>}
                    {r.status === 'suggested' && r.suggested_date && (
                      <div className="mt-1.5 text-[13px] text-near-black">
                        You offered {fmtDate(r.suggested_date)} at {fmt12(r.suggested_time)} — awaiting their reply.
                      </div>
                    )}
                  </div>

                  {! decided && ! open && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => openPanel(r, 'approve')} className="inline-flex items-center gap-1.5 rounded-full bg-near-black px-3 py-1.5 text-[12px] font-semibold text-cream hover:opacity-90"><Check className="size-3.5" /> Approve</button>
                      <button onClick={() => openPanel(r, 'suggest')} className="inline-flex items-center gap-1.5 rounded-full border border-near-black/20 px-3 py-1.5 text-[12px] font-semibold text-near-black hover:bg-near-black/5"><CalendarClock className="size-3.5" /> Suggest</button>
                      <button onClick={() => openPanel(r, 'decline')} className="inline-flex items-center gap-1.5 rounded-full border border-near-black/20 px-3 py-1.5 text-[12px] font-semibold text-muted-text hover:bg-near-black/5"><X className="size-3.5" /> Decline</button>
                    </div>
                  )}
                </div>

                {open && (
                  <div className="mt-3 border-t border-[rgba(18,18,18,0.08)] pt-3">
                    <div className="flex flex-wrap items-end gap-3">
                      {panel.mode === 'suggest' && (
                        <label className="text-[12px] text-muted-text">
                          <span className="block mb-1">Date</span>
                          <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-1.5 text-sm text-near-black" />
                        </label>
                      )}
                      {(panel.mode === 'approve' || panel.mode === 'suggest') && (
                        <label className="text-[12px] text-muted-text">
                          <span className="block mb-1">{panel.mode === 'approve' ? 'Confirmed time' : 'Time'}</span>
                          <input type="time" value={fTime} onChange={e => setFTime(e.target.value)} className="rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-1.5 text-sm text-near-black" />
                        </label>
                      )}
                      {(panel.mode === 'suggest' || panel.mode === 'decline') && (
                        <label className="text-[12px] text-muted-text flex-1 min-w-[180px]">
                          <span className="block mb-1">Note to customer {panel.mode === 'decline' ? '(optional)' : '(optional)'}</span>
                          <input type="text" value={fNote} onChange={e => setFNote(e.target.value)} placeholder={panel.mode === 'decline' ? 'Sorry, fully booked that week…' : 'This time works better for us…'} className="w-full rounded-lg border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-1.5 text-sm text-near-black" />
                        </label>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => submitPanel(r)} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 rounded-full bg-near-black px-4 py-1.5 text-[12px] font-semibold text-cream hover:opacity-90 disabled:opacity-50">
                        {busyId === r.id && <Loader2 className="size-3.5 animate-spin" />}
                        {panel.mode === 'approve' ? 'Confirm booking' : panel.mode === 'suggest' ? 'Send offer' : 'Decline request'}
                      </button>
                      <button onClick={() => setPanel(null)} className="rounded-full px-3 py-1.5 text-[12px] text-muted-text hover:text-near-black">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
