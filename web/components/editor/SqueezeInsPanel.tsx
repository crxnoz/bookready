'use client'

import { useEffect, useState } from 'react'
import {
  getEditorSqueezeIns,
  updateEditorSqueezeIns,
  getEditorSqueezeInAnnouncements,
  createEditorSqueezeInAnnouncement,
  deleteEditorSqueezeInAnnouncement,
  type SqueezeInConfig,
  type SqueezeInAnnouncement,
  type AfterHoursAccessTier,
} from '@/lib/api'
import AvailabilityRequestsEditor from './AvailabilityRequestsEditor'
import { Zap, Users, Inbox, CalendarPlus, X } from 'lucide-react'
import Button from '@/components/ui/Button'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  TabShell,
  TabIntro,
  CollapsibleSection,
  Section,
} from '@/components/editor/AvailabilitySections'

const TIERS: { id: AfterHoursAccessTier; label: string; hint: string }[] = [
  { id: 'everyone', label: 'Everyone',           hint: 'Anyone can request a squeeze-in.' },
  { id: 'existing', label: 'Existing customers', hint: 'Recommended — only people who have booked before.' },
  { id: 'vip',      label: 'VIP customers',      hint: 'Only clients you\'ve marked VIP.' },
]

const INPUT = 'w-full bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30'

/**
 * §6 — Squeeze-Ins tab. Config panel on top, then the squeeze-in request
 * queue (the same inbox component, filtered to kind=squeeze_in).
 */
