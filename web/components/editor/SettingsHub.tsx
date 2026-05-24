'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Building2, Calendar, CreditCard, Bell, FileText, UserCircle,
  Plug, AlertTriangle, ChevronRight, Loader2, Check, AlertCircle,
  DollarSign, Percent, Lock,
} from 'lucide-react'
import {
  getEditorPaymentSettings,
  updateEditorPaymentSettings,
} from '@/lib/api'
import type {
  DepositType,
  PaymentSettings,
  PaymentSettingsPayload,
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
  { tab: 'booking',       label: 'Booking Settings',   hint: 'Buffers, lead time, booking window',         icon: Calendar,     status: 'soon' },
  { tab: 'payments',      label: 'Payment Settings',   hint: 'Customer payments, deposits, currency',      icon: CreditCard,   status: 'ready' },
  { tab: 'notifications', label: 'Notifications',      hint: 'Email + SMS templates and recipients',       icon: Bell,         status: 'soon' },
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
      {tab !== 'overview' && tab !== 'payments' && <PlaceholderPanel tab={tab} />}
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
          Control whether clients pay anything when they book, and how much.
          Payment processing isn&apos;t wired up yet — these settings will take
          effect once Stripe is connected.
        </p>
      </header>

      {/* Master toggle */}
      <section className="bg-white border border-[rgba(18,18,18,0.10)] p-3.5 space-y-2">
        <Toggle
          label="Enable customer payments"
          hint="Master switch. Off means clients book without paying."
          icon={CreditCard}
          on={draft.payments_enabled}
          onToggle={() => patch({ payments_enabled: !draft.payments_enabled })}
        />
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
