'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, ArrowRight, Calendar, CalendarMinus, CalendarOff,
  CreditCard, ExternalLink, Loader2, Mail, Megaphone, Plug, Rss,
  ShieldCheck, Square as SquareIcon, Building2, Webhook, Zap,
} from 'lucide-react'
import { getEditorPaymentSettings } from '@/lib/api'
import type { PaymentSettings } from '@/lib/types'
import { cn } from '@/lib/cn'

/**
 * The Integrations hub — central catalog of third-party connections.
 *
 * The page is intentionally light on backend wiring for the MVP UI
 * pass: only Stripe surfaces real state (we already manage Connect
 * for appointment payments under /editor/payments). Every other tile
 * is a "coming soon" placeholder so visitors see the platform roadmap
 * at a glance and we capture interest signals without committing to
 * an integration order.
 *
 * Categories:
 *   - Payments         (Stripe live; Square coming soon)
 *   - Calendars        (Google + .ics export + busy-calendar import)
 *   - Marketing        (BookReady Marketing — built-in — plus
 *                       Mailchimp / Klaviyo sync)
 *   - Automation       (Outbound webhooks, Zapier)
 *   - Local SEO        (Google Business Profile)
 *
 * No Twilio / external SMS tile — customer-facing SMS is handled
 * in-house, not as a connectable integration.
 */

type IntegrationStatus =
  | 'connected'
  | 'not_connected'
  | 'action_required'
  | 'coming_soon'

interface IntegrationTile {
  key:          string
  name:         string
  description:  string
  icon:         React.ElementType
  status:       IntegrationStatus
  statusLabel?: string             // override the badge text
  /** Where the "Configure" button on a connected tile should link. */
  manageHref?:  string
  /** Where the "Connect" button on an unconnected tile should link. */
  connectHref?: string
  /** Short footnote shown under the description (e.g. "via Stripe"). */
  hint?:        string
}

interface IntegrationCategory {
  key:         string
  title:       string
  description: string
  tiles:       IntegrationTile[]
}

export default function IntegrationsHub() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorPaymentSettings()
      .then(s => { if (! cancelled) setSettings(s) })
      .catch(e => { if (! cancelled) setErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const categories = buildCatalog(settings)

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-6 max-w-[1024px]">
      {/* Page header */}
      <header>
        <div className="inline-flex items-center gap-2 text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text mb-1">
          <Plug size={11} /> Integrations
        </div>
        <h1 className="text-2xl font-bold text-near-black tracking-tight">
          Connect BookReady to the tools you already use.
        </h1>
        <p className="text-sm text-muted-text mt-1.5">
          Payments, calendars, marketing, automation. Most of this is coming soon.
          We&rsquo;re building it in the order most people ask for.
        </p>
      </header>

      {loading && (
        <p className="text-xs text-muted-text inline-flex items-center gap-2">
          <Loader2 size={12} className="animate-spin" /> Loading integration status…
        </p>
      )}

      {err && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-danger flex items-center gap-2">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {! loading && categories.map(cat => (
        <CategorySection key={cat.key} category={cat} />
      ))}
    </div>
  )
}

// ── Catalog builder ────────────────────────────────────────────────────────

function buildCatalog(settings: PaymentSettings | null): IntegrationCategory[] {
  return [
    {
      key:         'payments',
      title:       'Payments',
      description: 'Accept appointment payments + deposits.',
      tiles: [
        stripeTile(settings),
        comingSoon({
          key:         'square',
          name:        'Square',
          description: 'Accept payments through your Square account, and keep your Square POS in sync.',
          icon:        SquareIcon,
        }),
      ],
    },
    {
      key:         'calendars',
      title:       'Calendars',
      description: 'Show bookings in your day view, and block out times you\'re already busy.',
      tiles: [
        comingSoon({
          key:         'google-calendar',
          name:        'Google Calendar',
          description: 'New bookings appear on your Google Calendar automatically.',
          icon:        Calendar,
          hint:        'Keep your calendars in sync, one direction or both.',
        }),
        comingSoon({
          key:         'ics-feed',
          name:        'Calendar feed (.ics)',
          description: 'Subscribe to a per-business calendar URL from Apple, Outlook, Fantastical, or any iCal-compatible app.',
          icon:        Rss,
        }),
        comingSoon({
          key:         'busy-import',
          name:        'Import busy calendar',
          description: "Block availability from your personal Google / Outlook calendar so you don't double-book yourself.",
          icon:        CalendarMinus,
        }),
      ],
    },
    {
      key:         'marketing',
      title:       'Marketing',
      description: 'Stay in front of customers between visits.',
      tiles: [
        comingSoon({
          key:         'bookready-marketing',
          name:        'BookReady Marketing',
          description: 'Email campaigns built into BookReady. Segment by service, last visit, or first-time customer.',
          icon:        Megaphone,
          hint:        'Built-in. No extra account needed.',
        }),
        comingSoon({
          key:         'mailchimp',
          name:        'Mailchimp',
          description: 'Sync booking customers to your existing Mailchimp list.',
          icon:        Mail,
        }),
        comingSoon({
          key:         'klaviyo',
          name:        'Klaviyo',
          description: 'Send your booking customers to Klaviyo for email marketing.',
          icon:        Mail,
        }),
      ],
    },
    {
      key:         'automation',
      title:       'Automation',
      description: 'Wire BookReady events to anything else you run.',
      tiles: [
        comingSoon({
          key:         'webhooks',
          name:        'Outbound webhooks',
          description: 'Send booking events to any web address when they happen. Power your own integrations.',
          icon:        Webhook,
        }),
        comingSoon({
          key:         'zapier',
          name:        'Zapier',
          description: 'Connect BookReady to 5,000+ apps with no code.',
          icon:        Zap,
        }),
      ],
    },
    {
      key:         'local-seo',
      title:       'Local SEO',
      description: 'Help nearby customers find you.',
      tiles: [
        comingSoon({
          key:         'google-business-profile',
          name:        'Google Business Profile',
          description: 'Keep your hours in sync, show open times, and highlight upcoming services.',
          icon:        Building2,
        }),
      ],
    },
  ]
}