export default function SqueezeInsPanel() {
  const [cfg,     setCfg]     = useState<SqueezeInConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>('config')
  const toast = useToast()

  async function load() {
    setLoading(true); setError(null)
    try { setCfg(await getEditorSqueezeIns()) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load squeeze-in settings.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  function patch<K extends keyof SqueezeInConfig>(k: K, v: SqueezeInConfig[K]) {
    setCfg(prev => prev ? { ...prev, [k]: v } : prev)
  }

  async function save() {
    if (! cfg) return
    setSaving(true)
    try {
      setCfg(await updateEditorSqueezeIns(cfg))
      toast.success('Squeeze-ins saved')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <TabShell>
      <TabIntro>
        Sell a limited number of premium &ldquo;fit me in&rdquo; spots on fully-booked days — clients request, you approve.
      </TabIntro>

      <CollapsibleSection
        icon={Zap}
        title="Squeeze-In Settings"
        subtitle="Enable, set a fee, and cap daily spots"
        open={open === 'config'}
        onToggle={() => setOpen(o => o === 'config' ? null : 'config')}
      >
        <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading squeeze-in settings…">
          {cfg && (
            <div className="space-y-5">

              {/* Enable toggle */}
              <div className="bg-white border border-hairline-soft p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cfg.enabled}
                    onChange={e => patch('enabled', e.target.checked)}
                    className="mt-1 size-4 accent-near-black"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-near-black">Enable squeeze-ins</div>
                    <p className="text-xs text-muted-text mt-0.5">
                      Shows a &ldquo;Request a squeeze-in&rdquo; option to clients on fully-booked days.
                    </p>
                  </div>
                </label>
              </div>

              {/* Fee + daily limit */}
              <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
                <div className="bg-white border border-hairline-soft p-4 space-y-4">

                  <div>
                    <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1">
                      Squeeze-in fee
                    </p>
                    <p className="text-xs text-muted-text mb-2">
                      Added to the booking total when you approve.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-text">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={cfg.fee}
                        onChange={e => patch('fee', parseFloat(e.target.value) || 0)}
                        className="w-28 bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1">
                      Maximum per day
                    </p>
                    <p className="text-xs text-muted-text mb-2">
                      How many squeeze-ins you&apos;ll allow on a full day (independent of normal capacity).
                    </p>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={cfg.daily_limit}
                      onChange={e => patch('daily_limit', parseInt(e.target.value, 10) || 1)}
                      className="w-24 bg-white border border-hairline-strong px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-near-black/30"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Button onClick={save} loading={saving}>Save squeeze-ins</Button>
              </div>
            </div>
          )}
        </AsyncBoundary>
      </CollapsibleSection>

      <CollapsibleSection
        icon={Users}
        title="Who Can Request"
        subtitle="Restrict squeeze-ins by client tier"
        open={open === 'access'}
        onToggle={() => setOpen(o => o === 'access' ? null : 'access')}
      >
        <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading squeeze-in settings…">
          {cfg && (
            <div className={cfg.enabled ? '' : 'opacity-50 pointer-events-none'}>
              <div className="bg-white border border-hairline-soft p-4 space-y-3">
                {TIERS.map(t => (
                  <label key={t.id} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="sq-tier"
                      checked={cfg.access_tier === t.id}
                      onChange={() => patch('access_tier', t.id)}
                      className="mt-1 size-4 accent-near-black"
                    />
                    <div>
                      <div className="text-sm text-near-black">{t.label}</div>
                      <div className="text-xs text-muted-text">{t.hint}</div>
                    </div>
                  </label>
                ))}
              </div>

              <div className="mt-4">
                <Button onClick={save} loading={saving}>Save squeeze-ins</Button>
              </div>
            </div>
          )}
        </AsyncBoundary>
      </CollapsibleSection>

      {/* Owner-announced squeeze-ins — proactively published slots
          (vs the queue below which is customer-requested). */}
      <CollapsibleSection
        icon={CalendarPlus}
        title="Announce a Squeeze-In"
        subtitle="Publish extra premium slots inside your regular hours"
        open={open === 'announce'}
        onToggle={() => setOpen(o => o === 'announce' ? null : 'announce')}
      >
        <SqueezeInAnnouncementsEditor configFee={cfg?.fee ?? null} />
      </CollapsibleSection>

      {/* The squeeze-in request queue */}
      <Section icon={Inbox} title="Squeeze-In Requests" subtitle="Pending requests from clients on fully-booked days">
        <AvailabilityRequestsEditor kind="squeeze_in" embedded />
      </Section>
    </TabShell>
  )
}

// ── Owner-announced squeeze-in editor ────────────────────────────────────
//
// Distinct from the customer-requested queue above. The owner picks a
// date + one [start, end] window + optional fee override; the customer
// sees the slot as bookable in Step 3 of the booking flow under its own
// "Squeeze-in +$FEE" section.
//
// Each row = one announcement. To announce multiple windows on the same
// day, create multiple rows. The backend supports N windows per row but
// the v1 UI keeps the form simple.
function SqueezeInAnnouncementsEditor({ configFee }: { configFee: number | null }) {
  const [announcements, setAnnouncements] = useState<SqueezeInAnnouncement[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const toast = useToast()
  const confirm = useConfirm()

  // Form state.
  const [date,    setDate]    = useState('')
  const [start,   setStart]   = useState('')
  const [end,     setEnd]     = useState('')
  const [feeStr,  setFeeStr]  = useState('')
  const [saving,  setSaving]  = useState(false)

  async function load() {
    setLoading(true); setError(null)
    try {
      const from = new Date().toISOString().slice(0, 10)
      const toDate = new Date()
      toDate.setDate(toDate.getDate() + 30)
      const to = toDate.toISOString().slice(0, 10)
      const r = await getEditorSqueezeInAnnouncements(from, to)
      setAnnouncements(r.announcements)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load announcements.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  async function add() {
    if (! date || ! start || ! end) {
      toast.error('Pick a date and a time window.')
      return
    }
    if (end <= start) {
      toast.error('End time must be after start time.')
      return
    }
    setSaving(true)
    try {
      await createEditorSqueezeInAnnouncement({
        date,
        slot_windows: [{ start, end }],
        fee: feeStr.trim() === '' ? null : parseFloat(feeStr) || 0,
      })
      // Reset form + refresh.
      setDate(''); setStart(''); setEnd(''); setFeeStr('')
      toast.success('Squeeze-in announced')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not announce.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: number) {
    const ok = await confirm({
      title: 'Pull this squeeze-in?',
      message: 'Customers who haven\'t booked yet will lose this slot.',
      confirmLabel: 'Pull',
      tone: 'danger',
    })
    if (! ok) return
    try {
      await deleteEditorSqueezeInAnnouncement(id)
      toast.success('Pulled')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Form */}
      <div className="bg-white border border-hairline-soft p-4 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
          New announcement
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_1fr] gap-3">
          <label className="block">
            <span className="text-2xs font-bold tracking-[0.12em] uppercase text-muted-text block mb-1">Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-2xs font-bold tracking-[0.12em] uppercase text-muted-text block mb-1">Start</span>
            <input
              type="time"
              value={start}
              onChange={e => setStart(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-2xs font-bold tracking-[0.12em] uppercase text-muted-text block mb-1">End</span>
            <input
              type="time"
              value={end}
              onChange={e => setEnd(e.target.value)}
              className={INPUT}
            />
          </label>
          <label className="block">
            <span className="text-2xs font-bold tracking-[0.12em] uppercase text-muted-text block mb-1">
              Fee {configFee !== null ? `(default $${configFee})` : ''}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-text">$</span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={feeStr}
                onChange={e => setFeeStr(e.target.value)}
                placeholder="inherit"
                className={INPUT}
              />
            </div>
          </label>
        </div>
        <p className="text-xs text-muted-text">
          Customer sees this slot under a &ldquo;Squeeze-in&rdquo; section in the time picker, with the fee folded into the booking total.
        </p>
        <div>
          <Button onClick={add} loading={saving}>Announce</Button>
        </div>
      </div>

      {/* List */}
      <AsyncBoundary loading={loading} error={error} onRetry={load} loadingLabel="Loading announcements…">
        <div className="space-y-2">
          {announcements.length === 0 && (
            <p className="text-xs text-muted-text">No upcoming announcements. Add one above to publish a premium slot.</p>
          )}
          {announcements.map(a => {
            const w = a.slot_windows[0]
            const feeDollars = a.fee_cents !== null ? Math.round(a.fee_cents / 100) : configFee
            return (
              <div key={a.id} className="flex items-center gap-3 bg-white border border-hairline-soft px-4 py-3">
                <div className="flex-1">
                  <div className="text-sm text-near-black">
                    {new Date(a.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {' · '}
                    {w ? `${w.start} – ${w.end}` : '—'}
                    {a.slot_windows.length > 1 ? ` +${a.slot_windows.length - 1} more` : ''}
                  </div>
                  <div className="text-2xs text-muted-text mt-0.5">
                    +${feeDollars ?? 0} fee
                    {a.service_ids === null ? ' · all services' : ` · ${a.service_ids.length} service${a.service_ids.length === 1 ? '' : 's'}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  className="w-8 h-8 inline-flex items-center justify-center text-muted-text hover:text-danger border border-hairline-soft"
                  aria-label="Pull announcement"
                >
                  <X size={14} />
                </button>
              </div>
            )
          })}
        </div>
      </AsyncBoundary>
    </div>
  )
}
