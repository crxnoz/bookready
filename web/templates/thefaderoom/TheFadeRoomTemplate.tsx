'use client'

/**
 * The Fade Room — late-night neon nail + lash studio template.
 *
 * Visual language:
 *   - Deep midnight canvas (#0F0A1A) with a tenant-pickable neon accent
 *     (default hot pink #FF3DBE; full palette in manifest.ts)
 *   - Bricolage Grotesque for display + Inter for body — playful but
 *     legible, more personality than Blackline's Space Grotesk
 *   - Soft 8–12px rounded corners (friendlier than Blackline's hard
 *     zero, more confident than Lush's soft cards)
 *   - Subtle neon glow on accent surfaces — accent text-shadow on
 *     eyebrows + section titles, box-shadow on CTAs/active states
 *   - Pill-shaped buttons (vs Blackline's square pills) — fits the
 *     fun, after-hours energy
 *
 * Section structure mirrors Blackline / VT: sticky tab rail with 7
 * panels (book, gallery, results, about, policy, advice, timeline),
 * plus always-visible FAQ + Reviews + Thank-you + Footer below.
 */

import { useState, useRef, type ComponentType } from 'react'
import { CalendarPlus, Phone, Mail, Instagram, MapPin, MessageSquare, Youtube, Facebook } from 'lucide-react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import TheFadeRoomBooking from './TheFadeRoomBooking'

// ── Brand glyphs lucide doesn't ship (sized to match the lucide icons
//    in the social pills — see SocialButtons). ──
function TikTokGlyph({ size = 14 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.91a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
    </svg>
  )
}
function PinterestGlyph({ size = 14 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 4.25 2.65 7.88 6.39 9.34-.09-.79-.17-2 .03-2.86.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.34-.24 1 .5 1.81 1.49 1.81 1.79 0 3.17-1.89 3.17-4.62 0-2.42-1.74-4.11-4.22-4.11-2.87 0-4.56 2.15-4.56 4.38 0 .87.33 1.8.75 2.31a.3.3 0 0 1 .07.29c-.08.32-.26 1.04-.29 1.18-.05.2-.16.24-.36.15-1.34-.62-2.17-2.59-2.17-4.16 0-3.39 2.46-6.5 7.09-6.5 3.72 0 6.61 2.65 6.61 6.19 0 3.7-2.33 6.68-5.57 6.68-1.09 0-2.11-.57-2.46-1.24l-.67 2.55c-.24.93-.89 2.1-1.33 2.81.99.31 2.04.47 3.13.47 5.54 0 10.04-4.5 10.04-10.04C22.08 6.5 17.58 2 12.04 2z"/>
    </svg>
  )
}
function WhatsAppGlyph({ size = 14 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.07 4.49.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.5 2 2 6.5 2 12.04c0 1.94.55 3.74 1.5 5.27L2 22l4.84-1.46a10.05 10.05 0 0 0 5.2 1.46c5.54 0 10.04-4.5 10.04-10.04S17.58 2 12.04 2zm0 18.13a8.07 8.07 0 0 1-4.4-1.27l-.31-.19-2.87.87.86-2.8-.2-.32a8.07 8.07 0 0 1-1.27-4.38c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.09-8.09 8.09z"/>
    </svg>
  )
}

// Normalize a bare phone number into an sms: URI (mirrors VT/Lush's
// safeContactHref(url, 'sms')). Already-schemed values pass through to
// safeHref, which enforces the allowlist (sms:/tel:/mailto:/http(s):).
function smsHref(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v) return null
  if (/^[a-z][a-z0-9+.\-]*:/i.test(v) || v.startsWith('//')) return v
  return `sms:${v.replace(/[^\d+]/g, '')}`
}

interface Props {
  site: PublicSite
  slug: string
}

type TabId = 'book' | 'gallery' | 'results' | 'about' | 'policy' | 'advice' | 'timeline'

// Section keys → tab IDs. Accepts canonical + legacy (TFR previously
// used 'aftercare' for advice and 'before' for timeline; the M3 migration
// canonicalized them but legacy keys remain valid for older tenants).
const SECTION_KEY_TO_TAB: Record<string, TabId> = {
  book: 'book',
  gallery: 'gallery',
  results: 'results',
  before_after: 'results',
  about: 'about',
  policy: 'policy',
  policies: 'policy',
  advice: 'advice',
  aftercare: 'advice',
  steps: 'advice',
  timeline: 'timeline',
  before: 'timeline',
  before_appointment: 'timeline',
}

