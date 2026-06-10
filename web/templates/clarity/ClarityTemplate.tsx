'use client'

/**
 * Clarity, minimalist clinical luxury template.
 *
 * For medspas, fine-line and micro-tattoo studios, premium nail and lash
 * studios that want to read as luxury. The aesthetic is ultra-clean
 * Apple Newsroom: type-led, photo-light, generous whitespace, fine sans
 * throughout, a single muted accent. Sharp not rounded.
 *
 * Visual vocabulary:
 *   - Constant pure white canvas (#FFFFFF); a hair-of-grey surface
 *     (#FAFAFA) to define cards; ink (#1A1A1A); muted (#6B6B6B);
 *     hairline (#E5E5E5); muted sage accent default (#9EAD9C).
 *   - Inter throughout, NO SERIFS. Display weights 300 (light) + 400
 *     for the editorial luxury move; body 400 + 500.
 *   - Eyebrows: small uppercase Inter at 10px tracked 0.24em, accent
 *     colored.
 *   - Section titles: Inter light 300 at clamp(42px, 6vw, 72px), the
 *     "thin big" Apple move.
 *   - Sharp corners everywhere (radius 0), including buttons, cards,
 *     and the inner booking flow.
 *   - Primary CTA: charcoal fill, white text. Secondary: bare
 *     underlined link, no border, accent on hover.
 *   - Sticky tab rail; active marker is a small accent-colored 1px
 *     status dot to the LEFT of the label, with the label color
 *     trading from muted to ink. The Apple-style status dot, distinct
 *     from the other shipped templates' markers.
 *
 * All 12 required sections render. Empty data shows a calm empty state.
 * Booking embeds the platform flow via ClarityBooking, re-skinned to
 * the white + muted-accent palette.
 */

import { useState, useRef } from 'react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import ClarityBooking from './ClarityBooking'

// Contact-href helper: normalize bare phone/email/sms input to a scheme, then
// run it through the shared safeHref allowlist so tenant-controlled values
// can't inject javascript:/data: schemes.
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i
function ensureScheme(raw: string | null | undefined, fallback: 'tel' | 'mailto' | 'sms'): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  if (SCHEME_RE.test(v)) return v
  if (v.startsWith('//')) return `https:${v}`
  if (fallback === 'mailto' && v.includes('@')) return `mailto:${v}`
  if (fallback === 'tel') return `tel:${v.replace(/[^\d+]/g, '')}`
  if (fallback === 'sms') return `sms:${v.replace(/[^\d+]/g, '')}`
  return v
}
function safeContactHref(raw: string | null | undefined, fallback: 'tel' | 'mailto' | 'sms'): string | null {
  return safeHref(ensureScheme(raw, fallback)) ?? null
}

// Brand glyphs lucide doesn't ship. All buttons in the contact row carry a
// glyph (per gotcha 11: all or none).
function TikTokGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.91a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
    </svg>
  )
}
function PinterestGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 4.25 2.65 7.88 6.39 9.34-.09-.79-.17-2 .03-2.86.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.34-.24 1 .5 1.81 1.49 1.81 1.79 0 3.17-1.89 3.17-4.62 0-2.42-1.74-4.11-4.22-4.11-2.87 0-4.56 2.15-4.56 4.38 0 .87.33 1.8.75 2.31a.3.3 0 0 1 .07.29c-.08.32-.26 1.04-.29 1.18-.05.2-.16.24-.36.15-1.34-.62-2.17-2.59-2.17-4.16 0-3.39 2.46-6.5 7.09-6.5 3.72 0 6.61 2.65 6.61 6.19 0 3.7-2.33 6.68-5.57 6.68-1.09 0-2.11-.57-2.46-1.24l-.67 2.55c-.24.93-.89 2.1-1.33 2.81.99.31 2.04.47 3.13.47 5.54 0 10.04-4.5 10.04-10.04C22.08 6.5 17.58 2 12.04 2z"/>
    </svg>
  )
}
function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.07 4.49.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.5 2 2 6.5 2 12.04c0 1.94.55 3.74 1.5 5.27L2 22l4.84-1.46a10.05 10.05 0 0 0 5.2 1.46c5.54 0 10.04-4.5 10.04-10.04S17.58 2 12.04 2zm0 18.13a8.07 8.07 0 0 1-4.4-1.27l-.31-.19-2.87.87.86-2.8-.2-.32a8.07 8.07 0 0 1-1.27-4.38c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.09-8.09 8.09z"/>
    </svg>
  )
}
function MessageGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  )
}
function YoutubeGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23 12s0-3.2-.41-4.73a2.5 2.5 0 0 0-1.76-1.77C19.31 5.09 12 5.09 12 5.09s-7.31 0-8.83.41A2.5 2.5 0 0 0 1.41 7.27C1 8.8 1 12 1 12s0 3.2.41 4.73a2.5 2.5 0 0 0 1.76 1.77c1.52.41 8.83.41 8.83.41s7.31 0 8.83-.41a2.5 2.5 0 0 0 1.76-1.77C23 15.2 23 12 23 12zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
    </svg>
  )
}
function FacebookGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.78-3.91 1.1 0 2.24.2 2.24.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22c4.78-.76 8.44-4.92 8.44-9.94z"/>
    </svg>
  )
}
function InstagramGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function DirectionsGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}
function PhoneGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function MailGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="0" />
      <path d="M2 6l10 7 10-7" />
    </svg>
  )
}
function CalendarGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="0" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

