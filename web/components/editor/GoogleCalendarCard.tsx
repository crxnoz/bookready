'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertCircle, AlertTriangle, Calendar, Check, CheckCircle2,
  ExternalLink, Loader2, RefreshCw, X,
} from 'lucide-react'
import {
  getGoogleCalendarStatus,
  startGoogleCalendarConnect,
  listGoogleCalendars,
  setGoogleCalendar,
  disconnectGoogleCalendar,
  type GoogleCalendarStatus,
  type GoogleCalendarItem,
} from '@/lib/api'
import { cn } from '@/lib/cn'

/**
 * T1.4 — Google Calendar one-way sync card. Lives in the Integrations
 * hub, Calendars category. Mirrors StripeConnectCard's chrome (tone-
 * driven border + icon-box + meta + action row) for visual consistency.
 *
 * Four states map to the meta object below: not_connected / active /
 * action_required / coming_soon. The Connect button kicks off the
 * separate-redirect-URI OAuth flow handled by GoogleCalendarController.
 *
 * On return (Google redirects to `/editor/integrations?gcal_connected=1`
 * or `?gcal_error=...`), we re-fetch status so the card flips state
 * without a manual reload.
 */
export default function GoogleCalendarCard() {
  const sp = useSearchParams()
  const [status,    setStatus]   = useState<GoogleCalendarStatus | null>(null)
  const [loading,   setLoading]  = useState(true)
  const [loadErr,   setLoadErr]  = useState<string | null>(null)
  const [busy,      setBusy]     = useState<'idle' | 'connecting' | 'disconnecting'>('idle')
  const [err,       setErr]      = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false)

  async function load() {
    try {
      const s = await getGoogleCalendarStatus()
      setStatus(s)
      setLoadErr(null)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Could not load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  // Re-sync when Google bounces the owner back from OAuth.
  useEffect(() => {
    const ok  = sp?.get('gcal_connected')
    const bad = sp?.get('gcal_error')
    if (ok || bad) void load()
    if (bad) setErr(decodeURIComponent(bad))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  async function connect() {
    setBusy('connecting'); setErr(null)
    try {
      const { connect_url } = await startGoogleCalendarConnect()
      window.location.href = connect_url
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not start Google Calendar connect.')
      setBusy('idle')
    }
  }

  async function disconnect() {
    if (! confirmingDisconnect) { setConfirmingDisconnect(true); return }
    setBusy('disconnecting'); setErr(null)
    try {
      await disconnectGoogleCalendar()
      setConfirmingDisconnect(false)
      await load()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not disconnect.')
    } finally {
      setBusy('idle')
    }
  }

  if (loading) {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 flex items-center gap-2 text-xs text-muted-text">
        <Loader2 size={14} className="animate-spin" /> Loading Google Calendar status…
      </section>
    )
  }
  if (loadErr || ! status) {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load Google Calendar status'}
      </section>
    )
  }
  if (status.status === 'coming_soon') {
    return (
      <section className="bg-white border border-hairline-soft p-3.5 flex items-start gap-3">
        <IconChip><Calendar size={14} strokeWidth={1.8} /></IconChip>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-near-black">Google Calendar</p>
          <p className="text-2xs text-muted-text mt-1">
            Google Calendar sync will be available after the next migration.
          </p>
        </div>
      </section>
    )
  }

  const meta = (() => {
    switch (status.status) {
      case 'active':
        return {
          tone:  'positive' as const,
          icon:  CheckCircle2,
          title: 'Google Calendar connected',
          body:  'New bookings appear on your Google Calendar within seconds. Cancellations remove the event automatically.',
        }
      case 'action_required':
        return {
          tone:  'danger' as const,
          icon:  AlertTriangle,
          title: 'Reconnect Google Calendar',
          body:  'Your Google access expired or was revoked. Reconnect to resume syncing.',
        }
      case 'not_connected':
      default:
        return {
          tone:  'neutral' as const,
          icon:  Calendar,
          title: 'Connect Google Calendar',
          body:  'Push every booking to your Google Calendar automatically — one direction, never overwrites your personal events.',
        }
    }
  })()

  const borderCls = {
    positive: 'border-[rgba(20,140,80,0.40)]',
    warn:     'border-[rgba(180,120,0,0.35)]',
    danger:   'border-[rgba(180,40,40,0.40)]',
    neutral:  'border-hairline-soft',
  }[meta.tone]

  const iconCls = {
    positive: 'text-success',
    warn:     'text-warning',
    danger:   'text-danger',
    neutral:  'text-near-black',
  }[meta.tone]

  const Icon = meta.icon

  return (
    <section className={cn('bg-white border p-3.5 space-y-3', borderCls)}>
      <div className="flex items-start gap-3">
        <span className={cn('w-8 h-8 flex items-center justify-center bg-cream border border-hairline-soft flex-shrink-0', iconCls)}>
          <Icon size={14} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-near-black">{meta.title}</p>
            {status.status !== 'not_connected' && (
              <span className={cn(
                'text-eyebrow font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 whitespace-nowrap',
                meta.tone === 'positive' ? 'bg-white border-[rgba(20,140,80,0.40)] text-success'
                  : meta.tone === 'danger' ? 'bg-white border-[rgba(180,40,40,0.40)] text-danger'
                  : 'bg-cream border-hairline-strong text-muted-text',
              )}>
                {status.status === 'active' ? 'Active' : 'Reconnect needed'}
              </span>
            )}
          </div>
          <p className="text-2xs text-muted-text mt-1">{meta.body}</p>

          {status.status === 'active' && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-2xs">
              {status.google_email && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Google account</dt>
                  <dd className="text-near-black truncate">{status.google_email}</dd>
                </div>
              )}
              <div className="flex justify-between sm:block">
                <dt className="text-muted-text">Syncing to</dt>
                <dd className="text-near-black truncate">
                  {status.calendar_name || (status.calendar_id === 'primary' ? 'Primary calendar' : status.calendar_id)}
                </dd>
              </div>
              {status.last_sync_at && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Last sync</dt>
                  <dd className="text-near-black">{new Date(status.last_sync_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {err && (
        <div className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={11} /> {err}
        </div>
      )}

      {/* Calendar picker — inline panel that lazy-loads on open */}
      {pickerOpen && status.status === 'active' && (
        <CalendarPicker
          currentId={status.calendar_id ?? 'primary'}
          onClose={() => setPickerOpen(false)}
          onSaved={async () => { setPickerOpen(false); await load() }}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-hairline-soft">
        {status.status === 'not_connected' && (
          <button
            type="button"
            onClick={connect}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2 hover:bg-white hover:text-near-black disabled:opacity-60"
          >
            {busy === 'connecting'
              ? <><Loader2 size={11} className="animate-spin" /> Starting</>
              : <><ExternalLink size={11} /> Connect Google Calendar</>}
          </button>
        )}
        {status.status === 'action_required' && (
          <button
            type="button"
            onClick={connect}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-2 hover:bg-white hover:text-near-black disabled:opacity-60"
          >
            {busy === 'connecting'
              ? <><Loader2 size={11} className="animate-spin" /> Opening</>
              : <><RefreshCw size={11} /> Reconnect</>}
          </button>
        )}
        {status.status === 'active' && ! pickerOpen && (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black"
          >
            <Calendar size={11} /> Change calendar
          </button>
        )}
        {status.status === 'active' && (
          <button
            type="button"
            onClick={disconnect}
            disabled={busy !== 'idle'}
            className={cn(
              'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2 border disabled:opacity-60',
              confirmingDisconnect
                ? 'bg-white border-danger text-danger hover:bg-danger-bg'
                : 'bg-white border-hairline-strong text-muted-text hover:border-near-black hover:text-near-black',
            )}
          >
            {busy === 'disconnecting'
              ? <><Loader2 size={11} className="animate-spin" /> Disconnecting</>
              : confirmingDisconnect
                ? <><X size={11} /> Click again to disconnect</>
                : <>Disconnect</>}
          </button>
        )}
        {confirmingDisconnect && busy === 'idle' && (
          <button
            type="button"
            onClick={() => setConfirmingDisconnect(false)}
            className="text-2xs text-muted-text underline hover:text-near-black"
          >
            Cancel
          </button>
        )}
        {confirmingDisconnect && (
          <p className="text-2xs text-muted-text basis-full">
            Disconnecting also removes every booking we’ve pushed to your Google Calendar.
          </p>
        )}
      </div>
    </section>
  )
}

// ── Calendar picker ─────────────────────────────────────────────────────

function CalendarPicker({
  currentId, onClose, onSaved,
}: {
  currentId: string
  onClose:   () => void
  onSaved:   () => Promise<void>
}) {
  const [items, setItems]     = useState<GoogleCalendarItem[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [picked, setPicked]   = useState(currentId)

  useEffect(() => {
    let cancelled = false
    listGoogleCalendars()
      .then(r => { if (! cancelled) setItems(r.calendars) })
      .catch(e => { if (! cancelled) setLoadErr(e instanceof Error ? e.message : 'Could not load') })
    return () => { cancelled = true }
  }, [])

  async function save() {
    setSaving(true)
    try {
      const item = items?.find(c => c.id === picked)
      await setGoogleCalendar(picked, item?.summary)
      await onSaved()
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-hairline-soft bg-cream/40 p-3 space-y-2">
      <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
        Pick a calendar
      </p>
      {! items && ! loadErr && (
        <p className="text-2xs text-muted-text inline-flex items-center gap-1.5">
          <Loader2 size={11} className="animate-spin" /> Loading calendars…
        </p>
      )}
      {loadErr && (
        <p className="text-2xs text-danger inline-flex items-center gap-1.5">
          <AlertCircle size={11} /> {loadErr}
        </p>
      )}
      {items && (
        <div className="max-h-48 overflow-auto space-y-0.5">
          {items.map(c => (
            <label
              key={c.id}
              className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-white"
            >
              <input
                type="radio"
                name="gcal-pick"
                checked={picked === c.id}
                onChange={() => setPicked(c.id)}
                className="accent-near-black"
              />
              <span className="flex-1 truncate text-near-black">{c.summary}</span>
              {c.primary && (
                <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text">Primary</span>
              )}
            </label>
          ))}
        </div>
      )}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="text-2xs text-muted-text underline hover:text-near-black disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || ! items || picked === currentId}
          className="inline-flex items-center gap-1 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white border border-near-black px-3 py-1.5 hover:bg-white hover:text-near-black disabled:opacity-60"
        >
          {saving
            ? <><Loader2 size={11} className="animate-spin" /> Saving</>
            : <><Check size={11} /> Use this calendar</>}
        </button>
      </div>
    </div>
  )
}

function IconChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="w-8 h-8 flex items-center justify-center bg-cream border border-hairline-soft text-near-black flex-shrink-0">
      {children}
    </span>
  )
}
