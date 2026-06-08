'use client'

import { useEffect, useState } from 'react'
import {
  getEditorWaitlist,
  updateEditorWaitlistEntry,
  type WaitlistEntry,
} from '@/lib/api'
import { Clock, Mail, Phone, Trash2 } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import EmptyState from '@/components/ui/EmptyState'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { TabShell, TabIntro, Section } from '@/components/editor/AvailabilitySections'

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

/**
 * Owner's waitlist queue (pending + notified entries). Used by both the
 * standalone /editor/waitlist page and the Availability hub's Waitlist tab.
 * No EditorShell wrapper here so it embeds either way.
 *
 * Cohesion v1: shared StatusBadge / AsyncBoundary / EmptyState / Card +
 * Confirm + Toast. No local status map, no native confirm()/alert().
 */
export default function WaitlistEditor() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [busyId,  setBusyId]  = useState<number | null>(null)
  const confirm = useConfirm()
  const toast   = useToast()

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
    const ok = await confirm({
      title: 'Remove from waitlist?',
      message: 'They won’t be notified again.',
      confirmLabel: 'Remove',
      tone: 'danger',
    })
    if (! ok) return
    setBusyId(id)
    try {
      await updateEditorWaitlistEntry(id, { status: 'removed' })
      setEntries(prev => prev.filter(e => e.id !== id))
      toast.success('Removed from waitlist')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove this entry.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <TabShell>
      <TabIntro>
        People waiting for a slot to open — when an appointment cancels, the next match gets a 2-hour claim link automatically.
      </TabIntro>

      <Section
        icon={Clock}
        title="Waitlist"
        subtitle="First come, first served. Matches are notified by email when a slot opens."
      >
        <AsyncBoundary
          loading={loading}
          error={error}
          isEmpty={entries.length === 0}
          onRetry={load}
          loadingLabel="Loading the queue…"
          empty={
            <EmptyState
              icon={Clock}
              title="No one's waiting"
              description="When your calendar fills up, clients can join the waitlist from your booking page. They'll appear here in the order they joined."
            />
          }
        >
          <div className="bg-white border border-hairline-soft overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-hairline-soft bg-cream/60">
                <tr className="text-left">
                  <th className="px-4 py-3 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Client</th>
                  <th className="px-4 py-3 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Service</th>
                  <th className="px-4 py-3 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Window</th>
                  <th className="px-4 py-3 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Status</th>
                  <th className="px-4 py-3 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text w-12 text-right">·</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id} className="border-b border-hairline-soft last:border-b-0 align-top">
                    <td className="px-4 py-3.5 text-sm">
                      <div className="font-medium text-near-black">{e.customer_name}</div>
                      <div className="mt-0.5 flex flex-col gap-0.5 text-xs text-muted-text">
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
                        <div className="mt-0.5 text-xs text-muted-text">with {e.staff_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div className="text-near-black">{formatDate(e.earliest_date)} — {formatDate(e.latest_date)}</div>
                      {e.preferred_date && (
                        <div className="mt-0.5 text-xs text-muted-text">prefers {formatDate(e.preferred_date)}</div>
                      )}
                      {e.notes && (
                        <div className="mt-1 text-xs text-muted-text italic line-clamp-2">&ldquo;{e.notes}&rdquo;</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <StatusBadge domain="waitlist" status={e.status} />
                      {e.status === 'notified' && e.notification_expires_at && (
                        <div className="mt-1 text-2xs text-muted-text">
                          link expires {new Date(e.notification_expires_at).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => remove(e.id)}
                        disabled={busyId === e.id}
                        className="inline-flex items-center justify-center p-1.5 text-muted-text hover:bg-near-black/5 hover:text-danger disabled:opacity-40"
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
        </AsyncBoundary>
      </Section>
    </TabShell>
  )
}