interface Props {
  site: PublicSite
  slug: string
}

type TabId = 'book' | 'gallery' | 'results' | 'about' | 'policy' | 'advice' | 'timeline'

const SECTION_KEY_TO_TAB: Record<string, TabId> = {
  book: 'book',
  gallery: 'gallery',
  results: 'results',
  before_after: 'results',
  about: 'about',
  policy: 'policy',
  policies: 'policy',
  advice: 'advice',
  steps: 'advice',
  timeline: 'timeline',
  before_appointment: 'timeline',
}

// Pick a readable foreground for text sitting ON a solid accent fill.
// The 4 Clarity swatches are all muted/dusty (sage, dusty rose, mauve,
// stone) and dark ink (#1A1A1A) reads cleanly on every one of them, so
// default to dark and only flip to white if the owner ever swaps to a
// genuinely dark accent.
function pickOnAccentColor(hex: string | null | undefined): string {
  if (!hex) return '#1A1A1A'
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#1A1A1A'
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.4 ? '#1A1A1A' : '#FFFFFF'
}

export default function ClarityTemplate({ site, slug }: Props) {
  const p          = site.profile
  const display    = p?.business_name ?? site.business_name ?? site.slug
  const services   = (site.services ?? []).filter(s => s.is_active)
  const hours      = site.hours ?? []
  const settings: any = site.template?.settings ?? {}
  const header: any   = settings.header ?? {}
  const tabs:   any   = settings.tabs ?? {}
  const about:  any   = settings.about ?? {}
  const additionals: any = settings.additionals ?? {}
  const advice:   any[] = Array.isArray(settings.advice?.items)   ? settings.advice.items   : []
  const timeline: any[] = Array.isArray(settings.timeline?.items) ? settings.timeline.items : []
  const aboutImages: (string | null)[] = Array.isArray(about.images) ? about.images : []
  const policies: any = site.policies ?? {}

  const accentHex = settings?.theme?.accent_color || '#9EAD9C'
  const onAccent  = pickOnAccentColor(accentHex)

  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)

  const enabledByTab: Record<TabId, boolean> = {
    book: true, gallery: true, results: true, about: true,
    policy: true, advice: true, timeline: true,
  }
  const sectionsList = site.template?.sections ?? []
  if (sectionsList.length > 0) {
    for (const s of sectionsList) {
      const tabId = SECTION_KEY_TO_TAB[s.section_key]
      if (tabId) enabledByTab[tabId] = s.is_enabled
    }
  }

  const orderByTab: Record<string, number> = {}
  for (const s of (site.template?.sections ?? [])) {
    const tid = SECTION_KEY_TO_TAB[s.section_key]
    if (tid) orderByTab[tid] = s.sort_order
  }

  const allTabs: { id: TabId; label: string }[] = [
    { id: 'book',     label: tabs.book_label     ?? 'Book' },
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Work' },
    { id: 'results',  label: tabs.results_label  ?? 'Results' },
    { id: 'about',    label: tabs.about_label    ?? 'About' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Aftercare' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Your visit' },
    { id: 'policy',   label: tabs.policy_label   ?? 'Notes' },
  ]
  const visibleTabs = allTabs
    .filter(t => t.id === 'book' || enabledByTab[t.id])
    .sort((a, b) => (orderByTab[a.id] ?? 999) - (orderByTab[b.id] ?? 999))

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      <style>{CLARITY_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <div
        className="clarity-template"
        style={{
          ['--clarity-accent' as any]: accentHex,
          ['--clarity-on-accent' as any]: onAccent,
        }}
      >

        {/* 1. Announcement */}
        {header.show_announcement && header.announcement_text && (
          <div className="clarity-announce">
            <span>{header.announcement_text}</span>
          </div>
        )}

        {/* 2. Header / Hero */}
        <header className="clarity-header">
          {header.cover_image_url && (
            <div className="clarity-cover-wrap">
              <img className="clarity-cover" src={header.cover_image_url} alt="" />
              <div className="clarity-cover-veil" aria-hidden="true" />
            </div>
          )}
          <div className="clarity-header-inner">
            {header.avatar_image_url && (
              <img className="clarity-avatar" src={header.avatar_image_url} alt="" />
            )}
            <p className="clarity-eyebrow">{p?.business_type || 'Studio'}</p>
            <h1 className="clarity-name">{display}</h1>
            {p?.tagline && <p className="clarity-tagline">{p.tagline}</p>}
            <span className="clarity-rule-ornament" aria-hidden="true" />
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* Sticky tab rail */}
        <div className="clarity-tab-rail" ref={tabRailRef}>
          <div className="clarity-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`clarity-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span className="clarity-tab-dot" aria-hidden="true" />
                <span className="clarity-tab-label">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Book */}
        <div className={`clarity-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'}>
          <section className="clarity-section clarity-book" aria-label={tabs.book_label ?? 'Book'}>
            <ClarityBooking
              slug={slug}
              services={services}
              displayName={display}
              availability={site.availability ?? null}
              paymentSettings={site.payment_settings ?? null}
              requirePolicyAgreement={site.policies?.require_policy_agreement ?? false}
              serviceAddons={site.service_addons ?? []}
              staffMembers={site.staff ?? []}
              serviceCategories={site.service_categories ?? []}
              bookingQuestions={site.booking_questions ?? []}
            />
          </section>
        </div>

        {/* 4. Gallery / Work */}
        {enabledByTab.gallery && (
          <div className={`clarity-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <GallerySection
              items={site.gallery}
              groups={site.gallery_groups}
              heading={settings.gallery?.heading || 'Selected work'}
              eyebrow={tabs.gallery_label ?? 'Work'}
              displayName={display}
              emptyText="Selected work will appear here."
              ariaLabel={tabs.gallery_label ?? 'Work'}
            />
          </div>
        )}

        {/* 5. Results */}
        {enabledByTab.results && (
          <div className={`clarity-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <BeforeAfterSection
              items={site.results ?? site.before_after}
              groups={site.results_groups ?? site.before_after_groups}
              heading={settings.results?.heading || 'Results'}
              eyebrow={tabs.results_label ?? 'Results'}
              separator="/"
              labels
              emptyText="Before-and-after results will appear here."
              ariaLabel={tabs.results_label ?? 'Results'}
            />
          </div>
        )}

        {/* 6. About */}
        {enabledByTab.about && (
          <div className={`clarity-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="clarity-section clarity-about" aria-label={tabs.about_label ?? 'About'}>
              {aboutImages[0] && (
                <div className="clarity-about-feature">
                  <img src={aboutImages[0]!} alt="" loading="lazy" />
                </div>
              )}
              <SectionHeader eyebrow={tabs.about_label ?? 'About'} title={about.heading ?? 'About'} />
              {about.body && <p className="clarity-about-body">{about.body}</p>}
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="clarity-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      {h.title && <h3>{h.title}</h3>}
                      {h.body && <p>{h.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(aboutImages[1] || aboutImages[2]) && (
                <div className="clarity-about-pair">
                  {[aboutImages[1], aboutImages[2]].map((img, i) => (
                    img
                      ? <div key={i} className="clarity-about-pair-img"><img src={img} alt="" loading="lazy" /></div>
                      : <div key={i} className="clarity-about-pair-img clarity-about-pair-img--empty" aria-hidden="true" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 7. Advice / Aftercare */}
        {enabledByTab.advice && (
          <div className={`clarity-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <InstructionsSection
              items={advice}
              heading={settings.advice?.heading ?? 'Aftercare'}
              eyebrow={tabs.advice_label ?? 'Aftercare'}
              cardKicker={settings.advice?.card_kicker}
              markGlyph="/"
              emptyText="Aftercare guidance will appear here."
              ariaLabel={tabs.advice_label ?? 'Aftercare'}
            />
          </div>
        )}

        {/* 8. Timeline / Your visit */}
        {enabledByTab.timeline && (
          <div className={`clarity-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <InstructionsSection
              items={timeline}
              heading={settings.timeline?.heading ?? 'Your visit'}
              eyebrow={tabs.timeline_label ?? 'Your visit'}
              cardKicker={settings.timeline?.card_kicker}
              numbered
              emptyText="A simple step-by-step of your visit will appear here."
              ariaLabel={tabs.timeline_label ?? 'Your visit'}
            />
          </div>
        )}

        {/* 9. Policies / Notes */}
        {enabledByTab.policy && (
          <div className={`clarity-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <PolicySection
              rows={[
                { label: 'Cancellation', body: policies.cancellation_policy },
                { label: 'Late Arrival', body: policies.late_policy },
                { label: 'No-Show',      body: policies.no_show_policy },
                { label: 'Deposit',      body: policies.deposit_policy },
                { label: 'Rescheduling', body: policies.reschedule_policy },
                { label: 'Guests',       body: policies.guest_policy },
              ]}
              customGroups={(Array.isArray(policies.custom_groups) ? policies.custom_groups : []).map((g: any) => ({
                heading: g.heading,
                items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                  title: it.title,
                  content: it.content ?? it.body,
                })),
              }))}
              heading={settings.policy?.heading || 'Notes'}
              eyebrow={tabs.policy_label ?? 'Notes'}
              marker="none"
              emptyText="Booking notes will appear here."
              ariaLabel={tabs.policy_label ?? 'Notes'}
            />
          </div>
        )}

        {/* 10. FAQ */}
        {additionals.faq?.enabled !== false && (
          <FaqSection
            items={additionals.faq?.items}
            heading={additionals.faq?.heading}
            eyebrow="Questions"
          />
        )}

        {/* 11. Reviews */}
        {additionals.reviews?.enabled !== false && (
          <ReviewsSection
            items={additionals.reviews?.items}
            heading={additionals.reviews?.heading}
            eyebrow="Word from customers"
            starGlyph="/"
          />
        )}

        {/* 12. Thank-you + Footer */}
        <ThanksSection
          show={additionals.show_thank_you}
          title={additionals.thank_you_title}
          body={additionals.thank_you_body}
          signature={additionals.thank_you_signature}
          fallbackSignature={display}
          eyebrow={settings.additionals?.thank_you_eyebrow || 'A note'}
        />

        <SiteFooter
          businessName={(settings.footer?.business_name_override ?? '').trim() || display}
          subtext={settings.footer?.subtext}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          brandLabel={settings.footer?.brand_label || 'The Studio'}
          show={{
            quickBook: settings.footer?.show_quick_book,
            hours: settings.footer?.show_hours,
            contact: settings.footer?.show_contact_links,
            poweredBy: settings.footer?.show_powered_by,
          }}
        />
      </div>
    </>
  )
}

// Subcomponents

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="clarity-section-head">
      <p className="clarity-eyebrow">{eyebrow}</p>
      <h2 className="clarity-section-title">{title}</h2>
    </header>
  )
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  // Per gotcha 11: every button carries an icon. Calendar for book, phone /
  // mail / message for contact, mappin for directions, brand glyphs for socials.
  const btns: { key: string; href: string | null; label: string; icon: React.ReactNode }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Book appointment', icon: <CalendarGlyph /> },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call', icon: <PhoneGlyph /> },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email', icon: <MailGlyph /> },
    { key: 'message',    href: safeContactHref(header.message_button_url, 'sms'), label: 'Message', icon: <MessageGlyph /> },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram', icon: <InstagramGlyph /> },
    { key: 'tiktok',     href: safeHref(header.tiktok_button_url) ?? null, label: 'TikTok', icon: <TikTokGlyph /> },
    { key: 'youtube',    href: safeHref(header.youtube_button_url) ?? null, label: 'YouTube', icon: <YoutubeGlyph /> },
    { key: 'facebook',   href: safeHref(header.facebook_button_url) ?? null, label: 'Facebook', icon: <FacebookGlyph /> },
    { key: 'pinterest',  href: safeHref(header.pinterest_button_url) ?? null, label: 'Pinterest', icon: <PinterestGlyph /> },
    { key: 'whatsapp',   href: safeHref(header.whatsapp_button_url) ?? null, label: 'WhatsApp', icon: <WhatsAppGlyph /> },
    { key: 'directions', href: header.directions_button_url || null, label: 'Directions', icon: <DirectionsGlyph /> },
  ]
  const visible = btns.filter(b => header[`show_${b.key}_button`] !== false && b.href)
  if (visible.length === 0) return null
  return (
    <nav className="clarity-social" aria-label="Contact">
      {visible.map(b => {
        const isReserve = b.key === 'book' && !header.book_button_url
        const onClick = isReserve
          ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); goBook() }
          : undefined
        const isWeb = !!b.href && /^https?:/i.test(b.href)
        return (
          <a
            key={b.key}
            href={safeHref(b.href!)}
            target={!isReserve && isWeb ? '_blank' : undefined}
            rel={!isReserve && isWeb ? 'noopener noreferrer' : undefined}
            className={`clarity-social-btn clarity-social-btn--${b.key}${b.key === 'book' ? ' clarity-social-btn--primary' : ''}`}
            onClick={onClick}
          >
            <span className="clarity-social-ico" aria-hidden="true">{b.icon}</span>
            {b.label}
          </a>
        )
      })}
    </nav>
  )
}

// Scoped CSS. NO backticks inside this literal (gotcha 2). Unicode escapes
// require double backslashes (gotcha 3). Tokens injected via tokensToCss()
// (gotcha 1). Theme tokens bridged onto --brk-color-* (gotcha 8).

const CLARITY_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

.clarity-template {
  ${tokensToCss()}
  --clarity-bg: #FFFFFF;
  --clarity-surface: #FAFAFA;
  --clarity-ink: #1A1A1A;
  --clarity-muted: #6B6B6B;
  --clarity-rule: #E5E5E5;
  --clarity-accent: #9EAD9C;
  --clarity-on-accent: #1A1A1A;
  --clarity-danger: #B84545;
  --clarity-display: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --clarity-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  /* Bridge Clarity's palette onto the canonical theme tokens consumed by
     the shared section components (@bkrdy/platform/sections). */
  --brk-color-bg: var(--clarity-bg);
  --brk-color-surface: var(--clarity-surface);
  --brk-color-text: var(--clarity-ink);
  --brk-color-muted: var(--clarity-muted);
  --brk-color-rule: var(--clarity-rule);
  --brk-color-accent: var(--clarity-accent);
  --brk-color-on-accent: var(--clarity-on-accent);
  --brk-family-display: var(--clarity-display);
  --brk-family-body: var(--clarity-body);

  background: var(--clarity-bg);
  color: var(--clarity-ink);
  font-family: var(--clarity-body);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.65;
  letter-spacing: 0.005em;
  min-height: 100vh;
  /* overflow-x:clip (NOT hidden) so the sticky tab rail keeps sticking. */
  overflow-x: clip;
}
.clarity-template *, .clarity-template *::before, .clarity-template *::after { box-sizing: border-box; }
.clarity-template img { max-width: 100%; display: block; }
.clarity-template a { color: inherit; text-decoration: none; }
.clarity-template :focus-visible { outline: 2px solid var(--clarity-accent); outline-offset: 3px; }

/* Eyebrow + section header. Clarity signature: tracked 0.24em uppercase
   Inter at 10px, accent colored. */
.clarity-eyebrow {
  margin: 0;
  font-family: var(--clarity-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--clarity-accent);
}
.clarity-section-head {
  text-align: center;
  margin: 0 auto 64px;
  max-width: 760px;
}
/* Section titles: Inter light (300) at clamp(42px, 6vw, 72px), the
   "thin big" Apple Newsroom move. */
.clarity-section-title {
  margin: 18px 0 0;
  font-family: var(--clarity-display);
  font-weight: 300;
  font-size: clamp(42px, 6vw, 72px);
  line-height: 1.05;
  letter-spacing: -0.012em;
  color: var(--clarity-ink);
}

/* Announcement: a quiet thin strip with hairline borders, Inter tracked
   uppercase. No emoji, no ornaments, no fill. */
.clarity-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 13px 24px;
  background: var(--clarity-bg);
  border-bottom: 1px solid var(--clarity-rule);
  font-family: var(--clarity-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--clarity-muted);
  text-align: center;
}

/* Header / Hero */
.clarity-header { position: relative; background: var(--clarity-bg); }
.clarity-cover-wrap { position: relative; width: 100%; }
.clarity-cover {
  width: 100%;
  height: clamp(320px, 56vw, 600px);
  object-fit: cover;
  filter: saturate(0.96) brightness(1.0);
}
.clarity-cover-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.6) 100%);
  pointer-events: none;
}
.clarity-header-inner {
  position: relative;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: clamp(64px, 9vw, 112px) var(--brk-space-md) clamp(48px, 7vw, 80px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.clarity-cover-wrap + .clarity-header-inner { margin-top: -72px; }
.clarity-avatar {
  width: 84px;
  height: 84px;
  border-radius: 0;
  object-fit: cover;
  margin: 0 0 28px;
  border: 1px solid var(--clarity-rule);
  background: var(--clarity-surface);
}
.clarity-name {
  margin: 18px 0 0;
  font-family: var(--clarity-display);
  font-weight: 300;
  font-size: clamp(52px, 9vw, 104px);
  line-height: 1.0;
  letter-spacing: -0.02em;
  color: var(--clarity-ink);
}
.clarity-tagline {
  margin: 22px 0 0;
  max-width: 52ch;
  font-family: var(--clarity-body);
  font-weight: 400;
  font-size: clamp(17px, 2.2vw, 21px);
  line-height: 1.55;
  color: var(--clarity-muted);
}
.clarity-rule-ornament {
  display: block;
  width: 40px;
  height: 1px;
  margin: 36px auto;
  background: var(--clarity-accent);
  opacity: 0.85;
}

/* Hero contact buttons: sharp pills. Primary = charcoal fill, white
   text; rest = hairline outline that gets accent-toned on hover. */
.clarity-social {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}
.clarity-social-btn {
  display: inline-flex;
  align-items: center;
  padding: 12px 22px;
  border: 1px solid var(--clarity-rule);
  border-radius: 0;
  background: transparent;
  color: var(--clarity-ink);
  font-family: var(--clarity-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: none;
  cursor: pointer;
  transition: border-color 180ms ease, color 180ms ease, background 180ms ease;
}
.clarity-social-btn:hover {
  border-color: var(--clarity-accent);
  color: var(--clarity-accent);
  background: transparent;
}
.clarity-template .clarity-social-btn--primary {
  background: var(--clarity-ink);
  border-color: var(--clarity-ink);
  color: #FFFFFF;
}
.clarity-template .clarity-social-btn--primary:hover {
  background: #0A0A0A;
  border-color: #0A0A0A;
  color: #FFFFFF;
}
.clarity-social-ico {
  display: inline-flex;
  align-items: center;
  margin-right: 9px;
  color: currentColor;
}
.clarity-social-ico svg { display: block; }

/* Sticky tab rail. Signature: the active pill trades its text color
   from muted to ink and reveals a small 1px accent-colored status dot
   to the LEFT of the label. The Apple-style status dot. */
.clarity-tab-rail {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--clarity-bg) 92%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--clarity-rule);
  border-bottom: 1px solid var(--clarity-rule);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.clarity-tab-rail::-webkit-scrollbar { display: none; }
.clarity-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 14px var(--brk-space-md);
  gap: 4px;
}
.clarity-tab-pill {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  border-radius: 0;
  padding: 12px 18px;
  font-family: var(--clarity-body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: none;
  color: var(--clarity-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 180ms ease;
}
.clarity-tab-pill:hover { color: var(--clarity-ink); }
.clarity-tab-pill.is-active { color: var(--clarity-ink); }
.clarity-tab-label { display: inline-block; }
/* Signature: the 4px accent status dot, sharp (no border-radius set,
   purpose is a square dot). Reserves space when inactive so labels
   don't shift on activation. */
.clarity-tab-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  margin-right: 8px;
  background: transparent;
  border-radius: 0;
  transition: background 180ms ease;
}
.clarity-tab-pill.is-active .clarity-tab-dot {
  background: var(--clarity-accent);
}

.clarity-tab-panel { display: none; }
.clarity-tab-panel.is-active { display: block; }

/* Section frame: generous padding (Apple Newsroom voice). */
.clarity-section {
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(80px, 10vw, 140px) var(--brk-space-md);
}
.clarity-book { padding-top: clamp(48px, 6vw, 80px); }

/* Shared sections inherit the bridged tokens, but Clarity wants the
   section eyebrow + title to read in the same way as our bespoke
   header above (small uppercase tracked eyebrow + thin big light
   title). */
.clarity-template .brk-section .brk-eyebrow {
  font-family: var(--clarity-body);
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  font-size: 10px;
  color: var(--clarity-accent);
}
.clarity-template .brk-section .brk-section-title {
  font-family: var(--clarity-display);
  font-weight: 300;
  letter-spacing: -0.012em;
  color: var(--clarity-ink);
}

/* About: editorial layout. Single feature image up top (photography
   single-shot, never collage), body centered, highlights as a stacked
   ruled list, optional pair below. */
.clarity-about { max-width: 880px; }
.clarity-about-feature {
  margin: 0 0 64px;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--clarity-rule);
  aspect-ratio: 16/9;
  background: var(--clarity-surface);
}
.clarity-about-feature img { width: 100%; height: 100%; object-fit: cover; }
.clarity-about-body {
  max-width: 62ch;
  margin: 0 auto;
  text-align: center;
  font-size: 18px;
  line-height: 1.8;
  color: color-mix(in srgb, var(--clarity-ink) 88%, var(--clarity-muted));
  white-space: pre-line;
}
.clarity-highlights {
  list-style: none;
  margin: 64px auto 0;
  padding: 0;
  max-width: 760px;
  display: grid;
  gap: 0;
}
.clarity-highlights > li {
  padding: 32px 0;
  border-top: 1px solid var(--clarity-rule);
  text-align: center;
}
.clarity-highlights > li:last-child { border-bottom: 1px solid var(--clarity-rule); }
.clarity-highlights h3 {
  margin: 0 0 10px;
  font-family: var(--clarity-display);
  font-weight: 400;
  font-size: 24px;
  letter-spacing: -0.006em;
  color: var(--clarity-ink);
}
.clarity-highlights p { margin: 0; font-size: 15px; line-height: 1.7; color: var(--clarity-muted); }
.clarity-about-pair {
  margin: 64px auto 0;
  max-width: 760px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.clarity-about-pair-img {
  overflow: hidden;
  border-radius: 0;
  border: 1px solid var(--clarity-rule);
  aspect-ratio: 4/5;
}
.clarity-about-pair-img img { width: 100%; height: 100%; object-fit: cover; }
.clarity-about-pair-img--empty {
  background: linear-gradient(135deg, color-mix(in srgb, var(--clarity-accent) 8%, var(--clarity-surface)), color-mix(in srgb, var(--clarity-accent) 14%, var(--clarity-surface)));
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .clarity-tab-pill,
  .clarity-tab-dot,
  .clarity-social-btn { transition: none !important; }
}
`
