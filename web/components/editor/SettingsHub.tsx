'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Building2, Calendar, CreditCard, Bell, FileText, UserCircle,
  Plug, AlertTriangle, ChevronRight, Loader2, Check, AlertCircle,
  DollarSign, Percent, Lock, ExternalLink, RefreshCw, ShieldCheck,
} from 'lucide-react'
import {
  getEditorPaymentSettings,
  updateEditorPaymentSettings,
  getStripeConnectStatus,
  startStripeConnect,
  refreshStripeConnectOnboarding,
  getEditorBookingSettings,
  updateEditorBookingSettings,
  getEditorNotificationSettings,
  updateEditorNotificationSettings,
} from '@/lib/api'
import type {
  BookingSettings,
  BookingSettingsPayload,
  DepositType,
  NotificationSettings,
  NotificationSettingsPayload,
  PaymentSettings,
  PaymentSettingsPayload,
  SlotReleaseMode,
  StripeConnectStatus,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Sub-tab plumbing ─────────────────────────────────────────────────────────

type SettingsTab =
  | 'overview' | 'business' | 'booking' | 'payments'
  | 'notifications' | 'policies' | 'account' | 'integrations' | 'danger'

const VALID_TABS: SettingsTab[] = [
  'overview', 'business', 'booking', 'payments',
  'notifications', 'policies', 'account', 'integrations', 'danger',
]

interface GroupDef {
  tab:       SettingsTab
  label:     string
  hint:      string
  icon:      React.ElementType
  status:    'ready' | 'soon'
  tone?:     'default' | 'danger'
}

const GROUPS: GroupDef[] = [
  { tab: 'business',      label: 'Business Settings',  hint: 'Hours, time zone, contact basics',           icon: Building2,    status: 'soon' },
  { tab: 'booking',       label: 'Booking Settings',   hint: 'Booking window, notice, auto-confirm, rules', icon: Calendar,     status: 'ready' },
  { tab: 'payments',      label: 'Payment Settings',   hint: 'Customer payments, deposits, currency',      icon: CreditCard,   status: 'ready' },
  { tab: 'notifications', label: 'Notifications',      hint: 'Toggle booking emails, reply-to, sender',    icon: Bell,         status: 'ready' },
  { tab: 'policies',      label: 'Policies',           hint: 'Cancellation, late, no-show, deposits',      icon: FileText,     status: 'soon' },
  { tab: 'account',       label: 'Account',            hint: 'Owner profile, password, sign-in security',  icon: UserCircle,   status: 'soon' },
  { tab: 'integrations',  label: 'Integrations',       hint: 'Stripe, Google, Instagram, Resend, etc.',    icon: Plug,         status: 'soon' },
  { tab: 'danger',        label: 'Danger Zone',        hint: 'Disable booking, delete tenant, exports',    icon: AlertTriangle, status: 'soon', tone: 'danger' },
]

function hrefFor(tab: SettingsTab): string {
  return tab === 'overview' ? '/editor/settings' : `/editor/settings?tab=${tab}`
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function SettingsHub() {
  const sp     = useSearchParams()
  const raw    = sp?.get('tab') ?? 'overview'
  const tab: SettingsTab = VALID_TABS.includes(raw as SettingsTab)
    ? (raw as SettingsTab)
    : 'overview'

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-4">
      {tab === 'overview'      && <OverviewPanel />}
      {tab === 'payments'      && <PaymentSettingsPanel />}
      {tab === 'booking'       && <BookingSettingsPanel />}
      {tab === 'notifications' && <NotificationSettingsPanel />}
      {tab !== 'overview' && tab !== 'payments' && tab !== 'booking' && tab !== 'notifications' && <PlaceholderPanel tab={tab} />}
    </div>
  )
}

// ── Overview (cards) ─────────────────────────────────────────────────────────

function OverviewPanel() {
  return (
    <>
      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Settings</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Business-wide settings, payments, notifications, integrations, and account controls.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GROUPS.map(g => {
          const Icon = g.icon
          const isDanger = g.tone === 'danger'
          return (
            <Link
              key={g.tab}
              href={hrefFor(g.tab)}
              className={cn(
                'group flex items-start gap-3 border bg-white px-3.5 py-3 transition-colors',
                isDanger
                  ? 'border-[rgba(180,40,40,0.20)] hover:border-[rgba(180,40,40,0.55)]'
                  : 'border-[rgba(18,18,18,0.10)] hover:border-near-black',
              )}
            >
              <span
                className={cn(
                  'w-8 h-8 flex items-center justify-center flex-shrink-0 border',
                  isDanger
                    ? 'bg-[rgba(180,40,40,0.06)] border-[rgba(180,40,40,0.20)] text-[#b42828]'
                    : 'bg-cream border-[rgba(18,18,18,0.08)] text-near-black',
                )}
              >
                <Icon size={14} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-[13px] font-semibold',
                    isDanger ? 'text-[#b42828]' : 'text-near-black',
                  )}>{g.label}</p>
                  {g.status === 'soon' && (
                    <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-muted-text px-1.5 py-0.5">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-text mt-0.5">{g.hint}</p>
              </div>
              <ChevronRight size={14} className="text-muted-text group-hover:text-near-black mt-1 flex-shrink-0" />
            </Link>
          )
        })}
      </div>
    </>
  )
}