export default function TheFadeRoomTemplate({ site, slug }: Props) {
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
  // Loosely-typed view of the policy bag so owner-extra fields the
  // BusinessPolicy interface doesn't enumerate still resolve at runtime.
  const policies: any = site.policies ?? {}

  // Resolve accent — tenant-picked or pink default.
  const accent = settings?.theme?.accent_color || '#FF3DBE'

  // ── Tab state ──
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

  const allTabs: { id: TabId; label: string }[] = [
    { id: 'book',     label: tabs.book_label     ?? 'Book' },
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Work' },
    { id: 'results',  label: tabs.results_label  ?? 'Before / After' },
    { id: 'about',    label: tabs.about_label    ?? 'The Shop' },
    { id: 'policy',   label: tabs.policy_label   ?? 'House Rules' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Notes' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Process' },
  ]
  const orderByTab: Record<string, number> = {}
  for (const s of (site.template?.sections ?? [])) {
    const tid = SECTION_KEY_TO_TAB[s.section_key]
    if (tid) orderByTab[tid] = s.sort_order
  }
  const visibleTabs = allTabs
    .filter(t => t.id === 'book' || enabledByTab[t.id])
    .sort((a, b) => (orderByTab[a.id] ?? 999) - (orderByTab[b.id] ?? 999))

  // Reuse the exact resolved tab labels for each tabbed section's eyebrow,
  // so editing a tab name in the editor updates both the rail pill and the
  // section's small uppercase eyebrow.
  const tabLabel = Object.fromEntries(allTabs.map(t => [t.id, t.label])) as Record<TabId, string>

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=DM+Serif+Text:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600;700&display=swap"
      />
      <style>{TFR_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <div
        className="tfr-template"
        style={{
          ['--tfr-accent' as any]: accent,
        }}
      >

        {/* 1. Announcement bar */}
        {header.show_announcement && header.announcement_text && (
          <div className="tfr-announce">
            <span className="tfr-announce-spark" aria-hidden="true">✦</span>
            <span>{header.announcement_text}</span>
            <span className="tfr-announce-spark" aria-hidden="true">✦</span>
          </div>
        )}

        {/* 2. Header / Hero */}
        <header className="tfr-header">
          {header.cover_image_url && (
            <div className="tfr-cover-wrap">
              <img className="tfr-cover" src={header.cover_image_url} alt="" />
              <div className="tfr-cover-tint" aria-hidden="true" />
            </div>
          )}
          <div className="tfr-header-inner">
            {header.avatar_image_url && (
              <img className="tfr-avatar" src={header.avatar_image_url} alt="" />
            )}
            <p className="tfr-eyebrow">The Studio</p>
            <h1 className="tfr-name">{display}</h1>
            {p?.business_type && (
              <p className="tfr-business-type">{p.business_type}</p>
            )}
            {p?.tagline && (
              <p className="tfr-tagline">{p.tagline}</p>
            )}
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* ── Sticky tab rail ── */}
        <div className="tfr-tab-rail" ref={tabRailRef}>
          <div className="tfr-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`tfr-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab panels — all in DOM, only is-active visible (preserves
            booking form state across tab switches) ── */}

        {/* 3. Book — eyebrow + title removed, the booking flow's own
            internal step labels carry that work now (matches VT). */}
        <div className={`tfr-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'}>
          <section className="tfr-section tfr-book" aria-label={tabs.book_label ?? 'Book'}>
            <TheFadeRoomBooking
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

        {/* 4. Gallery / Work — migrated to the shared GallerySection. The
            tab-panel wrapper + enabledByTab gating stay; the inner render is
            now the canonical .brk-gallery-* markup, re-skinned to TFR's neon
            grid cards by the .tfr-template .brk-gallery* rules at the end of
            TFR_CSS. Eyebrow keeps the resolved Gallery tab label. */}
        {enabledByTab.gallery && (
          <div className={`tfr-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <GallerySection
              items={site.gallery}
              groups={site.gallery_groups}
              heading={tabs.gallery_label ?? 'Gallery'}
              eyebrow={tabLabel.gallery}
              displayName={display}
              variant="grid"
              emptyText="No gallery items yet."
              ariaLabel={tabs.gallery_label ?? 'Work'}
            />
          </div>
        )}

        {/* 5. Results / Before & After — migrated to the shared
            BeforeAfterSection. The old TFR render was a bare two-image
            diptych with no center separator and no Before/After tags, so
            both `separator` and `labels` are omitted to keep parity. The
            .tfr-template .brk-ba* skin re-applies the neon card frame. */}
        {enabledByTab.results && (
          <div className={`tfr-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <BeforeAfterSection
              items={site.results ?? site.before_after}
              groups={site.results_groups ?? site.before_after_groups}
              heading={tabs.results_label ?? 'Results'}
              eyebrow={tabLabel.results}
              emptyText="No results yet."
              ariaLabel={tabs.results_label ?? 'Results'}
            />
          </div>
        )}

        {/* 6. About / The Shop */}
        {enabledByTab.about && (
          <div className={`tfr-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="tfr-section tfr-about" aria-label={tabs.about_label ?? 'About'}>
              {/* Three-image staggered hero (editor exposes about.images[3]). */}
              {Array.isArray(about.images) && about.images.some((img: any) => img) && (
                <div className="tfr-about-images">
                  {[0, 1, 2].map(i => {
                    const img = about.images[i]
                    return img
                      ? <div key={i} className="tfr-about-img"><img src={img} alt="" /></div>
                      : <div key={i} className="tfr-about-img tfr-about-img--placeholder" aria-hidden="true" />
                  })}
                </div>
              )}

              {/* Layered title: DM Serif backdrop eyebrow at 80px low-opacity,
                  Dancing Script neon heading at 30px overlaid centered.
                  Eyebrow stays editable via about.eyebrow; falls back to the
                  resolved About tab label rather than a hardcoded string. */}
              {(() => {
                const aboutEyebrow = (typeof about.eyebrow === 'string' && about.eyebrow.trim())
                  ? about.eyebrow.trim()
                  : tabLabel.about
                return (aboutEyebrow || about.heading) ? (
                  <div className="tfr-layered-title">
                    {aboutEyebrow && (
                      <span className="tfr-layered-eyebrow" aria-hidden="true">{aboutEyebrow}</span>
                    )}
                    {about.heading && (
                      <h2 className="tfr-layered-heading">{about.heading}</h2>
                    )}
                  </div>
                ) : null
              })()}

              {about.body && <p className="tfr-about-body">{about.body}</p>}
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="tfr-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      <h3>{h.title}</h3>
                      <p>{h.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 7. Policy / House Rules — migrated to the shared PolicySection.
            rows mirror TFR's old PolicyRow set (Deposit / Cancellation / Late
            arrival / No-show / Reschedule); custom_groups map to the richer
            shared {heading, items:[{title, content}]} shape (it.content ??
            it.body for legacy flat groups). marker="none" preserves TFR's old
            tagged-ticket look (no glyph/numeral column); the
            .tfr-template .brk-policy* skin restores the accent-tag treatment. */}
        {enabledByTab.policy && (
          <div className={`tfr-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <PolicySection
              rows={[
                { label: 'Deposit',      body: policies.deposit_policy },
                { label: 'Cancellation', body: policies.cancellation_policy },
                { label: 'Late arrival', body: policies.late_policy },
                { label: 'No-show',      body: policies.no_show_policy },
                { label: 'Reschedule',   body: policies.reschedule_policy },
              ]}
              customGroups={(Array.isArray(policies.custom_groups) ? policies.custom_groups : []).map((g: any) => ({
                heading: g.heading,
                items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                  title: it.title,
                  content: it.content ?? it.body,
                })),
              }))}
              heading={tabs.policy_label ?? 'House Rules'}
              eyebrow={tabLabel.policy}
              marker="none"
              emptyText="No house rules yet."
              ariaLabel={tabs.policy_label ?? 'House Rules'}
            />
          </div>
        )}

        {/* 8. Advice / Notes — migrated to the shared InstructionsSection.
            showMark={false} drops the marker column (.brk-instructions--plain)
            so the TFR skin can render the items as alternating-tilt sticky
            notes. Eyebrow uses the resolved Advice tab label (matches the
            other tabbed sections); heading + card_kicker stay editable. */}
        {enabledByTab.advice && (
          <div className={`tfr-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <InstructionsSection
              items={advice}
              heading={settings.advice?.heading ?? 'Advice'}
              eyebrow={tabs.advice_label ?? 'Notes'}
              cardKicker={settings.advice?.card_kicker}
              showMark={false}
              emptyText="No notes yet."
              ariaLabel={tabs.advice_label ?? 'Notes'}
            />
          </div>
        )}

        {/* 9. Timeline / Process — shared InstructionsSection, numbered.
            The TFR skin restyles .brk-instructions--numbered as the neon
            spine + circular numbered nodes. */}
        {enabledByTab.timeline && (
          <div className={`tfr-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <InstructionsSection
              items={timeline}
              heading={settings.timeline?.heading ?? 'Timeline'}
              eyebrow={tabs.timeline_label ?? 'Process'}
              cardKicker={settings.timeline?.card_kicker}
              numbered
              emptyText="No timeline yet."
              ariaLabel={tabs.timeline_label ?? 'Process'}
            />
          </div>
        )}

        {/* 10. FAQ (always visible below tabs) — migrated to the shared,
            theme-tokenized platform component. TFR's palette is bridged onto
            the canonical --brk-* tokens above; the .tfr-* skin at the end of
            TFR_CSS re-applies the neon title + accent marker. */}
        {additionals.faq?.enabled !== false && (
          <FaqSection
            items={additionals.faq?.items}
            heading={additionals.faq?.heading ?? 'Questions'}
            eyebrow="FAQ"
          />
        )}

        {/* 11. Reviews — shared component. The ✦ before the "Reviews"
            eyebrow is reproduced by the skin (.brk-reviews-section
            .brk-eyebrow::before), not passed as a prop. */}
        {additionals.reviews?.enabled !== false && (
          <ReviewsSection
            items={additionals.reviews?.items}
            heading={additionals.reviews?.heading ?? 'In the chair'}
            eyebrow="Reviews"
            starGlyph="★"
          />
        )}

        {/* 12. Thank-you — shared component. The ✦ flanking the "Outro"
            eyebrow is reproduced by the skin (.brk-thanks .brk-eyebrow
            ::before/::after), not passed as a prop. */}
        <ThanksSection
          show={additionals.show_thank_you}
          title={additionals.thank_you_title}
          body={additionals.thank_you_body}
          signature={additionals.thank_you_signature}
          fallbackSignature={display}
          eyebrow="Outro"
        />

        {/* Footer — shared 3-band component. Mirrors the old local Footer
            exactly: businessName = override || display, eyebrow labels The
            Studio / Hours / Contact, CTA "Reserve the chair", credit band is
            "Powered by BookReady" only (no copyright prefix → copyrightName
            omitted). The neon CTA pill is restored by the skin. */}
        <SiteFooter
          businessName={(settings.footer?.business_name_override ?? '').trim() || display}
          subtext={settings.footer?.subtext}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          ctaLabel="Reserve the chair"
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

// Per-platform brand gradients. Each button's `background` reads like
// the destination it points at — Insta's iconic pink→orange→purple,
// Call's WhatsApp green, Email's mail blue, Directions' Maps green,
// Reserve's tenant-accent gradient.
// Glyph can be a lucide icon or one of the inline brand-glyph components
// above — both accept size/strokeWidth and paint with currentColor.
// ComponentType keeps the union unambiguously callable in JSX.
// Accepts both lucide icons (whose props type is broader — size?: string |
// number, plus ref/propTypes) and the inline brand-glyph components above.
// `any` props avoids the lucide vs custom-glyph propTypes variance clash
// while staying callable as <Icon size={…} strokeWidth={…} /> in JSX.
type SocialGlyph = ComponentType<any>
const SOCIAL_STYLES: Record<string, { Icon: SocialGlyph; gradient: string }> = {
  book:       { Icon: CalendarPlus,  gradient: 'linear-gradient(135deg, var(--tfr-accent), color-mix(in srgb, var(--tfr-accent) 55%, #fff))' },
  call:       { Icon: Phone,         gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
  email:      { Icon: Mail,          gradient: 'linear-gradient(135deg, #4F8BFF, #2D5FCF)' },
  message:    { Icon: MessageSquare, gradient: 'linear-gradient(135deg, #34B7F1, #0A7CC4)' },
  instagram:  { Icon: Instagram,     gradient: 'linear-gradient(135deg, #F58529 0%, #DD2A7B 45%, #8134AF 100%)' },
  tiktok:     { Icon: TikTokGlyph,   gradient: 'linear-gradient(135deg, #25F4EE 0%, #1A1228 45%, #FE2C55 100%)' },
  youtube:    { Icon: Youtube,       gradient: 'linear-gradient(135deg, #FF0000, #C4302B)' },
  facebook:   { Icon: Facebook,      gradient: 'linear-gradient(135deg, #1877F2, #0B5FCC)' },
  pinterest:  { Icon: PinterestGlyph, gradient: 'linear-gradient(135deg, #E60023, #AD081B)' },
  whatsapp:   { Icon: WhatsAppGlyph, gradient: 'linear-gradient(135deg, #25D366, #128C7E)' },
  directions: { Icon: MapPin,        gradient: 'linear-gradient(135deg, #34A853, #16713C)' },
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  // href resolution mirrors the canonical VT/Lush header buttons. safeHref
  // (applied uniformly in the render below) enforces the scheme allowlist;
  // message normalizes a bare number to sms: first via smsHref. Brand
  // socials (tiktok/youtube/facebook/pinterest/whatsapp) have no profile
  // fallback — they only render when the tenant sets a URL override.
  const btns: { key: string; href: string | null; label: string }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call' },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email' },
    { key: 'message',    href: smsHref(header.message_button_url), label: 'Message' },
    { key: 'instagram',  href: header.instagram_button_url  || profile?.instagram_url || null, label: 'Instagram' },
    { key: 'tiktok',     href: header.tiktok_button_url     || null, label: 'TikTok' },
    { key: 'youtube',    href: header.youtube_button_url    || null, label: 'YouTube' },
    { key: 'facebook',   href: header.facebook_button_url   || null, label: 'Facebook' },
    { key: 'pinterest',  href: header.pinterest_button_url  || null, label: 'Pinterest' },
    { key: 'whatsapp',   href: header.whatsapp_button_url   || null, label: 'WhatsApp' },
    { key: 'directions', href: header.directions_button_url || null, label: 'Directions' },
  ]
  const visible = btns.filter(b => header[`show_${b.key}_button`] !== false && b.href)
  if (visible.length === 0) return null
  return (
    <nav className="tfr-social" aria-label="Contact">
      {visible.map(b => {
        // Reserve button isn't a real anchor — tab pill carries that
        // concept. Intercept the click so the header button drives
        // setActive + scroll into the tab rail.
        const onClick = b.key === 'book' && !header.book_button_url
          ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); goBook() }
          : undefined
        const style = SOCIAL_STYLES[b.key]
        return (
          <a
            key={b.key}
            href={safeHref(b.href!)}
            className="tfr-social-btn"
            style={{ background: style?.gradient }}
            onClick={onClick}
          >
            {style?.Icon && <style.Icon size={14} strokeWidth={2.4} />}
            <span>{b.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const TFR_CSS = `
.tfr-template {
  ${tokensToCss()}
  --tfr-bg: #0F0A1A;
  --tfr-fg: #F0EFF5;
  --tfr-fg-muted: rgba(240, 239, 245, 0.62);
  --tfr-rule: rgba(240, 239, 245, 0.10);
  --tfr-card: #1A1228;
  /* --tfr-accent injected via inline style (tenant pick or pink default) */
  --tfr-display: 'Bricolage Grotesque', 'Outfit', 'Manrope', system-ui, sans-serif;
  --tfr-script: 'Dancing Script', 'Pacifico', cursive;
  --tfr-serif: 'DM Serif Text', 'Playfair Display', Georgia, serif;
  --tfr-body: 'Inter', system-ui, -apple-system, sans-serif;
  /* Neon halo — used on every Dancing Script title (section titles,
     tagline, layered heading, thanks, highlights). White text with a
     colored halo around it (no white inner = no stroke effect, per
     feedback). Multi-layer = real bloom, not a flat single shadow. */
  --tfr-neon-shadow:
    0 0 6px var(--tfr-accent),
    0 0 14px var(--tfr-accent),
    0 0 30px var(--tfr-accent),
    0 0 56px color-mix(in srgb, var(--tfr-accent) 80%, transparent);
  /* Tighter variant for smaller script type — same halo character,
     less spread. */
  --tfr-neon-shadow-tight:
    0 0 4px var(--tfr-accent),
    0 0 10px var(--tfr-accent),
    0 0 22px var(--tfr-accent);

  /* Bridge TFR's palette + fonts onto the canonical --brk-* tokens the
     shared section components (@bkrdy/platform/sections) are styled
     against. CSS aliasing means the runtime accent override on
     --tfr-accent flows through automatically. The .tfr-* skin at the end
     of this file then re-applies TFR's neon signatures over the base. */
  --brk-color-bg: var(--tfr-bg);
  --brk-color-surface: var(--tfr-card);
  --brk-color-text: var(--tfr-fg);
  --brk-color-muted: var(--tfr-fg-muted);
  --brk-color-rule: var(--tfr-rule);
  --brk-color-accent: var(--tfr-accent);
  --brk-color-on-accent: var(--tfr-bg);
  --brk-family-display: var(--tfr-display);
  --brk-family-body: var(--tfr-body);
  --brk-family-script: var(--tfr-script);

  background: var(--tfr-bg);
  color: var(--tfr-fg);
  font-family: var(--tfr-body);
  font-size: var(--brk-font-body);
  line-height: 1.55;
  letter-spacing: 0.01em;
  min-height: 100vh;
}
.tfr-template * { box-sizing: border-box; }
.tfr-template img { max-width: 100%; display: block; }
.tfr-template a { color: inherit; text-decoration: none; }

/* Eyebrow — tracked uppercase accent with subtle neon glow. */
.tfr-eyebrow {
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
  margin: 0 0 var(--brk-space-md);
}
.tfr-eyebrow > span[aria-hidden] {
  display: inline-block;
  margin: 0 6px;
  font-size: 9px;
  opacity: 0.85;
}

/* Section titles — Dancing Script in WHITE with full neon halo. */
.tfr-section-title {
  font-family: var(--tfr-script);
  font-size: clamp(38px, 5.5vw, 64px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.1;
  margin: 0 0 var(--brk-space-xl);
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  padding: 0.05em 0;
}

/* Announce bar — tracked uppercase muted, with sparkle bookends. */
.tfr-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px var(--brk-space-md);
  border-bottom: 1px solid var(--tfr-rule);
  font-family: var(--tfr-body);
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
}
.tfr-announce-spark {
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
  font-size: 10px;
}

/* Header — cover image runs full width with an accent wash overlay,
   content sits in container-narrow lifted into the cover. */
.tfr-header { padding: 0 0 var(--brk-space-3xl); position: relative; }
.tfr-cover-wrap { position: relative; }
.tfr-cover {
  width: 100%;
  height: clamp(320px, 55vw, 580px);
  object-fit: cover;
  filter: brightness(0.58) saturate(1.12);
}
/* Subtle neon-poster wash from accent at top → bg at bottom */
.tfr-cover-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    transparent 0%,
    color-mix(in srgb, var(--tfr-accent) 8%, transparent) 50%,
    var(--tfr-bg) 100%
  );
  pointer-events: none;
}
.tfr-header-inner {
  position: relative;
  z-index: 1;
  max-width: var(--brk-container-narrow);
  margin: -140px auto 0;
  padding: 0 var(--brk-space-md);
  text-align: left;
}
.tfr-header:not(:has(.tfr-cover-wrap)) .tfr-header-inner {
  margin-top: var(--brk-space-2xl);
}
.tfr-avatar {
  width: 124px;
  height: 124px;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid var(--tfr-accent);
  box-shadow:
    0 0 0 4px var(--tfr-bg),
    0 0 0 5px color-mix(in srgb, var(--tfr-accent) 60%, transparent),
    0 0 28px color-mix(in srgb, var(--tfr-accent) 55%, transparent),
    0 0 60px color-mix(in srgb, var(--tfr-accent) 30%, transparent);
  margin: 0 0 var(--brk-space-md);
}
/* Hero name — plain white Bricolage. No script, no neon, no
   animation. The brand anchor; the script/neon language lives in the
   section titles + taglines below. */
.tfr-name {
  font-family: var(--tfr-display);
  font-size: clamp(44px, 8vw, 88px);
  font-weight: 800;
  letter-spacing: -0.025em;
  line-height: 0.96;
  margin: 0 0 var(--brk-space-sm);
  color: var(--tfr-fg);
}
.tfr-business-type {
  font-family: var(--tfr-body);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
  margin: 0 0 var(--brk-space-sm);
}
/* Tagline — Dancing Script in WHITE with tight neon halo. */
.tfr-tagline {
  font-family: var(--tfr-script);
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 700;
  line-height: 1.2;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  margin: 0 0 var(--brk-space-xl);
  max-width: 28ch;
  padding: 0.05em 0;
}

/* Social — pill buttons with per-platform brand gradients + lucide
   icons. Each button gets a different visual identity (Instagram pink/
   orange/purple, Call green, Email blue, Directions Maps green,
   Reserve accent gradient), so the row reads as a contact toolbox
   rather than a homogeneous list. */
.tfr-social {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: var(--brk-space-lg);
}
.tfr-social-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
  transition: transform 160ms ease, box-shadow 220ms ease;
  /* background-image set per-button via inline style */
}
.tfr-social-btn:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 24px color-mix(in srgb, var(--tfr-accent) 35%, transparent),
    0 6px 16px rgba(0, 0, 0, 0.35);
}
.tfr-social-btn svg {
  flex-shrink: 0;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* Tab rail — sticky band of outlined pills. The active tab stays the
   same shape but lights up via text-neon-glow + a small "marquee
   marker" bar attached underneath, instead of the old fill-with-pink
   approach. Reads as a row of label tags with the active one switched
   on, more theater-marquee than club-button-panel. */
.tfr-tab-rail {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--tfr-bg);
  border-top: 1px solid var(--tfr-rule);
  border-bottom: 1px solid var(--tfr-rule);
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  padding: 16px 0 24px;
}
.tfr-tab-rail::-webkit-scrollbar { display: none; }
.tfr-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: 0 var(--brk-space-md);
  gap: 8px;
}
.tfr-tab-pill {
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 20%, transparent);
  border-radius: 999px;
  padding: 11px 24px;
  margin: 0;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--tfr-fg-muted);
  cursor: pointer;
  transition: color 180ms ease, border-color 180ms ease, text-shadow 220ms ease;
  white-space: nowrap;
}
.tfr-tab-pill:hover {
  color: var(--tfr-fg);
  border-color: color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-tab-pill.is-active {
  color: var(--tfr-fg);
  border-color: var(--tfr-accent);
  text-shadow:
    0 0 6px var(--tfr-accent),
    0 0 16px color-mix(in srgb, var(--tfr-accent) 65%, transparent);
}
/* Marquee marker — a small horizontal accent bar attached below the
   active pill with a soft glow halo. Reads as a marker light pointing
   up to the active tab. */
.tfr-tab-pill.is-active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 28px;
  height: 3px;
  background: var(--tfr-accent);
  border-radius: 2px;
  box-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 80%, transparent);
}
.tfr-tab-pill:focus-visible {
  outline: 2px solid var(--tfr-accent);
  outline-offset: 2px;
}

