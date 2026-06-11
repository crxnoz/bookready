'use client'

/**
 * Opaline — premium luxury beauty + spa template.
 *
 * For estheticians, med spas, lash + brow artists, waxing studios,
 * injectors, PMU artists, and boutique skin clinics that want to feel
 * established, calm, and high-end. The aesthetic is pearl + champagne +
 * marble + silk: bright, soft, generously spaced, timeless. Luxury
 * through restraint — the gold whispers, the whitespace breathes.
 *
 * Visual vocabulary:
 *   - Constant pearl/marble canvas (#F7F3EC); the accent swatch tones
 *     CTAs + ornaments + active states (champagne default).
 *   - Cormorant Garamond display serif + Jost humanist sans.
 *   - Hairline champagne rules, soft small radii, lots of air.
 *   - Tracked uppercase Jost eyebrows over light Cormorant headings.
 *   - Sticky tab rail; the active tab gets a soft champagne-wash pill
 *     (the Opaline signature — distinct from the other templates' bars
 *     and sparkles).
 *
 * All 12 required sections render. Empty data shows a calm empty state.
 * Booking embeds the platform flow via OpalineBooking, re-skinned to
 * the pearl + champagne palette.
 */

import { useState, useRef } from 'react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import OpalineBooking from './OpalineBooking'

// ── Contact-href helper ──────────────────────────────────────────────────────
// Normalizes bare phone/email/sms input to a scheme, then runs it through the
// shared safeHref allowlist so tenant-controlled values can't inject
// javascript:/data: schemes (matches VelvetTheory + LushStudio).
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

// ── Brand glyphs lucide doesn't ship (Opaline draws its own SVG icon set so it
// stays dependency-free; sized for the small hero pill at 14px). ──
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
  // Stroked camera-square + lens + flash dot — matches the visual weight
  // of the brand glyphs above without filing off the official IG mark.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function DirectionsGlyph({ size = 14 }: { size?: number }) {
  // Map-pin glyph — same stroke weight as the Instagram square so the
  // two new icons land in the same visual family as the existing set.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}
function LinkGlyph({ size = 14 }: { size?: number }) {
  // Chain-link glyph (lucide Link2 geometry) for owner-defined custom links —
  // same stroke weight as the Instagram + Directions glyphs above.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" x2="16" y1="12" y2="12" />
    </svg>
  )
}

interface Props {
  site: PublicSite
  slug: string
}

type TabId = 'book' | 'gallery' | 'results' | 'about' | 'policy' | 'advice' | 'timeline'

// Map website_sections.section_key → TabId. Accepts both canonical and
// legacy keys so older tenants who predate the M3 rename still resolve.
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

// Pick a readable foreground (#FFFFFF or warm near-black) for text sitting
// ON a solid accent fill. Champagne (#B89B72, lum ~0.62) reads cleaner with
// dark text — the threshold below biases toward the warm ink so light/metallic
// accents stay elegant rather than washing out white text.
function pickOnAccent(hex: string | null | undefined): string {
  if (!hex) return '#2A2620'
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#2A2620'
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.45 ? '#2A2620' : '#FBF8F2'
}