// ── Placeholder for not-yet-built groups ─────────────────────────────────────

function PlaceholderPanel({ tab }: { tab: SettingsTab }) {
  const group = GROUPS.find(g => g.tab === tab)
  const Icon  = group?.icon ?? Lock
  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-6 flex items-start gap-4">
        <span className="w-10 h-10 flex items-center justify-center bg-cream border border-[rgba(18,18,18,0.08)] text-near-black flex-shrink-0">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-near-black">{group?.label ?? 'Settings'}</h2>
          <p className="text-xs text-muted-text mt-1">{group?.hint}</p>
          <p className="text-[11px] text-muted-text mt-3">
            This section is on the roadmap and isn&apos;t live yet. Check back soon.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Payment Settings panel ───────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function PaymentSettingsPanel() {
  const sp = useSearchParams()
  const [data,    setData]    = useState<PaymentSettings | null>(null)
  const [draft,   setDraft]   = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)
  const [connectBusy, setConnectBusy] = useState<'idle' | 'starting' | 'refreshing' | 'syncing'>('idle')
  const [connectErr,  setConnectErr]  = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorPaymentSettings()
      .then(d => { if (!cancelled) { setData(d); setDraft(d) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Auto-sync Stripe Connect status when the owner returns from onboarding.
  // Stripe's redirect lands at ?tab=payments&stripe_connect=return.
  useEffect(() => {
    const flag = sp?.get('stripe_connect')
    if (flag === 'return' || flag === 'refresh') syncConnectStatus()

  }, [sp])

  async function syncConnectStatus() {
    setConnectBusy('syncing')
    setConnectErr(null)
    try {
      const next = await getStripeConnectStatus()
      const apply = (d: PaymentSettings | null) =>
        d ? { ...d, ...next } as PaymentSettings : d
      setData(apply)
      setDraft(apply)
    } catch (e) {
      setConnectErr(e instanceof Error ? e.message : 'Could not refresh Stripe status')
    } finally {
      setConnectBusy('idle')
    }
  }

  async function handleConnectStart() {
    setConnectBusy('starting')
    setConnectErr(null)
    try {
      const { onboarding_url } = await startStripeConnect()
      window.location.href = onboarding_url
    } catch (e) {
      setConnectErr(e instanceof Error ? e.message : 'Could not start Stripe Connect')
      setConnectBusy('idle')
    }
  }

  async function handleConnectContinue() {
    setConnectBusy('refreshing')
    setConnectErr(null)
    try {
      const { onboarding_url } = await refreshStripeConnectOnboarding()
      window.location.href = onboarding_url
    } catch (e) {
      setConnectErr(e instanceof Error ? e.message : 'Could not refresh onboarding link')
      setConnectBusy('idle')
    }
  }

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    return (
         data.payments_enabled   !== draft.payments_enabled
      || data.deposits_enabled   !== draft.deposits_enabled
      || data.deposit_type       !== draft.deposit_type
      || data.deposit_amount     !== draft.deposit_amount
      || data.allow_full_payment !== draft.allow_full_payment
      || data.currency           !== draft.currency
    )
  }, [data, draft])

  function patch(p: Partial<PaymentSettings>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle')
    setSaveErr(null)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving')
    setSaveErr(null)
    try {
      const payload: PaymentSettingsPayload = {
        payments_enabled:   draft.payments_enabled,
        deposits_enabled:   draft.deposits_enabled,
        deposit_type:       draft.deposits_enabled ? (draft.deposit_type ?? 'percent') : null,
        deposit_amount:     draft.deposits_enabled ? draft.deposit_amount : null,
        allow_full_payment: draft.allow_full_payment,
        currency:           draft.currency,
      }
      const next = await updateEditorPaymentSettings(payload)
      setData(next)
      setDraft(next)
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading payment settings…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load payment settings'}
      </div>
    )
  }

  const paymentsOff   = !draft.payments_enabled
  const depositsLocked = paymentsOff
  const depositInputsLocked = paymentsOff || !draft.deposits_enabled

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Payment Settings</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Connect Stripe, decide whether clients pay a deposit when they
          book, and configure how much.
        </p>
      </header>

      {/* Stripe Connect status card */}
      <StripeConnectBlock
        settings={draft}
        busy={connectBusy}
        error={connectErr}
        onStart={handleConnectStart}
        onContinue={handleConnectContinue}
        onRefresh={syncConnectStatus}
      />

      {/* Master toggle */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-2">
        <Toggle
          label="Enable customer payments"
          hint="Master switch. Off means clients book without paying."
          icon={CreditCard}
          on={draft.payments_enabled}
          onToggle={() => patch({ payments_enabled: !draft.payments_enabled })}
        />
        {draft.payments_enabled && draft.stripe_connect_status !== 'active' && (
          <p className="text-[11px] text-[#8a5a00] inline-flex items-start gap-1.5 mt-1">
            <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
            Connect Stripe above so customers can actually pay. Until then,
            payment-required bookings will be blocked.
          </p>
        )}
      </section>

      {/* Deposit */}
      <section className={cn(
        'bg-white border p-3.5 space-y-3 transition-opacity',
        paymentsOff
          ? 'border-[rgba(18,18,18,0.06)] opacity-60'
          : 'border-[rgba(18,18,18,0.10)]',
      )}>
        <Toggle
          label="Require a deposit"
          hint={paymentsOff ? 'Turn on customer payments first to use deposits.' : 'Ask for an upfront amount when a client books.'}
          icon={DollarSign}
          on={draft.deposits_enabled && !depositsLocked}
          onToggle={() => patch({ deposits_enabled: !draft.deposits_enabled })}
          disabled={depositsLocked}
        />

        <div className={cn(
          'grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-2 sm:gap-3 transition-opacity',
          depositInputsLocked && 'opacity-50',
        )}>
          <label className="block">
            <FieldLabel>Deposit type</FieldLabel>
            <div className="relative mt-1.5">
              <select
                value={draft.deposit_type ?? 'percent'}
                onChange={e => patch({ deposit_type: e.target.value as DepositType })}
                disabled={depositInputsLocked}
                className={cn(
                  'w-full appearance-none bg-white border px-3 py-2 pr-8 text-sm text-near-black focus:outline-none',
                  depositInputsLocked
                    ? 'border-[rgba(18,18,18,0.08)] bg-cream cursor-not-allowed'
                    : 'border-[rgba(18,18,18,0.15)] focus:border-near-black',
                )}
              >
                <option value="percent">Percent (%)</option>
                <option value="flat">Flat amount</option>
              </select>
              <ChevronRight
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-text pointer-events-none"
              />
            </div>
          </label>

          <label className="block">
            <FieldLabel>
              Deposit amount {draft.deposit_type === 'percent' ? '(0–100%)' : `(${draft.currency})`}
            </FieldLabel>
            <div className={cn(
              'mt-1.5 flex items-center border',
              depositInputsLocked
                ? 'border-[rgba(18,18,18,0.08)] bg-cream'
                : 'border-[rgba(18,18,18,0.15)] focus-within:border-near-black bg-white',
            )}>
              <span className="px-2 text-muted-text">
                {draft.deposit_type === 'percent' ? <Percent size={12} /> : <DollarSign size={12} />}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step={draft.deposit_type === 'percent' ? '1' : '0.01'}
                max={draft.deposit_type === 'percent' ? '100' : undefined}
                value={draft.deposit_amount ?? ''}
                onChange={e => {
                  const v = e.target.value
                  patch({ deposit_amount: v === '' ? null : Number(v) })
                }}
                disabled={depositInputsLocked}
                placeholder={draft.deposit_type === 'percent' ? '20' : '25.00'}
                className="w-full py-2 pr-3 text-sm text-near-black bg-transparent focus:outline-none disabled:cursor-not-allowed"
              />
            </div>
          </label>
        </div>
      </section>

      {/* Allow full payment + currency */}
      <section className={cn(
        'bg-white border p-3.5 space-y-3 transition-opacity',
        paymentsOff
          ? 'border-[rgba(18,18,18,0.06)] opacity-60'
          : 'border-[rgba(18,18,18,0.10)]',
      )}>
        <Toggle
          label="Allow full payment up front"
          hint="Let clients pay the entire service price at booking time."
          icon={Check}
          on={draft.allow_full_payment && !paymentsOff}
          onToggle={() => patch({ allow_full_payment: !draft.allow_full_payment })}
          disabled={paymentsOff}
        />

        <div className="flex items-center justify-between gap-3 border-t border-[rgba(18,18,18,0.06)] pt-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Currency</p>
            <p className="text-[11px] text-muted-text mt-0.5">Multi-currency support is coming soon.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-near-black border border-[rgba(18,18,18,0.15)] bg-cream px-3 py-1.5">
            {draft.currency}
          </span>
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-[rgba(18,18,18,0.08)] pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] text-muted-text">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-near-black">
              <Check size={12} /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-[#b42828]">
              <AlertCircle size={12} /> {saveErr ?? 'Could not save'}
            </span>
          )}
          {saveState === 'idle' && dirty && (
            <span>Unsaved changes</span>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saveState === 'saving'}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty
              ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
              : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.10)] cursor-not-allowed',
          )}
        >
          {saveState === 'saving'
            ? <><Loader2 size={11} className="animate-spin" /> Saving</>
            : <><Check size={12} /> Save changes</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Booking Settings panel ──────────────────────────────────────────────────

const SLOT_INTERVALS = [15, 30, 45, 60] as const

function BookingSettingsPanel() {
  const [data,    setData]    = useState<BookingSettings | null>(null)
  const [draft,   setDraft]   = useState<BookingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorBookingSettings()
      .then(d => { if (!cancelled) { setData(d); setDraft(d) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    return JSON.stringify(stripMeta(data)) !== JSON.stringify(stripMeta(draft))
  }, [data, draft])

  function patch(p: Partial<BookingSettings>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle')
    setSaveErr(null)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving')
    setSaveErr(null)
    try {
      const payload: BookingSettingsPayload = {
        booking_enabled:                   draft.booking_enabled,
        auto_confirm_bookings:             draft.auto_confirm_bookings,
        minimum_notice_minutes:            draft.minimum_notice_minutes,
        max_days_ahead:                    draft.max_days_ahead,
        slot_interval_minutes:             draft.slot_interval_minutes,
        slot_release_mode:                 draft.slot_release_mode,
        slot_release_window_days:          draft.slot_release_mode === 'always_open' ? null : draft.slot_release_window_days,
        cancellation_window_hours:         draft.cancellation_window_hours,
        reschedule_window_hours:           draft.reschedule_window_hours,
        prevent_duplicate_client_bookings: draft.prevent_duplicate_client_bookings,
      }
      const next = await updateEditorBookingSettings(payload)
      setData(next)
      setDraft(next)
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading booking settings…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load booking settings'}
      </div>
    )
  }

  const releaseHasWindow = draft.slot_release_mode !== 'always_open'

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Booking Settings</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Business-wide rules for how clients book with you.
        </p>
      </header>

      {/* Booking enabled */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-2">
        <Toggle
          label="Booking enabled"
          hint="Master switch. When off, your public site shows a friendly unavailable message and no new bookings can be made."
          icon={Calendar}
          on={draft.booking_enabled}
          onToggle={() => patch({ booking_enabled: !draft.booking_enabled })}
        />
      </section>

      {/* Confirmation + duplicate guard */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <Toggle
          label="Auto-confirm bookings"
          hint="Newly booked appointments are marked confirmed immediately (or right after the deposit clears) instead of pending review."
          on={draft.auto_confirm_bookings}
          onToggle={() => patch({ auto_confirm_bookings: !draft.auto_confirm_bookings })}
        />
        <div className="border-t border-[rgba(18,18,18,0.06)] pt-3">
          <Toggle
            label="Prevent duplicate client bookings"
            hint="Reject a booking when the same client (by email or phone) already holds the same service at the same time."
            on={draft.prevent_duplicate_client_bookings}
            onToggle={() => patch({ prevent_duplicate_client_bookings: !draft.prevent_duplicate_client_bookings })}
          />
        </div>
      </section>

      {/* Booking window */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField
            label="Minimum notice"
            suffix="minutes"
            min={0}
            max={10080}
            value={draft.minimum_notice_minutes}
            onChange={v => patch({ minimum_notice_minutes: v })}
            hint="How far ahead a client must book (e.g. 120 = 2 hours)."
          />
          <NumberField
            label="Max days ahead"
            suffix="days"
            min={1}
            max={365}
            value={draft.max_days_ahead}
            onChange={v => patch({ max_days_ahead: v })}
            hint="How far in the future bookings can be made."
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[rgba(18,18,18,0.06)] pt-3">
          <SelectField
            label="Slot interval"
            value={String(draft.slot_interval_minutes)}
            onChange={v => patch({ slot_interval_minutes: Number(v) })}
            options={SLOT_INTERVALS.map(n => ({ value: String(n), label: `${n} minutes` }))}
            hint="Spacing between available start times."
          />
          <SelectField
            label="Slot release mode"
            value={draft.slot_release_mode}
            onChange={v => patch({ slot_release_mode: v as SlotReleaseMode })}
            options={[
              { value: 'always_open', label: 'Always open' },
              { value: 'weekly',      label: 'Weekly' },
              { value: 'biweekly',    label: 'Biweekly' },
              { value: 'monthly',     label: 'Monthly' },
            ]}
            hint="When new dates open up for booking."
          />
        </div>
        {releaseHasWindow && (
          <div className="border-t border-[rgba(18,18,18,0.06)] pt-3">
            <NumberField
              label="Release window"
              suffix="days"
              min={1}
              max={365}
              value={draft.slot_release_window_days ?? 14}
              onChange={v => patch({ slot_release_window_days: v })}
              hint="How many days are visible at once in the release window."
            />
          </div>
        )}
      </section>

      {/* Cancellation / reschedule */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField
            label="Cancellation window"
            suffix="hours"
            min={0}
            max={720}
            value={draft.cancellation_window_hours}
            onChange={v => patch({ cancellation_window_hours: v })}
            hint="Minimum notice required for clients to cancel."
          />
          <NumberField
            label="Reschedule window"
            suffix="hours"
            min={0}
            max={720}
            value={draft.reschedule_window_hours}
            onChange={v => patch({ reschedule_window_hours: v })}
            hint="Minimum notice required for clients to reschedule."
          />
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-[rgba(18,18,18,0.08)] pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] text-muted-text">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-near-black">
              <Check size={12} /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-[#b42828]">
              <AlertCircle size={12} /> {saveErr ?? 'Could not save'}
            </span>
          )}
          {saveState === 'idle' && dirty && <span>Unsaved changes</span>}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saveState === 'saving'}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty
              ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
              : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.10)] cursor-not-allowed',
          )}
        >
          {saveState === 'saving'
            ? <><Loader2 size={11} className="animate-spin" /> Saving</>
            : <><Check size={12} /> Save changes</>}
        </button>
      </div>
    </div>
  )
}

