'use client'

/**
 * Phase 18 — Coming-soon teasers.
 *
 * Two exports:
 *   - ComingSoonPanel — full-page hero + grid of feature cards. Used by
 *     "soon" nav tabs (Website → Announcements, Website → Introduction,
 *     Bookings → Waitlist).
 *   - ComingSoonCard  — single inline preview tile dropped inside an
 *     existing editor (e.g. Services > Packages, Availability > Group
 *     appointments).
 *
 * Pure display. Nothing here hits the backend.
 */

import type { ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SoonFeature {
  icon:        React.ElementType
  title:       string
  description: string
  bullets?:    string[]   // optional list of sub-features
  tone?:       'accent' | 'default'  // accent = pink-tinted card
}

/**
 * Full-page "coming soon" panel used by sub-tabs that aren't built yet
 * but should advertise what's coming. Hero + grid of teaser cards.
 */
export function ComingSoonPanel({
  eyebrow = 'Coming soon',
  title,
  intro,
  features,
}: {
  eyebrow?: string
  title:    string
  intro:    string
  features: SoonFeature[]
}) {
  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#FFE5F0] via-white to-[#F0E5FF] border border-[rgba(18,18,18,0.10)] p-6 sm:p-8 relative overflow-hidden">
        {/* Decorative sparkles */}
        <Sparkles
          size={120}
          strokeWidth={1}
          className="absolute -top-4 -right-4 text-[rgba(255,61,190,0.08)] pointer-events-none"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-near-black bg-white border border-near-black px-2 py-1">
            <Sparkles size={11} /> {eyebrow}
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-near-black mt-3 tracking-tight">
            {title}
          </h2>
          <p className="text-[13px] text-near-black/75 mt-2 max-w-2xl leading-relaxed">
            {intro}
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {features.map((f, i) => (
          <FeatureTile key={i} feature={f} />
        ))}
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-muted-text text-center pt-2">
        Have a feature request? Reply to any BookReady email and let us know what you want most.
      </p>
    </div>
  )
}

function FeatureTile({ feature }: { feature: SoonFeature }) {
  const Icon = feature.icon
  const accent = feature.tone === 'accent'
  return (
    <article
      className={cn(
        'border p-4 flex flex-col gap-2.5',
        accent
          ? 'bg-[#FFF5FB] border-[rgba(255,61,190,0.25)]'
          : 'bg-white border-[rgba(18,18,18,0.10)]',
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn(
          'w-9 h-9 flex items-center justify-center border flex-shrink-0',
          accent
            ? 'bg-white border-[rgba(255,61,190,0.30)] text-[#b8197f]'
            : 'bg-cream border-[rgba(18,18,18,0.08)] text-near-black',
        )}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-bold text-near-black">{feature.title}</p>
            <SoonBadge />
          </div>
        </div>
      </div>
      <p className="text-[12px] text-near-black/70 leading-relaxed">{feature.description}</p>
      {feature.bullets && feature.bullets.length > 0 && (
        <ul className="space-y-1 mt-1">
          {feature.bullets.map((b, i) => (
            <li key={i} className="text-[11px] text-near-black/70 leading-snug flex items-start gap-1.5">
              <span className="text-[#b8197f] mt-1 flex-shrink-0">·</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

/**
 * Inline single-card teaser. Drops inside an existing editor section.
 * Used by Services > Packages, Availability > Group appointments, etc.
 */
export function ComingSoonCard({
  icon: Icon,
  title,
  description,
  bullets,
  tone = 'default',
}: {
  icon:        React.ElementType
  title:       string
  description: string
  bullets?:    string[]
  tone?:       'accent' | 'default'
}) {
  const accent = tone === 'accent'
  return (
    <div
      className={cn(
        'border p-4 relative',
        accent
          ? 'bg-[#FFF5FB] border-[rgba(255,61,190,0.25)]'
          : 'bg-white border-[rgba(18,18,18,0.10)] border-dashed',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          'w-9 h-9 flex items-center justify-center border flex-shrink-0',
          accent
            ? 'bg-white border-[rgba(255,61,190,0.30)] text-[#b8197f]'
            : 'bg-cream border-[rgba(18,18,18,0.10)] text-muted-text',
        )}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-near-black">{title}</p>
            <SoonBadge />
          </div>
          <p className="text-[11px] text-near-black/65 mt-1 leading-relaxed">{description}</p>
          {bullets && bullets.length > 0 && (
            <ul className="space-y-1 mt-2">
              {bullets.map((b, i) => (
                <li key={i} className="text-[11px] text-near-black/65 leading-snug flex items-start gap-1.5">
                  <span className="text-[#b8197f] mt-1 flex-shrink-0">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function SoonBadge() {
  return (
    <span className="text-[8px] font-bold tracking-[0.14em] uppercase border border-[rgba(255,61,190,0.40)] bg-[rgba(255,61,190,0.10)] text-[#b8197f] px-1.5 py-0.5 inline-flex items-center gap-1">
      <Sparkles size={9} strokeWidth={2} /> Soon
    </span>
  )
}