/* Tab panels — display:none on inactive (preserves form state). */
.tfr-tab-panel { display: none; }
.tfr-tab-panel.is-active { display: block; }

/* Section frame — editorial padding, container-narrow. */
.tfr-section {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: var(--brk-space-3xl) var(--brk-space-md);
  border-top: 1px solid var(--tfr-rule);
}
.tfr-tab-panel > .tfr-section:first-child { border-top: none; }
.tfr-book { padding-top: var(--brk-space-3xl); }

/* About — three-up staggered hero gallery. Each cell gets a slightly
   different aspect-ratio + vertical offset so they don't read as a
   strict grid. Equal-width columns keep the rhythm. */
.tfr-about-images {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 14px;
  align-items: start;
  margin: 0 0 var(--brk-space-2xl);
}
.tfr-about-img {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--tfr-rule);
  background: var(--tfr-card);
  aspect-ratio: 3/4;
}
.tfr-about-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tfr-about-img--placeholder {
  background: linear-gradient(
    135deg,
    var(--tfr-card),
    color-mix(in srgb, var(--tfr-accent) 6%, var(--tfr-card))
  );
}
/* Staggered heights via aspect-ratio + offset. Tall→short→tall, with
   the middle column lifted to break the strict row alignment. */
.tfr-about-images > *:nth-child(1) { aspect-ratio: 4/5; margin-top: 0; }
.tfr-about-images > *:nth-child(2) { aspect-ratio: 3/5; margin-top: 28px; }
.tfr-about-images > *:nth-child(3) { aspect-ratio: 2/3; margin-top: -14px; }
/* Mobile keeps 3 cols side-by-side per feedback. Reduce the gap +
   stagger magnitudes so it fits without crowding. */
