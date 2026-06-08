'use client'

import { useEffect, useState } from 'react'
import {
  getEditorWaitlist,
  updateEditorWaitlistEntry,
  type WaitlistEntry,
} from '@/lib/api'
import { Clock, Mail, Phone, Trash2, AlertCircle } from 'lucide-react'

function formatDate(d: string | null): string {
  if (! d) return '—'
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  } catch {
    return d
  }
}

function StatusBadge({ status }: { status: WaitlistEntry['status'] }) {
  const tone =
    status === 'notified' ? 'bg-blush text-near-black border-near-black/15'
    : status === 'pending' ? 'bg-cream text-near-black border-near-black/10'
    : 'bg-near-black/5 text-muted-text border-near-black/10'
  const label =
    status === 'notified' ? 'Offer sent'
    : status === 'pending' ? 'Waiting'
    : status
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone}`}>
      {status === 'notified' && <Clock className="size-3" />}
      {label}
    </span>
  )
}

/**
 * Owner's waitlist queue (pending + notified entries). Used both by the
 * standalone /editor/waitlist page and the Availability hub's Waitlist tab.
 * No EditorShell wrapper here so it can be embedded either way.
 */
export default function WaitlistEditor() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [busyId,  setBusyId]  = useState<number | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await getEditorWaitlist()
      setEntries(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the waitlist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function remove(id: number) {
    if (! confirm('Remove this person from the waitlist? They will not be notified again.')) return
    setBusyId(id)
    try {
      await updateEditorWaitlistEntry(id, { status: 'removed' })
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not remove this entry.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <p className="text-sm text-muted-text mb-4">
        People waiting for a slot to open. When an appointment cancels, the next match
        automatically gets a 2-hour claim link by email — first come, first served.
      </p>

      {loading && (
        <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-6 text-center text-sm text-muted-text">
          Loading the queue…
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 flex items-start gap-3">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {! loading && ! error && entries.length === 0 && (
        <div className="rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white p-8 text-center">
          <h3 className="text-near-black font-medium">No one&apos;s waiting</h3>
          <p className="mt-1.5 text-sm text-muted-text">
            When your calendar fills up, clients can join the waitlist from your booking page.
            They&apos;ll appear here in the order they joined.
          </p>
        </div>
      )}

      {! loading && ! error && entries.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[rgba(18,18,18,0.10)] bg-white">
          <table className="w-full">
            <thead className="border-b border-[rgba(18,18,18,0.08)] bg-cream/60">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-text">
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Window</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium w-12 text-right">·</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b border-[rgba(18,18,18,0.05)] last:border-b-0 align-top">
                  <td className="px-4 py-3.5 text-sm">
                    <div className="font-medium text-near-black">{e.customer_name}</div>
                    <div className="mt-0.5 flex flex-col gap-0.5 text-[12px] text-muted-text">
                      <a href={`mailto:${e.customer_email}`} className="flex items-center gap-1.5 hover:text-near-black">
                        <Mail className="size-3" /> {e.customer_email}
                      </a>
                      {e.customer_phone && (
                        <a href={`tel:${e.customer_phone}`} className="flex items-center gap-1.5 hover:text-near-black">
                          <Phone className="size-3" /> {e.customer_phone}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <div className="text-near-black">{e.service_name || `Service #${e.service_id}`}</div>
                    {e.staff_name && (
                      <div className="mt-0.5 text-[12px] text-muted-text">with {e.staff_name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <div className="text-near-black">{formatDate(e.earliest_date)} — {formatDate(e.latest_date)}</div>
                    {e.preferred_date && (
                      <div className="mt-0.5 text-[12px] text-muted-text">prefers {formatDate(e.preferred_date)}</div>
                    )}
                    {e.notes && (
                      <div className="mt-1 text-[12px] text-muted-text italic line-clamp-2">&ldquo;{e.notes}&rdquo;</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <StatusBadge status={e.status} />
                    {e.status === 'notified' && e.notification_expires_at && (
                      <div className="mt-1 text-[11px] text-muted-text">
                        link expires {new Date(e.notification_expires_at).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => remove(e.id)}
                      disabled={busyId === e.id}
                      className="inline-flex items-center justify-center rounded-full p-1.5 text-muted-text hover:bg-near-black/5 hover:text-red-600 disabled:opacity-40"
                      title="Remove from waitlist"
                      aria-label="Remove from waitlist"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
