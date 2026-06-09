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
import { useConfirm } from '@/components/ui/ConfirmDialog'
import Switch from '@/components/ui/Toggle'
import {
  Building2, Calendar, CalendarClock, CreditCard, Bell, UserCircle,
  Plug, ChevronRight, ChevronDown, Loader2, Check, AlertCircle,
  DollarSign, Download, Instagram, Mail, MapPin, MessageSquare, Phone,
  Percent, Lock, ExternalLink, RefreshCw, ShieldCheck, Send, Webhook,
  X,
} from 'lucide-react'
import {
  getEditorPaymentSettings,
  updateEditorPaymentSettings,
  getEditorBookingSettings,
  updateEditorBookingSettings,
  getEditorNotificationSettings,
  updateEditorNotificationSettings,
  sendNotificationTestEmail,
  getEditorAccount,
  updateEditorAccount,
  changeEditorPassword,
  signOutEverywhere,
  getEditorBusiness,
  updateEditorBusiness,
  getEditorPolicies,
  updateEditorPolicies,
  downloadEditorExport,
} from '@/lib/api'
import type {
  AccountProfile,
  BookingSettings,
  BookingSettingsPayload,
  BusinessPolicy,
  BusinessProfile,
  DepositType,
  NotificationSettings,
  NotificationSettingsPayload,
  EmailTemplateKey,
  EmailTemplateOverride,
  PaymentSettings,
  PaymentSettingsPayload,
  SlotReleaseMode,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import BillingHub from '@/components/editor/BillingHub'

// ── Sub-tab plumbing ─────────────────────────────────────────────────────────

type SettingsTab =
  | 'overview' | 'business' | 'booking' | 'payments'
  | 'notifications' | 'account' | 'subscription'

const VALID_TABS: SettingsTab[] = [
  'overview', 'business', 'booking', 'payments',
  'notifications', 'account', 'subscription',
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
  { tab: 'business',      label: 'Business Profile',   hint: 'Name, contact, address, socials, time & format', icon: Building2,    status: 'ready' },
  { tab: 'booking',       label: 'Booking Settings',   hint: 'Booking window, notice, auto-confirm, rules',    icon: Calendar,     status: 'ready' },
  { tab: 'payments',      label: 'Payment Settings',   hint: 'Customer payments, deposits, currency',          icon: CreditCard,   status: 'ready' },
  { tab: 'notifications', label: 'Notifications',      hint: 'Toggle booking emails, reply address, sent-from name', icon: Bell,         status: 'ready' },
  { tab: 'account',       label: 'Account',            hint: 'Owner profile, password, sign-out everywhere',   icon: UserCircle,   status: 'ready' },
  { tab: 'subscription',  label: 'Subscription & Plan', hint: 'Plan, billing cycle, card on file, delete account', icon: CreditCard,   status: 'ready' },
]

function hrefFor(tab: SettingsTab): string {
  return tab === 'overview' ? '/editor/settings' : `/editor/settings?tab=${tab}`
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function SettingsHub() {
  const router = useRouter()
  const sp     = useSearchParams()
  const raw    = sp?.get('tab') ?? 'overview'
  const tab: SettingsTab = VALID_TABS.includes(raw as SettingsTab)
    ? (raw as SettingsTab)
    : 'overview'

  // Bookmark continuity: the old Integrations sub-tab moved to a
  // dedicated /editor/integrations page. Redirect anyone landing here
  // with ?tab=integrations so old links keep working.
  useEffect(() => {
    if (raw === 'integrations') {
      router.replace('/editor/integrations')
    }
  }, [raw, router])

  useScrollResetOnTab(tab)

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-4">
      {tab === 'overview'      && <OverviewPanel />}
      {tab === 'business'      && <BusinessSettingsPanel />}
      {tab === 'payments'      && <PaymentSettingsPanel />}
      {tab === 'booking'       && <BookingSettingsPanel />}
      {tab === 'notifications' && <NotificationSettingsPanel />}
      {tab === 'account'       && <AccountSettingsPanel />}
      {tab === 'subscription'  && <SubscriptionPanel />}
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
                  : 'border-hairline-soft hover:border-near-black',
              )}
            >
              <span
                className={cn(
                  'w-8 h-8 flex items-center justify-center flex-shrink-0 border',
                  isDanger
                    ? 'bg-[rgba(180,40,40,0.06)] border-[rgba(180,40,40,0.20)] text-danger'
                    : 'bg-cream border-hairline-soft text-near-black',
                )}
              >
                <Icon size={14} strokeWidth={1.8} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className={cn(
                    'text-sm font-semibold',
                    isDanger ? 'text-danger' : 'text-near-black',
                  )}>{g.label}</p>
                  {g.status === 'soon' && (
                    <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-cream text-muted-text px-1.5 py-0.5">
                      Soon
                    </span>
                  )}
                </div>
                <p className="text-2xs text-muted-text mt-0.5">{g.hint}</p>
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
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>
      <div className="bg-white border border-hairline-soft p-6 flex items-start gap-4">
        <span className="w-10 h-10 flex items-center justify-center bg-cream border border-hairline-soft text-near-black flex-shrink-0">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-near-black">{group?.label ?? 'Settings'}</h2>
          <p className="text-xs text-muted-text mt-1">{group?.hint}</p>
          <p className="text-2xs text-muted-text mt-3">
            This section isn&apos;t live yet. Check back soon.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Payment Settings panel ───────────────────────────────────────────────────

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function PaymentSettingsPanel() {
  const [data,    setData]    = useState<PaymentSettings | null>(null)
  const [draft,   setDraft]   = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorPaymentSettings()
      .then(d => { if (!cancelled) { setData(d); setDraft(d) } })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

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
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
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
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Payment Settings</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Decide whether customers pay a deposit when they book, and choose how much.
        </p>
      </header>

      {/* Stripe setup lives in Integrations now — nudge them there if not live. */}
      {! draft.stripe_charges_enabled && (
        <div className="bg-cream border border-hairline-soft p-3 flex items-start gap-2 text-2xs text-muted-text">
          <CreditCard size={13} className="text-near-black mt-0.5 flex-shrink-0" />
          <span>
            Connect Stripe to start accepting payments —{' '}
            <Link href="/editor/integrations" className="font-semibold text-near-black hover:underline">
              set it up in Integrations
            </Link>.
          </span>
        </div>
      )}

      {/* Master toggle */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-2">
        <Toggle
          label="Enable customer payments"
          hint="Turn this off and customers book without paying."
          on={draft.payments_enabled}
          onToggle={() => patch({ payments_enabled: !draft.payments_enabled })}
        />
        {draft.payments_enabled && draft.stripe_connect_status !== 'active' && (
          <p className="text-2xs text-warning inline-flex items-start gap-1.5 mt-1">
            <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
            Finish your Stripe setup above so customers can actually pay.
            Until then, bookings that require payment will be blocked.
          </p>
        )}
      </section>

      {/* Deposit */}
      <section className={cn(
        'bg-white border p-3.5 space-y-3 transition-opacity',
        paymentsOff
          ? 'border-hairline-soft opacity-60'
          : 'border-hairline-soft',
      )}>
        <Toggle
          label="Require a deposit"
          hint={paymentsOff ? 'Turn on customer payments first to use deposits.' : 'Ask for an upfront amount when a customer books.'}
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
                    ? 'border-hairline-soft bg-cream cursor-not-allowed'
                    : 'border-hairline-strong focus:border-near-black',
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
                ? 'border-hairline-soft bg-cream'
                : 'border-hairline-strong focus-within:border-near-black bg-white',
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
          ? 'border-hairline-soft opacity-60'
          : 'border-hairline-soft',
      )}>
        <Toggle
          label="Allow full payment up front"
          hint="Let customers pay the entire service price at booking time."
          icon={Check}
          on={draft.allow_full_payment && !paymentsOff}
          onToggle={() => patch({ allow_full_payment: !draft.allow_full_payment })}
          disabled={paymentsOff}
        />

        <Toggle
          label="Buy Now, Pay Later (Klarna, Afterpay, Affirm)"
          hint="Show Buy Now, Pay Later options next to the card field at checkout. Stripe decides eligibility based on the customer's region and amount."
          icon={Check}
          on={(draft.allow_split_pay ?? false) && !paymentsOff}
          onToggle={() => patch({ allow_split_pay: !(draft.allow_split_pay ?? false) })}
          disabled={paymentsOff}
        />

        <Toggle
          label="Collect sales tax"
          hint="Adds sales tax to every payment. You also need to turn on Tax inside your Stripe dashboard."
          icon={Check}
          on={(draft.collect_tax ?? false) && !paymentsOff}
          onToggle={() => patch({ collect_tax: !(draft.collect_tax ?? false) })}
          disabled={paymentsOff}
        />

        <Toggle
          label="Save cards for repeat customers"
          hint="Returning customers see their saved card at checkout. This also unlocks no-show and late-cancel fees below. Card-only, so Buy Now, Pay Later is turned off for that session."
          icon={Check}
          on={(draft.save_cards_for_reuse ?? false) && !paymentsOff}
          onToggle={() => patch({ save_cards_for_reuse: !(draft.save_cards_for_reuse ?? false) })}
          disabled={paymentsOff}
        />

        {/* Late-fee config (only meaningful when save_cards_for_reuse is on) */}
        <div className={cn(
          'border-t border-hairline-soft pt-3 space-y-3',
          (!draft.save_cards_for_reuse || paymentsOff) && 'opacity-60',
        )}>
          <div>
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1">Late fees</p>
            <p className="text-2xs text-muted-text">
              {draft.save_cards_for_reuse
                ? 'Manually charge the saved card when a customer no-shows or cancels too late.'
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
          <div className="flex items-center gap-2 text-2xs text-muted-text">
            <span>Cancellation is &ldquo;late&rdquo; within</span>
            <input
              type="number"
              min={0}
              max={336}
              value={draft.late_cancel_window_hours ?? 24}
              onChange={e => patch({ late_cancel_window_hours: Math.max(0, Math.min(336, parseInt(e.target.value, 10) || 0)) })}
              disabled={!draft.save_cards_for_reuse || paymentsOff}
              className="w-16 bg-white border border-hairline-strong px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black transition-colors disabled:opacity-50"
            />
            <span>hours of the appointment.</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-hairline-soft pt-3">
          <div>
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Currency</p>
            <p className="text-2xs text-muted-text mt-0.5">Multi-currency support is coming soon.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-near-black border border-hairline-strong bg-cream px-3 py-1.5">
            {draft.currency}
          </span>
        </div>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-hairline-soft pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-2xs text-muted-text">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-near-black">
              <Check size={12} /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-danger">
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
            'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty
              ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
              : 'bg-cream text-muted-text border border-hairline-soft cursor-not-allowed',
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

// Subset of BusinessPolicy that we edit inline on the Booking Settings panel.
// The display-copy fields (cancellation_policy, etc.) live in Website → Policies.
interface PolicyEnforcement {
  require_policy_agreement:       boolean
  forfeit_deposit_on_late_cancel: boolean
  max_reschedules_per_booking:    number | null
  late_grace_period_minutes:      number
}

function normalizeEnforcement(p: BusinessPolicy): PolicyEnforcement {
  return {
    require_policy_agreement:       !! p.require_policy_agreement,
    forfeit_deposit_on_late_cancel: !! p.forfeit_deposit_on_late_cancel,
    max_reschedules_per_booking:    p.max_reschedules_per_booking ?? null,
    late_grace_period_minutes:      p.late_grace_period_minutes   ?? 0,
  }
}

function BookingSettingsPanel() {
  const [data,    setData]    = useState<BookingSettings | null>(null)
  const [draft,   setDraft]   = useState<BookingSettings | null>(null)
  // Enforcement rules live on business_policies — same panel, dual save.
  const [policyData,  setPolicyData]  = useState<PolicyEnforcement | null>(null)
  const [policyDraft, setPolicyDraft] = useState<PolicyEnforcement | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorBookingSettings(),
      getEditorPolicies().catch(() => null),
    ])
      .then(([bs, pol]) => {
        if (cancelled) return
        setData(bs); setDraft(bs)
        if (pol) {
          const norm = normalizeEnforcement(pol)
          setPolicyData(norm); setPolicyDraft(norm)
        }
      })
      .catch(e => { if (!cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(() => {
    if (!data || !draft) return false
    const bookingDirty = JSON.stringify(stripMeta(data)) !== JSON.stringify(stripMeta(draft))
    const policyDirty  = policyData && policyDraft
      ? JSON.stringify(policyData) !== JSON.stringify(policyDraft)
      : false
    return bookingDirty || policyDirty
  }, [data, draft, policyData, policyDraft])

  function patch(p: Partial<BookingSettings>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle')
    setSaveErr(null)
  }
  function patchPolicy(p: Partial<PolicyEnforcement>) {
    setPolicyDraft(d => d ? { ...d, ...p } : d)
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
        // minimum_notice_minutes + max_days_ahead intentionally NOT sent.
        // Availability > Date Drops is the single writer for those fields
        // (same single-source-of-truth treatment as slot_release_*).
        slot_interval_minutes:             draft.slot_interval_minutes,
        // slot_release_mode + slot_release_window_days intentionally NOT sent.
        // Availability > Date Drops is the single writer for those columns
        // post Availability 2.0. Sending them here would race a concurrent
        // Date Drops edit and revert it.
        cancellation_window_hours:         draft.cancellation_window_hours,
        reschedule_window_hours:           draft.reschedule_window_hours,
        prevent_duplicate_client_bookings: draft.prevent_duplicate_client_bookings,
        max_appointments_per_customer_per_day: draft.max_appointments_per_customer_per_day,
      }
      const next = await updateEditorBookingSettings(payload)
      setData(next)
      setDraft(next)

      // Persist enforcement fields too. Best-effort: a partial save success on
      // booking settings shouldn't get rolled back if the policy patch fails,
      // but we do surface the error.
      if (policyDraft) {
        const polNext = await updateEditorPolicies({
          require_policy_agreement:       policyDraft.require_policy_agreement,
          forfeit_deposit_on_late_cancel: policyDraft.forfeit_deposit_on_late_cancel,
          max_reschedules_per_booking:    policyDraft.max_reschedules_per_booking,
          late_grace_period_minutes:      policyDraft.late_grace_period_minutes,
        })
        const norm = normalizeEnforcement(polNext)
        setPolicyData(norm); setPolicyDraft(norm)
      }

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
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load booking settings'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Booking Settings</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Business-wide rules for how customers book with you.
        </p>
      </header>

      {/* Booking enabled — kept at the top of the page */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-2">
        <Toggle
          label="Booking enabled"
          hint="When this is off, your public site shows a friendly unavailable message and no new bookings can come in."
          on={draft.booking_enabled}
          onToggle={() => patch({ booking_enabled: !draft.booking_enabled })}
        />
      </section>

      {/* Default appointment duration (moved from the old Preferences tab). */}
      <PrefsCard section="duration" />

      {/* Confirmation + duplicate guard */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <Toggle
          label="Auto-confirm bookings"
          hint="Newly booked appointments are marked confirmed immediately (or right after the deposit clears) instead of pending review."
          on={draft.auto_confirm_bookings}
          onToggle={() => patch({ auto_confirm_bookings: !draft.auto_confirm_bookings })}
        />
        <div className="border-t border-hairline-soft pt-3">
          <Toggle
            label="Prevent duplicate customer bookings"
            hint="Reject a booking when the same customer (by email or phone) already holds the same service at the same time."
            on={draft.prevent_duplicate_client_bookings}
            onToggle={() => patch({ prevent_duplicate_client_bookings: !draft.prevent_duplicate_client_bookings })}
          />
        </div>
        <div className="border-t border-hairline-soft pt-3">
          <NumberField
            label="Max bookings per customer per day"
            suffix={draft.max_appointments_per_customer_per_day === 1 ? 'booking' : 'bookings'}
            min={1}
            max={20}
            value={draft.max_appointments_per_customer_per_day ?? 1}
            onChange={v => patch({ max_appointments_per_customer_per_day: v })}
            hint="How many appointments a single customer can hold on the same day. 1 is the typical default; raise it if your customers commonly book back-to-back services."
          />
        </div>
      </section>

      {/* Booking spacing — slot interval lives here because it's a global
          appointment-rhythm setting, not a release-window thing. Minimum
          notice + max days ahead moved to Availability > Date Drops where
          owners think about them alongside release cadence. */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <SelectField
          label="Time between appointment start times"
          value={String(draft.slot_interval_minutes)}
          onChange={v => patch({ slot_interval_minutes: Number(v) })}
          options={SLOT_INTERVALS.map(n => ({ value: String(n), label: `${n} minutes` }))}
          hint="Spacing between available start times."
        />
        <div className="border-t border-hairline-soft pt-3">
          <p className="text-eyebrow tracking-eyebrow uppercase font-bold text-muted-text mb-1">
            Booking window and release schedule
          </p>
          <p className="text-[13px] text-muted-text leading-snug">
            Minimum notice, max days ahead, and how new dates open for booking now live in{' '}
            <Link href="/editor/availability?tab=drops" className="text-near-black font-semibold underline underline-offset-2 decoration-hairline hover:decoration-near-black">
              Availability &rsaquo; Date Drops
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Cancellation / reschedule */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumberField
            label="Cancellation window"
            suffix="hours"
            min={0}
            max={720}
            value={draft.cancellation_window_hours}
            onChange={v => patch({ cancellation_window_hours: v })}
            hint="Minimum notice required for customers to cancel."
          />
          <NumberField
            label="Reschedule window"
            suffix="hours"
            min={0}
            max={720}
            value={draft.reschedule_window_hours}
            onChange={v => patch({ reschedule_window_hours: v })}
            hint="Minimum notice required for customers to reschedule."
          />
        </div>
      </section>

      {/* Enforcement rules — moved from the old Policies tab. These are the
          knobs BookReady acts on automatically; the public-facing copy lives
          in Website → Policies. */}
      {policyDraft && (
        <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
          <SectionTitle icon={ShieldCheck} label="Enforcement rules" hint="Real rules. BookReady enforces these automatically." />

          <Toggle
            label="Require customers to agree to your policies"
            hint="Adds a checkbox to the booking form. Bookings are rejected without it."
            on={policyDraft.require_policy_agreement}
            onToggle={() => patchPolicy({ require_policy_agreement: !policyDraft.require_policy_agreement })}
          />

          <div className="border-t border-hairline-soft pt-3">
            <Toggle
              label="Forfeit deposit on late cancellation"
              hint="When a customer cancels within the cancellation window, their deposit becomes non-refundable. You can still refund manually."
              on={policyDraft.forfeit_deposit_on_late_cancel}
              onToggle={() => patchPolicy({ forfeit_deposit_on_late_cancel: !policyDraft.forfeit_deposit_on_late_cancel })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline-soft pt-3">
            <NumberField
              label="Max reschedules per booking"
              value={policyDraft.max_reschedules_per_booking ?? 0}
              onChange={v => patchPolicy({ max_reschedules_per_booking: v <= 0 ? null : v })}
              min={0}
              max={50}
              suffix="0 = unlimited"
              hint="Cap how many times a customer can reschedule a single appointment via the manage link."
            />
            <NumberField
              label="Late grace period"
              value={policyDraft.late_grace_period_minutes}
              onChange={v => patchPolicy({ late_grace_period_minutes: v })}
              min={0}
              max={240}
              suffix="minutes"
              hint="How many minutes past the start time a customer is still considered on time."
            />
          </div>
        </section>
      )}

      {/* Save bar */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-hairline-soft pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-2xs text-muted-text">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-near-black">
              <Check size={12} /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-danger">
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
            'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty
              ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
              : 'bg-cream text-muted-text border border-hairline-soft cursor-not-allowed',
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
        email_templates:                     draft.email_templates ?? {},
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
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load notification settings'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Notifications</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Choose which emails your business and your customers receive when a booking happens.
        </p>
      </header>

      {/* Communication copy (moved from the old Preferences tab). */}
      <PrefsCard section="communication" />

      {/* Booking emails */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Booking emails</p>
        <Toggle
          label="Owner: new booking request"
          hint="Notify you when a customer submits a booking request or pays a deposit."
          on={draft.owner_booking_email_enabled}
          onToggle={() => patch({ owner_booking_email_enabled: !draft.owner_booking_email_enabled })}
        />
        <div className="border-t border-hairline-soft pt-3">
          <Toggle
            label="Customer: request received"
            hint="Send a receipt to the customer when their booking request comes in."
            on={draft.client_booking_email_enabled}
            onToggle={() => patch({ client_booking_email_enabled: !draft.client_booking_email_enabled })}
          />
        </div>
        <div className="border-t border-hairline-soft pt-3">
          <Toggle
            label="Customer: appointment confirmed"
            hint="Send when you confirm an appointment."
            on={draft.appointment_confirmed_email_enabled}
            onToggle={() => patch({ appointment_confirmed_email_enabled: !draft.appointment_confirmed_email_enabled })}
          />
        </div>
        <div className="border-t border-hairline-soft pt-3">
          <Toggle
            label="Customer: appointment cancelled"
            hint="Send when an appointment is cancelled."
            on={draft.appointment_cancelled_email_enabled}
            onToggle={() => patch({ appointment_cancelled_email_enabled: !draft.appointment_cancelled_email_enabled })}
          />
        </div>
      </section>

      {/* Reminder */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Reminders</p>
        <Toggle
          label="Send appointment reminders"
          hint="Email each customer a set number of hours before their appointment."
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

      {/* Email content (per-template overrides) */}
      <EmailContentEditor
        draft={draft}
        onChange={(key, override) => {
          const next = { ...(draft.email_templates ?? {}) }
          next[key] = override
          patch({ email_templates: next })
        }}
      />

      {/* Reply-to + sender name */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">How your emails appear</p>

        {/* Phase 17 — show what FROM address Resend will actually use, since
            owners often want to verify it matches their domain. */}
        <div className="bg-cream/60 border border-hairline-soft p-2.5">
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Sent-from address</p>
          <p className="text-xs text-near-black mt-0.5 font-mono break-all">
            {(draft.effective_from_name || 'BookReady')} &lt;{draft.effective_from_address || 'Not set'}&gt;
          </p>
          <p className="text-eyebrow text-muted-text mt-1.5">
            This is the address customers see in their inbox. The reply address and sent-from name below customize it.
          </p>
        </div>

        <label className="block">
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Reply address</span>
          <input
            type="email"
            value={draft.reply_to_email ?? ''}
            onChange={e => patch({ reply_to_email: e.target.value || null })}
            placeholder="hello@yourbusiness.com"
            className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            maxLength={255}
          />
          <p className="text-eyebrow text-muted-text mt-1">
            Replies from customers land here. Leave blank to use the owner email on file.
          </p>
        </label>
        <label className="block">
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Sent-from name</span>
          <input
            type="text"
            value={draft.sender_name ?? ''}
            onChange={e => patch({ sender_name: e.target.value || null })}
            placeholder="Your business name"
            className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            maxLength={120}
          />
          <p className="text-eyebrow text-muted-text mt-1">
            Shown as the sent-from name on emails. Defaults to BookReady when blank.
          </p>
        </label>
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-hairline-soft pt-3 pb-2 flex items-center justify-between gap-3">
        <div className="text-2xs text-muted-text">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1 text-near-black">
              <Check size={12} /> Saved
            </span>
          )}
          {saveState === 'error' && (
            <span className="inline-flex items-center gap-1 text-danger">
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
            'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty
              ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
              : 'bg-cream text-muted-text border border-hairline-soft cursor-not-allowed',
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
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <div className="mt-1.5 flex items-center border border-hairline-strong bg-white focus-within:border-near-black">
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
        {suffix && <span className="px-2 text-2xs text-muted-text">{suffix}</span>}
      </div>
      {hint && <p className="text-eyebrow text-muted-text mt-1">{hint}</p>}
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
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-white border border-hairline-strong px-3 py-2 pr-8 text-sm text-near-black focus:outline-none focus:border-near-black"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronRight
          size={12}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-muted-text pointer-events-none"
        />
      </div>
      {hint && <p className="text-eyebrow text-muted-text mt-1">{hint}</p>}
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
  const confirm = useConfirm()

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
    const ok = await confirm({ title: 'Sign out everywhere?', message: 'Every other device signed in to this account will be signed out.', confirmLabel: 'Sign out', tone: 'danger' })
    if (! ok) return
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
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load account'}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
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
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Profile</p>
        <label className="block">
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Name</span>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          />
        </label>
        <label className="block">
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            maxLength={255}
            className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          />
          <p className="text-eyebrow text-muted-text mt-1">
            Used for signing in and as the default reply address for booking emails.
          </p>
        </label>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-hairline-soft">
          <div className="text-2xs text-muted-text">
            {profSave === 'saved' && (
              <span className="inline-flex items-center gap-1 text-near-black">
                <Check size={12} /> Saved
              </span>
            )}
            {profSave === 'error' && (
              <span className="inline-flex items-center gap-1 text-danger">
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
              'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
              profileDirty
                ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
                : 'bg-cream text-muted-text border border-hairline-soft cursor-not-allowed',
            )}
          >
            {profSave === 'saving'
              ? <><Loader2 size={11} className="animate-spin" /> Saving</>
              : <><Check size={12} /> Save changes</>}
          </button>
        </div>
      </section>

      {/* Password */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Change password</p>
        <label className="block">
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Current password</span>
          <input
            type="password"
            value={currentPw}
            onChange={e => setCurrentPw(e.target.value)}
            autoComplete="current-password"
            className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">New password</span>
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
            <p className="text-eyebrow text-muted-text mt-1">At least 8 characters.</p>
          </label>
          <label className="block">
            <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Confirm new password</span>
            <input
              type="password"
              value={newPw2}
              onChange={e => setNewPw2(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
            {newPw && newPw2 && newPw !== newPw2 && (
              <p className="text-eyebrow text-danger mt-1">Passwords don&rsquo;t match.</p>
            )}
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-hairline-soft">
          <div className="text-2xs text-muted-text">
            {pwSave === 'saved' && (
              <span className="inline-flex items-center gap-1 text-near-black">
                <Check size={12} /> Password updated
              </span>
            )}
            {pwSave === 'error' && (
              <span className="inline-flex items-center gap-1 text-danger">
                <AlertCircle size={12} /> {pwErr ?? 'Password change failed'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={changePw}
            disabled={! pwReady || pwSave === 'saving'}
            className={cn(
              'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
              pwReady
                ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
                : 'bg-cream text-muted-text border border-hairline-soft cursor-not-allowed',
            )}
          >
            {pwSave === 'saving'
              ? <><Loader2 size={11} className="animate-spin" /> Updating</>
              : <><Lock size={12} /> Update password</>}
          </button>
        </div>
      </section>

      {/* Security — sign out everywhere */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Security</p>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-near-black">Sign out everywhere else</p>
            <p className="text-2xs text-muted-text mt-0.5">
              Ends every active session for your account except this device.
              Useful if you logged in somewhere you shouldn&rsquo;t still be signed in.
            </p>
            {signoutMsg && (
              <p className="text-2xs text-success mt-2 inline-flex items-center gap-1">
                <Check size={11} /> {signoutMsg}
              </p>
            )}
            {signoutErr && (
              <p className="text-2xs text-danger mt-2 inline-flex items-center gap-1">
                <AlertCircle size={11} /> {signoutErr}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end pt-1 border-t border-hairline-soft">
          <button
            type="button"
            onClick={handleSignOutEverywhere}
            disabled={signoutBusy}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-60"
          >
            {signoutBusy
              ? <><Loader2 size={11} className="animate-spin" /> Signing out</>
              : 'Sign out everywhere'}
          </button>
        </div>
      </section>

      <ExportDataCard />
    </div>
  )
}

// ── Tiny shared bits ────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
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
      <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1">{label}</label>
      <div className={cn(
        'flex items-center border border-hairline-strong focus-within:border-near-black',
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
        <span className="px-2.5 text-2xs text-muted-text">{currency}</span>
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
          {hint && <span className="text-2xs text-muted-text">{hint}</span>}
        </div>
      </div>
      <Switch checked={on} onChange={onToggle} disabled={disabled} className="flex-shrink-0" />
    </div>
  )
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
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
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
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <header className="px-1">
        <h1 className="text-base font-bold text-near-black">Business Profile</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Who you are: name, public contact, and where customers can find you.
        </p>
      </header>

      {/* Public site URL preview */}
      {tenantSlug && (
        <a
          href={`https://${tenantSlug}.bkrdy.me`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white border border-hairline-soft p-3.5 hover:border-near-black transition-colors group"
        >
          <div className="flex items-start gap-3">
            <ExternalLink size={14} className="text-near-black mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Your public site</p>
              <p className="text-sm font-semibold text-near-black mt-0.5 truncate">
                {tenantSlug}.bkrdy.me
              </p>
            </div>
            <span className="text-2xs text-muted-text group-hover:text-near-black">View →</span>
          </div>
        </a>
      )}

      {/* Identity */}
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <SectionTitle icon={Building2} label="Identity" hint="How your business shows up across BookReady." />
        <TextField
          label="Business name"
          value={draft.business_name ?? ''}
          onChange={v => patch({ business_name: v })}
          placeholder="Lush Studio"
          hint="Appears on your public site, in customer emails, and on the welcome screen."
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
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <SectionTitle icon={Mail} label="Public contact" hint="Shown to customers on your booking site." />
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
      <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
        <SectionTitle icon={MapPin} label="Address" hint="Helps customers find you. Address shows on your public site." />
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

      {/* Time & format + site visibility (moved from the old Preferences / Danger tabs). */}
      <PrefsCard section="time_format" />
      <PrefsCard section="visibility" />

      <SaveBar
        dirty={dirty}
        saveState={saveState}
        saveErr={saveErr}
        onSave={save}
      />
    </div>
  )
}

// ── Preferences (dissolved) → PrefsCard slices live in their home tabs ───────

// US-first list. Full IANA list is ~400 entries; expand later when we serve
// outside the US. The select also accepts a typed value via "Other".
const COMMON_TIMEZONES = [
  { value: 'America/New_York',    label: 'Eastern (New York)' },
  { value: 'America/Chicago',     label: 'Central (Chicago)' },
  { value: 'America/Denver',      label: 'Mountain (Denver)' },
  { value: 'America/Phoenix',     label: 'Mountain, no DST (Phoenix)' },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Anchorage',   label: 'Alaska (Anchorage)' },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (Honolulu)' },
  { value: 'America/Puerto_Rico', label: 'Atlantic (San Juan)' },
] as const

/**
 * Self-contained editor for one slice of BusinessProfile-backed preferences.
 * The old Preferences tab was dissolved (#settings-ia) and its four blocks
 * moved to the tabs they belong to:
 *   time_format   → Business      duration   → Booking
 *   communication → Notifications  visibility → Business
 * Each PrefsCard owns its own load + partial save (updateEditorBusiness only
 * sends the fields for that slice, so it never clobbers a sibling tab).
 */
type PrefsSection = 'time_format' | 'duration' | 'communication' | 'visibility'

const PREFS_META: Record<PrefsSection, { icon: React.ElementType; label: string; hint: string }> = {
  time_format:   { icon: CalendarClock, label: 'Time & format',  hint: 'Used across the app, emails, and your public site.' },
  duration:      { icon: Calendar,      label: 'Defaults',       hint: 'Speed up common owner workflows.' },
  communication: { icon: Mail,          label: 'Communication',  hint: 'Show up consistently across emails and the booking site.' },
  visibility:    { icon: Lock,          label: 'Site visibility',hint: 'Who can see your booking site.' },
}

function prefsSlice(section: PrefsSection, b: BusinessProfile): Partial<BusinessProfile> {
  switch (section) {
    case 'time_format':
      return { time_zone: b.time_zone ?? null, week_start_day: b.week_start_day ?? 0, time_format: b.time_format ?? '12h' }
    case 'duration':
      return { default_appointment_duration_minutes: b.default_appointment_duration_minutes ?? 60 }
    case 'communication':
      return { post_booking_message: b.post_booking_message ?? null, email_signature: b.email_signature ?? null }
    case 'visibility':
      return { site_visibility: b.site_visibility ?? 'public', site_password_set: !! b.site_password_set }
  }
}

function PrefsCard({ section }: { section: PrefsSection }) {
  const [data,    setData]    = useState<BusinessProfile | null>(null)
  const [draft,   setDraft]   = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErr,   setSaveErr]   = useState<string | null>(null)
  const [pwInput, setPwInput] = useState('')
  const confirm = useConfirm()
  const meta = PREFS_META[section]

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
    if (section === 'visibility' && pwInput !== '') return true
    return JSON.stringify(prefsSlice(section, data)) !== JSON.stringify(prefsSlice(section, draft))
  }, [data, draft, pwInput, section])

  function patch(p: Partial<BusinessProfile>) {
    setDraft(d => d ? { ...d, ...p } : d)
    setSaveState('idle'); setSaveErr(null)
  }

  async function save() {
    if (!draft) return
    setSaveState('saving'); setSaveErr(null)
    try {
      const payload = prefsSlice(section, draft)
      delete (payload as { site_password_set?: boolean }).site_password_set
      if (section === 'communication') {
        payload.post_booking_message = draft.post_booking_message?.trim() || null
        payload.email_signature      = draft.email_signature?.trim() || null
      }
      if (section === 'time_format') payload.time_zone = draft.time_zone || null
      if (section === 'visibility' && pwInput !== '') payload.site_password = pwInput
      const next = await updateEditorBusiness(payload)
      setData(next); setDraft(next); setPwInput('')
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  async function clearPassword() {
    if (!draft) return
    const ok = await confirm({ title: 'Clear the site password?', message: 'Anyone with the link will be able to view your site again once visibility is public.', confirmLabel: 'Clear password', tone: 'danger' })
    if (!ok) return
    setSaveState('saving'); setSaveErr(null)
    try {
      const next = await updateEditorBusiness({ site_password: '' })
      setData(next); setDraft(next); setPwInput('')
      setSaveState('saved')
    } catch (e) {
      setSaveState('error')
      setSaveErr(e instanceof Error ? e.message : 'Save failed')
    }
  }

  if (loading) {
    return (
      <div className="bg-white border border-hairline-soft p-3.5 flex items-center gap-2 text-xs text-muted-text">
        <Loader2 size={14} className="animate-spin" /> Loading…
      </div>
    )
  }
  if (loadErr || !draft) {
    return (
      <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
        <AlertCircle size={14} /> {loadErr ?? 'Could not load'}
      </div>
    )
  }

  const isPrivate = draft.site_visibility === 'private'
  const tzKnown   = (COMMON_TIMEZONES as readonly { value: string }[]).some(t => t.value === draft.time_zone)
  const tzSelect  = draft.time_zone === null || draft.time_zone === undefined || draft.time_zone === ''
    ? '' : (tzKnown ? draft.time_zone! : 'Other')

  return (
    <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
      <SectionTitle icon={meta.icon} label={meta.label} hint={meta.hint} />

      {section === 'time_format' && (
        <>
          <SelectField
            label="Time zone"
            value={tzSelect}
            onChange={v => patch({ time_zone: v === 'Other' ? (draft.time_zone || '') : (v || null) })}
            options={[
              { value: '', label: 'Use BookReady default (US Eastern)' },
              ...COMMON_TIMEZONES.map(t => ({ value: t.value, label: t.label })),
              { value: 'Other', label: 'Other (enter time zone manually)' },
            ]}
            hint="Affects how all dates and times display. Reminder schedules will start respecting this in the next release."
          />
          {tzSelect === 'Other' && (
            <TextField
              label="Time zone name"
              value={draft.time_zone ?? ''}
              onChange={v => patch({ time_zone: v || null })}
              placeholder="e.g. Europe/London"
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-hairline-soft pt-3">
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
        </>
      )}

      {section === 'duration' && (
        <NumberField
          label="Default appointment duration"
          value={draft.default_appointment_duration_minutes ?? 60}
          onChange={v => patch({ default_appointment_duration_minutes: v })}
          min={5}
          max={600}
          suffix="minutes"
          hint="Used when you create an appointment manually without picking a service."
        />
      )}

      {section === 'communication' && (
        <>
          <TextAreaField
            label="Post-booking message"
            value={draft.post_booking_message ?? ''}
            onChange={v => patch({ post_booking_message: v })}
            placeholder="Bring your reference photos, and arrive 5 minutes early!"
            hint="Shown to customers on the booking success page and included in their confirmation email."
            rows={3}
          />
          <TextAreaField
            label="Email signature"
            value={draft.email_signature ?? ''}
            onChange={v => patch({ email_signature: v })}
            placeholder="Anna at Lush Studio"
            hint="Appended to customer-facing emails (confirmations, reminders, etc)."
            rows={2}
          />
        </>
      )}

      {section === 'visibility' && (
        <>
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
                placeholder={draft.site_password_set ? '(already set, leave blank to keep)' : 'Choose a password'}
                hint={draft.site_password_set ? 'Type a new value to change it. Leave blank to keep the existing one.' : 'Anyone with the link will need this to view your site.'}
              />
              {draft.site_password_set && (
                <button
                  type="button"
                  onClick={clearPassword}
                  className="text-eyebrow font-bold tracking-[0.14em] uppercase text-danger hover:underline"
                >
                  Clear password
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Inline save (non-sticky — the parent tab may own a sticky SaveBar). */}
      <div className="flex items-center gap-3 pt-1 border-t border-hairline-soft">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saveState === 'saving'}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 border border-near-black hover:bg-white hover:text-near-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saveState === 'saving' ? <><Loader2 size={11} className="animate-spin" /> Saving</> : 'Save'}
        </button>
        {saveState === 'saved' && (
          <span className="inline-flex items-center gap-1 text-xs text-success font-semibold"><Check size={12} /> Saved</span>
        )}
        {saveState === 'error' && saveErr && <span className="text-xs text-danger">{saveErr}</span>}
      </div>
    </section>
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
    <div className="flex items-start gap-3 border-b border-hairline-soft pb-2.5 mb-1">
      {/* BookReady icon-box: cream square, muted glyph. */}
      <span className="w-8 h-8 bg-cream border border-hairline-soft flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-muted-text" strokeWidth={1.8} />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-near-black">{label}</p>
        {hint && <p className="text-2xs text-muted-text mt-0.5">{hint}</p>}
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
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <div className="mt-1.5 flex items-center border border-hairline-strong bg-white focus-within:border-near-black">
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
          className="w-full px-3 py-2 text-sm text-near-black bg-transparent placeholder:text-faint-text focus:outline-none"
        />
      </div>
      {hint && <p className="text-eyebrow text-muted-text mt-1">{hint}</p>}
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
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full mt-1.5 px-3 py-2 text-sm text-near-black bg-white border border-hairline-strong placeholder:text-faint-text focus:outline-none focus:border-near-black resize-y leading-relaxed"
      />
      {hint && <p className="text-eyebrow text-muted-text mt-1">{hint}</p>}
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
    <div className="sticky bottom-0 bg-cream/95 backdrop-blur border-t border-hairline-soft pt-3 pb-2 flex items-center justify-between gap-3">
      <div className="text-2xs text-muted-text">
        {saveState === 'saved' && (
          <span className="inline-flex items-center gap-1 text-near-black">
            <Check size={12} /> Saved
          </span>
        )}
        {saveState === 'error' && (
          <span className="inline-flex items-center gap-1 text-danger">
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
          'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
          dirty
            ? 'bg-near-black text-white hover:bg-white hover:text-near-black border border-near-black'
            : 'bg-cream text-muted-text border border-hairline-soft cursor-not-allowed',
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

function SubscriptionPanel() {
  return (
    <div className="space-y-4">
      <Link
        href={hrefFor('overview')}
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black hover:underline"
      >
        ← Back to Settings
      </Link>

      <BillingHub />
    </div>
  )
}

// Export-your-data card — lives in Account. Self-contained: owns its busy/
// error state and triggers the CSV download.
function ExportDataCard() {
  const [exportBusy, setExportBusy] = useState<null | 'appointments' | 'customers'>(null)
  const [exportErr,  setExportErr]  = useState<string | null>(null)

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

  return (
    <section className="bg-white border border-hairline-soft p-3.5 space-y-3">
      <SectionTitle
        icon={Download}
        label="Export your data"
        hint="Download a CSV copy of your bookings and customers. Useful for backups, accounting, or moving off BookReady."
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
          description="Your customer list with name, email, phone, and notes."
          busy={exportBusy === 'customers'}
          onClick={() => handleExport('customers')}
        />
      </div>
      {exportErr && (
        <div className="px-3 py-2 bg-danger-bg border border-danger text-xs text-danger flex items-center gap-2">
          <AlertCircle size={12} /> {exportErr}
        </div>
      )}
    </section>
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
        'text-left bg-cream border border-hairline-soft p-3 flex items-start gap-3 transition-colors',
        busy ? 'opacity-60 cursor-wait' : 'hover:border-near-black',
      )}
    >
      <span className="w-7 h-7 flex items-center justify-center bg-white border border-hairline-soft text-near-black flex-shrink-0">
        {busy
          ? <Loader2 size={12} className="animate-spin" />
          : <Download size={12} strokeWidth={1.8} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-near-black">{label}</p>
        <p className="text-[10.5px] text-muted-text mt-0.5 leading-snug">{description}</p>
      </div>
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text flex-shrink-0 self-center">
        {busy ? 'Exporting…' : 'CSV ↓'}
      </span>
    </button>
  )
}

// ── Email content editor (Phase 17) ─────────────────────────────────────────

interface EmailTemplateMeta {
  key:           EmailTemplateKey
  label:         string
  description:   string
  defaultSubject: string
  defaultIntro:   string
}

const EMAIL_TEMPLATES: EmailTemplateMeta[] = [
  {
    key: 'booking_request_client',
    label: 'Booking request received',
    description: 'Sent right after a customer submits a booking request.',
    defaultSubject: 'We received your booking request',
    defaultIntro:   'Thanks for booking with us. We received your request and will confirm it shortly.',
  },
  {
    key: 'appointment_confirmed',
    label: 'Appointment confirmed',
    description: 'Sent when you confirm a booking (or it auto-confirms).',
    defaultSubject: 'Your appointment is confirmed',
    defaultIntro:   'Great news, your appointment is confirmed. We look forward to seeing you.',
  },
  {
    key: 'appointment_cancelled',
    label: 'Appointment cancelled',
    description: 'Sent when an appointment is cancelled (owner or customer).',
    defaultSubject: 'Your appointment has been cancelled',
    defaultIntro:   'We are letting you know that the appointment below has been cancelled.',
  },
  {
    key: 'appointment_rescheduled',
    label: 'Appointment rescheduled',
    description: 'Sent when an appointment moves to a new time.',
    defaultSubject: 'Your appointment has been rescheduled',
    defaultIntro:   'We have moved your appointment to a new time. The details are below.',
  },
  {
    key: 'appointment_reminder',
    label: 'Appointment reminder',
    description: 'Sent automatically a configurable number of hours before the appointment.',
    defaultSubject: 'A reminder about your upcoming appointment',
    defaultIntro:   'This is a friendly reminder about your upcoming appointment with us.',
  },
]

function EmailContentEditor({
  draft, onChange,
}: {
  draft:    NotificationSettings
  onChange: (key: EmailTemplateKey, value: EmailTemplateOverride) => void
}) {
  return (
    <section className="bg-white border border-hairline-soft p-3.5 space-y-2.5">
      <div className="flex items-start gap-2 mb-1">
        <div className="min-w-0">
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Email content</p>
          <p className="text-2xs text-muted-text mt-0.5">
            Override the subject line, opening, or sign-off on the 5 emails that go to your customers.
            Leave blank to use BookReady defaults. Sample data + your saved overrides are used for test sends.
          </p>
        </div>
      </div>

      <div className="divide-y divide-[rgba(18,18,18,0.06)]">
        {EMAIL_TEMPLATES.map(meta => (
          <EmailTemplateCard
            key={meta.key}
            meta={meta}
            value={(draft.email_templates ?? {})[meta.key] ?? {}}
            onChange={v => onChange(meta.key, v)}
          />
        ))}
      </div>
    </section>
  )
}

function EmailTemplateCard({
  meta, value, onChange,
}: {
  meta:     EmailTemplateMeta
  value:    EmailTemplateOverride
  onChange: (v: EmailTemplateOverride) => void
}) {
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendMsg, setSendMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  // Optional override for the test-send recipient. Empty = owner's
  // account email (backend default). Lets the owner preview the email
  // exactly as it will land in a real client inbox.
  const [testTo, setTestTo] = useState('')

  const hasOverride = !! (value.subject || value.intro || value.signoff)

  async function testSend() {
    setSending(true); setSendMsg(null)
    try {
      const r = await sendNotificationTestEmail(meta.key, testTo)
      setSendMsg({ kind: 'ok', text: r.message })
    } catch (e) {
      setSendMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Test send failed' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="py-2.5">
      <button
        type="button"
        onClick={() => setOpen(o => ! o)}
        className="flex items-start gap-2 w-full text-left hover:opacity-80 transition-opacity"
      >
        <ChevronDown
          size={13}
          className={cn('text-muted-text mt-0.5 flex-shrink-0 transition-transform', open ? 'rotate-0' : '-rotate-90')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-near-black">{meta.label}</p>
            {hasOverride && (
              <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-cream text-near-black px-1.5 py-0.5">
                Customized
              </span>
            )}
          </div>
          <p className="text-2xs text-muted-text mt-0.5">{meta.description}</p>
        </div>
      </button>

      {open && (
        <div className="mt-3 pl-5 space-y-2.5">
          <label className="block">
            <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Subject</span>
            <input
              type="text"
              value={value.subject ?? ''}
              onChange={e => onChange({ ...value, subject: e.target.value || null })}
              placeholder={meta.defaultSubject}
              className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black placeholder:text-faint-text focus:outline-none focus:border-near-black"
              maxLength={255}
            />
          </label>
          <label className="block">
            <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Intro paragraph</span>
            <textarea
              rows={3}
              value={value.intro ?? ''}
              onChange={e => onChange({ ...value, intro: e.target.value || null })}
              placeholder={meta.defaultIntro}
              className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black placeholder:text-faint-text focus:outline-none focus:border-near-black resize-y leading-relaxed"
              maxLength={2000}
            />
          </label>
          <label className="block">
            <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Sign-off paragraph</span>
            <textarea
              rows={2}
              value={value.signoff ?? ''}
              onChange={e => onChange({ ...value, signoff: e.target.value || null })}
              placeholder="e.g. Thanks for choosing us, Anna"
              className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black placeholder:text-faint-text focus:outline-none focus:border-near-black resize-y leading-relaxed"
              maxLength={2000}
            />
          </label>

          <div className="pt-1 border-t border-hairline-soft space-y-2">
            {/* Status row — error gets red treatment, success gets a
                clearly-visible green confirmation strip with a check
                icon so it reads as "yes, sent" at a glance. Defaults
                back to muted helper copy when neither has fired. */}
            {sendMsg?.kind === 'ok' ? (
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-success-bg border border-green-200 text-2xs text-success">
                <Check size={12} className="flex-shrink-0" />
                <span className="font-semibold">{sendMsg.text}</span>
              </div>
            ) : sendMsg?.kind === 'err' ? (
              <p className="text-2xs text-danger">{sendMsg.text}</p>
            ) : (
              <p className="text-2xs text-muted-text">
                Send a test to verify deliverability + saved content. Leave the address blank to use your account email.
              </p>
            )}
            <div className="flex items-stretch gap-2">
              <input
                type="email"
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder="Send to… (defaults to your account email)"
                className="flex-1 min-w-0 bg-white border border-hairline-strong px-3 py-1.5 text-xs text-near-black placeholder:text-faint-text focus:outline-none focus:border-near-black"
              />
              <button
                type="button"
                onClick={testSend}
                disabled={sending}
                className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.10em] uppercase border border-hairline-strong bg-white text-near-black px-2.5 py-1.5 hover:border-near-black disabled:opacity-50 whitespace-nowrap"
              >
                {sending
                  ? <><Loader2 size={11} className="animate-spin" /> Sending</>
                  : sendMsg?.kind === 'ok'
                    ? <><Check size={11} /> Sent</>
                    : <><Send size={11} /> Test send</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