@media (max-width: 640px) {
  .tfr-about-images { gap: 6px; }
  .tfr-about-images > *:nth-child(1) { margin-top: 0; }
  .tfr-about-images > *:nth-child(2) { margin-top: 14px; }
  .tfr-about-images > *:nth-child(3) { margin-top: -6px; }
}

/* Layered title — backdrop DM Serif eyebrow at low opacity with the
   Dancing Script heading overlaid centered. The two type families and
   contrasting sizes give the section a museum-placard-meets-neon-sign
   feel that the simpler section-title can't carry. */
.tfr-layered-title {
  position: relative;
  display: inline-block;
  margin: 0 0 var(--brk-space-2xl);
  line-height: 1;
  max-width: 100%;
}
.tfr-layered-eyebrow {
  display: block;
  font-family: var(--tfr-serif);
  font-size: clamp(80px, 14vw, 140px);
  line-height: 1;
  opacity: 0.14;
  margin: 0;
  letter-spacing: -0.015em;
  color: var(--tfr-fg);
  white-space: nowrap;
  /* Strip any inherited script styling — this is a serif backdrop only. */
  text-shadow: none;
}
.tfr-layered-heading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--tfr-script);
  font-size: clamp(40px, 6vw, 64px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  margin: 0;
  white-space: nowrap;
  padding: 0.05em 0;
  pointer-events: none;
}

