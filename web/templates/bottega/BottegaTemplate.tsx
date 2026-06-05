'use client'

/**
 * Bottega — modern earthy nail / lash / brow studio template.
 *
 * The ONLY template in the marketplace with a patterned background:
 * a tileable terrazzo PNG (warm cream base with rust + walnut + sand +
 * slate + navy speckles) lives behind every section at ~8% effective
 * opacity. Implementation: layer a 92% cream gradient ON TOP of the
 * tiled terrazzo via stacked CSS backgrounds — the pattern shows
 * through everywhere at a calm intensity that doesn't fight text.
 *
 * Visual vocabulary:
 *   - Constant warm cream canvas (#F2EFE8); accent swatch (Rust default,
 *     Walnut / Slate / Deep Navy / Sage alternates — all drawn from the
 *     speckle palette) sets eyebrows, CTAs, active-tab markers, ornaments.
 *   - DM Serif Display italic + Inter (humanist sans). The serif lane was
 *     busy with Cormorant/Fraunces/Playfair/Pinyon/DM Serif TEXT —
 *     DM Serif DISPLAY is its own family with heavier contrast and a
 *     pointier italic, distinct on every shipped template.
 *   - Identity card sits on a soft cream surface lifted from the terrazzo
 *     backdrop so the hero reads composed, not noisy.
 *   - Active-tab marker: a 3-circle SPECKLE CLUSTER beneath the active
 *     pill (sizes 4-6-4 px, accent color) — the one place the terrazzo
 *     motif gets a glyph-scale callback. Distinct from all six existing
 *     markers (TFR marquee, Blackline underline, Velvet bar, Lush sparkle,
 *     Opaline pill wash, Pétale scallop).
 *   - About: 2-image EQUAL-WEIGHT side-by-side diptych (no offset,
 *     equal column widths). Distinct from Pétale's asymmetric portrait+
 *     offset and Opaline's 1-feature + 2-pair grid.
 *
 * Pattern asset: web/public/templates/bottega/terrazzo.png — referenced
 * via /templates/bottega/terrazzo.png (Next.js public/ serves from URL root).
 *
 * All 12 required sections render. Empty data shows a soft empty state.
 * Booking embeds the platform flow via BottegaBooking, re-skinned to
 * the cream + accent palette.
 */

import { useState, useRef } from 'react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import BottegaBooking from './BottegaBooking'

// ── Contact-href helper ─────────────────────────────────────────────────────
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

// ── Brand glyphs lucide doesn't ship (matched to Bottega's stroke at 14px). ──
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
function DirectionsGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}
function PhoneGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}
function EmailGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
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

// Compute a readable foreground (cream or warm dark) for text/icons sitting
// ON a solid accent fill. Light accents (Sage) want dark text; deep ones
// (Navy, Rust) want cream.
function pickOnAccent(hex: string | null | undefined): string {
  if (!hex) return '#F2EFE8'
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#F2EFE8'
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.55 ? '#2A1F18' : '#F2EFE8'
}