function stripMeta(s: BookingSettings) {
  // Ignore created_at/updated_at/id when computing dirty state.
  const { id: _id, created_at: _c, updated_at: _u, ...rest } = s
  return rest
}

// ── Notification Settings panel ─────────────────────────────────────────────

function NotificationSettingsPanel() {
  const [data,    setData]    = useState<NotificationSettings | null>(null)
  const [draft,   setDraft]   = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorNotificationSettings()
      .then(d => { if (!cancelled) { setData(d); setDraft(d) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    const a = { ...data,  id: undefined, created_at: undefined, updated_at: undefined }
    const b = { ...draft, id: undefined, created_at: undefined, updated_at: undefined }
    return JSON.stringify(a) !== JSON.stringify(b)
  }, [data, draft])

  function patch(p: Partial<NotificationSettings>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle')
    setSaveErr(null)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving')
    setSaveErr(null)
    try {
      const payload: NotificationSettingsPayload = {
        owner_booking_email_enabled:         draft.owner_booking_email_enabled,
        client_booking_email_enabled:        draft.client_booking_email_enabled,
        appointment_confirmed_email_enabled: draft.appointment_confirmed_email_enabled,
        appointment_cancelled_email_enabled: draft.appointment_cancelled_email_enabled,
        reminder_email_enabled:              draft.reminder_email_enabled,
        reminder_hours_before:               draft.reminder_hours_before,
        reply_to_email:                      draft.reply_to_email,
        sender_name:                         draft.sender_name,
      }
      const next = await updateEditorNotificationSettings(payload)
      setData(next)
      setDraft(next)
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading notification settings…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load notification settings'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Notifications</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Choose which emails your business and your clients receive when a booking happens.
        </p>
      </header>

      {/* Booking emails */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Booking emails</p>
        <Toggle
          label="Owner — new booking request"
          hint="Notify you when a client submits a booking request or pays a deposit."
          icon={Bell}
          on={draft.owner_booking_email_enabled}
          onToggle={() => patch({ owner_booking_email_enabled: !draft.owner_booking_email_enabled })}
        />
        <div className="border-t border-[rgba(18,18,18,0.06)] pt-3">
          <Toggle
            label="Client — request received"
            hint="Send a receipt to the client when their booking request comes in."
            on={draft.client_booking_email_enabled}
            onToggle={() => patch({ client_booking_email_enabled: !draft.client_booking_email_enabled })}
          />
        </div>
        <div className="border-t border-[rgba(18,18,18,0.06)] pt-3">
          <Toggle
            label="Client — appointment confirmed"
            hint="Send when you confirm an appointment."
            on={draft.appointment_confirmed_email_enabled}
            onToggle={() => patch({ appointment_confirmed_email_enabled: !draft.appointment_confirmed_email_enabled })}
          />
        </div>
        <div className="border-t border-[rgba(18,18,18,0.06)] pt-3">
          <Toggle
            label="Client — appointment cancelled"
            hint="Send when an appointment is cancelled."
            on={draft.appointment_cancelled_email_enabled}
            onToggle={() => patch({ appointment_cancelled_email_enabled: !draft.appointment_cancelled_email_enabled })}
          />
        </div>
      </section>

      {/* Reminder */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3 opacity-95">
        <div className="flex items-start gap-2">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Reminders</p>
          <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-muted-text px-1.5 py-0.5">
            Coming soon
          </span>
        </div>
        <Toggle
          label="Send appointment reminders"
          hint="The scheduler hasn’t shipped yet — your preference will be stored and applied when it does."
          on={draft.reminder_email_enabled}
          onToggle={() => patch({ reminder_email_enabled: !draft.reminder_email_enabled })}
        />
        {draft.reminder_email_enabled && (
          <NumberField
            label="Hours before appointment"
            suffix="hours"
            min={1}
            max={720}
            value={draft.reminder_hours_before}
            onChange={v => patch({ reminder_hours_before: v })}
            hint="Default 24 hours before the appointment start time."
          />
        )}
      </section>

      {/* Reply-to + sender name */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Email identity</p>
        <label className="block">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Reply-to email</span>
          <input
            type="email"
            value={draft.reply_to_email ?? ''}
            onChange={e => patch({ reply_to_email: e.target.value || null })}
            placeholder="hello@yourbusiness.com"
            className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            maxLength={255}
          />
          <p className="text-[10px] text-muted-text mt-1">
            Replies from clients land here. Leave blank to use the owner email on file.
          </p>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Sender name</span>
          <input
            type="text"
            value={draft.sender_name ?? ''}
            onChange={e => patch({ sender_name: e.target.value || null })}
            placeholder="Your business name"
            className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            maxLength={120}
          />
          <p className="text-[10px] text-muted-text mt-1">
            Shown as the From name on emails. Defaults to BookReady when blank.
          </p>
        </label>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-[rgba(18,18,18,0.08)] pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-[11px] text-muted-text">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-near-black">
              <Check size={12} /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-[#b42828]">
              <AlertCircle size={12} /> {saveErr ?? 'Could not save'}
            </span>
          )}
          {saveState === 'idle' && dirty && <span>Unsaved changes</span>}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saveState === 'saving'}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty
              ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
              : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.10)] cursor-not-allowed',
          )}
        >
          {saveState === 'saving'
            ? <><Loader2 size={11} className="animate-spin" /> Saving</>
            : <><Check size={12} /> Save changes</>}
        </button>
      </div>
    </div>
  )
}