.tfr-about-body {
  font-size: 18px;
  line-height: 1.65;
  max-width: 58ch;
  margin: 0 0 var(--brk-space-2xl);
  color: var(--tfr-fg);
}
/* About highlights — accent-stick cards stacked vertically. Each card
   has a glowing 3px neon spine on the left edge + Dancing Script title
   in accent + muted body. Distinct from Blackline's two-column
   hairline-divided pattern. */
.tfr-highlights {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 16px;
}
.tfr-highlights > li {
  position: relative;
  background: var(--tfr-card);
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 22%, var(--tfr-rule));
  border-radius: 14px;
  padding: var(--brk-space-lg) var(--brk-space-xl) var(--brk-space-lg) calc(var(--brk-space-xl) + 12px);
}
/* The glowing neon spine on the left edge of each card. */
.tfr-highlights > li::before {
  content: '';
  position: absolute;
  left: 12px;
  top: 22px;
  bottom: 22px;
  width: 3px;
  border-radius: 2px;
  background: var(--tfr-accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--tfr-accent) 60%, transparent);
}
.tfr-highlights h3 {
  font-family: var(--tfr-script);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.1;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  margin: 0 0 8px;
  padding: 0.05em 0;
}
.tfr-highlights p { margin: 0; color: var(--tfr-fg-muted); line-height: 1.55; }