function stripeTile(settings: PaymentSettings | null): IntegrationTile {
  const status: IntegrationStatus = (() => {
    if (! settings) return 'not_connected'
    if (settings.stripe_charges_enabled) return 'connected'
    if (settings.stripe_connect_account_id) return 'action_required'
    return 'not_connected'
  })()

  return {
    key:         'stripe',
    name:        'Stripe',
    description: 'Charge deposits and full payments through Stripe. PayPal is supported as a Stripe payment method.',
    icon:        CreditCard,
    status,
    manageHref:  '/editor/payments',
    connectHref: '/editor/payments',
    hint:        status === 'action_required'
      ? 'Stripe setup not finished. Finish it to start accepting payments.'
      : undefined,
  }
}

function comingSoon(t: Omit<IntegrationTile, 'status'>): IntegrationTile {
  return { ...t, status: 'coming_soon' }
}

// ── Section ────────────────────────────────────────────────────────────────

function CategorySection({ category }: { category: IntegrationCategory }) {
  return (
    <section>
      <div className="mb-2.5">
        <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-near-black">
          {category.title}
        </h2>
        <p className="text-xs text-muted-text mt-0.5">{category.description}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {category.tiles.map(tile => (
          <Tile key={tile.key} t={tile} />
        ))}
      </div>
    </section>
  )
}

// ── Tile ───────────────────────────────────────────────────────────────────

function Tile({ t }: { t: IntegrationTile }) {
  const dimmed = t.status === 'coming_soon'
  const Icon   = t.icon

  return (
    <div
      className={cn(
        'bg-white border border-hairline-soft p-4 flex items-start gap-3 min-w-0',
        dimmed && 'opacity-90',
      )}
    >
      {/* Icon tile */}
      <div className={cn(
        'w-10 h-10 flex items-center justify-center flex-shrink-0',
        dimmed ? 'bg-cream text-muted-text' : 'bg-cream text-near-black',
      )}>
        <Icon size={18} strokeWidth={1.8} />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-near-black tracking-tight truncate">
                {t.name}
              </h3>
              <StatusBadge status={t.status} label={t.statusLabel} />
            </div>
            <p className="text-xs text-muted-text mt-0.5 leading-snug">
              {t.description}
            </p>
            {t.hint && (
              <p className="text-2xs text-muted-text mt-1.5 inline-flex items-center gap-1">
                <ShieldCheck size={10} className="opacity-60" />
                {t.hint}
              </p>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="mt-1">
          <ActionButton tile={t} />
        </div>
      </div>
    </div>
  )
}

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status, label }: { status: IntegrationStatus; label?: string }) {
  const map: Record<IntegrationStatus, { label: string; cls: string }> = {
    connected:       { label: 'Connected',       cls: 'bg-lavender text-near-black' },
    not_connected:   { label: 'Not connected',   cls: 'bg-cream text-muted-text' },
    action_required: { label: 'Action needed',   cls: 'bg-blush text-near-black' },
    coming_soon:     { label: 'Coming soon',     cls: 'bg-[rgba(18,18,18,0.06)] text-muted-text' },
  }
  const { label: defaultLabel, cls } = map[status]
  return (
    <span className={cn(
      'inline-flex items-center text-eyebrow font-bold tracking-[0.10em] uppercase border border-hairline-soft px-1.5 py-0.5 whitespace-nowrap',
      cls,
    )}>
      {label ?? defaultLabel}
    </span>
  )
}

// ── Action button ──────────────────────────────────────────────────────────

function ActionButton({ tile }: { tile: IntegrationTile }) {
  const baseCls = 'inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.10em] uppercase px-3 py-2 border whitespace-nowrap'

  if (tile.status === 'coming_soon') {
    return (
      <button
        type="button"
        disabled
        className={cn(baseCls, 'border-hairline-soft bg-white text-muted-text cursor-not-allowed')}
        title="Coming soon. Tell us if you want this sooner."
      >
        Coming soon
      </button>
    )
  }

  if (tile.status === 'connected') {
    return (
      <Link
        href={tile.manageHref ?? '#'}
        className={cn(baseCls, 'border-hairline-strong bg-white text-near-black hover:border-near-black')}
      >
        Configure <ArrowRight size={11} />
      </Link>
    )
  }

  if (tile.status === 'action_required') {
    return (
      <Link
        href={tile.manageHref ?? tile.connectHref ?? '#'}
        className={cn(baseCls, 'border-warning bg-blush text-near-black hover:bg-white')}
      >
        Finish setup <ArrowRight size={11} />
      </Link>
    )
  }

  // not_connected
  return (
    <Link
      href={tile.connectHref ?? '#'}
      className={cn(baseCls, 'bg-near-black border-near-black text-white hover:bg-white hover:text-near-black')}
    >
      Connect <ExternalLink size={11} />
    </Link>
  )
}

// Reserved for the next implementation phase — kept imported so the
// unused-imports lint stays quiet without obscuring future intent.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _futureIcons = { CalendarOff }