// Same idea, but emit the RGB triplet (no leading '#') for rgba() recipes
// the booking shim needs to fill --lush-pink-rgb.
function hexToRgbTriplet(hex: string | null | undefined): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim())
  if (!m) return '201, 105, 44'
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`
}

export default function BottegaTemplate({ site, slug }: Props) {
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

  // Accent (tenant-picked or rust default). Canvas stays constant.
  const accentHex = settings?.theme?.accent_color || '#C9692C'
  const onAccent  = pickOnAccent(accentHex)
  const accentRgb = hexToRgbTriplet(accentHex)

  // Pattern motif (tenant-picked or terrazzo default). Each entry sets the
  // tile URL, the cream-overlay opacity that gates how loud the pattern
  // reads (terrazzo at .92 → ~8%; floral linework at .78 → ~22% since the
  // source is white-with-pink-line and would otherwise vanish), and the
  // tile dimensions (terrazzo is a square 800; flowers is wider than tall
  // so tileH is `auto` for proportional repeat).
  const PATTERNS: Record<string, { url: string; overlay: number; tileW: string; tileH: string }> = {
    terrazzo: { url: '/templates/bottega/terrazzo.jpg', overlay: 0.92, tileW: '800px', tileH: '800px' },
    flowers:  { url: '/templates/bottega/flowers.png',  overlay: 0.50, tileW: '720px', tileH: 'auto' },
  }
  const patternKey = (settings?.theme?.pattern_motif as string) || 'terrazzo'
  const pattern = PATTERNS[patternKey] ?? PATTERNS.terrazzo
  const patternBg = `linear-gradient(rgba(242,239,232,${pattern.overlay}), rgba(242,239,232,${pattern.overlay})), url('${pattern.url}')`
  const patternSize = `auto, ${pattern.tileW} ${pattern.tileH}`

  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)
  const bookPanelRef = useRef<HTMLDivElement>(null)

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
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Portfolio' },
    { id: 'results',  label: tabs.results_label  ?? 'Before & After' },
    { id: 'about',    label: tabs.about_label    ?? 'The Bottega' },
    { id: 'policy',   label: tabs.policy_label   ?? 'House' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Care' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Visit' },
  ]
  const visibleTabs = allTabs
    .filter(t => t.id === 'book' || enabledByTab[t.id])
    .sort((a, b) => (orderByTab[a.id] ?? 999) - (orderByTab[b.id] ?? 999))

  function goBook() {
    setActive('book')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const panel = bookPanelRef.current
        const rail  = tabRailRef.current
        if (!panel) return
        const railH = rail?.getBoundingClientRect().height ?? 60
        const y = panel.getBoundingClientRect().top + window.scrollY - railH - 8
        window.scrollTo({ top: y, behavior: 'smooth' })
      })
    })
  }

  return (
    <>
      <style>{BOTTEGA_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <div
        className="bottega-template"
        style={{
          ['--bottega-accent' as any]:     accentHex,
          ['--bottega-on-accent' as any]:  onAccent,
          ['--bottega-accent-rgb' as any]: accentRgb,
          // Pattern motif: inline backgroundImage overrides the CSS default
          // so the active pattern picks up immediately on tenant settings
          // change without a build. background-size is paired in lockstep.
          backgroundImage: patternBg,
          backgroundSize:  patternSize,
        }}
      >

        {/* 1. Announcement — narrow centered strip with small terrazzo-cluster
            SVG bookends. Static (not a marquee). */}
        {header.show_announcement && header.announcement_text && (
          <div className="bottega-announce">
            <SpeckleBookend />
            <span>{header.announcement_text}</span>
            <SpeckleBookend />
          </div>
        )}

        {/* 2. Header / Hero — magazine-cover split. When a cover image is set,
            the layout becomes a two-column spread on desktop: cover bleeds
            full-bleed LEFT, identity panel sits RIGHT with the type stacked
            left-aligned. Reads as a magazine front-cover spread, distinct
            from the centered editorial lane that Opaline / Blackline / the
            previous Bottega all shared.

            When NO cover, the layout falls back to a centered hero (so
            tenants who haven't uploaded a photo still get a composed
            opening). */}
        <header className={`bottega-header${header.cover_image_url ? ' bottega-header--split' : ''}`}>
          {header.cover_image_url && (
            <div className="bottega-cover-wrap">
              <img className="bottega-cover" src={header.cover_image_url} alt="" />
            </div>
          )}
          <div className="bottega-header-inner">
            {header.avatar_image_url && (
              <img className="bottega-avatar" src={header.avatar_image_url} alt="" />
            )}
            <p className="bottega-eyebrow">{p?.business_type || 'Atelier'}</p>
            <h1 className="bottega-name">{display}</h1>
            {p?.tagline && <p className="bottega-tagline">{p.tagline}</p>}
            <div className="bottega-rule-ornament" aria-hidden="true">
              <SpeckleOrnament />
            </div>
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
        </header>

        {/* ── Sticky tab rail with speckle-cluster active marker ── */}
        <div className="bottega-tab-rail" ref={tabRailRef}>
          <div className="bottega-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`bottega-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span>{t.label}</span>
                {active === t.id && (
                  <svg className="bottega-tab-speckle" width="28" height="8" viewBox="0 0 28 8" aria-hidden="true">
                    {/* 3-circle terrazzo speckle cluster: 4 → 6 → 4 px,
                        spaced like a mini stone-fragment trio. */}
                    <circle cx="4"  cy="4" r="2"   fill="currentColor" />
                    <circle cx="14" cy="4" r="3"   fill="currentColor" />
                    <circle cx="24" cy="4" r="2"   fill="currentColor" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Reserve / Book */}
        <div className={`bottega-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'} ref={bookPanelRef}>
          <section className="bottega-section bottega-book" aria-label={tabs.book_label ?? 'Reserve'}>
            <BottegaBooking
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
          <div className={`bottega-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <GallerySection
              items={site.gallery}
              groups={site.gallery_groups}
              heading={settings.gallery?.heading || 'Portfolio'}
              eyebrow={tabs.gallery_label ?? 'Portfolio'}
              displayName={display}
              emptyText="A curated portfolio of recent work will live here."
              ariaLabel={tabs.gallery_label ?? 'Portfolio'}
            />
          </div>
        )}

        {/* 5. Results / Before & After */}
        {enabledByTab.results && (
          <div className={`bottega-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <BeforeAfterSection
              items={site.results ?? site.before_after}
              groups={site.results_groups ?? site.before_after_groups}
              heading={settings.results?.heading || 'Before & After'}
              eyebrow={tabs.results_label ?? 'Before & After'}
              separator="·"
              labels
              emptyText="Before-and-after transformations will appear here."
              ariaLabel={tabs.results_label ?? 'Before & After'}
            />
          </div>
        )}

        {/* 6. About — 2-image equal-weight side-by-side diptych, heading +
            body sit below. Bottega's bespoke layout. */}
        {enabledByTab.about && (
          <div className={`bottega-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="bottega-section bottega-about" aria-label={tabs.about_label ?? 'The Bottega'}>
              <div className="bottega-about-diptych">
                {[0, 1].map(i => (
                  <div key={i} className="bottega-about-img">
                    {aboutImages[i]
                      ? <img src={aboutImages[i]!} alt="" loading="lazy" />
                      : <div className="bottega-about-img--placeholder" aria-hidden="true" />}
                  </div>
                ))}
              </div>
              <div className="bottega-about-text">
                <p className="bottega-eyebrow">{tabs.about_label ?? 'About'}</p>
                <h2 className="bottega-section-title">{about.heading ?? 'About'}</h2>
                {about.body && (
                  <div className="bottega-about-body">
                    {about.body.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean).map((para: string, i: number) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
              </div>
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="bottega-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      {h.title && <h3>{h.title}</h3>}
                      {h.body && <p>{h.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* 7. Policies */}
        {enabledByTab.policy && (
          <div className={`bottega-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <PolicySection
              rows={[
                { label: 'Cancellation',  body: policies.cancellation_policy },
                { label: 'Late Arrival',  body: policies.late_policy },
                { label: 'No-Show',       body: policies.no_show_policy },
                { label: 'Deposit',       body: policies.deposit_policy },
                { label: 'Rescheduling',  body: policies.reschedule_policy },
                { label: 'Guests',        body: policies.guest_policy },
              ]}
              customGroups={(Array.isArray(policies.custom_groups) ? policies.custom_groups : []).map((g: any) => ({
                heading: g.heading,
                items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                  title: it.title,
                  content: it.content ?? it.body,
                })),
              }))}
              heading={settings.policy?.heading || 'House Notes'}
              eyebrow={tabs.policy_label ?? 'House'}
              marker="none"
              emptyText="House notes will appear here."
              ariaLabel={tabs.policy_label ?? 'House'}
            />
          </div>
        )}

        {/* 8. Advice / Care */}
        {enabledByTab.advice && (
          <div className={`bottega-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <InstructionsSection
              items={advice}
              heading={settings.advice?.heading ?? 'Care'}
              eyebrow={tabs.advice_label ?? 'Care'}
              cardKicker={settings.advice?.card_kicker}
              markGlyph="·"
              emptyText="Aftercare guidance will appear here."
              ariaLabel={tabs.advice_label ?? 'Care'}
            />
          </div>
        )}

        {/* 9. Timeline / Visit */}
        {enabledByTab.timeline && (
          <div className={`bottega-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
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

        {/* 10. FAQ */}
        {additionals.faq?.enabled !== false && (
          <FaqSection
            items={additionals.faq?.items}
            heading={additionals.faq?.heading ?? 'Questions'}
            eyebrow="Questions"
          />
        )}

        {/* 11. Reviews */}
        {additionals.reviews?.enabled !== false && (
          <ReviewsSection
            items={additionals.reviews?.items}
            heading={additionals.reviews?.heading ?? 'Words from the chair'}
            eyebrow="Reviews"
            starGlyph="●"
          />
        )}

        {/* 12. Thank-you */}
        <ThanksSection
          show={additionals.show_thank_you}
          title={additionals.thank_you_title ?? 'Grazie'}
          body={additionals.thank_you_body}
          signature={additionals.thank_you_signature}
          fallbackSignature={display}
          eyebrow={additionals.thank_you_eyebrow || 'A note'}
        />

        <SiteFooter
          businessName={(settings.footer?.business_name_override ?? '').trim() || display}
          subtext={settings.footer?.subtext}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          brandLabel={settings.footer?.brand_label || 'The Bottega'}
          ctaLabel="Reserve your seat"
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

function SpeckleBookend() {
  // Two tiny terrazzo speckles paired — sits at each end of the announcement strip.
  return (
    <svg width="14" height="8" viewBox="0 0 14 8" aria-hidden="true" className="bottega-announce-mark">
      <circle cx="3"  cy="4" r="2" fill="currentColor" />
      <circle cx="10" cy="4" r="1.5" fill="currentColor" opacity="0.65" />
    </svg>
  )
}

function SpeckleOrnament() {
  // Three speckles + hairline rule — sits between tagline and contact strip
  // in the hero. The terrazzo motif rendered at brand-glyph scale.
  return (
    <svg width="120" height="14" viewBox="0 0 120 14" aria-hidden="true">
      <line x1="0"  y1="7" x2="42"  y2="7" stroke="currentColor" strokeWidth="1" />
      <circle cx="52" cy="7" r="2.5" fill="currentColor" opacity="0.65" />
      <circle cx="60" cy="7" r="4"   fill="currentColor" />
      <circle cx="68" cy="7" r="2.5" fill="currentColor" opacity="0.65" />
      <line x1="78" y1="7" x2="120" y2="7" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

function SocialButtons({ header, profile, goBook }: { header: any; profile: any; goBook: () => void }) {
  const btns: { key: string; href: string | null; label: string; icon?: React.ReactNode }[] = [
    { key: 'book',       href: header.book_button_url || '#book', label: 'Reserve' },
    { key: 'call',       href: header.call_button_url       || (profile?.public_phone ? `tel:${profile.public_phone}` : null), label: 'Call', icon: <PhoneGlyph /> },
    { key: 'email',      href: header.email_button_url      || (profile?.public_email ? `mailto:${profile.public_email}` : null), label: 'Email', icon: <EmailGlyph /> },
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
    <nav className="bottega-social" aria-label="Contact">
      {visible.map(b => {
        const isReserve = b.key === 'book' && !header.book_button_url
        const onClick = isReserve
          ? (e: React.MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); goBook() }
          : undefined
        const isWeb = !!b.href && /^https?:/i.test(b.href)
        const isPrimary = b.key === 'book'
        return (
          <a
            key={b.key}
            href={safeHref(b.href!)}
            target={!isReserve && isWeb ? '_blank' : undefined}
            rel={!isReserve && isWeb ? 'noopener noreferrer' : undefined}
            className={`bottega-social-btn bottega-social-btn--${b.key}${isPrimary ? ' bottega-social-btn--primary' : ''}`}
            onClick={onClick}
            aria-label={b.label}
            title={b.label}
          >
            {isPrimary ? b.label : (b.icon && <span className="bottega-social-ico" aria-hidden="true">{b.icon}</span>)}
          </a>
        )
      })}
    </nav>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const BOTTEGA_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@300;400;500;600&display=swap');

/* The terrazzo backdrop. We layer a 92% cream gradient ON TOP of the
   tiled terrazzo PNG so the pattern shows through at ~8% effective
   opacity behind every section. The first gradient is the cream
   overlay (full coverage); the second background is the tiled PNG
   that lives at /templates/bottega/terrazzo.png (Next.js serves from
   public/ at URL root). */
.bottega-template {
  ${tokensToCss()}
  --bottega-bg: #F2EFE8;
  --bottega-surface: #FBF8F1;
  --bottega-ink: #2A1F18;
  --bottega-muted: rgba(42,31,24,0.62);
  --bottega-rule: rgba(42,31,24,0.14);
  --bottega-accent: #C9692C;
  --bottega-on-accent: #F2EFE8;
  --bottega-accent-rgb: 201, 105, 44;
  --bottega-display: 'DM Serif Display', Georgia, 'Times New Roman', serif;
  --bottega-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;

  /* Bridge Bottega's palette + fonts onto the canonical theme tokens used by
     the shared section components (@bkrdy/platform/sections). The runtime
     accent override on --bottega-accent flows through automatically. */
  --brk-color-bg: var(--bottega-bg);
  --brk-color-surface: var(--bottega-surface);
  --brk-color-text: var(--bottega-ink);
  --brk-color-muted: var(--bottega-muted);
  --brk-color-rule: var(--bottega-rule);
  --brk-color-accent: var(--bottega-accent);
  --brk-color-on-accent: var(--bottega-on-accent);
  --brk-family-display: var(--bottega-display);
  --brk-family-body: var(--bottega-body);

  /* THE pattern. 92% cream overlay on top of the tiled terrazzo PNG
     equals ~8% effective opacity for the pattern. Pattern tiles at
     800x800px (matches the source asset aspect — adjust if a different
     tile size reads better on screen). */
  background-color: var(--bottega-bg);
  background-image:
    linear-gradient(rgba(242,239,232,0.92), rgba(242,239,232,0.92)),
    url('/templates/bottega/terrazzo.jpg');
  background-size: auto, 800px 800px;
  background-repeat: no-repeat, repeat;
  background-attachment: scroll, scroll;

  color: var(--bottega-ink);
  font-family: var(--bottega-body);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.65;
  letter-spacing: 0.005em;
  min-height: 100vh;
  /* overflow-x:clip (NOT hidden) so the sticky tab rail keeps sticking. */
  overflow-x: clip;
}
.bottega-template *, .bottega-template *::before, .bottega-template *::after { box-sizing: border-box; }
.bottega-template img { max-width: 100%; display: block; }
.bottega-template a { color: inherit; text-decoration: none; }
.bottega-template :focus-visible { outline: 2px solid var(--bottega-accent); outline-offset: 3px; }

/* ── Shared eyebrow + section header ── */
.bottega-eyebrow {
  margin: 0;
  font-family: var(--bottega-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--bottega-accent);
}
.bottega-section-title {
  margin: 14px 0 0;
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(38px, 5vw, 60px);
  line-height: 1.06;
  letter-spacing: -0.005em;
  color: var(--bottega-ink);
}

/* ── Announcement — narrow centered strip with speckle bookends. ── */
.bottega-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 13px 24px;
  background: var(--bottega-surface);
  border-bottom: 1px solid var(--bottega-rule);
  font-family: var(--bottega-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: var(--bottega-ink);
  text-align: center;
}
.bottega-announce-mark { color: var(--bottega-accent); }

/* ── Header / Hero ──
   Two modes:
   1. Centered (fallback when no cover image is set) — original editorial
      layout, identity card centered on the cream backdrop.
   2. Magazine-cover SPLIT (when bottega-header--split is applied) —
      desktop two-column spread: cover bleeds full-bleed LEFT, identity
      panel sits RIGHT left-aligned. Mobile collapses to stacked: cover
      first (full width), identity below.
*/
.bottega-header { position: relative; }
.bottega-cover-wrap { position: relative; width: 100%; }
.bottega-cover {
  width: 100%;
  height: clamp(280px, 52vw, 560px);
  object-fit: cover;
  filter: saturate(0.97) brightness(1.01);
}
.bottega-header-inner {
  position: relative;
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: clamp(48px, 7vw, 80px) var(--brk-space-md) clamp(40px, 6vw, 64px);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.bottega-avatar {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  object-fit: cover;
  margin: 0 0 22px;
  border: 1px solid var(--bottega-rule);
  background: var(--bottega-surface);
  box-shadow: 0 8px 30px rgba(42,31,24,0.10);
}
.bottega-name {
  margin: 14px 0 0;
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(48px, 8.5vw, 92px);
  line-height: 1.0;
  letter-spacing: -0.012em;
  color: var(--bottega-ink);
}
.bottega-tagline {
  margin: 18px 0 0;
  max-width: 46ch;
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(18px, 2.4vw, 23px);
  line-height: 1.5;
  color: var(--bottega-muted);
}
.bottega-rule-ornament {
  display: inline-flex;
  align-items: center;
  margin: 30px 0;
  color: var(--bottega-accent);
  opacity: 0.85;
}
.bottega-rule-ornament svg { display: block; }

/* ── Magazine-cover split (active when bottega-header--split is set) ──
   Desktop: two-column grid (image LEFT bleeding edge-to-edge, identity
   RIGHT with internal padding). Mobile: collapses to stacked, cover first.
   This is Bottega's hero signature — distinct from the centered editorial
   shared by Opaline / Blackline / TFR.
*/
.bottega-header--split {
  display: grid;
  grid-template-columns: 1fr;
  align-items: stretch;
  min-height: clamp(420px, 70vh, 720px);
}
@media (min-width: 880px) {
  .bottega-header--split {
    grid-template-columns: 6fr 5fr;
  }
}

/* Cover panel in split mode — image bleeds to its container edge, no veil. */
.bottega-header--split .bottega-cover-wrap {
  height: 100%;
  min-height: clamp(320px, 60vw, 720px);
  order: 1;
}
.bottega-header--split .bottega-cover {
  width: 100%;
  height: 100%;
  min-height: inherit;
  object-fit: cover;
}

/* Identity panel in split mode — left-aligned column, centered vertically. */
.bottega-header--split .bottega-header-inner {
  text-align: left;
  align-items: flex-start;
  justify-content: center;
  margin: 0;
  max-width: none;
  padding: clamp(56px, 6vw, 88px) clamp(28px, 5vw, 64px);
  order: 2;
}
@media (max-width: 879px) {
  /* On mobile, collapse back to centered alignment so the stacked view
     still reads composed (left-aligned narrow text feels off when there
     is no neighboring image to anchor against). */
  .bottega-header--split .bottega-header-inner {
    text-align: center;
    align-items: center;
    padding: clamp(48px, 7vw, 80px) var(--brk-space-md);
  }
}
.bottega-header--split .bottega-name {
  /* Slightly tighter ceiling than centered — the identity column is
     narrower in split mode, so the giant 92px ceiling would overflow. */
  font-size: clamp(44px, 5.4vw, 72px);
  margin-top: 12px;
}
.bottega-header--split .bottega-tagline {
  margin-left: 0;
  margin-right: 0;
  max-width: 36ch;
}
.bottega-header--split .bottega-avatar {
  margin: 0 0 20px;
}
.bottega-header--split .bottega-rule-ornament {
  margin: 24px 0;
}
.bottega-header--split .bottega-social {
  justify-content: flex-start;
}
@media (max-width: 879px) {
  .bottega-header--split .bottega-tagline { margin-left: auto; margin-right: auto; }
  .bottega-header--split .bottega-avatar { margin-left: auto; margin-right: auto; }
  .bottega-header--split .bottega-rule-ornament { margin-left: auto; margin-right: auto; }
  .bottega-header--split .bottega-social { justify-content: center; }
}

/* Hero contact strip — icon-only circular buttons (matches the family
   pattern). Reserve CTA breaks the pattern as a wide italic pill. */
.bottega-social {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  align-items: center;
}
.bottega-social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--bottega-accent) 38%, transparent);
  border-radius: 6px;
  background: var(--bottega-surface);
  color: var(--bottega-accent);
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.bottega-social-btn:hover {
  border-color: var(--bottega-accent);
  background: color-mix(in srgb, var(--bottega-accent) 12%, var(--bottega-surface));
  color: var(--bottega-ink);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--bottega-accent-rgb), 0.20);
}
.bottega-social-ico { display: inline-flex; align-items: center; color: currentColor; }
.bottega-social-ico svg { display: block; }
/* Reserve CTA — wide pill, accent fill, italic Serif Display. */
.bottega-social-btn--primary {
  width: auto;
  height: auto;
  padding: 13px 28px;
  background: var(--bottega-accent);
  border-color: var(--bottega-accent);
  color: var(--bottega-on-accent);
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: 17px;
  letter-spacing: 0;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(var(--bottega-accent-rgb), 0.22);
}
.bottega-social-btn--primary:hover {
  color: var(--bottega-on-accent);
  background: var(--bottega-accent);
  filter: brightness(1.04);
  box-shadow: 0 10px 26px rgba(var(--bottega-accent-rgb), 0.30);
}
.bottega-social-btn--primary .bottega-social-ico { display: none; }

/* ── Sticky tab rail with speckle-cluster active marker ── */
.bottega-tab-rail {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--bottega-bg) 88%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--bottega-rule);
  border-bottom: 1px solid var(--bottega-rule);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.bottega-tab-rail::-webkit-scrollbar { display: none; }
.bottega-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 12px var(--brk-space-md) 16px;
  gap: 6px;
}
.bottega-tab-pill {
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  padding: 6px 16px 12px;
  font-family: var(--bottega-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--bottega-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms ease;
}
.bottega-tab-pill:hover { color: var(--bottega-ink); }
.bottega-tab-pill.is-active { color: var(--bottega-accent); }
.bottega-tab-speckle {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  color: var(--bottega-accent);
  display: block;
}

.bottega-tab-panel { display: none; }
.bottega-tab-panel.is-active { display: block; }

/* ── Section frame ── */
.bottega-section {
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(64px, 8vw, 104px) var(--brk-space-md);
}
.bottega-book { padding-top: clamp(40px, 5vw, 64px); }

/* ── About — 2-image EQUAL-WEIGHT side-by-side diptych. Heading + body
   sit BELOW. Distinct from Pétale's asymmetric portrait+offset. ── */
.bottega-about { max-width: 980px; }
.bottega-about-diptych {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 56px;
}
.bottega-about-img {
  aspect-ratio: 4/5;
  background: var(--bottega-surface);
  border: 1px solid var(--bottega-rule);
  border-radius: 4px;
  overflow: hidden;
}
.bottega-about-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.bottega-about-img--placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--bottega-accent) 6%, var(--bottega-surface)),
    color-mix(in srgb, var(--bottega-accent) 14%, var(--bottega-surface)));
}
@media (max-width: 640px) {
  .bottega-about-diptych { gap: 10px; margin-bottom: 40px; }
}
.bottega-about-text { max-width: 720px; margin: 0 auto; text-align: center; }
.bottega-about-body {
  max-width: 60ch;
  margin: 26px auto 0;
}
.bottega-about-body p {
  margin: 0 0 18px;
  font-size: 17px;
  line-height: 1.8;
  color: color-mix(in srgb, var(--bottega-ink) 88%, var(--bottega-muted));
}
.bottega-about-body p:last-child { margin-bottom: 0; }
.bottega-highlights {
  list-style: none;
  margin: 56px auto 0;
  padding: 0;
  max-width: 760px;
  display: grid;
  gap: 0;
}
.bottega-highlights > li {
  padding: 26px 0;
  border-top: 1px solid var(--bottega-rule);
  text-align: center;
}
.bottega-highlights > li:last-child { border-bottom: 1px solid var(--bottega-rule); }
.bottega-highlights h3 {
  margin: 0 0 6px;
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: 24px;
  letter-spacing: -0.005em;
  color: var(--bottega-ink);
}
.bottega-highlights p {
  margin: 0;
  font-family: var(--bottega-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--bottega-muted);
}

/* ── Skin layer over the shared platform sections ──
   Apply Bottega's signatures over the canonical .brk-* base: italic
   DM Serif Display section titles, accent tracked Inter eyebrows, soft
   surface cards (more opaque than the 8% terrazzo backdrop so they lift). */

.bottega-template .brk-eyebrow {
  font-family: var(--bottega-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--bottega-accent);
}
.bottega-template .brk-section-title {
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(38px, 5vw, 60px);
  line-height: 1.06;
  letter-spacing: -0.005em;
  color: var(--bottega-ink);
}

/* Thank-you — italic DM Serif Display heading, accent ornament. */
.bottega-template .brk-thanks {
  max-width: 720px;
  padding-top: 96px;
  padding-bottom: 64px;
}
.bottega-template .brk-thanks-title {
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.06;
  letter-spacing: -0.012em;
  color: var(--bottega-ink);
}
.bottega-template .brk-thanks-body {
  font-family: var(--bottega-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(17px, 1.8vw, 21px);
  line-height: 1.6;
  color: var(--bottega-ink);
  opacity: 0.86;
}
.bottega-template .brk-thanks-signature {
  font-family: var(--bottega-display);
  font-style: italic;
  font-size: 28px;
  color: var(--bottega-accent);
}

/* FAQ — italic summary, accent + marker (rotates to × on open). */
.bottega-template .brk-faq summary {
  font-family: var(--bottega-display);
  font-style: italic;
  font-size: 18px;
  font-weight: 400;
}
.bottega-template .brk-faq summary::after {
  color: var(--bottega-accent);
  font-family: var(--bottega-display);
}

/* Reviews — italic blockquote, accent terrazzo cluster as the rating dots. */
.bottega-template .brk-review blockquote {
  font-family: var(--bottega-display);
  font-style: italic;
  font-size: 18px;
  line-height: 1.55;
  color: var(--bottega-ink);
}
.bottega-template .brk-review-stars {
  color: var(--bottega-accent);
  letter-spacing: 0.32em;
  font-size: 14px;
}
.bottega-template .brk-review-attr {
  font-family: var(--bottega-body);
  letter-spacing: 0.22em;
}

/* Footer CTA pill — soft mid-radius accent fill. */
.bottega-template .brk-footer-book {
  border-radius: 6px;
  font-family: var(--bottega-body);
  letter-spacing: 0.22em;
}
.bottega-template .brk-footer-credit-band {
  font-family: var(--bottega-body);
}

/* Surface cards on the shared sections (FAQ/reviews bg, etc.) — slightly
   more opaque than the bridged --brk-color-surface so they lift cleanly
   off the terrazzo without feeling too solid. */
.bottega-template .brk-card,
.bottega-template .brk-review {
  background: rgba(251,248,241,0.85);
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .bottega-tab-pill,
  .bottega-social-btn { transition: none !important; }
}

/* ── Mobile tweaks ── */
@media (max-width: 640px) {
  .bottega-section { padding: 56px 20px; }
}
`