@media (prefers-reduced-motion: reduce) {
  .tfr-template *,
  .tfr-template *::before,
  .tfr-template *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

/* ════════════════════════════════════════════════════════════════════
   TFR SKIN over the shared platform sections (@bkrdy/platform/sections)
   ────────────────────────────────────────────────────────────────────
   The FAQ / Reviews / Thank-you / Footer now render the canonical
   .brk-* markup. These overrides (scoped under .tfr-template, AFTER
   SECTIONS_CSS) re-apply TFR's neon signatures: Dancing Script titles
   with the neon halo, accent-glow eyebrows + ✦ flourishes, polaroid
   review cards with the giant script quote watermark, the hung-neon-sign
   thank-you frame, and the glowing footer CTA pill. All colors/fonts
   come from the bridged tokens. The old .tfr-faq/.tfr-reviews/
   .tfr-thanks/.tfr-footer rules above are now dead (left inert).
   ════════════════════════════════════════════════════════════════════ */

/* Keep TFR's tighter editorial column (shared default is wider). */
.tfr-template .brk-section { max-width: var(--brk-container-narrow); }

/* Shared header is centered; TFR titles read fine centered here. Match
   .tfr-section-title: Dancing Script, white, full neon halo. */
.tfr-template .brk-section-title {
  font-family: var(--tfr-script);
  font-size: clamp(38px, 5.5vw, 64px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.1;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  padding: 0.05em 0;
}
/* Match .tfr-eyebrow: tracked uppercase accent with a subtle glow. */
.tfr-template .brk-eyebrow {
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
}
/* ✦ flourishes — Reviews leads with one, Outro is flanked by two. */
.tfr-template .brk-reviews-section .brk-eyebrow::before { content: '\\2726\\00a0'; font-size: 0.78em; }
.tfr-template .brk-thanks .brk-eyebrow::before { content: '\\2726\\00a0'; font-size: 0.78em; }
.tfr-template .brk-thanks .brk-eyebrow::after  { content: '\\00a0\\2726'; font-size: 0.78em; }

/* ── FAQ skin — match .tfr-faq: display-font summary, space-between row,
   glowing +/− marker. ── */
.tfr-template .brk-faq summary {
  font-family: var(--tfr-display);
  font-size: 18px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--brk-space-md);
  padding: var(--brk-space-lg) 0;
}
/* Replace the shared absolutely-positioned +/− with TFR's inline glowing
   marker (the flex summary above handles placement). */
.tfr-template .brk-faq summary::after {
  position: static;
  transform: none;
  font-family: var(--tfr-display);
  font-size: 24px;
  font-weight: 400;
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
  line-height: 1;
}
.tfr-template .brk-faq[open] summary::after { content: '\\2212'; }
.tfr-template .brk-faq p {
  padding: var(--brk-space-md) 0 var(--brk-space-lg);
  line-height: 1.65;
}

/* ── Reviews skin — polaroid cards on a dark wall: accent border + glow,
   alternating tilt, giant Dancing Script quote watermark, neon stars +
   attribution. Matches .tfr-reviews. ── */
.tfr-template .brk-reviews { gap: 28px; }
@media (min-width: 720px) {
  .tfr-template .brk-reviews { grid-template-columns: repeat(2, 1fr); gap: 32px; }
}
.tfr-template .brk-review {
  padding: var(--brk-space-xl);
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 28%, var(--tfr-rule));
  border-radius: 18px;
  box-shadow:
    0 0 28px color-mix(in srgb, var(--tfr-accent) 14%, transparent),
    0 12px 24px rgba(0, 0, 0, 0.32);
  transition: transform 220ms ease, box-shadow 250ms ease;
}
.tfr-template .brk-review:nth-child(odd)  { transform: rotate(-1.2deg); }
.tfr-template .brk-review:nth-child(even) { transform: rotate(1.2deg); }
.tfr-template .brk-review:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow:
    0 0 40px color-mix(in srgb, var(--tfr-accent) 28%, transparent),
    0 16px 32px rgba(0, 0, 0, 0.4);
}
/* The shared .brk-review-quote glyph becomes TFR's oversized low-opacity
   corner watermark in Dancing Script. */
.tfr-template .brk-review-quote {
  top: -28px;
  left: auto;
  right: 20px;
  font-family: var(--tfr-script);
  font-size: 140px;
  line-height: 1;
  color: var(--tfr-accent);
  opacity: 0.5;
  text-shadow: 0 0 28px color-mix(in srgb, var(--tfr-accent) 60%, transparent);
  pointer-events: none;
}
.tfr-template .brk-review blockquote {
  font-family: var(--tfr-display);
  font-style: normal;
  font-size: 18px;
  font-weight: 500;
  line-height: 1.5;
  letter-spacing: -0.005em;
  color: var(--tfr-fg);
  position: relative;
  z-index: 1;
}
.tfr-template .brk-review-stars {
  font-size: 15px;
  letter-spacing: 0.12em;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 45%, transparent);
  position: relative;
  z-index: 1;
}
.tfr-template .brk-review-attr {
  font-family: var(--tfr-body);
  font-weight: 700;
  letter-spacing: 0.28em;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 30%, transparent);
  position: relative;
  z-index: 1;
}
@media (prefers-reduced-motion: reduce) {
  .tfr-template .brk-review,
  .tfr-template .brk-review:hover { transform: none; }
}