function NumberField({
  label, value, onChange, suffix, hint, min, max,
}: {
  label:   string
  value:   number
  onChange:(v: number) => void
  suffix?: string
  hint?:   string
  min?:    number
  max?:    number
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <div className="mt-1.5 flex items-center border border-[rgba(18,18,18,0.15)] bg-white focus-within:border-near-black">
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ''}
          onChange={e => {
            const n = Number(e.target.value)
            if (!Number.isFinite(n)) return
            onChange(n)
          }}
          className="w-full px-3 py-2 text-sm text-near-black bg-transparent focus:outline-none tabular-nums"
        />
        {suffix && <span className="px-2 text-[11px] text-muted-text">{suffix}</span>}
      </div>
      {hint && <p className="text-[10px] text-muted-text mt-1">{hint}</p>}
    </label>
  )
}

function SelectField({
  label, value, onChange, options, hint,
}: {
  label:   string
  value:   string
  onChange:(v: string) => void
  options: { value: string; label: string }[]
  hint?:   string
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 pr-8 text-sm text-near-black focus:outline-none focus:border-near-black"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronRight
          size={12}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-text pointer-events-none"
        />
      </div>
      {hint && <p className="text-[10px] text-muted-text mt-1">{hint}</p>}
    </label>
  )
}

// ── Tiny shared bits ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
      {children}
    </span>
  )
}

