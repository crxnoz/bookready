'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// Window-scroll reset on tab change. Without this the viewport stays
// wherever the previous panel left it, which is jarring on shorter panels.
function useScrollResetOnTab(tab: string) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [tab])
}
import { useRouter } from 'next/navigation'
import { clearAuth } from '@/lib/auth'
import {
  Building2, Calendar, CalendarClock, CreditCard, Bell, FileText, UserCircle,
  Plug, AlertTriangle, ChevronRight, Loader2, Check, AlertCircle,
  DollarSign, Download, Instagram, Mail, MapPin, MessageSquare, Phone,
  Percent, Lock, ExternalLink, RefreshCw, ShieldCheck, Send, Trash2, Webhook, Sparkles,
  X, Plus,
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
  getEditorAccount,
  updateEditorAccount,
  changeEditorPassword,
  signOutEverywhere,
  getEditorBusiness,
  updateEditorBusiness,
  getEditorPolicies,
  updateEditorPolicies,
  downloadEditorExport,
  deleteEditorAccount,
} from '@/lib/api'
import type {
  AccountProfile,
  BookingSettings,
  BookingSettingsPayload,
  BusinessPolicy,
  BusinessProfile,
  PolicyCustomGroup,
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
  | 'overview' | 'business' | 'preferences' | 'booking' | 'payments'
  | 'notifications' | 'policies' | 'account' | 'integrations' | 'danger'

const VALID_TABS: SettingsTab[] = [
  'overview', 'business', 'preferences', 'booking', 'payments',
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
  { tab: 'business',      label: 'Business Profile',   hint: 'Name, contact, address, socials',                icon: Building2,    status: 'ready' },
  { tab: 'preferences',   label: 'Preferences',        hint: 'Time zone, week start, time format, site visibility', icon: Sparkles,     status: 'ready' },
  { tab: 'booking',       label: 'Booking Settings',   hint: 'Booking window, notice, auto-confirm, rules',    icon: Calendar,     status: 'ready' },
  { tab: 'payments',      label: 'Payment Settings',   hint: 'Customer payments, deposits, currency',          icon: CreditCard,   status: 'ready' },
  { tab: 'notifications', label: 'Notifications',      hint: 'Toggle booking emails, reply-to, sender',        icon: Bell,         status: 'ready' },
  { tab: 'policies',      label: 'Policies',           hint: 'Enforcement rules + client-facing copy',         icon: FileText,     status: 'ready' },
  { tab: 'account',       label: 'Account',            hint: 'Owner profile, password, sign-out everywhere',   icon: UserCircle,   status: 'ready' },
  { tab: 'integrations',  label: 'Integrations',       hint: 'Stripe, calendar, SMS, webhooks',                icon: Plug,         status: 'ready' },
  { tab: 'danger',        label: 'Danger Zone',        hint: 'Pause bookings, export data, delete account',    icon: AlertTriangle, status: 'ready', tone: 'danger' },
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

  useScrollResetOnTab(tab)

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-4">
      {tab === 'overview'      && <OverviewPanel />}
      {tab === 'business'      && <BusinessSettingsPanel />}
      {tab === 'preferences'   && <PreferencesSettingsPanel />}
      {tab === 'payments'      && <PaymentSettingsPanel />}
      {tab === 'booking'       && <BookingSettingsPanel />}
      {tab === 'notifications' && <NotificationSettingsPanel />}
      {tab === 'policies'      && <PoliciesSettingsPanel />}
      {tab === 'account'       && <AccountSettingsPanel />}
      {tab === 'integrations'  && <IntegrationsSettingsPanel />}
      {tab === 'danger'        && <DangerSettingsPanel />}
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
         data.payments_enabled       !== draft.payments_enabled
      || data.deposits_enabled       !== draft.deposits_enabled
      || (data.allow_split_pay        ?? false) !== (draft.allow_split_pay        ?? false)
      || (data.collect_tax            ?? false) !== (draft.collect_tax            ?? false)
      || (data.save_cards_for_reuse   ?? false) !== (draft.save_cards_for_reuse   ?? false)
      || (data.no_show_fee_amount     ?? null)  !== (draft.no_show_fee_amount     ?? null)
      || (data.late_cancel_fee_amount ?? null)  !== (draft.late_cancel_fee_amount ?? null)
      || (data.late_cancel_window_hours ?? 24)  !== (draft.late_cancel_window_hours ?? 24)
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
        payments_enabled:     draft.payments_enabled,
        deposits_enabled:     draft.deposits_enabled,
        deposit_type:         draft.deposits_enabled ? (draft.deposit_type ?? 'percent') : null,
        deposit_amount:       draft.deposits_enabled ? draft.deposit_amount : null,
        allow_full_payment:   draft.allow_full_payment,
        allow_split_pay:      draft.allow_split_pay ?? false,
        collect_tax:          draft.collect_tax ?? false,
        save_cards_for_reuse: draft.save_cards_for_reuse ?? false,
        no_show_fee_amount:     draft.no_show_fee_amount ?? null,
        late_cancel_fee_amount: draft.late_cancel_fee_amount ?? null,
        late_cancel_window_hours: draft.late_cancel_window_hours ?? 24,
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

        <Toggle
          label="Split-pay (Klarna, Afterpay, Affirm)"
          hint="Show Buy-Now-Pay-Later options alongside card in Stripe Checkout. Stripe handles eligibility per region and amount."
          icon={Check}
          on={(draft.allow_split_pay ?? false) && !paymentsOff}
          onToggle={() => patch({ allow_split_pay: !(draft.allow_split_pay ?? false) })}
          disabled={paymentsOff}
        />

        <Toggle
          label="Collect sales tax"
          hint="Adds tax to every payment via Stripe Tax. You must also enable Stripe Tax inside your connected account's Stripe dashboard."
          icon={Check}
          on={(draft.collect_tax ?? false) && !paymentsOff}
          onToggle={() => patch({ collect_tax: !(draft.collect_tax ?? false) })}
          disabled={paymentsOff}
        />

        <Toggle
          label="Save cards for repeat customers"
          hint="Returning clients see their saved card in Checkout. Also unlocks no-show / late-cancel fees below. Card-only — disables split-pay for that session."
          icon={Check}
          on={(draft.save_cards_for_reuse ?? false) && !paymentsOff}
          onToggle={() => patch({ save_cards_for_reuse: !(draft.save_cards_for_reuse ?? false) })}
          disabled={paymentsOff}
        />

        {/* Late-fee config (only meaningful when save_cards_for_reuse is on) */}
        <div className={cn(
          'border-t border-[rgba(18,18,18,0.06)] pt-3 space-y-3',
          (!draft.save_cards_for_reuse || paymentsOff) && 'opacity-60',
        )}>
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1">Late fees</p>
            <p className="text-[11px] text-muted-text">
              {draft.save_cards_for_reuse
                ? 'Manually charge the saved card when a client no-shows or cancels too late.'
                : 'Turn on “Save cards for repeat customers” to enable late fees.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <MoneyInput
              label="No-show fee"
              currency={draft.currency}
              value={draft.no_show_fee_amount ?? null}
              onChange={v => patch({ no_show_fee_amount: v })}
              disabled={!draft.save_cards_for_reuse || paymentsOff}
            />
            <MoneyInput
              label="Late-cancel fee"
              currency={draft.currency}
              value={draft.late_cancel_fee_amount ?? null}
              onChange={v => patch({ late_cancel_fee_amount: v })}
              disabled={!draft.save_cards_for_reuse || paymentsOff}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-text">
            <span>Cancellation is &ldquo;late&rdquo; within</span>
            <input
              type="number"
              min={0}
              max={336}
              value={draft.late_cancel_window_hours ?? 24}
              onChange={e => patch({ late_cancel_window_hours: Math.max(0, Math.min(336, parseInt(e.target.value, 10) || 0)) })}
              disabled={!draft.save_cards_for_reuse || paymentsOff}
              className="w-16 bg-white border border-[rgba(18,18,18,0.15)] px-2 py-1 text-[11px] text-near-black focus:outline-none focus:border-near-black transition-colors disabled:opacity-50"
            />
            <span>hours of the appointment.</span>
          </div>
        </div>

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

// ── Account Settings panel ──────────────────────────────────────────────────

function AccountSettingsPanel() {
  const [profile,    setProfile]    = useState<AccountProfile | null>(null)
  const [loadErr,    setLoadErr]    = useState<string | null>(null)
  const [loading,    setLoading]    = useState(true)

  // Profile form state
  const [name,       setName]       = useState('')
  const [email,      setEmail]      = useState('')
  const [profSave,   setProfSave]   = useState<SaveState>('idle')
  const [profErr,    setProfErr]    = useState<string | null>(null)

  // Password form state
  const [currentPw,  setCurrentPw]  = useState('')
  const [newPw,      setNewPw]      = useState('')
  const [newPw2,     setNewPw2]     = useState('')
  const [pwSave,     setPwSave]     = useState<SaveState>('idle')
  const [pwErr,      setPwErr]      = useState<string | null>(null)

  // Sign-out-everywhere
  const [signoutBusy, setSignoutBusy] = useState(false)
  const [signoutMsg,  setSignoutMsg]  = useState<string | null>(null)
  const [signoutErr,  setSignoutErr]  = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorAccount()
      .then(p => { if (!cancelled) { setProfile(p); setName(p.name); setEmail(p.email) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const profileDirty = useMemo(() => {
    if (!profile) return false
    return name.trim() !== profile.name || email.trim() !== profile.email
  }, [name, email, profile])

  const pwReady =
    currentPw.length > 0 &&
    newPw.length >= 8 &&
    newPw === newPw2

  async function saveProfile() {
    if (!profileDirty) return
    setProfSave('saving'); setProfErr(null)
    try {
      const next = await updateEditorAccount({
        name:  name.trim(),
        email: email.trim(),
      })
      setProfile(next)
      setName(next.name)
      setEmail(next.email)
      setProfSave('saved')
    } catch (e) {
      setProfErr(e instanceof Error ? e.message : 'Save failed')
      setProfSave('error')
    }
  }

  async function changePw() {
    if (!pwReady) return
    setPwSave('saving'); setPwErr(null)
    try {
      await changeEditorPassword({
        current_password:           currentPw,
        new_password:               newPw,
        new_password_confirmation:  newPw2,
      })
      setCurrentPw(''); setNewPw(''); setNewPw2('')
      setPwSave('saved')
    } catch (e) {
      setPwErr(e instanceof Error ? e.message : 'Password change failed')
      setPwSave('error')
    }
  }

  async function handleSignOutEverywhere() {
    if (! confirm('Sign out every other device that has used this account?')) return
    setSignoutBusy(true); setSignoutErr(null); setSignoutMsg(null)
    try {
      const res = await signOutEverywhere()
      setSignoutMsg(res.revoked_count > 0
        ? `${res.revoked_count} other session${res.revoked_count === 1 ? '' : 's'} signed out.`
        : 'No other sessions were active.')
    } catch (e) {
      setSignoutErr(e instanceof Error ? e.message : 'Sign out failed')
    } finally {
      setSignoutBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading account…
      </div>
    )
  }
  if (loadErr || !profile) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load account'}
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
        <h1 className="text-base font-bold text-near-black">Account</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Your owner profile, sign-in credentials, and active sessions.
        </p>
      </header>

      {/* Profile */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Profile</p>
        <label className="block">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={255}
            className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          />
          <p className="text-[10px] text-muted-text mt-1">
            Used for signing in and as the default reply-to for booking emails.
          </p>
        </label>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[rgba(18,18,18,0.06)]">
          <div className="text-[11px] text-muted-text">
            {profSave === 'saved' && (
              <span className="inline-flex items-center gap-1 text-near-black">
                <Check size={12} /> Saved
              </span>
            )}
            {profSave === 'error' && (
              <span className="inline-flex items-center gap-1 text-[#b42828]">
                <AlertCircle size={12} /> {profErr ?? 'Could not save'}
              </span>
            )}
            {profSave === 'idle' && profileDirty && <span>Unsaved changes</span>}
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={! profileDirty || profSave === 'saving'}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
              profileDirty
                ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
                : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.10)] cursor-not-allowed',
            )}
          >
            {profSave === 'saving'
              ? <><Loader2 size={11} className="animate-spin" /> Saving</>
              : <><Check size={12} /> Save changes</>}
          </button>
        </div>
      </section>

      {/* Password */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Change password</p>
        <label className="block">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Current password</span>
          <input
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">New password</span>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
            <p className="text-[10px] text-muted-text mt-1">At least 8 characters.</p>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Confirm new password</span>
            <input
              type="password"
              value={newPw2}
              onChange={e => setNewPw2(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
            {newPw && newPw2 && newPw !== newPw2 && (
              <p className="text-[10px] text-[#b42828] mt-1">Passwords don&rsquo;t match.</p>
            )}
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-[rgba(18,18,18,0.06)]">
          <div className="text-[11px] text-muted-text">
            {pwSave === 'saved' && (
              <span className="inline-flex items-center gap-1 text-near-black">
                <Check size={12} /> Password updated
              </span>
            )}
            {pwSave === 'error' && (
              <span className="inline-flex items-center gap-1 text-[#b42828]">
                <AlertCircle size={12} /> {pwErr ?? 'Password change failed'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={changePw}
            disabled={! pwReady || pwSave === 'saving'}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
              pwReady
                ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
                : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.10)] cursor-not-allowed',
            )}
          >
            {pwSave === 'saving'
              ? <><Loader2 size={11} className="animate-spin" /> Updating</>
              : <><Lock size={12} /> Update password</>}
          </button>
        </div>
      </section>

      {/* Security — sign out everywhere */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Security</p>
        <div className="flex items-start gap-3">
          <UserCircle size={14} className="text-near-black flex-shrink-0 mt-1" strokeWidth={1.8} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-near-black">Sign out everywhere else</p>
            <p className="text-[11px] text-muted-text mt-0.5">
              Ends every active session for your account except this device.
              Useful if you logged in somewhere you shouldn&rsquo;t still be signed in.
            </p>
            {signoutMsg && (
              <p className="text-[11px] text-[#0f6f3d] mt-2 inline-flex items-center gap-1">
                <Check size={11} /> {signoutMsg}
              </p>
            )}
            {signoutErr && (
              <p className="text-[11px] text-[#b42828] mt-2 inline-flex items-center gap-1">
                <AlertCircle size={11} /> {signoutErr}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end pt-1 border-t border-[rgba(18,18,18,0.06)]">
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            disabled={signoutBusy}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-60"
          >
            {signoutBusy
              ? <><Loader2 size={11} className="animate-spin" /> Signing out</>
              : 'Sign out everywhere'}
          </button>
        </div>
      </section>
    </div>
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

function MoneyInput({
  label, currency, value, onChange, disabled,
}: {
  label: string
  currency: string
  value: number | null
  onChange: (v: number | null) => void
  disabled?: boolean
}) {
  const sym = currency === 'USD' ? '$' : ''
  return (
    <div>
      <label className="block text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1">{label}</label>
      <div className={cn(
        'flex items-center border border-[rgba(18,18,18,0.15)] focus-within:border-near-black',
        disabled && 'opacity-50',
      )}>
        <span className="px-2.5 text-xs text-muted-text">{sym}</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={value ?? ''}
          onChange={e => {
            const v = e.target.value.trim()
            onChange(v === '' ? null : Math.max(0, parseFloat(v) || 0))
          }}
          disabled={disabled}
          placeholder="0.00"
          className="flex-1 py-2 px-2 text-sm text-near-black bg-white outline-none disabled:opacity-50"
        />
        <span className="px-2.5 text-[11px] text-muted-text">{currency}</span>
      </div>
    </div>
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

// ── Business Settings panel ─────────────────────────────────────────────────

// Common beauty business types. Free-text fallback via the "Other" option.
const BUSINESS_TYPES = [
  'Salon', 'Barbershop', 'Spa', 'Nail tech', 'Lash tech',
  'Brow tech', 'Esthetician', 'Massage therapist', 'Makeup artist',
  'Hair stylist (solo)', 'Other',
] as const

function BusinessSettingsPanel() {
  const [data,    setData]    = useState<BusinessProfile | null>(null)
  const [draft,   setDraft]   = useState<BusinessProfile | null>(null)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorBusiness()
      .then(d => { if (!cancelled) { setData(d); setDraft(d) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    // Tenant slug for the public URL preview. Stored under br_tenant_id by setTenantId().
    if (typeof window !== 'undefined') {
      setTenantSlug(localStorage.getItem('br_tenant_id'))
    }
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    return JSON.stringify(data) !== JSON.stringify(draft)
  }, [data, draft])

  function patch(p: Partial<BusinessProfile>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle')
    setSaveErr(null)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving'); setSaveErr(null)
    try {
      // Send only the editable identity/contact/address fields. booking_enabled
      // is owned by Booking Settings; site_status by the Danger Zone.
      const payload: Partial<BusinessProfile> = {
        business_name: draft.business_name?.trim() || null,
        tagline:       draft.tagline?.trim()       || null,
        business_type: draft.business_type?.trim() || null,
        public_email:  draft.public_email?.trim()  || null,
        public_phone:  draft.public_phone?.trim()  || null,
        address_line:  draft.address_line?.trim()  || null,
        city:          draft.city?.trim()          || null,
        state:         draft.state?.trim()         || null,
        zip:           draft.zip?.trim()           || null,
        instagram_url: draft.instagram_url?.trim() || null,
      }
      const next = await updateEditorBusiness(payload)
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
        <Loader2 size={14} className="animate-spin" /> Loading business settings…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load business settings'}
      </div>
    )
  }

  // For the business_type select: if the saved value isn't in our list, treat
  // it as "Other" and pop a custom text input.
  const typeValue   = draft.business_type ?? ''
  const isKnownType = (BUSINESS_TYPES as readonly string[]).includes(typeValue)
  const showCustomType = !isKnownType && typeValue !== ''

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Business Profile</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Who you are — name, public contact, and where clients can find you.
        </p>
      </header>

      {/* Public site URL preview */}
      {tenantSlug && (
        <a
          href={`https://${tenantSlug}.bkrdy.me`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white border border-[rgba(18,18,18,0.10)] p-3.5 hover:border-near-black transition-colors group"
        >
          <div className="flex items-start gap-3">
            <ExternalLink size={14} className="text-near-black mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Your public site</p>
              <p className="text-[13px] font-semibold text-near-black mt-0.5 truncate">
                {tenantSlug}.bkrdy.me
              </p>
            </div>
            <span className="text-[11px] text-muted-text group-hover:text-near-black">View →</span>
          </div>
        </a>
      )}

      {/* Identity */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={Building2} label="Identity" hint="How your business shows up across BookReady." />
        <TextField
          label="Business name"
          value={draft.business_name ?? ''}
          onChange={v => patch({ business_name: v })}
          placeholder="Lush Studio"
          hint="Appears on your public site, in client emails, and on the welcome screen."
        />
        <TextField
          label="Tagline"
          value={draft.tagline ?? ''}
          onChange={v => patch({ tagline: v })}
          placeholder="Effortless beauty, on your schedule"
          hint="Optional one-line description shown on your booking site."
        />
        <SelectField
          label="Business type"
          value={isKnownType ? typeValue : 'Other'}
          onChange={v => patch({ business_type: v === 'Other' ? (showCustomType ? typeValue : '') : v })}
          options={BUSINESS_TYPES.map(t => ({ value: t, label: t }))}
          hint="Helps us tailor templates and defaults later."
        />
        {(showCustomType || (typeValue === '' && draft.business_type === null) || (! isKnownType && typeValue === '')) && (
          <TextField
            label="Custom type"
            value={showCustomType ? typeValue : ''}
            onChange={v => patch({ business_type: v })}
            placeholder="e.g. PMU artist"
          />
        )}
      </section>

      {/* Public contact */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={Mail} label="Public contact" hint="Shown to clients on your booking site." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Public email"
            type="email"
            icon={Mail}
            value={draft.public_email ?? ''}
            onChange={v => patch({ public_email: v })}
            placeholder="hello@yourbusiness.com"
          />
          <TextField
            label="Public phone"
            type="tel"
            icon={Phone}
            value={draft.public_phone ?? ''}
            onChange={v => patch({ public_phone: v })}
            placeholder="(555) 123-4567"
          />
        </div>
        <TextField
          label="Instagram"
          icon={Instagram}
          value={draft.instagram_url ?? ''}
          onChange={v => patch({ instagram_url: v })}
          placeholder="@yourhandle or https://instagram.com/yourhandle"
          hint="Used on your site header. Other socials live in Website → Header."
        />
      </section>

      {/* Address */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={MapPin} label="Address" hint="Helps clients find you. Address shows on your public site." />
        <TextField
          label="Street address"
          value={draft.address_line ?? ''}
          onChange={v => patch({ address_line: v })}
          placeholder="123 Beauty Lane, Suite 200"
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TextField
            label="City"
            value={draft.city ?? ''}
            onChange={v => patch({ city: v })}
            placeholder="Brooklyn"
          />
          <TextField
            label="State"
            value={draft.state ?? ''}
            onChange={v => patch({ state: v })}
            placeholder="NY"
          />
          <TextField
            label="ZIP"
            value={draft.zip ?? ''}
            onChange={v => patch({ zip: v })}
            placeholder="11211"
          />
        </div>
      </section>

      <SaveBar
        dirty={dirty}
        saveState={saveState}
        saveErr={saveErr}
        onSave={save}
      />
    </div>
  )
}

// ── Policies Settings panel ─────────────────────────────────────────────────

const POLICY_FIELDS: { key: keyof BusinessPolicy; label: string; placeholder: string; hint?: string }[] = [
  { key: 'cancellation_policy', label: 'Cancellation policy', placeholder: '24 hours notice required for cancellations…',
    hint: 'How much notice clients need to give and any fees.' },
  { key: 'late_policy',         label: 'Late arrival policy', placeholder: 'After 15 minutes, your appointment may be cancelled…' },
  { key: 'no_show_policy',      label: 'No-show policy',      placeholder: 'No-shows are charged the full service price…' },
  { key: 'deposit_policy',      label: 'Deposit policy',      placeholder: 'A 25% deposit is required at booking. Non-refundable.' },
  { key: 'reschedule_policy',   label: 'Reschedule policy',   placeholder: 'Reschedule up to 24 hours before your appointment.' },
  { key: 'extra_notes',         label: 'Additional notes',    placeholder: 'Anything else clients should know before they book.' },
]

function PoliciesSettingsPanel() {
  const [data,    setData]    = useState<BusinessPolicy | null>(null)
  const [draft,   setDraft]   = useState<BusinessPolicy | null>(null)
  // Cross-section pull-throughs so the owner can see the whole policy stack
  // in one place. We don't edit these here — just display + deep-link.
  const [booking, setBooking] = useState<BookingSettings | null>(null)
  const [payment, setPayment] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorPolicies(),
      getEditorBookingSettings().catch(() => null),
      getEditorPaymentSettings().catch(() => null),
    ])
      .then(([p, bs, ps]) => {
        if (cancelled) return
        const normalized = normalizePolicy(p)
        setData(normalized); setDraft(normalized)
        setBooking(bs); setPayment(ps)
      })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    return JSON.stringify(data) !== JSON.stringify(draft)
  }, [data, draft])

  const copyCount = useMemo(() => {
    if (!draft) return 0
    return POLICY_FIELDS.filter(({ key }) => {
      const v = draft[key]
      return typeof v === 'string' && v.trim().length > 0
    }).length
  }, [draft])

  function patch(p: Partial<BusinessPolicy>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle'); setSaveErr(null)
  }
  function patchText(key: keyof BusinessPolicy, value: string) {
    patch({ [key]: value } as Partial<BusinessPolicy>)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving'); setSaveErr(null)
    try {
      // Empty strings → null so old policies clear properly.
      const payload: Partial<BusinessPolicy> = {}
      for (const { key } of POLICY_FIELDS) {
        const v = (draft[key] as string | null) ?? ''
        ;(payload as Record<string, string | null>)[key] = v.trim().length > 0 ? v : null
      }
      payload.late_grace_period_minutes      = draft.late_grace_period_minutes ?? 0
      payload.forfeit_deposit_on_late_cancel = !! draft.forfeit_deposit_on_late_cancel
      payload.max_reschedules_per_booking    = draft.max_reschedules_per_booking ?? null
      payload.require_policy_agreement       = !! draft.require_policy_agreement
      // Custom groups — strip empties so a half-typed row doesn't error on the API,
      // and drop trailing-whitespace-only headings/titles.
      payload.custom_groups = (draft.custom_groups ?? [])
        .map(g => ({
          heading: (g.heading ?? '').trim(),
          items: (g.items ?? [])
            .map(it => ({
              title:   (it.title   ?? '').trim(),
              content: (it.content ?? '').trim(),
            }))
            .filter(it => it.title.length > 0),
        }))
        .filter(g => g.heading.length > 0)
      const next = await updateEditorPolicies(payload)
      const normalized = normalizePolicy(next)
      setData(normalized); setDraft(normalized)
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading policies…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load policies'}
      </div>
    )
  }

  const currency = (payment?.currency ?? 'USD').toUpperCase()
  const sym      = currency === 'USD' ? '$' : ''

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Policies</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Enforcement rules that actually do something, plus the copy your clients read on your site and emails.
        </p>
      </header>

      {/* ── Enforcement rules (live here) ── */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={ShieldCheck} label="Enforcement rules" hint="Real rules — BookReady enforces these automatically." />

        <Toggle
          label="Require clients to agree to your policies"
          hint="Adds a checkbox to the booking form. Bookings are rejected without it."
          on={!! draft.require_policy_agreement}
          onToggle={() => patch({ require_policy_agreement: !draft.require_policy_agreement })}
        />

        <div className="border-t border-[rgba(18,18,18,0.06)] pt-3">
          <Toggle
            label="Forfeit deposit on late cancellation"
            hint="When a client cancels within the cancellation window, their deposit becomes non-refundable. You can still refund manually."
            on={!! draft.forfeit_deposit_on_late_cancel}
            onToggle={() => patch({ forfeit_deposit_on_late_cancel: !draft.forfeit_deposit_on_late_cancel })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[rgba(18,18,18,0.06)] pt-3">
          <NumberField
            label="Max reschedules per booking"
            value={draft.max_reschedules_per_booking ?? 0}
            onChange={v => patch({ max_reschedules_per_booking: v <= 0 ? null : v })}
            min={0}
            max={50}
            suffix="0 = unlimited"
            hint="Cap how many times a client can reschedule a single appointment via the manage link."
          />
          <NumberField
            label="Late grace period"
            value={draft.late_grace_period_minutes ?? 0}
            onChange={v => patch({ late_grace_period_minutes: v })}
            min={0}
            max={240}
            suffix="minutes"
            hint="Auto-no-show enforcement cron coming soon. Setting saved either way."
          />
        </div>
      </section>

      {/* ── Rules configured elsewhere (read-only summary) ── */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-2.5">
        <SectionTitle icon={ExternalLink} label="Set elsewhere" hint="These rules live in other tabs — shown here for context." />

        <PolicyReadout
          label="Cancellation window"
          value={`${booking?.cancellation_window_hours ?? 24} hour${(booking?.cancellation_window_hours ?? 24) === 1 ? '' : 's'} notice required`}
          href={hrefFor('booking')}
        />
        <PolicyReadout
          label="Reschedule window"
          value={`${booking?.reschedule_window_hours ?? 24} hour${(booking?.reschedule_window_hours ?? 24) === 1 ? '' : 's'} notice required`}
          href={hrefFor('booking')}
        />
        <PolicyReadout
          label="No-show fee"
          value={payment?.no_show_fee_amount ? `${sym}${payment.no_show_fee_amount.toFixed(2)} charged to saved card` : 'Not configured'}
          href={hrefFor('payments')}
          muted={! payment?.no_show_fee_amount}
        />
        <PolicyReadout
          label="Late-cancel fee"
          value={payment?.late_cancel_fee_amount ? `${sym}${payment.late_cancel_fee_amount.toFixed(2)} charged to saved card` : 'Not configured'}
          href={hrefFor('payments')}
          muted={! payment?.late_cancel_fee_amount}
        />
        <PolicyReadout
          label="Deposit"
          value={payment?.deposits_enabled
            ? (payment.deposit_type === 'percent'
                ? `${payment.deposit_amount ?? 0}% deposit required`
                : `${sym}${(payment.deposit_amount ?? 0).toFixed(2)} flat deposit required`)
            : 'No deposit required'}
          href={hrefFor('payments')}
          muted={! payment?.deposits_enabled}
        />
      </section>

      {/* ── Client-facing copy ── */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <SectionTitle icon={FileText} label="Client-facing copy" hint="Text that appears on your booking site and in confirmation emails." />
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text whitespace-nowrap">
            {copyCount}/{POLICY_FIELDS.length} set
          </span>
        </div>
        {POLICY_FIELDS.map(({ key, label, placeholder, hint }) => (
          <TextAreaField
            key={key}
            label={label}
            value={(draft[key] as string) ?? ''}
            onChange={v => patchText(key, v)}
            placeholder={placeholder}
            hint={hint}
            rows={3}
          />
        ))}
      </section>

      {/* ── Custom policy sections ── */}
      <CustomPolicyGroupsEditor
        groups={draft.custom_groups ?? []}
        onChange={(next) => patch({ custom_groups: next })}
      />

      <SaveBar
        dirty={dirty}
        saveState={saveState}
        saveErr={saveErr}
        onSave={save}
      />
    </div>
  )
}

function normalizePolicy(p: BusinessPolicy): BusinessPolicy {
  const rawGroups = Array.isArray(p.custom_groups) ? p.custom_groups : []
  return {
    id: p.id,
    cancellation_policy: p.cancellation_policy ?? '',
    late_policy:         p.late_policy         ?? '',
    no_show_policy:      p.no_show_policy      ?? '',
    deposit_policy:      p.deposit_policy      ?? '',
    reschedule_policy:   p.reschedule_policy   ?? '',
    extra_notes:         p.extra_notes         ?? '',
    late_grace_period_minutes:      p.late_grace_period_minutes      ?? 0,
    forfeit_deposit_on_late_cancel: !! p.forfeit_deposit_on_late_cancel,
    max_reschedules_per_booking:    p.max_reschedules_per_booking    ?? null,
    require_policy_agreement:       !! p.require_policy_agreement,
    custom_groups: rawGroups.map(g => ({
      heading: g?.heading ?? '',
      items: Array.isArray(g?.items) ? g.items.map(it => ({
        title:   it?.title   ?? '',
        content: it?.content ?? '',
      })) : [],
    })),
  }
}

function PolicyReadout({
  label, value, href, muted,
}: {
  label: string
  value: string
  href:  string
  muted?: boolean
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 py-2 border-b border-[rgba(18,18,18,0.04)] last:border-b-0 group"
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-near-black">{label}</p>
        <p className={cn('text-[11px] mt-0.5 truncate', muted ? 'text-muted-text/70' : 'text-muted-text')}>
          {value}
        </p>
      </div>
      <ChevronRight size={12} className="text-muted-text group-hover:text-near-black flex-shrink-0" />
    </Link>
  )
}

// ── Custom policy groups editor ─────────────────────────────────────────────

// Keep the policies tab from sprawling into walls of text — owners can
// add at most 2 custom sections × 3 items each.
const CUSTOM_POLICY_MAX_GROUPS         = 2
const CUSTOM_POLICY_MAX_ITEMS_PER_GROUP = 3

function CustomPolicyGroupsEditor({
  groups, onChange,
}: {
  groups: PolicyCustomGroup[]
  onChange: (next: PolicyCustomGroup[]) => void
}) {
  function addGroup() {
    if (groups.length >= CUSTOM_POLICY_MAX_GROUPS) return
    onChange([...groups, { heading: '', items: [{ title: '', content: '' }] }])
  }
  function patchGroup(gi: number, p: Partial<PolicyCustomGroup>) {
    onChange(groups.map((g, idx) => idx === gi ? { ...g, ...p } : g))
  }
  function removeGroup(gi: number) {
    onChange(groups.filter((_, idx) => idx !== gi))
  }
  function addItem(gi: number) {
    const g = groups[gi]
    if (!g) return
    if (g.items.length >= CUSTOM_POLICY_MAX_ITEMS_PER_GROUP) return
    patchGroup(gi, { items: [...g.items, { title: '', content: '' }] })
  }
  function patchItem(gi: number, ii: number, p: Partial<{ title: string; content: string }>) {
    const g = groups[gi]
    if (!g) return
    patchGroup(gi, { items: g.items.map((it, idx) => idx === ii ? { ...it, ...p } : it) })
  }
  function removeItem(gi: number, ii: number) {
    const g = groups[gi]
    if (!g) return
    patchGroup(gi, { items: g.items.filter((_, idx) => idx !== ii) })
  }

  return (
    <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <SectionTitle
          icon={Plus}
          label="Custom policy sections"
          hint={`Add your own sections — up to ${CUSTOM_POLICY_MAX_GROUPS}, with ${CUSTOM_POLICY_MAX_ITEMS_PER_GROUP} items each.`}
        />
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-muted-text">
            {groups.length}/{CUSTOM_POLICY_MAX_GROUPS}
          </span>
          <button
            type="button"
            onClick={addGroup}
            disabled={groups.length >= CUSTOM_POLICY_MAX_GROUPS}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-2.5 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Add section
          </button>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-[11px] text-muted-text italic">
          No custom sections yet. Use these for product care, aftercare instructions, parking notes, or anything else clients need to know.
        </p>
      )}

      {groups.map((g, gi) => (
        <div key={gi} className="bg-cream border border-[rgba(18,18,18,0.08)] p-3 space-y-2.5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={`Section ${gi + 1} heading`}
                value={g.heading}
                onChange={v => patchGroup(gi, { heading: v })}
                placeholder="Aftercare, Parking, Add-Ons…"
              />
            </div>
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              className="w-9 h-9 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600"
              title="Delete section"
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div className="space-y-2 pl-2 border-l-2 border-[rgba(18,18,18,0.08)]">
            {g.items.map((it, ii) => (
              <div key={ii} className="bg-white border border-[rgba(18,18,18,0.08)] p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
                    Item {ii + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(gi, ii)}
                    className="w-6 h-6 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600"
                    title="Delete item"
                  >
                    <X size={11} />
                  </button>
                </div>
                <TextField
                  label="Title"
                  value={it.title}
                  onChange={v => patchItem(gi, ii, { title: v })}
                  placeholder="What clients see as the bullet heading"
                />
                <TextAreaField
                  label="Content"
                  value={it.content ?? ''}
                  onChange={v => patchItem(gi, ii, { content: v })}
                  placeholder="The body text shown under the title."
                  rows={2}
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-muted-text">
                {g.items.length}/{CUSTOM_POLICY_MAX_ITEMS_PER_GROUP}
              </span>
              <button
                type="button"
                onClick={() => addItem(gi)}
                disabled={g.items.length >= CUSTOM_POLICY_MAX_ITEMS_PER_GROUP}
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-2 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={11} /> Add item
              </button>
            </div>
          </div>
        </div>
      ))}
    </section>
  )
}

// ── Preferences Settings panel ──────────────────────────────────────────────

// US-first list. Full IANA list is ~400 entries; expand later when we serve
// outside the US. The select also accepts a typed value via "Other".
const COMMON_TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern (New York)' },
  { value: 'America/Chicago',     label: 'Central (Chicago)' },
  { value: 'America/Denver',      label: 'Mountain (Denver)' },
  { value: 'America/Phoenix',     label: 'Mountain — no DST (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage',   label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (Honolulu)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic (San Juan)' },
] as const

function PreferencesSettingsPanel() {
  // Preferences live on the BusinessProfile model — same endpoint as Business
  // Profile. We just expose a different subset of fields here.
  const [data,    setData]    = useState<BusinessProfile | null>(null)
  const [draft,   setDraft]   = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)
  // Plain password field — empty unless user types into it. We only send
  // it on save when the visibility is 'private' AND a password was typed.
  const [pwInput, setPwInput] = useState('')

  useEffect(() => {
    let cancelled = false
    getEditorBusiness()
      .then(d => { if (!cancelled) { setData(d); setDraft(d) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    if (pwInput !== '') return true
    return JSON.stringify(stripPrefs(data)) !== JSON.stringify(stripPrefs(draft))
  }, [data, draft, pwInput])

  function patch(p: Partial<BusinessProfile>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle'); setSaveErr(null)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving'); setSaveErr(null)
    try {
      const payload: Partial<BusinessProfile> = {
        time_zone:        draft.time_zone || null,
        week_start_day:   draft.week_start_day ?? 0,
        time_format:      draft.time_format ?? '12h',
        default_appointment_duration_minutes: draft.default_appointment_duration_minutes ?? 60,
        post_booking_message: draft.post_booking_message?.trim() || null,
        email_signature:      draft.email_signature?.trim() || null,
        site_visibility:      draft.site_visibility ?? 'public',
      }
      // Only send a password if user actually typed one. Empty doesn't clear
      // an existing one — there's a separate "Clear password" affordance.
      if (pwInput !== '') payload.site_password = pwInput
      const next = await updateEditorBusiness(payload)
      setData(next); setDraft(next)
      setPwInput('')
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function clearPassword() {
    if (! draft) return
    if (! confirm('Clear the site password? Anyone with the link will be able to view your site again (once you switch visibility back to public).')) return
    setSaveState('saving'); setSaveErr(null)
    try {
      const next = await updateEditorBusiness({ site_password: '' })
      setData(next); setDraft(next)
      setPwInput('')
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
        <Loader2 size={14} className="animate-spin" /> Loading preferences…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-[#b42828] flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load preferences'}
      </div>
    )
  }

  const isPrivate = draft.site_visibility === 'private'
  const tzKnown   = (COMMON_TIMEZONES as readonly { value: string }[]).some(t => t.value === draft.time_zone)
  const tzSelect  = draft.time_zone === null || draft.time_zone === undefined || draft.time_zone === ''
    ? '' : (tzKnown ? draft.time_zone! : 'Other')

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Preferences</h1>
        <p className="text-xs text-muted-text mt-0.5">
          How BookReady behaves for your business — time zone, formats, defaults, and site visibility.
        </p>
      </header>

      {/* Time + format */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={CalendarClock} label="Time & format" hint="Used across the app, emails, and your public site." />

        <SelectField
          label="Time zone"
          value={tzSelect}
          onChange={v => patch({ time_zone: v === 'Other' ? (draft.time_zone || '') : (v || null) })}
          options={[
            { value: '', label: 'Use BookReady default (US Eastern)' },
            ...COMMON_TIMEZONES.map(t => ({ value: t.value, label: t.label })),
            { value: 'Other', label: 'Other (type IANA name)' },
          ]}
          hint="Affects how all dates and times display. Reminder schedules will start respecting this in the next release."
        />
        {tzSelect === 'Other' && (
          <TextField
            label="Custom IANA time zone"
            value={draft.time_zone ?? ''}
            onChange={v => patch({ time_zone: v || null })}
            placeholder="e.g. Europe/London"
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-[rgba(18,18,18,0.06)] pt-3">
          <SelectField
            label="Week starts on"
            value={String(draft.week_start_day ?? 0)}
            onChange={v => patch({ week_start_day: Number(v) })}
            options={[
              { value: '0', label: 'Sunday' },
              { value: '1', label: 'Monday' },
            ]}
            hint="Calendar grid + week-view starting day."
          />
          <SelectField
            label="Time format"
            value={draft.time_format ?? '12h'}
            onChange={v => patch({ time_format: v as '12h' | '24h' })}
            options={[
              { value: '12h', label: '12-hour (1:30 PM)' },
              { value: '24h', label: '24-hour (13:30)' },
            ]}
          />
        </div>
      </section>

      {/* Defaults */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={Calendar} label="Defaults" hint="Speed up common owner workflows." />

        <NumberField
          label="Default appointment duration"
          value={draft.default_appointment_duration_minutes ?? 60}
          onChange={v => patch({ default_appointment_duration_minutes: v })}
          min={5}
          max={600}
          suffix="minutes"
          hint="Used when you create an appointment manually without picking a service."
        />
      </section>

      {/* Communication */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={Mail} label="Communication" hint="Show up consistently across emails and the booking site." />

        <TextAreaField
          label="Post-booking message"
          value={draft.post_booking_message ?? ''}
          onChange={v => patch({ post_booking_message: v })}
          placeholder="Bring your reference photos, and arrive 5 minutes early!"
          hint="Shown to clients on the booking success page and included in their confirmation email."
          rows={3}
        />
        <TextAreaField
          label="Email signature"
          value={draft.email_signature ?? ''}
          onChange={v => patch({ email_signature: v })}
          placeholder="— Anna at Lush Studio"
          hint="Appended to client-facing emails (confirmations, reminders, etc)."
          rows={2}
        />
      </section>

      {/* Site visibility */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle icon={Lock} label="Site visibility" hint="Who can see your booking site." />

        <SelectField
          label="Visibility"
          value={draft.site_visibility ?? 'public'}
          onChange={v => patch({ site_visibility: v as 'public' | 'private' | 'coming_soon' })}
          options={[
            { value: 'public',      label: 'Public (anyone with the link)' },
            { value: 'private',     label: 'Private (password required)' },
            { value: 'coming_soon', label: 'Coming soon (placeholder page)' },
          ]}
        />
        {isPrivate && (
          <div className="space-y-2">
            <TextField
              label="Site password"
              type="text"
              value={pwInput}
              onChange={setPwInput}
              placeholder={draft.site_password_set ? '(already set — leave blank to keep)' : 'Choose a password'}
              hint={draft.site_password_set ? 'Type a new value to change it. Leave blank to keep the existing one.' : 'Anyone with the link will need this to view your site.'}
            />
            {draft.site_password_set && (
              <button
                type="button"
                onClick={clearPassword}
                className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#b42828] hover:underline"
              >
                Clear password
              </button>
            )}
          </div>
        )}
      </section>

      <SaveBar
        dirty={dirty}
        saveState={saveState}
        saveErr={saveErr}
        onSave={save}
      />
    </div>
  )
}

/** Pull off just the preference fields for dirty-checking. */
function stripPrefs(b: BusinessProfile): Partial<BusinessProfile> {
  return {
    time_zone:        b.time_zone ?? null,
    week_start_day:   b.week_start_day ?? 0,
    time_format:      b.time_format ?? '12h',
    default_appointment_duration_minutes: b.default_appointment_duration_minutes ?? 60,
    post_booking_message: b.post_booking_message ?? null,
    email_signature:      b.email_signature ?? null,
    site_visibility:      b.site_visibility ?? 'public',
    site_password_set:    !! b.site_password_set,
  }
}

// ── Integrations Settings panel ─────────────────────────────────────────────

interface IntegrationCard {
  icon:       React.ElementType
  name:       string
  description:string
  status:     'connected' | 'available' | 'coming_soon'
  statusLabel?: string
  action?:    { label: string; href: string; external?: boolean }
}

function IntegrationsSettingsPanel() {
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getStripeConnectStatus()
      .then(r => { if (!cancelled) setStripeStatus(r.stripe_connect_status) })
      .catch(() => { if (!cancelled) setStripeStatus('not_connected') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const stripeConnected = stripeStatus === 'active'
  const stripeOnboarding = stripeStatus && stripeStatus !== 'not_connected' && stripeStatus !== 'active'

  const cards: IntegrationCard[] = [
    {
      icon: CreditCard,
      name: 'Stripe',
      description: 'Accept deposits, full payments, balance charges, tips, and late fees from clients.',
      status: stripeConnected ? 'connected' : (stripeOnboarding ? 'available' : 'available'),
      statusLabel: loading ? 'Checking…' : (stripeConnected ? 'Connected' : (stripeOnboarding ? 'In progress' : 'Not connected')),
      action: {
        label: stripeConnected ? 'Manage in Payment Settings' : 'Set up Stripe',
        href:  '/editor/settings?tab=payments',
      },
    },
    {
      icon: CalendarClock,
      name: 'Google Calendar',
      description: 'Two-way sync your appointments to a Google Calendar so your bookings show up everywhere.',
      status: 'coming_soon',
    },
    {
      icon: MessageSquare,
      name: 'SMS notifications',
      description: 'Send appointment confirmations and reminders via text message (Twilio).',
      status: 'coming_soon',
    },
    {
      icon: Send,
      name: 'Mailchimp',
      description: 'Push your client list to Mailchimp for marketing campaigns and newsletters.',
      status: 'coming_soon',
    },
    {
      icon: Sparkles,
      name: 'Instagram booking link',
      description: 'Auto-update your IG bio link with your latest booking-now URL.',
      status: 'coming_soon',
    },
    {
      icon: Webhook,
      name: 'Webhooks',
      description: 'Get notified at a URL of your choice when bookings, cancellations, or payments happen.',
      status: 'coming_soon',
    },
  ]

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Integrations</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Connect BookReady to the tools you already use. More integrations rolling out soon.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {cards.map(c => (
          <IntegrationCardView key={c.name} card={c} />
        ))}
      </div>
    </div>
  )
}

function IntegrationCardView({ card }: { card: IntegrationCard }) {
  const Icon = card.icon
  const isConnected   = card.status === 'connected'
  const isComingSoon  = card.status === 'coming_soon'

  return (
    <div className={cn(
      'bg-white border p-3.5 flex flex-col gap-3',
      isComingSoon
        ? 'border-[rgba(18,18,18,0.06)]'
        : 'border-[rgba(18,18,18,0.10)]',
    )}>
      <div className="flex items-start gap-3">
        <span className={cn(
          'w-9 h-9 flex items-center justify-center flex-shrink-0 border',
          isConnected
            ? 'bg-[rgba(20,140,80,0.08)] border-[rgba(20,140,80,0.35)] text-[#0f6f3d]'
            : isComingSoon
              ? 'bg-cream border-[rgba(18,18,18,0.08)] text-muted-text'
              : 'bg-cream border-[rgba(18,18,18,0.08)] text-near-black',
        )}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={cn('text-[13px] font-semibold', isComingSoon ? 'text-muted-text' : 'text-near-black')}>
              {card.name}
            </p>
            {card.statusLabel && (
              <span className={cn(
                'text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 border whitespace-nowrap',
                isConnected
                  ? 'bg-white border-[rgba(20,140,80,0.40)] text-[#0f6f3d]'
                  : 'bg-white border-[rgba(180,120,0,0.35)] text-[#8a5a00]',
              )}>
                {card.statusLabel}
              </span>
            )}
            {isComingSoon && (
              <span className="text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 bg-white border border-[rgba(18,18,18,0.15)] text-muted-text">
                Soon
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-text mt-1 leading-snug">{card.description}</p>
        </div>
      </div>
      {card.action && (
        <Link
          href={card.action.href}
          className="self-start text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.20)] bg-white px-3 py-1.5 hover:border-near-black transition-colors"
        >
          {card.action.label} →
        </Link>
      )}
    </div>
  )
}

// ── Shared sub-components for the new panels ────────────────────────────────

function SectionTitle({
  icon: Icon, label, hint,
}: {
  icon: React.ElementType
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start gap-2 border-b border-[rgba(18,18,18,0.06)] pb-2.5 mb-1">
      <Icon size={14} className="text-near-black mt-0.5 flex-shrink-0" strokeWidth={1.8} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-near-black">{label}</p>
        {hint && <p className="text-[11px] text-muted-text mt-0.5">{hint}</p>}
      </div>
    </div>
  )
}

function TextField({
  label, value, onChange, placeholder, hint, type = 'text', icon: Icon,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  placeholder?: string
  hint?:    string
  type?:    'text' | 'email' | 'tel' | 'url'
  icon?:    React.ElementType
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <div className="mt-1.5 flex items-center border border-[rgba(18,18,18,0.15)] bg-white focus-within:border-near-black">
        {Icon && (
          <span className="pl-2.5 pr-1 text-muted-text flex-shrink-0">
            <Icon size={13} strokeWidth={1.8} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm text-near-black bg-transparent placeholder:text-[#c4bcb6] focus:outline-none"
        />
      </div>
      {hint && <p className="text-[10px] text-muted-text mt-1">{hint}</p>}
    </label>
  )
}

function TextAreaField({
  label, value, onChange, placeholder, hint, rows = 3,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  placeholder?: string
  hint?:    string
  rows?:    number
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full mt-1.5 px-3 py-2 text-sm text-near-black bg-white border border-[rgba(18,18,18,0.15)] placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black resize-y leading-relaxed"
      />
      {hint && <p className="text-[10px] text-muted-text mt-1">{hint}</p>}
    </label>
  )
}

/**
 * Sticky save bar that mirrors the inline one used inside PaymentSettingsPanel
 * so all panels feel the same. Extracted as its own component because the
 * new panels (business/policies) each render it identically.
 */
function SaveBar({
  dirty, saveState, saveErr, onSave,
}: {
  dirty:     boolean
  saveState: SaveState
  saveErr:   string | null
  onSave:    () => void
}) {
  return (
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
        onClick={onSave}
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
  )
}

// ── Danger Zone panel ───────────────────────────────────────────────────────

function DangerSettingsPanel() {
  // We pull the booking-enabled state for the "pause bookings" status card
  // — but the actual edit lives in Booking Settings to keep state in one place.
  const [bookingSettings, setBookingSettings] = useState<BookingSettings | null>(null)
  const [loading,         setLoading]         = useState(true)
  const [exportBusy,      setExportBusy]      = useState<null | 'appointments' | 'customers'>(null)
  const [exportErr,       setExportErr]       = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  useEffect(() => {
    let cancelled = false
    getEditorBookingSettings()
      .then(d => { if (!cancelled) setBookingSettings(d) })
      .catch(() => { /* non-fatal — we still render the rest */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function handleExport(type: 'appointments' | 'customers') {
    setExportBusy(type); setExportErr(null)
    try {
      const { blob, filename } = await downloadEditorExport(type)
      const url = URL.createObjectURL(blob)
      const a   = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      setExportErr(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExportBusy(null)
    }
  }

  const bookingsPaused = bookingSettings && bookingSettings.booking_enabled === false

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Danger Zone</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Destructive and archival actions. Read carefully &mdash; these affect real client data and money.
        </p>
      </header>

      {/* Pause bookings (read-only status with deep-link to source) */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className={cn(
              'w-9 h-9 flex items-center justify-center border flex-shrink-0',
              bookingsPaused
                ? 'bg-[rgba(180,120,0,0.08)] border-[rgba(180,120,0,0.35)] text-[#8a5a00]'
                : 'bg-cream border-[rgba(18,18,18,0.08)] text-near-black',
            )}>
              <Calendar size={15} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-near-black">Pause bookings</p>
              <p className="text-[11px] text-muted-text mt-0.5">
                {loading
                  ? 'Checking status…'
                  : bookingsPaused
                    ? 'Bookings are paused. Your site shows an unavailable message; existing appointments are untouched.'
                    : 'Bookings are accepting new clients. Pause to temporarily stop accepting bookings without deleting anything.'}
              </p>
            </div>
          </div>
          <Link
            href={hrefFor('booking')}
            className="text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.20)] bg-white px-3 py-1.5 hover:border-near-black transition-colors flex-shrink-0"
          >
            {bookingsPaused ? 'Manage' : 'Pause →'}
          </Link>
        </div>
      </section>

      {/* Export data */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-3">
        <SectionTitle
          icon={Download}
          label="Export your data"
          hint="Download a CSV copy of your bookings and clients. Useful for backups, accounting, or moving off BookReady."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExportCard
            label="Appointments"
            description="Every appointment with status, customer, payment, and timestamps."
            busy={exportBusy === 'appointments'}
            onClick={() => handleExport('appointments')}
          />
          <ExportCard
            label="Customers"
            description="Your client list with name, email, phone, and notes."
            busy={exportBusy === 'customers'}
            onClick={() => handleExport('customers')}
          />
        </div>
        {exportErr && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={12} /> {exportErr}
          </div>
        )}
      </section>

      {/* Delete account */}
      <section className="bg-white border border-[rgba(180,40,40,0.30)] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-9 h-9 flex items-center justify-center border bg-[rgba(180,40,40,0.06)] border-[rgba(180,40,40,0.30)] text-[#b42828] flex-shrink-0">
              <Trash2 size={15} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#b42828]">Delete BookReady account</p>
              <p className="text-[11px] text-muted-text mt-0.5 leading-snug">
                Permanently deletes your booking site, every appointment, your customer list, and your owner login. Stripe transaction history is preserved in Stripe.
                This cannot be undone &mdash; export your data first.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="text-[11px] font-bold tracking-[0.08em] uppercase border border-[rgba(180,40,40,0.45)] bg-white text-[#b42828] px-3 py-1.5 hover:bg-[rgba(180,40,40,0.05)] transition-colors flex-shrink-0"
          >
            Delete account
          </button>
        </div>
      </section>

      {showDeleteModal && (
        <DeleteAccountDialog onClose={() => setShowDeleteModal(false)} />
      )}
    </div>
  )
}

function ExportCard({
  label, description, busy, onClick,
}: {
  label: string
  description: string
  busy: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        'text-left bg-cream border border-[rgba(18,18,18,0.10)] p-3 flex items-start gap-3 transition-colors',
        busy ? 'opacity-60 cursor-wait' : 'hover:border-near-black',
      )}
    >
      <span className="w-7 h-7 flex items-center justify-center bg-white border border-[rgba(18,18,18,0.10)] text-near-black flex-shrink-0">
        {busy
          ? <Loader2 size={12} className="animate-spin" />
          : <Download size={12} strokeWidth={1.8} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-near-black">{label}</p>
        <p className="text-[10.5px] text-muted-text mt-0.5 leading-snug">{description}</p>
      </div>
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text flex-shrink-0 self-center">
        {busy ? 'Exporting…' : 'CSV ↓'}
      </span>
    </button>
  )
}

/**
 * Multi-step "type your slug + password" deletion dialog. Reads the tenant
 * slug from localStorage (where setTenantId() stored it at login). On
 * success: clears local auth, redirects to /login with a deleted=1 flag.
 */
function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [slug, setSlug]         = useState<string | null>(null)
  const [typedSlug, setTyped]   = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy]         = useState(false)
  const [err,  setErr]          = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSlug(localStorage.getItem('br_tenant_id'))
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose() }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose, busy])

  const slugMatches = slug !== null && typedSlug === slug
  const canSubmit   = slugMatches && password.length > 0 && !busy

  async function handleDelete() {
    if (!canSubmit || !slug) return
    setBusy(true); setErr(null)
    try {
      await deleteEditorAccount({ password, confirm_slug: slug })
      clearAuth()
      router.push('/login?deleted=1')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-near-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => { if (!busy) onClose() }}
    >
      <div
        className="w-full sm:max-w-[460px] bg-white border-t sm:border border-[rgba(180,40,40,0.30)] flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(180,40,40,0.20)]">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#b42828] mb-1">
              Permanent deletion
            </p>
            <h2 className="text-base font-bold text-near-black tracking-tight">
              Delete your BookReady account
            </h2>
          </div>
          <button
            type="button"
            onClick={() => { if (!busy) onClose() }}
            disabled={busy}
            className="p-1.5 hover:bg-[rgba(18,18,18,0.05)] transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-[#fff3f3] border border-[rgba(180,40,40,0.30)] px-3.5 py-3 text-[12px] leading-relaxed text-[#7a1f1f]">
            <p className="font-semibold mb-1.5">This will permanently:</p>
            <ul className="list-disc list-outside pl-4 space-y-0.5">
              <li>Cancel your BookReady subscription &mdash; no more charges</li>
              <li>Delete your booking site at <span className="font-mono text-[11px]">{slug ?? '…'}.bkrdy.me</span></li>
              <li>Delete all appointments, customers, services, staff, and gallery items</li>
              <li>Delete your owner login and every active session</li>
              <li>Disconnect your Stripe Connect link (Stripe history + balance stays in Stripe)</li>
            </ul>
            <p className="mt-2 font-semibold">There is no undo. Export your data first if you need it.</p>
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
              Type your workspace slug to confirm
            </label>
            <input
              type="text"
              value={typedSlug}
              onChange={e => setTyped(e.target.value)}
              placeholder={slug ?? 'yourslug'}
              autoComplete="off"
              className="w-full bg-white border border-[rgba(18,18,18,0.20)] px-3 py-2.5 text-sm text-near-black font-mono placeholder:text-[#c4bcb6] focus:outline-none focus:border-[#b42828] transition-colors"
            />
            {typedSlug && slug && !slugMatches && (
              <p className="text-[11px] text-[#b42828] mt-1">
                Doesn&rsquo;t match. Type <span className="font-mono">{slug}</span> exactly.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
              Your current password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full bg-white border border-[rgba(18,18,18,0.20)] px-3 py-2.5 text-sm text-near-black focus:outline-none focus:border-[#b42828] transition-colors"
            />
          </div>

          {err && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={12} /> {err}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-5 border-t border-[rgba(180,40,40,0.20)]">
          <button
            type="button"
            onClick={() => { if (!busy) onClose() }}
            disabled={busy}
            className="flex-1 border border-[rgba(18,18,18,0.20)] bg-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 text-near-black hover:border-near-black transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className="flex-1 bg-[#b42828] text-white text-[11px] font-bold tracking-[0.18em] uppercase py-3 hover:bg-[#8a1d1d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Deleting…' : 'Delete forever'}
          </button>
        </div>
      </div>
    </div>
  )
}
