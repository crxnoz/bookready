'use client'

import { useEffect, useState } from 'react'
import {
  getEditorAvailabilityRequests,
  approveAvailabilityRequest,
  suggestAvailabilityRequest,
  declineAvailabilityRequest,
  type AvailabilityRequest,
} from '@/lib/api'
import { CalendarClock, Mail, Phone, Inbox } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import Button from '@/components/ui/Button'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { TabShell, TabIntro, Section } from '@/components/editor/AvailabilitySections'

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

const INPUT = 'border border-hairline-strong bg-white px-3 py-1.5 text-sm text-near-black focus:outline-none focus:border-near-black'

export default function AvailabilityRequestsEditor({ kind = 'standard' }: { kind?: 'standard' | 'squeeze_in' }) {
  const isSqueeze = kind === 'squeeze_in'
  const [items,   setItems]   = useState<AvailabilityRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [busyId,  setBusyId]  = useState<number | null>(null)
  const toast = useToast()

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
    if (panel.mode === 'approve' && ! fTime) { toast.error('Pick a confirmed time.'); return }
    if (panel.mode === 'suggest' && (! fDate || ! fTime)) { toast.error('Pick a date and time to suggest.'); return }
    setBusyId(r.id)
    try {
      if (panel.mode === 'approve') {
        await approveAvailabilityRequest(r.id, fTime)
        toast.success('Booked')
      } else if (panel.mode === 'suggest') {
        await suggestAvailabilityRequest(r.id, { date: fDate, time: fTime, note: fNote || undefined })
        toast.success('Offer sent')
      } else {
        await declineAvailabilityRequest(r.id, fNote || undefined)
        toast.success('Request declined')
      }
      setPanel(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Action failed.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <TabShell>
      <TabIntro>
        {isSqueeze
          ? 'Customers asking to be squeezed in on a fully-booked day — approve, suggest a time, or decline.'
          : "Customers who asked for a time that wasn't open — approve to book instantly, suggest a different time, or decline."}
      </TabIntro>

      <Section
        icon={Inbox}
        title="Requests"
        subtitle={isSqueeze ? 'Squeeze-in requests from clients on fully-booked days.' : 'Incoming availability requests waiting for your decision.'}
      >
        <AsyncBoundary
          loading={loading}
          error={error}
          isEmpty={items.length === 0}
          onRetry={load}
          loadingLabel="Loading requests…"
          empty={
            <EmptyState
              icon={Inbox}
              title={isSqueeze ? 'No squeeze-in requests yet' : 'No requests yet'}
              description={isSqueeze
                ? 'When a client asks to be fit in on a fully-booked day, it lands here.'
                : "When a client asks for a date that isn't bookable, it lands here for you to decide."}
            />
          }
        >
          <div className="space-y-3">
            {items.map(r => {
              const decided = ! ['pending', 'suggested'].includes(r.status)
              const open = panel?.id === r.id
              return (
                <div key={r.id} className="bg-white border border-hairline-soft">
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-near-black">{r.customer_name}</span>
                          <StatusBadge domain="request" status={r.status} />
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-text">
                          <a href={`mailto:${r.customer_email}`} className="flex items-center gap-1 hover:text-near-black"><Mail className="size-3" /> {r.customer_email}</a>
                          {r.customer_phone && <a href={`tel:${r.customer_phone}`} className="flex items-center gap-1 hover:text-near-black"><Phone className="size-3" /> {r.customer_phone}</a>}
                        </div>
                        <div className="mt-2 text-sm text-near-black">
                          <span className="font-medium">{r.service_name || `Service #${r.service_id}`}</span>
                          {r.staff_name && <span className="text-muted-text"> · with {r.staff_name}</span>}
                          {isSqueeze && r.fee > 0 && (
                            <span className="ml-2 inline-flex items-center bg-lavender border border-hairline px-2 py-0.5 text-2xs font-semibold">+${r.fee}</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-text">
                          <CalendarClock className="size-3.5" />
                          Wants {fmtDate(r.preferred_date)}{r.preferred_time ? ` at ${fmt12(r.preferred_time)}` : ''}
                        </div>
                        {r.notes && <div className="mt-1.5 text-sm text-muted-text italic">&ldquo;{r.notes}&rdquo;</div>}
                        {r.status === 'suggested' && r.suggested_date && (
                          <div className="mt-1.5 text-sm text-near-black">
                            You offered {fmtDate(r.suggested_date)} at {fmt12(r.suggested_time)} — awaiting their reply.
                          </div>
                        )}
                      </div>

                      {! decided && ! open && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" onClick={() => openPanel(r, 'approve')}>Approve</Button>
                          <Button size="sm" variant="secondary" onClick={() => openPanel(r, 'suggest')}>Suggest</Button>
                          <Button size="sm" variant="secondary" onClick={() => openPanel(r, 'decline')}>Decline</Button>
                        </div>
                      )}
                    </div>

                    {open && (
                      <div className="mt-3 border-t border-hairline-soft pt-3">
                        <div className="flex flex-wrap items-end gap-3">
                          {panel.mode === 'suggest' && (
                            <label className="text-xs text-muted-text">
                              <span className="block mb-1">Date</span>
                              <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className={INPUT} />
                            </label>
                          )}
                          {(panel.mode === 'approve' || panel.mode === 'suggest') && (
                            <label className="text-xs text-muted-text">
                              <span className="block mb-1">{panel.mode === 'approve' ? 'Confirmed time' : 'Time'}</span>
                              <input type="time" value={fTime} onChange={e => setFTime(e.target.value)} className={INPUT} />
                            </label>
                          )}
                          {(panel.mode === 'suggest' || panel.mode === 'decline') && (
                            <label className="text-xs text-muted-text flex-1 min-w-[180px]">
                              <span className="block mb-1">Note to customer (optional)</span>
                              <input type="text" value={fNote} onChange={e => setFNote(e.target.value)} placeholder={panel.mode === 'decline' ? 'Sorry, fully booked that week…' : 'This time works better for us…'} className={`w-full ${INPUT}`} />
                            </label>
                          )}
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Button size="sm" loading={busyId === r.id} onClick={() => submitPanel(r)}>
                            {panel.mode === 'approve' ? 'Confirm booking' : panel.mode === 'suggest' ? 'Send offer' : 'Decline request'}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </AsyncBoundary>
      </Section>
    </TabShell>
  )
}
