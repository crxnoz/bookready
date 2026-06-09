'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Plus, Tag, Percent, DollarSign, Calendar as CalendarIcon,
  Hash, Trash2, Pencil,
} from 'lucide-react'
import {
  getEditorCoupons, createEditorCoupon, updateEditorCoupon, deleteEditorCoupon,
  getEditorServices,
} from '@/lib/api'
import type { Coupon, CouponWritePayload, Service } from '@/lib/types'
import StatusBadge from '@/components/ui/StatusBadge'
import AsyncBoundary from '@/components/ui/AsyncBoundary'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Toggle from '@/components/ui/Toggle'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { TabShell, TabIntro, Section, IconBox } from '@/components/editor/AvailabilitySections'
import { cn } from '@/lib/cn'

/**
 * Customer booking coupons editor. Owners create codes here; customers
 * redeem them via the "Have a code?" widget on the booking page.
 *
 * Design system: TabShell + Section, shared StatusBadge / AsyncBoundary /
 * EmptyState / Modal + Confirm + Toast. SHARP (radius 0) — no `rounded-*`.
 * No native confirm()/alert().
 */
export default function CouponsEditor() {
  const [coupons,  setCoupons]  = useState<Coupon[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [editing,  setEditing]  = useState<Coupon | null | undefined>(undefined) // undefined = closed; null = new
  const [busyId,   setBusyId]   = useState<number | null>(null)
  const confirm = useConfirm()
  const toast   = useToast()

  async function load() {
    setLoading(true); setError(null)
    try {
      const [c, s] = await Promise.all([getEditorCoupons(), getEditorServices()])
      setCoupons(c)
      setServices(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load coupons.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  async function remove(c: Coupon) {
    if ((c.uses_count ?? 0) > 0) {
      toast.info('This coupon has been redeemed. Disable it instead so past records stay intact.')
      return
    }
    const ok = await confirm({
      title:        'Delete this coupon?',
      message:      `“${c.code}” will be removed. This can’t be undone.`,
      confirmLabel: 'Delete',
      tone:         'danger',
    })
    if (! ok) return
    setBusyId(c.id)
    try {
      await deleteEditorCoupon(c.id)
      toast.success('Coupon deleted.')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(c: Coupon, next: boolean) {
    setBusyId(c.id)
    try {
      await updateEditorCoupon(c.id, { is_active: next })
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <TabShell>
      <div className="flex items-start justify-between gap-3">
        <TabIntro>
          Create discount codes customers can apply at booking — percent off, flat off, with optional limits.
        </TabIntro>
        <Button variant="primary" onClick={() => setEditing(null)}>
          <Plus size={14} strokeWidth={2.2} className="mr-1.5" /> New coupon
        </Button>
      </div>

      <Section
        icon={Tag}
        title="Your coupons"
        subtitle={coupons.length > 0
          ? `${coupons.length} code${coupons.length === 1 ? '' : 's'} configured.`
          : 'No coupons yet.'}
      >
        <AsyncBoundary loading={loading} error={error} onRetry={load}>
          {coupons.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No coupons yet"
              description="Create your first code to start running promos. You'll see usage stats here as customers redeem them."
              action={
                <Button onClick={() => setEditing(null)}>
                  <Plus size={14} className="mr-1.5" /> New coupon
                </Button>
              }
            />
          ) : (
            <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
              {coupons.map(c => (
                <CouponRow
                  key={c.id}
                  coupon={c}
                  services={services}
                  busy={busyId === c.id}
                  onEdit={() => setEditing(c)}
                  onToggle={(next) => toggleActive(c, next)}
                  onDelete={() => remove(c)}
                />
              ))}
            </div>
          )}
        </AsyncBoundary>
      </Section>

      {editing !== undefined && (
        <CouponModal
          coupon={editing}
          services={services}
          onClose={() => setEditing(undefined)}
          onSaved={async () => { setEditing(undefined); await load() }}
        />
      )}
    </TabShell>
  )
}

// ── Row ─────────────────────────────────────────────────────────────────────

function CouponRow({
  coupon, services, busy, onEdit, onToggle, onDelete,
}: {
  coupon:   Coupon
  services: Service[]
  busy:     boolean
  onEdit:   () => void
  onToggle: (next: boolean) => void
  onDelete: () => void
}) {
  const c = coupon
  const expired = !! c.expires_at && new Date(c.expires_at).getTime() <= Date.now()
  const exhausted = c.max_uses !== null && c.uses_count >= c.max_uses

  // Effective state for the status badge — disabled > expired > exhausted > active.
  const state = ! c.is_active ? 'inactive'
    : expired                 ? 'inactive'
    : exhausted               ? 'inactive'
    : 'active'

  const discountLabel = c.discount_type === 'percent'
    ? `${c.discount_value}% off`
    : `$${c.discount_value.toFixed(2)} off`

  const serviceLabel = c.applicable_service_ids.length > 0
    ? `${c.applicable_service_ids.length} service${c.applicable_service_ids.length === 1 ? '' : 's'}`
    : 'All services'

  return (
    <div className="px-4 py-3 flex items-start justify-between gap-3 min-w-0">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-2xs font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-cream text-near-black px-2 py-0.5">
            <Hash size={10} /> {c.code}
          </span>
          <StatusBadge domain="entity" status={state} />
          {expired && c.is_active && (
            <span className="text-eyebrow tracking-eyebrow uppercase text-warning">Expired</span>
          )}
          {exhausted && c.is_active && ! expired && (
            <span className="text-eyebrow tracking-eyebrow uppercase text-warning">Fully claimed</span>
          )}
        </div>
        <p className="text-sm font-semibold text-near-black flex items-center gap-1.5">
          {c.discount_type === 'percent'
            ? <Percent size={12} strokeWidth={2} className="text-muted-text" />
            : <DollarSign size={12} strokeWidth={2} className="text-muted-text" />}
          {discountLabel}
          <span className="text-muted-text font-normal">·</span>
          <span className="text-muted-text font-normal text-2xs">{serviceLabel}</span>
          {c.expires_at && (
            <>
              <span className="text-muted-text font-normal">·</span>
              <span className="text-muted-text font-normal text-2xs inline-flex items-center gap-1">
                <CalendarIcon size={10} /> Expires {new Date(c.expires_at).toLocaleDateString()}
              </span>
            </>
          )}
        </p>
        {c.description && (
          <p className="text-2xs text-muted-text">{c.description}</p>
        )}
        <p className="text-2xs text-muted-text tabular-nums">
          {c.uses_count}{c.max_uses !== null ? `/${c.max_uses}` : ''} use{c.uses_count === 1 ? '' : 's'}
          {(c.total_discount_given ?? 0) > 0 && (
            <> · ${(c.total_discount_given ?? 0).toFixed(2)} discounted</>
          )}
          {c.minimum_amount !== null && (
            <> · ${c.minimum_amount.toFixed(2)} min order</>
          )}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Toggle checked={c.is_active} onChange={onToggle} disabled={busy} aria-label="Active" />
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={busy}>
          <Pencil size={13} className="mr-1.5" /> Edit
        </Button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className={cn(
            'w-8 h-8 inline-flex items-center justify-center border border-hairline-strong bg-white text-muted-text hover:text-danger hover:border-danger transition-colors',
            busy && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Delete coupon"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Modal (create + edit) ──────────────────────────────────────────────────

function CouponModal({
  coupon, services, onClose, onSaved,
}: {
  coupon:   Coupon | null
  services: Service[]
  onClose:  () => void
  onSaved:  () => Promise<void>
}) {
  const isNew = coupon === null
  const toast = useToast()

  const [code,           setCode]           = useState(coupon?.code ?? '')
  const [description,    setDescription]    = useState(coupon?.description ?? '')
  const [discountType,   setDiscountType]   = useState<'percent' | 'flat'>(coupon?.discount_type ?? 'percent')
  const [discountValue,  setDiscountValue]  = useState<string>(coupon ? String(coupon.discount_value) : '10')
  const [isActive,       setIsActive]       = useState<boolean>(coupon?.is_active ?? true)
  const [maxUses,        setMaxUses]        = useState<string>(coupon?.max_uses != null ? String(coupon.max_uses) : '')
  const [expiresAt,      setExpiresAt]      = useState<string>(coupon?.expires_at ? coupon.expires_at.slice(0, 10) : '')
  const [minimumAmount,  setMinimumAmount]  = useState<string>(coupon?.minimum_amount != null ? String(coupon.minimum_amount) : '')
  const [restrictMode,   setRestrictMode]   = useState<'all' | 'some'>(
    (coupon?.applicable_service_ids?.length ?? 0) > 0 ? 'some' : 'all',
  )
  const [serviceIds,     setServiceIds]     = useState<Set<number>>(
    new Set(coupon?.applicable_service_ids ?? []),
  )
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function toggleService(id: number) {
    setServiceIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function handleSubmit() {
    setSubmitError(null)
    const value = parseFloat(discountValue)
    if (! code.trim() || ! /^[A-Za-z0-9_\-]{3,64}$/.test(code.trim())) {
      setSubmitError('Code: 3–64 letters, digits, dashes, or underscores.'); return
    }
    if (! Number.isFinite(value) || value <= 0) {
      setSubmitError('Enter a discount greater than 0.'); return
    }
    if (discountType === 'percent' && value > 100) {
      setSubmitError('Percent can’t exceed 100.'); return
    }

    const payload: CouponWritePayload = {
      code:                  code.trim().toUpperCase(),
      description:           description.trim() || null,
      discount_type:         discountType,
      discount_value:        value,
      is_active:             isActive,
      max_uses:              maxUses.trim()      ? parseInt(maxUses, 10)        : null,
      expires_at:            expiresAt           ? expiresAt                    : null,
      minimum_amount:        minimumAmount.trim()? parseFloat(minimumAmount)    : null,
      applicable_service_ids: restrictMode === 'some' ? Array.from(serviceIds) : null,
    }

    setSaving(true)
    try {
      if (isNew) await createEditorCoupon(payload)
      else       await updateEditorCoupon(coupon!.id, payload)
      toast.success(isNew ? 'Coupon created.' : 'Coupon saved.')
      await onSaved()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'New coupon' : `Edit ${coupon!.code}`}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create coupon' : 'Save changes'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {submitError && (
          <p className="text-2xs text-danger bg-danger-bg border border-danger/30 px-3 py-2">
            {submitError}
          </p>
        )}

        <label className="block">
          <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">Code</span>
          <Input
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER25"
            maxLength={64}
            autoFocus
          />
          <span className="text-2xs text-muted-text mt-1 block">3–64 chars · letters, digits, dashes, underscores. Always stored uppercase.</span>
        </label>

        <label className="block">
          <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">Internal note (optional)</span>
          <Textarea
            value={description ?? ''}
            onChange={e => setDescription(e.target.value)}
            placeholder="What's this code for? (only you see this)"
            rows={2}
            maxLength={255}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">Discount type</span>
            <Select value={discountType} onChange={e => setDiscountType(e.target.value as 'percent' | 'flat')}>
              <option value="percent">% off</option>
              <option value="flat">$ off</option>
            </Select>
          </label>
          <label className="block">
            <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">
              {discountType === 'percent' ? 'Percent (0–100)' : 'Amount ($)'}
            </span>
            <Input
              type="number"
              min="0"
              max={discountType === 'percent' ? '100' : undefined}
              step="0.01"
              value={discountValue}
              onChange={e => setDiscountValue(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">Expires on (optional)</span>
            <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">Max total uses (optional)</span>
            <Input
              type="number"
              min="1"
              step="1"
              value={maxUses}
              onChange={e => setMaxUses(e.target.value)}
              placeholder="Unlimited"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold">Minimum order (optional)</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={minimumAmount}
            onChange={e => setMinimumAmount(e.target.value)}
            placeholder="No minimum"
          />
          <span className="text-2xs text-muted-text mt-1 block">
            The deposit or full amount must be at least this much for the coupon to apply.
          </span>
        </label>

        <div>
          <span className="text-eyebrow tracking-eyebrow uppercase text-muted-text font-bold block mb-2">Services</span>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="restrict"
                checked={restrictMode === 'all'}
                onChange={() => setRestrictMode('all')}
                className="accent-near-black"
              />
              <span>Any service</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                name="restrict"
                checked={restrictMode === 'some'}
                onChange={() => setRestrictMode('some')}
                className="accent-near-black"
              />
              <span>Only specific services</span>
            </label>
          </div>
          {restrictMode === 'some' && (
            <div className="mt-3 border border-hairline-soft bg-cream max-h-56 overflow-auto">
              {services.length === 0 ? (
                <p className="px-3 py-3 text-2xs text-muted-text">No services configured yet.</p>
              ) : services.map(s => (
                <label key={s.id} className="flex items-center gap-2 px-3 py-2 border-b border-hairline-soft last:border-b-0 text-sm cursor-pointer hover:bg-white">
                  <input
                    type="checkbox"
                    checked={serviceIds.has(s.id)}
                    onChange={() => toggleService(s.id)}
                    className="accent-near-black"
                  />
                  <span className="flex-1 truncate">{s.name}</span>
                  <span className="text-2xs text-muted-text tabular-nums">${Number(s.price).toFixed(2)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center justify-between border border-hairline-soft px-3 py-3 cursor-pointer">
          <span className="text-sm">
            <span className="font-semibold text-near-black">Active</span>
            <span className="block text-2xs text-muted-text mt-0.5">Customers can apply this code at booking.</span>
          </span>
          <Toggle checked={isActive} onChange={(next) => setIsActive(next)} aria-label="Active" />
        </label>
      </div>
    </Modal>
  )
}