function Toggle({
  label, hint, icon: Icon, on, onToggle, disabled,
}: {
  label: string
  hint?: string
  icon?: React.ElementType
  on: boolean
  onToggle: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="text-near-black flex-shrink-0" strokeWidth={1.8} />}
        <div className="min-w-0">
          <span className="text-sm text-near-black block">{label}</span>
          {hint && <span className="text-[11px] text-muted-text">{hint}</span>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => { if (!disabled) onToggle() }}
        disabled={disabled}
        className={cn(
          'relative inline-flex items-center w-10 h-5 transition-colors border flex-shrink-0',
          on ? 'bg-near-black border-near-black' : 'bg-white border-[rgba(18,18,18,0.25)]',
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-3.5 h-3.5 bg-white border border-[rgba(18,18,18,0.15)] transition-all',
          on ? 'left-[22px]' : 'left-0.5',
        )} />
      </button>
    </div>
  )
}

// ── Stripe Connect status card ──────────────────────────────────────────────

interface ConnectBlockProps {
  settings:   PaymentSettings
  busy:       'idle' | 'starting' | 'refreshing' | 'syncing'
  error:      string | null
  onStart:    () => void
  onContinue: () => void
  onRefresh:  () => void
}

function StripeConnectBlock({
  settings, busy, error, onStart, onContinue, onRefresh,
}: ConnectBlockProps) {
  const status: StripeConnectStatus = (settings.stripe_connect_status ?? 'not_connected')

  const meta = (() => {
    switch (status) {
      case 'active':
        return {
          tone:  'positive' as const,
          icon:  ShieldCheck,
          title: 'Stripe connected',
          body:  'Customer payments are ready. Deposits will route to your Stripe account.',
        }
      case 'pending':
        return {
          tone:  'warn' as const,
          icon:  AlertCircle,
          title: 'Pending review',
          body:  'You finished onboarding — Stripe is still verifying your details. Payments will turn on once they finish.',
        }
      case 'onboarding_started':
        return {
          tone:  'warn' as const,
          icon:  AlertCircle,
          title: 'Onboarding in progress',
          body:  'You started Stripe onboarding but haven’t finished yet. Continue where you left off.',
        }
      case 'restricted':
        return {
          tone:  'danger' as const,
          icon:  AlertTriangle,
          title: 'Action required',
          body:  'Stripe needs more information before your account can accept payments. Continue onboarding to resolve.',
        }
      case 'not_connected':
      default:
        return {
          tone:  'neutral' as const,
          icon:  CreditCard,
          title: 'Connect Stripe',
          body:  'Connect a Stripe account so customer deposits and payments land in your bank.',
        }
    }
  })()

  const Icon = meta.icon

  const borderCls = {
    positive: 'border-[rgba(20,140,80,0.40)]',
    warn:     'border-[rgba(180,120,0,0.35)]',
    danger:   'border-[rgba(180,40,40,0.40)]',
    neutral:  'border-[rgba(18,18,18,0.10)]',
  }[meta.tone]

  const iconCls = {
    positive: 'text-[#0f6f3d]',
    warn:     'text-[#8a5a00]',
    danger:   'text-[#b42828]',
    neutral:  'text-near-black',
  }[meta.tone]

  return (
    <section className={cn('bg-white border p-3.5 space-y-3', borderCls)}>
      <div className="flex items-start gap-3">
        <span className={cn('w-8 h-8 flex items-center justify-center bg-cream border border-[rgba(18,18,18,0.08)] flex-shrink-0', iconCls)}>
          <Icon size={14} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-near-black">{meta.title}</p>
            <span className={cn(
              'text-[9px] font-bold tracking-[0.06em] uppercase border px-1.5 py-0.5 whitespace-nowrap',
              meta.tone === 'positive' ? 'bg-white border-[rgba(20,140,80,0.40)] text-[#0f6f3d]'
                : meta.tone === 'warn' ? 'bg-white border-[rgba(180,120,0,0.35)] text-[#8a5a00]'
                : meta.tone === 'danger' ? 'bg-white border-[rgba(180,40,40,0.40)] text-[#b42828]'
                : 'bg-cream border-[rgba(18,18,18,0.15)] text-muted-text',
            )}>{statusLabel(status)}</span>
          </div>
          <p className="text-[11px] text-muted-text mt-1">{meta.body}</p>

          {(settings.stripe_connect_account_id || settings.stripe_connect_last_checked_at) && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 mt-2 text-[11px]">
              {settings.stripe_connect_account_id && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Account</dt>
                  <dd className="font-mono text-near-black truncate">{settings.stripe_connect_account_id}</dd>
                </div>
              )}
              {settings.stripe_details_submitted !== undefined && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Onboarding</dt>
                  <dd className="text-near-black">{settings.stripe_details_submitted ? 'Submitted' : 'Incomplete'}</dd>
                </div>
              )}
              {settings.stripe_charges_enabled !== undefined && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Charges</dt>
                  <dd className="text-near-black">{settings.stripe_charges_enabled ? 'Enabled' : 'Disabled'}</dd>
                </div>
              )}
              {settings.stripe_payouts_enabled !== undefined && (
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-text">Payouts</dt>
                  <dd className="text-near-black">{settings.stripe_payouts_enabled ? 'Enabled' : 'Disabled'}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-[#b42828] flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[rgba(18,18,18,0.06)]">
        {status === 'not_connected' && (
          <button
            type="button"
            onClick={onStart}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black border border-near-black disabled:opacity-60"
          >
            {busy === 'starting'
              ? <><Loader2 size={11} className="animate-spin" /> Starting</>
              : <><CreditCard size={12} /> Connect Stripe</>}
          </button>
        )}
        {(status === 'onboarding_started' || status === 'pending' || status === 'restricted') && (
          <button
            type="button"
            onClick={onContinue}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black border border-near-black disabled:opacity-60"
          >
            {busy === 'refreshing'
              ? <><Loader2 size={11} className="animate-spin" /> Opening</>
              : <><ExternalLink size={12} /> Continue onboarding</>}
          </button>
        )}
        {settings.stripe_connect_account_id && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy !== 'idle'}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-60"
          >
            {busy === 'syncing'
              ? <><Loader2 size={11} className="animate-spin" /> Refreshing</>
              : <><RefreshCw size={12} /> Refresh status</>}
          </button>
        )}
      </div>
    </section>
  )
}

function statusLabel(status: StripeConnectStatus): string {
  switch (status) {
    case 'active':             return 'Active'
    case 'pending':            return 'Pending'
    case 'onboarding_started': return 'In progress'
    case 'restricted':         return 'Restricted'
    default:                   return 'Not connected'
  }
}
