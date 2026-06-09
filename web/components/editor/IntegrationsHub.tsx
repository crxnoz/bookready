'use client'

import Link from 'next/link'
import {
  ArrowRight, CalendarMinus, CalendarOff,
  ExternalLink, Mail, Megaphone,
  ShieldCheck, Building2, Webhook, Zap,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import IconBox from '@/components/ui/IconBox'
import StatusBadge from '@/components/ui/StatusBadge'
import StripeConnectCard from '@/components/editor/StripeConnectCard'
import IcsFeedCard from '@/components/editor/IcsFeedCard'
import GoogleCalendarCard from '@/components/editor/GoogleCalendarCard'

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
 *   - Payments         (Stripe — the single supported processor.
 *                       Stripe's own alt-payment methods cover Apple Pay
 *                       / Google Pay / Link / Klarna / Afterpay / Affirm
 *                       so we don't need a second processor.)
 *   - Calendars        (Google + .ics export + busy-calendar import)
 *   - Marketing        (BookReady Marketing — built-in — plus
 *                       Mailchimp sync)
 *   - Automation       (Outbound webhooks, Zapier)
 *   - Local SEO        (Google Business Profile)
 *
 * No Twilio / external SMS tile — customer-facing SMS is handled
 * in-house, not as a connectable integration.
 *
 * Square is intentionally NOT listed — Square competes with BookReady
 * (their own booking product), and Stripe Connect already covers the
 * payment surface cleanly. Klaviyo is intentionally NOT listed — most
 * beauty pros aren't running campaigns there; revisit on real demand.
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
  const categories = buildCatalog()
  // Calendars renders explicitly (matches the Payments split) — the .ics
  // feed is a real status-driven card, not a generic Tile, so we host it
  // here alongside the remaining placeholder tiles in its own grid.
  const calendarTiles = (categories.find(c => c.key === 'calendars')?.tiles) ?? []
  const restCategories = categories.filter(c => c.key !== 'calendars')

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-6 max-w-[1024px]">
      {/* Page header is provided by EditorShell (Integrations section). */}

      {/* Payments — Stripe is the single supported processor. Stripe's own
          alt-payment methods (Apple Pay, Google Pay, Link, Klarna, Afterpay,
          Affirm) cover the breadth a second processor would. */}
      <section>
        <div className="mb-2.5">
          <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-near-black">Payments</h2>
          <p className="text-xs text-muted-text mt-0.5">Accept appointment payments + deposits.</p>
        </div>
        <StripeConnectCard />
      </section>

      {/* Calendars — T1.1 lives here. IcsFeedCard is a status-driven card
          (real "Live" badge, copy URL, regenerate). The other tiles stay
          as coming-soon placeholders for now. */}
      <section>
        <div className="mb-2.5">
          <h2 className="text-xs font-bold tracking-[0.18em] uppercase text-near-black">Calendars</h2>
          <p className="text-xs text-muted-text mt-0.5">
            Show bookings in your day view, and block out times you&apos;re already busy.
          </p>
        </div>
        <div className="space-y-3">
          <IcsFeedCard />
          <GoogleCalendarCard />
          {calendarTiles.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {calendarTiles.map(tile => <Tile key={tile.key} t={tile} />)}
            </div>
          )}
        </div>
      </section>

      {restCategories.map(cat => (
        <CategorySection key={cat.key} category={cat} />
      ))}
    </div>
  )
}

// ── Catalog builder ────────────────────────────────────────────────────────

function buildCatalog(): IntegrationCategory[] {
  return [
    {
      key:         'calendars',
      title:       'Calendars',
      description: 'Show bookings in your day view, and block out times you\'re already busy.',
      tiles: [
        // T1.1 ICS feed renders as IcsFeedCard above this grid (status-driven).
        // T1.4 Google Calendar renders as GoogleCalendarCard above this grid
        // (status-driven). Only `busy-import` remains as a coming-soon tile
        // here — that's the post-launch T2.1 two-way sync.
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
      {/* Icon tile — shared icon-box signature */}
      <IconBox icon={Icon} size="md" />

      {/* Body */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-near-black tracking-tight truncate">
                {t.name}
              </h3>
              <StatusBadge domain="integration" status={t.status} label={t.statusLabel} />
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