/* ── Thank-you skin — hung neon sign: accent tube border, rounded, with
   corner ✦ sparkles sitting on the border line, and a big script title.
   Matches .tfr-thanks. ── */
.tfr-template .brk-thanks {
  position: relative;
  max-width: min(680px, calc(100% - 64px));
  padding: var(--brk-space-3xl) clamp(28px, 5vw, 56px) var(--brk-space-2xl);
  border: 2px solid var(--tfr-accent);
  border-radius: 22px;
}
.tfr-template .brk-thanks::before,
.tfr-template .brk-thanks::after {
  content: '\\2726';
  position: absolute;
  font-size: 22px;
  color: var(--tfr-accent);
  line-height: 1;
}
.tfr-template .brk-thanks::before { top: -12px; left: 28px; }
.tfr-template .brk-thanks::after  { bottom: -12px; right: 28px; }
.tfr-template .brk-thanks-title {
  font-family: var(--tfr-script);
  font-size: clamp(40px, 7vw, 80px);
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.0;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow);
  padding: 0.05em 0;
}
.tfr-template .brk-thanks-body { line-height: 1.65; }
.tfr-template .brk-thanks-sign {
  font-family: var(--tfr-body);
  font-style: normal;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
}

/* ── Footer skin — neon pill CTA + TFR column treatment. Matches
   .tfr-footer*. ── */
.tfr-template .brk-footer { background: transparent; }
.tfr-template .brk-footer-inner { max-width: var(--brk-container-narrow); }
.tfr-template .brk-footer-book {
  border-radius: 999px;
  letter-spacing: 0.24em;
  padding: 18px 44px;
  box-shadow: 0 0 20px color-mix(in srgb, var(--tfr-accent) 35%, transparent);
  transition: box-shadow 220ms ease, transform 120ms ease;
}
.tfr-template .brk-footer-book:hover {
  filter: none;
  box-shadow: 0 0 32px color-mix(in srgb, var(--tfr-accent) 65%, transparent);
}
.tfr-template .brk-footer-book:active { transform: scale(0.98); }
.tfr-template .brk-footer-name {
  font-family: var(--tfr-display);
  font-weight: 700;
  font-size: 28px;
  letter-spacing: -0.018em;
}
.tfr-template .brk-footer-hours-row dd {
  font-family: var(--tfr-display);
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--tfr-fg);
}
.tfr-template .brk-footer-contact a {
  transition: color 160ms ease, text-shadow 200ms ease;
}
.tfr-template .brk-footer-contact a:hover {
  color: var(--tfr-accent);
  text-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
}

/* ── Advice skin (Notes) — sticky-note cards over the shared
   .brk-instructions--plain base. The base makes it a 1-col grid with a
   marker column dropped and a hairline border-top per row; TFR turns
   each row into a tilted post-it card. Two-up on desktop with
   alternating tilt so they don't read as a strict grid. Matches the old
   .tfr-note-list. Header is centered (shared default) — the one parity
   shift from the old left-aligned eyebrow + title. ── */
.tfr-template .brk-instructions--plain {
  max-width: var(--brk-container-narrow);
  display: grid;
  gap: 20px;
}
@media (min-width: 720px) {
  .tfr-template .brk-instructions--plain { grid-template-columns: repeat(2, 1fr); gap: 28px; }
}
.tfr-template .brk-instructions--plain .brk-instruction {
  display: block;
  position: relative;
  border-top: 0;
  background: var(--tfr-card);
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, var(--tfr-rule));
  border-radius: 14px;
  padding: var(--brk-space-lg) var(--brk-space-xl);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.28);
  transition: transform 220ms ease, box-shadow 250ms ease;
}
/* Cancel the shared :last-child bottom hairline — cards have full borders. */
.tfr-template .brk-instructions--plain .brk-instruction:last-child { border-bottom: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, var(--tfr-rule)); }
.tfr-template .brk-instructions--plain .brk-instruction:nth-child(odd)  { transform: rotate(-0.8deg); }
.tfr-template .brk-instructions--plain .brk-instruction:nth-child(even) { transform: rotate(0.9deg); }
.tfr-template .brk-instructions--plain .brk-instruction:hover {
  transform: rotate(0deg) translateY(-3px);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.4),
    0 0 24px color-mix(in srgb, var(--tfr-accent) 18%, transparent);
}
.tfr-template .brk-instructions--plain .brk-instruction-kicker {
  display: inline-block;
  font-family: var(--tfr-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
  margin: 0 0 8px;
}
.tfr-template .brk-instructions--plain .brk-instruction-body h3 {
  font-family: var(--tfr-display);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--tfr-fg);
}
.tfr-template .brk-instructions--plain .brk-instruction-body p {
  margin: 0;
  font-size: 15px;
  color: var(--tfr-fg-muted);
  line-height: 1.55;
}
@media (prefers-reduced-motion: reduce) {
  .tfr-template .brk-instructions--plain .brk-instruction,
  .tfr-template .brk-instructions--plain .brk-instruction:hover { transform: none; }
}

/* ── Timeline skin (Process) — vertical neon spine with circular node
   "buttons" punching through, over .brk-instructions--numbered. The
   shared base gives an auto/1fr two-column row; TFR pins the mark column
   to 44px, runs a glowing accent spine down its center, and turns each
   .brk-instruction-mark into an accent-bordered circular node with a
   neon halo. Matches the old .tfr-timeline / .tfr-timeline-num. ── */
.tfr-template .brk-instructions--numbered {
  max-width: var(--brk-container-narrow);
  position: relative;
}
/* The vertical accent spine running down behind the node column. Fades
   in/out at the ends so it doesn't terminate flush. left:21px = center
   of the 44px node column. */
.tfr-template .brk-instructions--numbered::before {
  content: '';
  position: absolute;
  left: 21px;
  top: 28px;
  bottom: 28px;
  width: 2px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--tfr-accent) 8%,
    var(--tfr-accent) 92%,
    transparent 100%
  );
  box-shadow: 0 0 10px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-template .brk-instructions--numbered .brk-instruction {
  grid-template-columns: 44px 1fr;
  gap: 20px;
  padding: 0 0 var(--brk-space-2xl);
  border-top: 0;
  align-items: start;
}
.tfr-template .brk-instructions--numbered .brk-instruction:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
/* Step numbers as circular nodes — bg matches the page so the spine
   appears to punch through behind them. Accent border + neon glow. */