export default function OpalineTemplate({ site, slug }: Props) {
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
  // Loosely-typed view of the policy bag — mirrors the old `any` access so
  // owner-extra fields the BusinessPolicy interface doesn't enumerate (e.g.
  // guest_policy) still resolve at runtime without a TS error.
  const policies: any = site.policies ?? {}

  // Accent (tenant-picked or champagne default). Canvas + ink stay constant.
  const accentHex = settings?.theme?.accent_color || '#B89B72'
  const onAccent  = pickOnAccent(accentHex)

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
    { id: 'book',     label: tabs.book_label     ?? 'Reserve' },
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Gallery' },
    { id: 'results',  label: tabs.results_label  ?? 'Results' },
    { id: 'about',    label: tabs.about_label    ?? 'About' },
    { id: 'policy',   label: tabs.policy_label   ?? 'Policies' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Care' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Visit' },
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
      <style>{OPALINE_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <div
        className="opaline-template"
        style={{
          ['--opaline-accent' as any]: accentHex,
          ['--opaline-on-accent' as any]: onAccent,
        }}
      >

        {/* 1. Announcement */}
        {header.show_announcement && header.announcement_text && (
          <div className="opaline-announce">
            <span className="opaline-announce-mark" aria-hidden="true">&#9670;</span>
            <span>{header.announcement_text}</span>
            <span className="opaline-announce-mark" aria-hidden="true">&#9670;</span>
          </div>
        )}

        {/* 2. Header / Hero */}
        <header className="opaline-header">
          {header.cover_image_url && (
            <div className="opaline-cover-wrap">
              <img className="opaline-cover" src={header.cover_image_url} alt="" />
              <div className="opaline-cover-veil" aria-hidden="true" />
            </div>
          )}
          <div className="opaline-header-inner">
            {header.avatar_image_url && (
              <img className="opaline-avatar" src={header.avatar_image_url} alt="" />
            )}
            <p className="opaline-eyebrow">{p?.business_type || 'Studio'}</p>
            <h1 className="opaline-name">{display}</h1>
            {p?.tagline && <p className="opaline-tagline">{p.tagline}</p>}
            <span className="opaline-rule-ornament" aria-hidden="true" />
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* ── Sticky tab rail ── */}
        <div className="opaline-tab-rail" ref={tabRailRef}>
          <div className="opaline-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`opaline-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Reserve / Book */}
        <div className={`opaline-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'}>
          <section className="opaline-section opaline-book" aria-label={tabs.book_label ?? 'Reserve'}>
            <OpalineBooking
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

        {/* 4. Gallery */}
        {enabledByTab.gallery && (
          <div className={`opaline-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <GallerySection
              items={site.gallery}
              groups={site.gallery_groups}
              layout={settings.gallery?.layout ?? null}
              heading={settings.gallery?.heading || 'Portfolio'}
              eyebrow={tabs.gallery_label ?? 'Gallery'}
              displayName={display}
              emptyText="A curated gallery of recent work will appear here."
              ariaLabel={tabs.gallery_label ?? 'Gallery'}
            />
          </div>
        )}

        {/* 5. Results / Before & After */}
        {enabledByTab.results && (
          <div className={`opaline-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <BeforeAfterSection
              items={site.results ?? site.before_after}
              groups={site.results_groups ?? site.before_after_groups}
              layout={settings.results?.layout ?? null}
              heading={settings.results?.heading || 'Before & After'}
              eyebrow={tabs.results_label ?? 'Results'}
              separator="◆"
              labels
              emptyText="Before-and-after results will be shown here."
              ariaLabel={tabs.results_label ?? 'Results'}
            />
          </div>
        )}

        {/* 6. About */}
        {enabledByTab.about && (
          <div className={`opaline-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="opaline-section opaline-about" aria-label={tabs.about_label ?? 'About'}>
              {aboutImages[0] && (
                <div className="opaline-about-feature">
                  <img src={aboutImages[0]!} alt="" loading="lazy" />
                </div>
              )}
              <SectionHeader eyebrow={tabs.about_label ?? 'About'} title={about.heading ?? 'About'} />
              {about.body && <p className="opaline-about-body">{about.body}</p>}
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="opaline-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      {h.title && <h3>{h.title}</h3>}
                      {h.body && <p>{h.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
              {(aboutImages[1] || aboutImages[2]) && (
                <div className="opaline-about-pair">
                  {[aboutImages[1], aboutImages[2]].map((img, i) => (
                    img
                      ? <div key={i} className="opaline-about-pair-img"><img src={img} alt="" loading="lazy" /></div>
                      : <div key={i} className="opaline-about-pair-img opaline-about-pair-img--empty" aria-hidden="true" />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 7. Policies */}
        {enabledByTab.policy && (
          <div className={`opaline-tab-panel${active === 'policy' ? ' is-active' : ''}`}
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
              heading={settings.policy?.heading || 'Good to Know'}
              eyebrow={tabs.policy_label ?? 'Policies'}
              marker="none"
              emptyText="Booking policies will appear here."
              ariaLabel={tabs.policy_label ?? 'Policies'}
            />
          </div>
        )}

        {/* 8. Advice / Care */}
        {enabledByTab.advice && (
          <div className={`opaline-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <InstructionsSection
              items={advice}
              heading={settings.advice?.heading ?? 'Care notes'}
              eyebrow={tabs.advice_label ?? 'Care'}
              cardKicker={settings.advice?.card_kicker}
              markGlyph="◆"
              emptyText="Aftercare guidance will appear here."
              ariaLabel={tabs.advice_label ?? 'Care'}
            />
          </div>
        )}

        {/* 9. Timeline / Visit */}
        {enabledByTab.timeline && (
          <div className={`opaline-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <InstructionsSection
              items={timeline}
              heading={settings.timeline?.heading ?? 'Your visit'}
              eyebrow={tabs.timeline_label ?? 'Visit'}
              cardKicker={settings.timeline?.card_kicker}
              numbered
              emptyText="A simple step-by-step of your visit will appear here."
              ariaLabel={tabs.timeline_label ?? 'Visit'}
            />
          </div>
        )}

        {/* 10. FAQ — first section migrated to the shared, theme-tokenized
            platform component (@bkrdy/platform/sections). Opaline's palette
            is bridged onto the canonical --brk-* tokens above, so this
            renders identically to the old inline .opaline-faq markup.
            See web/templates/ARCHITECTURE.md. */}
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
            eyebrow="Kind Words"
            starGlyph="♦"
          />
        )}

        {/* 12. Thank-you */}
        <ThanksSection
          show={additionals.show_thank_you}
          title={additionals.thank_you_title}
          body={additionals.thank_you_body}
          signature={additionals.thank_you_signature}
          fallbackSignature={display}
          eyebrow={settings.additionals?.thank_you_eyebrow || 'With Gratitude'}
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

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="opaline-section-head">
      <p className="opaline-eyebrow">{eyebrow}</p>
      <h2 className="opaline-section-title">{title}</h2>
    </header>
  )
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  // Each entry resolves its own href (URL override → profile fallback) and
  // carries an optional icon. The brand/contact buttons get a glyph; the
  // text-forward Reserve/Call/Email/etc. labels carry the meaning on their own.
  const btns: { key: string; href: string | null; label: string; icon?: React.ReactNode }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
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
  // Owner-defined custom links (settings.header.custom_links). Validated
  // server-side; re-checked here against the same scheme allowlist so a
  // stale row can never render a javascript:/data: href.
  const customLinks: { id: string; label: string; url: string }[] =
    (Array.isArray(header.custom_links) ? header.custom_links : [])
      .filter((l: any) => l && typeof l.url === 'string' && /^(https?:\/\/|mailto:|tel:)/i.test(l.url) && l.label)
  if (visible.length === 0 && customLinks.length === 0) return null
  return (
    <nav className="opaline-social" aria-label="Contact">
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
            className={`opaline-social-btn opaline-social-btn--${b.key}${b.key === 'book' ? ' opaline-social-btn--primary' : ''}`}
            onClick={onClick}
          >
            {b.icon && <span className="opaline-social-ico" aria-hidden="true">{b.icon}</span>}
            {b.label}
          </a>
        )
      })}
      {customLinks.map(l => {
        const isWeb = /^https?:/i.test(l.url)
        return (
          <a
            key={l.id}
            href={safeHref(l.url)}
            target={isWeb ? '_blank' : undefined}
            rel={isWeb ? 'noopener noreferrer' : undefined}
            className="opaline-social-btn opaline-social-btn--custom"
          >
            <span className="opaline-social-ico" aria-hidden="true"><LinkGlyph /></span>
            {l.label}
          </a>
        )
      })}
    </nav>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const OPALINE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap');

.opaline-template {
  ${tokensToCss()}
  --opaline-bg: #F7F3EC;
  --opaline-surface: #FCFAF5;
  --opaline-ink: #2A2620;
  --opaline-muted: #857C70;
  --opaline-rule: rgba(42,38,32,0.12);
  --opaline-accent: #B89B72;
  --opaline-on-accent: #2A2620;
  --opaline-display: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
  --opaline-body: 'Jost', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  /* Bridge Opaline's palette onto the canonical theme tokens consumed by
     the shared section components (@bkrdy/platform/sections). Aliasing in
     CSS means the runtime accent override on --opaline-accent flows through
     automatically. */
  --brk-color-bg: var(--opaline-bg);
  --brk-color-surface: var(--opaline-surface);
  --brk-color-text: var(--opaline-ink);
  --brk-color-muted: var(--opaline-muted);
  --brk-color-rule: var(--opaline-rule);
  --brk-color-accent: var(--opaline-accent);
  --brk-color-on-accent: var(--opaline-on-accent);
  --brk-family-display: var(--opaline-display);
  --brk-family-body: var(--opaline-body);

  background: var(--opaline-bg);
  color: var(--opaline-ink);
  font-family: var(--opaline-body);
  font-size: 16px;
  font-weight: 300;
  line-height: 1.65;
  letter-spacing: 0.01em;
  min-height: 100vh;
  /* overflow-x:clip (NOT hidden) so the sticky tab rail keeps sticking. */
  overflow-x: clip;
}
.opaline-template *, .opaline-template *::before, .opaline-template *::after { box-sizing: border-box; }
.opaline-template img { max-width: 100%; display: block; }
.opaline-template a { color: inherit; text-decoration: none; }
.opaline-template :focus-visible { outline: 2px solid var(--opaline-accent); outline-offset: 3px; }

/* ── Shared eyebrow + section header ── */
.opaline-eyebrow {
  margin: 0;
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--opaline-accent);
}
.opaline-section-head {
  text-align: center;
  margin: 0 auto 44px;
  max-width: 640px;
}
.opaline-section-title {
  margin: 14px 0 0;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: clamp(38px, 5.4vw, 60px);
  line-height: 1.04;
  letter-spacing: 0.005em;
  color: var(--opaline-ink);
}
.opaline-empty {
  text-align: center;
  color: var(--opaline-muted);
  font-style: italic;
  font-family: var(--opaline-display);
  font-size: 19px;
  padding: 28px 0;
}

/* ── Announcement ── */
.opaline-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 13px 24px;
  background: var(--opaline-surface);
  border-bottom: 1px solid var(--opaline-rule);
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--opaline-ink);
  text-align: center;
}
.opaline-announce-mark { color: var(--opaline-accent); font-size: 7px; }

/* ── Header / Hero ── */
.opaline-header { position: relative; }
.opaline-cover-wrap { position: relative; width: 100%; }
.opaline-cover {
  width: 100%;
  height: clamp(280px, 52vw, 560px);
  object-fit: cover;
  filter: saturate(0.94) brightness(1.02);
}
.opaline-cover-veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(247,243,236,0) 40%, rgba(247,243,236,0.55) 100%);
  pointer-events: none;
}
.opaline-header-inner {
  position: relative;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: clamp(48px, 7vw, 80px) var(--brk-space-md) clamp(40px, 6vw, 64px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
/* When a cover exists, lift the identity card up into the soft veil. */
.opaline-cover-wrap + .opaline-header-inner { margin-top: -64px; }
.opaline-avatar {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  object-fit: cover;
  margin: 0 0 22px;
  border: 1px solid var(--opaline-rule);
  background: var(--opaline-surface);
  box-shadow: 0 8px 30px rgba(42,38,32,0.10);
}
.opaline-name {
  margin: 14px 0 0;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: clamp(46px, 8vw, 88px);
  line-height: 1.0;
  letter-spacing: 0.004em;
  color: var(--opaline-ink);
}
.opaline-tagline {
  margin: 16px 0 0;
  max-width: 46ch;
  font-family: var(--opaline-display);
  font-style: italic;
  font-size: clamp(18px, 2.4vw, 23px);
  line-height: 1.5;
  color: var(--opaline-muted);
}
.opaline-rule-ornament {
  display: block;
  width: 56px;
  height: 1px;
  margin: 30px auto;
  background: var(--opaline-accent);
  opacity: 0.7;
}

/* Hero buttons — refined hairline pills, generous padding, calm. */
.opaline-social {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}
.opaline-social-btn {
  display: inline-flex;
  align-items: center;
  padding: 13px 26px;
  border: 1px solid var(--opaline-rule);
  border-radius: 2px;
  background: transparent;
  color: var(--opaline-ink);
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
}
.opaline-social-btn:hover {
  border-color: var(--opaline-accent);
  color: var(--opaline-accent);
}
.opaline-social-btn--primary {
  background: var(--opaline-accent);
  border-color: var(--opaline-accent);
  color: var(--opaline-on-accent);
}
.opaline-social-btn--primary:hover {
  color: var(--opaline-on-accent);
  filter: brightness(1.04);
}
/* Inline glyph that precedes the label on the brand/contact pills. Inherits
   currentColor so it tracks the same hover shift as the text. */
.opaline-social-ico {
  display: inline-flex;
  align-items: center;
  margin-right: 9px;
  color: currentColor;
}
.opaline-social-ico svg { display: block; }
/* Per-type hairline buttons (message + social brands). They share the calm
   pill shell above; the hover simply warms toward the champagne accent like
   the base rule, kept explicit here so future per-brand tints have a home. */
.opaline-social-btn--message:hover,
.opaline-social-btn--tiktok:hover,
.opaline-social-btn--youtube:hover,
.opaline-social-btn--facebook:hover,
.opaline-social-btn--pinterest:hover,
.opaline-social-btn--whatsapp:hover {
  border-color: var(--opaline-accent);
  color: var(--opaline-accent);
}

/* ── Sticky tab rail ── Signature: the active tab fills with a soft
   champagne wash pill (distinct from the other templates' bars + marks). */
.opaline-tab-rail {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--opaline-bg) 86%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--opaline-rule);
  border-bottom: 1px solid var(--opaline-rule);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.opaline-tab-rail::-webkit-scrollbar { display: none; }
.opaline-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  /* width:max-content + margin:0 auto centers the strip when the tabs fit
     and lets it scroll from the START when they overflow. The old
     justify-content:center on an overflow-x:auto rail pushed the first tab
     to a negative, unreachable scroll offset — so it was cut off at the
     start on narrower viewports. */
  width: max-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 12px var(--brk-space-md);
  gap: 6px;
}
.opaline-tab-pill {
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  border-radius: 999px;
  padding: 11px 22px;
  font-family: var(--opaline-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--opaline-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms ease, background 220ms ease;
}
.opaline-tab-pill:hover { color: var(--opaline-ink); }
.opaline-tab-pill.is-active {
  color: var(--opaline-ink);
  background: color-mix(in srgb, var(--opaline-accent) 16%, transparent);
}

.opaline-tab-panel { display: none; }
.opaline-tab-panel.is-active { display: block; }

/* ── Section frame ── generous, breathing. */
.opaline-section {
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(64px, 8vw, 104px) var(--brk-space-md);
}
.opaline-book { padding-top: clamp(40px, 5vw, 64px); }

/* ── Gallery / Results / Policies ── now render via the shared
   GallerySection / BeforeAfterSection / PolicySection components
   (@bkrdy/platform/sections), styled by SECTIONS_CSS against the --brk-*
   tokens bridged above. The shared base metrics were ported verbatim from
   Opaline, so the only skin needed is restoring the signature frosted-glass
   Before/After label pill (the shared base uses a solid surface fill; Opaline
   floats a translucent, blurred pearl pill over the photo). */
.opaline-template .brk-ba-label {
  background: color-mix(in srgb, var(--opaline-bg) 86%, transparent);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

/* ── About ── */
.opaline-about { max-width: 880px; }
.opaline-about-feature {
  margin: 0 0 52px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--opaline-rule);
  aspect-ratio: 16/9;
}
.opaline-about-feature img { width: 100%; height: 100%; object-fit: cover; }
.opaline-about-body {
  max-width: 60ch;
  margin: 0 auto;
  text-align: center;
  font-size: 18px;
  line-height: 1.85;
  color: color-mix(in srgb, var(--opaline-ink) 88%, var(--opaline-muted));
}
.opaline-highlights {
  list-style: none;
  margin: 52px auto 0;
  padding: 0;
  max-width: 720px;
  display: grid;
  gap: 0;
}
.opaline-highlights > li {
  padding: 28px 0;
  border-top: 1px solid var(--opaline-rule);
  text-align: center;
}
.opaline-highlights > li:last-child { border-bottom: 1px solid var(--opaline-rule); }
.opaline-highlights h3 {
  margin: 0 0 8px;
  font-family: var(--opaline-display);
  font-weight: 500;
  font-size: 25px;
  letter-spacing: 0.005em;
  color: var(--opaline-ink);
}
.opaline-highlights p { margin: 0; font-size: 15px; line-height: 1.7; color: var(--opaline-muted); }
.opaline-about-pair {
  margin: 56px auto 0;
  max-width: 720px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.opaline-about-pair-img {
  overflow: hidden;
  border-radius: 3px;
  border: 1px solid var(--opaline-rule);
  aspect-ratio: 4/5;
}
.opaline-about-pair-img img { width: 100%; height: 100%; object-fit: cover; }
.opaline-about-pair-img--empty {
  background: linear-gradient(135deg, color-mix(in srgb, var(--opaline-accent) 6%, var(--opaline-surface)), color-mix(in srgb, var(--opaline-accent) 14%, var(--opaline-surface)));
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .opaline-tab-pill,
  .opaline-social-btn { transition: none !important; }
}
`
