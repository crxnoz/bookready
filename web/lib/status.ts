/**
 * BookReady status registry — the ONE source of truth for every status
 * label + tone across the tenant app. Replaces the ~5 divergent status/
 * payment pill maps documented in the Architecture Bible.
 *
 * A status is identified by (domain, value). `statusDef` resolves it to a
 * human label + a tone; `<StatusBadge>` maps the tone to tokens. No screen
 * defines its own status colors or labels again.
 *
 * Tones map to Visual System tokens (see StatusBadge):
 *   success → green · warning → amber · danger → red ·
 *   info → lavender · accent → blush · neutral → cream/muted
 */

export type StatusTone =
  | 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent'

export type StatusDomain =
  | 'appointment' | 'payment' | 'connect' | 'entity' | 'waitlist' | 'request' | 'customer' | 'payout' | 'integration'

export interface StatusDef {
  label: string
  tone:  StatusTone
}

const REGISTRY: Record<StatusDomain, Record<string, StatusDef>> = {
  appointment: {
    pending:   { label: 'Pending',   tone: 'warning' },
    confirmed: { label: 'Confirmed', tone: 'success' },
    completed: { label: 'Completed', tone: 'info' },
    no_show:   { label: 'No-show',   tone: 'danger' },
    cancelled: { label: 'Cancelled', tone: 'neutral' },
  },
  payment: {
    unpaid:             { label: 'Unpaid',             tone: 'neutral' },
    pending_payment:    { label: 'Deposit pending',    tone: 'warning' },
    deposit_paid:       { label: 'Deposit paid',       tone: 'success' },
    paid:               { label: 'Paid',               tone: 'success' },
    refunded:           { label: 'Refunded',           tone: 'neutral' },
    partially_refunded: { label: 'Partially refunded', tone: 'neutral' },
    failed:             { label: 'Failed',             tone: 'danger'  },
    disputed:           { label: 'Disputed',           tone: 'danger'  },
  },
  connect: {
    not_connected:      { label: 'Not connected', tone: 'neutral' },
    onboarding_started: { label: 'Setup started', tone: 'warning' },
    pending:            { label: 'Pending review', tone: 'warning' },
    active:             { label: 'Active',         tone: 'success' },
    restricted:         { label: 'Restricted',    tone: 'danger'  },
  },
  entity: {
    active:   { label: 'Active',   tone: 'success' },
    inactive: { label: 'Inactive', tone: 'neutral' },
    archived: { label: 'Archived', tone: 'neutral' },
    draft:    { label: 'Draft',    tone: 'warning' },
  },
  waitlist: {
    pending:  { label: 'Waiting',    tone: 'neutral' },
    notified: { label: 'Offer sent', tone: 'accent'  },
    claimed:  { label: 'Claimed',    tone: 'success' },
    expired:  { label: 'Expired',    tone: 'neutral' },
    removed:  { label: 'Removed',    tone: 'neutral' },
  },
  request: {
    pending:   { label: 'Pending',        tone: 'warning' },
    approved:  { label: 'Approved',       tone: 'success' },
    suggested: { label: 'Time suggested', tone: 'info'    },
    declined:  { label: 'Declined',       tone: 'neutral' },
    accepted:  { label: 'Accepted',       tone: 'success' },
    cancelled: { label: 'Cancelled',      tone: 'neutral' },
  },
  // Customer lifecycle tier (derived server-side). VIP was a gradient pill —
  // gradients are reserved, so it's a solid 'warning' (gold = premium) here.
  customer: {
    new:       { label: 'New',       tone: 'accent'  },
    returning: { label: 'Returning', tone: 'info'    },
    regular:   { label: 'Regular',   tone: 'success' },
    vip:       { label: 'VIP',       tone: 'warning' },
    inactive:  { label: 'Inactive',  tone: 'neutral' },
  },
  // Stripe Connect payout status. Friendly owner-facing copy; "money landed"
  // = success (green), matching how payments read 'paid' across the app.
  payout: {
    paid:       { label: 'In your bank', tone: 'success' },
    pending:    { label: 'Pending',      tone: 'accent'  },
    in_transit: { label: 'On the way',   tone: 'info'    },
    canceled:   { label: 'Canceled',     tone: 'neutral' },
    failed:     { label: 'Failed',       tone: 'danger'  },
  },
  // Third-party integration connection state (Integrations hub).
  integration: {
    connected:       { label: 'Connected',     tone: 'success' },
    not_connected:   { label: 'Not connected', tone: 'neutral' },
    action_required: { label: 'Action needed', tone: 'warning' },
    coming_soon:     { label: 'Coming soon',   tone: 'neutral' },
  },
}

/** Humanize an unknown status value as a graceful fallback. */
function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, ' ').trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Resolve (domain, value) → {label, tone}. Falls back to a neutral chip. */
export function statusDef(domain: StatusDomain, value: string | null | undefined): StatusDef {
  if (!value) return { label: '—', tone: 'neutral' }
  return REGISTRY[domain]?.[value] ?? { label: humanize(value), tone: 'neutral' }
}