.tfr-template .brk-instructions--numbered .brk-instruction-mark {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  background: var(--tfr-bg);
  border: 2px solid var(--tfr-accent);
  color: var(--tfr-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--tfr-display);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
  line-height: 1;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 14px color-mix(in srgb, var(--tfr-accent) 40%, transparent);
  text-shadow: 0 0 6px color-mix(in srgb, var(--tfr-accent) 50%, transparent);
}
.tfr-template .brk-instructions--numbered .brk-instruction-body { padding-top: 6px; }
.tfr-template .brk-instructions--numbered .brk-instruction-kicker {
  display: inline-block;
  font-family: var(--tfr-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--tfr-accent);
  text-shadow: 0 0 8px color-mix(in srgb, var(--tfr-accent) 36%, transparent);
  margin: 0 0 8px;
}
.tfr-template .brk-instructions--numbered .brk-instruction-body h3 {
  font-family: var(--tfr-display);
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--tfr-fg);
}
.tfr-template .brk-instructions--numbered .brk-instruction-body p {
  margin: 0;
  font-size: 15px;
  color: var(--tfr-fg-muted);
  line-height: 1.55;
}

/* ── Gallery skin — matches the old .tfr-grid: dark card tiles with a
   neon-rule border that lights up + glows on hover. The shared grid is
   already responsive (1/2/3 cols); TFR keeps 2-up on mobile, so widen the
   first breakpoint to 2 cols, and squares the tiles (shared base is 4/5).
   Group headings get the Dancing Script + neon halo treatment. ── */
.tfr-template .brk-gallery-grid {
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}
@media (min-width: 720px) {
  .tfr-template .brk-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 16px; }
}
.tfr-template .brk-gallery-item {
  background: var(--tfr-card);
  aspect-ratio: 1;
  border-radius: 12px;
  border: 1px solid var(--tfr-rule);
  transition: border-color 200ms ease, box-shadow 250ms ease;
}
.tfr-template .brk-gallery-item:hover {
  border-color: var(--tfr-accent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--tfr-accent) 25%, transparent);
}
.tfr-template .brk-gallery-group-heading {
  font-family: var(--tfr-script);
  font-weight: 700;
  letter-spacing: 0;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  padding: 0.05em 0;
}

/* ── Before/After skin — matches the old .tfr-ba: both panes sit inside a
   single neon-bordered card on the dark surface, tight 6px gutter, square
   images with a soft inner radius. The shared markup nests panes in
   .brk-ba-pair (a 1fr/auto/1fr grid); TFR drops the center separator
   column to a tight gap and carries the frame on the outer .brk-ba.
   Border lights + glows on hover. ── */
.tfr-template .brk-ba-stack { gap: 12px; }
.tfr-template .brk-ba {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--tfr-rule);
  background: var(--tfr-card);
  padding: 6px;
  transition: border-color 200ms ease, box-shadow 250ms ease;
}
.tfr-template .brk-ba:hover {
  border-color: var(--tfr-accent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--tfr-accent) 25%, transparent);
}
.tfr-template .brk-ba-pair {
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.tfr-template .brk-ba-pane img {
  aspect-ratio: 1;
  border-radius: 8px;
  border: 0;
}
@media (max-width: 640px) {
  /* Keep both panes side-by-side on mobile (the shared base stacks them);
     TFR's diptych reads as a single before|after card at every width. */
  .tfr-template .brk-ba-pair { grid-template-columns: 1fr 1fr; }
}
.tfr-template .brk-ba-caption {
  font-family: var(--tfr-display);
  font-style: normal;
  color: var(--tfr-fg-muted);
}
.tfr-template .brk-ba-group-heading {
  font-family: var(--tfr-script);
  font-weight: 700;
  letter-spacing: 0;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  padding: 0.05em 0;
}

/* ── Policy skin — matches the old .tfr-policy "tagged ticket": each row is
   a neon-bordered card on the dark surface, split into a filled accent-tint
   label tag (the title) and the body. marker="none" → the shared list runs
   in --plain mode (single-column rows), so TFR drops the hairline list
   rules and turns each .brk-policy-row into the bordered card, then puts the
   tag/body split on the inner .brk-policy-body. ── */
.tfr-template .brk-policy-list--plain {
  border-top: 0;
  display: grid;
  gap: 14px;
  max-width: var(--brk-container-narrow);
}
.tfr-template .brk-policy-list--plain .brk-policy-row {
  display: block;
  padding: 0;
  border-bottom: 0;
  border: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, var(--tfr-rule));
  border-radius: 14px;
  overflow: hidden;
  background: var(--tfr-card);
}
/* The title+text container becomes the two-column ticket: an accent-tint
   tag column (the label) and the body column. Single column on mobile. */
.tfr-template .brk-policy-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}
@media (min-width: 720px) {
  .tfr-template .brk-policy-body { grid-template-columns: minmax(160px, max-content) 1fr; }
}
/* The label becomes the filled accent tag (was .tfr-policy h3). */
.tfr-template .brk-policy-title {
  margin: 0;
  background: color-mix(in srgb, var(--tfr-accent) 14%, transparent);
  color: var(--tfr-fg);
  padding: 18px 24px;
  font-family: var(--tfr-body);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  white-space: nowrap;
  border-right: 1px solid color-mix(in srgb, var(--tfr-accent) 24%, transparent);
}
/* The body (was .tfr-policy p). */
.tfr-template .brk-policy-text {
  padding: 18px 24px;
  margin: 0;
  color: var(--tfr-fg);
  line-height: 1.55;
  display: flex;
  align-items: center;
}
/* Custom-group subheading — Dancing Script + neon halo, like section titles. */
.tfr-template .brk-policy-group-heading {
  font-family: var(--tfr-script);
  font-weight: 700;
  letter-spacing: 0;
  color: var(--tfr-fg);
  text-shadow: var(--tfr-neon-shadow-tight);
  padding: 0.05em 0;
  margin-bottom: var(--brk-space-lg);
}
@media (prefers-reduced-motion: reduce) {
  .tfr-template .brk-gallery-item,
  .tfr-template .brk-ba { transition: none !important; }
}
`
