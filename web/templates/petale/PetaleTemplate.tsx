'use client'

/**
 * Pétale — soft pink bridal/luxe-feminine template.
 *
 * For brides, makeup + lash artists serving brides, hair-for-events
 * stylists, and boutique studios in the wedding + special-occasion lane.
 *
 * Visual vocabulary:
 *   - Pink canvas (background-role); palette swatches paint the page
 *     (Blush default → Rose Quartz / Peach / Mauve / Dusty Rose / Cream
 *     exit). Each variant carries its own accent — champagne gold
 *     (#C9A876) on the light canvases, deepened wine/copper tones on the
 *     darker pinks — driving CTAs, eyebrows, ornaments, and the scalloped
 *     active marker.
 *   - Playfair Display (italic emphasis on headings) + Inter body +
 *     Pinyon Script (the brand-name hero treatment + all section
 *     eyebrows + the Thank You note signature).
 *   - Hairline gold rules and a SCALLOPED divider SVG between sections —
 *     a romantic-wedding-stationery flourish that the other templates
 *     don't carry.
 *   - Sticky tab rail; the active tab gets a SCALLOPED curve underline
 *     (the Pétale signature, distinct from Opaline's champagne pill wash,
 *     Velvet's gold bar, Blackline's flat underline, Lush's sparkle,
 *     TFR's marquee glow).
 *
 * About: 2-image asymmetric diptych (portrait-left larger + offset-right
 * smaller, with a Playfair italic heading and oversized lead cap on the
 * body). Distinct from TFR/Velvet/Lush (3-staggered hero), Opaline
 * (3-grid), and Blackline (1-hero).
 *
 * All 12 required sections render. Empty data shows a soft empty state.
 * Booking embeds the platform flow via PetaleBooking, re-skinned to the
 * pink + gold palette.
 */

import { useState, useRef } from 'react'
import type { PublicSite } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import PetaleBooking from './PetaleBooking'

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

// ── Brand glyphs lucide doesn't ship (matched to Pétale's stroke weight at 14px). ──
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
function LinkGlyph({ size = 14 }: { size?: number }) {
  // lucide Link2, inlined to match the rail's glyph system.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 17H7A5 5 0 0 1 7 7h2" />
      <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
      <line x1="8" y1="12" x2="16" y2="12" />
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

// ── Background variants ──────────────────────────────────────────────────────
//
// Pétale swaps BACKGROUND across variants. The editor reuses
// theme.accent_color to pick a variant (treated as a canvas hex here).
// Unknown values fall back to Blush. Each variant carries its own accent:
// champagne gold on the light canvases (Blush, Cream), deepened wine/copper
// tones on the darker pinks where gold loses contrast.
interface Variant { bg: string; ink: string; muted: string; rule: string; surface: string; accent: string; onAccent: string }
const VARIANTS: Record<string, Variant> = {
  '#F4DDE0': { bg: '#F4DDE0', ink: '#3D2027', muted: 'rgba(61,32,39,0.58)', rule: 'rgba(61,32,39,0.14)', surface: 'rgba(255,255,255,0.55)', accent: '#C9A876', onAccent: '#3D2027' }, // Blush — champagne gold
  '#EAC4CB': { bg: '#EAC4CB', ink: '#3D2027', muted: 'rgba(61,32,39,0.58)', rule: 'rgba(61,32,39,0.16)', surface: 'rgba(255,255,255,0.50)', accent: '#7A3848', onAccent: '#F8F1EA' }, // Rose Quartz — deep wine
  '#F5D5C0': { bg: '#F5D5C0', ink: '#3F2618', muted: 'rgba(63,38,24,0.58)', rule: 'rgba(63,38,24,0.16)', surface: 'rgba(255,255,255,0.52)', accent: '#8A4A2E', onAccent: '#F8F1EA' }, // Peach — burnt copper
  '#E0B5C4': { bg: '#E0B5C4', ink: '#3A1A25', muted: 'rgba(58,26,37,0.58)', rule: 'rgba(58,26,37,0.16)', surface: 'rgba(255,255,255,0.50)', accent: '#6B2D3D', onAccent: '#F8F1EA' }, // Mauve — oxblood
  '#D9A8B0': { bg: '#D9A8B0', ink: '#3A1820', muted: 'rgba(58,24,32,0.58)', rule: 'rgba(58,24,32,0.18)', surface: 'rgba(255,255,255,0.50)', accent: '#5C1F2C', onAccent: '#F8F1EA' }, // Dusty Rose — claret
  '#F5EFE6': { bg: '#F5EFE6', ink: '#3D2A20', muted: 'rgba(61,42,32,0.58)', rule: 'rgba(61,42,32,0.14)', surface: 'rgba(255,255,255,0.55)', accent: '#C9A876', onAccent: '#3D2027' }, // Cream exit — champagne gold
}
const DEFAULT_VARIANT_HEX = '#F4DDE0'
function resolveVariant(raw: string | null | undefined): Variant {
  const key = (raw ?? '').toUpperCase().trim()
  return VARIANTS[key] ?? VARIANTS[DEFAULT_VARIANT_HEX]
}

export default function PetaleTemplate({ site, slug }: Props) {
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

  // Variant lives on theme.accent_color (repurposed — see VARIANTS comment).
  const variant = resolveVariant(settings.theme?.accent_color ?? null)
  const variantVars: React.CSSProperties = {
    ['--petale-bg' as any]:      variant.bg,
    ['--petale-ink' as any]:     variant.ink,
    ['--petale-muted' as any]:   variant.muted,
    ['--petale-rule' as any]:    variant.rule,
    ['--petale-surface' as any]: variant.surface,
    ['--petale-accent' as any]:    variant.accent,
    ['--petale-on-accent' as any]: variant.onAccent,
    backgroundColor: variant.bg,
    color:           variant.ink,
  }

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
    { id: 'gallery',  label: tabs.gallery_label  ?? 'Gallery' },
    { id: 'results',  label: tabs.results_label  ?? 'Transformations' },
    { id: 'about',    label: tabs.about_label    ?? 'About' },
    { id: 'policy',   label: tabs.policy_label   ?? 'Details' },
    { id: 'advice',   label: tabs.advice_label   ?? 'Care' },
    { id: 'timeline', label: tabs.timeline_label ?? 'Your day' },
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

  // Botanical petal divider — Pétale's signature section break. Three
  // small petals on a hairline, like pressed flowers between pages of a
  // wedding album. Replaces the earlier scalloped curve.
  const ScallopDivider = () => (
    <div className="petale-divider" aria-hidden="true">
      <svg width="160" height="20" viewBox="0 0 160 20" xmlns="http://www.w3.org/2000/svg">
        <line x1="0" y1="10" x2="60" y2="10" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="74" cy="10" rx="3" ry="6" fill="currentColor" opacity="0.55" />
        <ellipse cx="80" cy="10" rx="5" ry="7" fill="currentColor" opacity="0.85" />
        <ellipse cx="86" cy="10" rx="3" ry="6" fill="currentColor" opacity="0.55" />
        <line x1="100" y1="10" x2="160" y2="10" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )

  return (
    <>
      <style>{PETALE_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <div className="petale-template" style={variantVars}>

        {/* 1. Announcement — static centered strip with scalloped bookends. */}
        {header.show_announcement && header.announcement_text && (
          <div className="petale-announce">
            <span className="petale-announce-mark" aria-hidden="true">&#x273F;</span>
            <span>{header.announcement_text}</span>
            <span className="petale-announce-mark" aria-hidden="true">&#x273F;</span>
          </div>
        )}

        {/* 2. Header / Hero — wedding-invitation layout: identity card sits
            LEFT (Pinyon Script name + Playfair italic tagline + petal
            ornament), cover image flanks RIGHT (vertical 3:4 portrait
            window). Stacks on mobile with cover first. Asymmetric +
            handwritten-script vocabulary makes this read as a wedding
            invitation rather than Opaline's symmetric editorial spread. */}
        <header className={`petale-header${header.cover_image_url ? ' petale-header--has-cover' : ''}`}>
          <div className="petale-header-text">
            <p className="petale-hero-kicker">{p?.business_type || 'Atelier'}</p>
            <h1 className="petale-name">{display}</h1>
            {p?.tagline && <p className="petale-tagline">{p.tagline}</p>}
            <span className="petale-rule-ornament" aria-hidden="true">
              <svg width="64" height="14" viewBox="0 0 64 14" xmlns="http://www.w3.org/2000/svg">
                {/* Three small petal silhouettes connected by a hairline.
                    Replaces the plain gold rule with a botanical ornament. */}
                <line x1="0" y1="7" x2="22" y2="7" stroke="currentColor" strokeWidth="1" />
                <ellipse cx="32" cy="7" rx="4" ry="6" fill="currentColor" opacity="0.7" />
                <line x1="42" y1="7" x2="64" y2="7" stroke="currentColor" strokeWidth="1" />
                <ellipse cx="26" cy="7" rx="2" ry="3" fill="currentColor" opacity="0.45" />
                <ellipse cx="38" cy="7" rx="2" ry="3" fill="currentColor" opacity="0.45" />
              </svg>
            </span>
            <SocialButtons header={header} profile={p} goBook={goBook} />
          </div>
          {header.cover_image_url && (
            <div className="petale-cover-wrap">
              <img className="petale-cover" src={header.cover_image_url} alt="" />
              <div className="petale-cover-frame" aria-hidden="true" />
              {header.avatar_image_url && (
                <img className="petale-cover-avatar" src={header.avatar_image_url} alt="" />
              )}
            </div>
          )}
          {!header.cover_image_url && header.avatar_image_url && (
            <img className="petale-avatar-standalone" src={header.avatar_image_url} alt="" />
          )}
        </header>

        {/* ── Sticky tab rail with scalloped active-underline ── */}
        <div className="petale-tab-rail" ref={tabRailRef}>
          <div className="petale-tab-slider" role="tablist" aria-label="Sections">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={active === t.id}
                className={`petale-tab-pill${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
              >
                <span>{t.label}</span>
                {active === t.id && (
                  <svg className="petale-tab-scallop" width="64" height="6" viewBox="0 0 64 6" aria-hidden="true">
                    <path
                      d="M0 3 Q 4 0 8 3 T 16 3 T 24 3 T 32 3 T 40 3 T 48 3 T 56 3 T 64 3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Reserve / Book */}
        <div className={`petale-tab-panel${active === 'book' ? ' is-active' : ''}`}
             role="tabpanel" aria-hidden={active !== 'book'} ref={bookPanelRef}>
          <section className="petale-section petale-book" aria-label={tabs.book_label ?? 'Reserve'}>
            <PetaleBooking
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
          <div className={`petale-tab-panel${active === 'gallery' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'gallery'}>
            <GallerySection
              items={site.gallery}
              groups={site.gallery_groups}
              layout={settings.gallery?.layout ?? null}
              heading={settings.gallery?.heading || 'Lookbook'}
              eyebrow={tabs.gallery_label ?? 'Gallery'}
              displayName={display}
              emptyText="A lookbook of recent work will live here."
              ariaLabel={tabs.gallery_label ?? 'Gallery'}
            />
            <ScallopDivider />
          </div>
        )}

        {/* 5. Results / Before & After */}
        {enabledByTab.results && (
          <div className={`petale-tab-panel${active === 'results' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'results'}>
            <BeforeAfterSection
              items={site.results ?? site.before_after}
              groups={site.results_groups ?? site.before_after_groups}
              layout={settings.results?.layout ?? null}
              heading={settings.results?.heading || 'Before & After'}
              eyebrow={tabs.results_label ?? 'Transformations'}
              separator="✦︎"
              labels
              emptyText="Transformations will appear here."
              ariaLabel={tabs.results_label ?? 'Transformations'}
            />
            <ScallopDivider />
          </div>
        )}

        {/* 6. About — 2-image asymmetric diptych, Playfair italic heading,
            oversized lead cap on body. Pétale's bespoke layout. */}
        {enabledByTab.about && (
          <div className={`petale-tab-panel${active === 'about' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'about'}>
            <section className="petale-section petale-about" aria-label={tabs.about_label ?? 'About'}>
              <div className="petale-about-grid">
                <div className="petale-about-images">
                  <div className="petale-about-img petale-about-img--lead">
                    {aboutImages[0]
                      ? <img src={aboutImages[0]!} alt="" loading="lazy" />
                      : <div className="petale-about-img--placeholder" aria-hidden="true" />}
                  </div>
                  <div className="petale-about-img petale-about-img--offset">
                    {aboutImages[1]
                      ? <img src={aboutImages[1]!} alt="" loading="lazy" />
                      : <div className="petale-about-img--placeholder" aria-hidden="true" />}
                  </div>
                </div>
                <div className="petale-about-text">
                  <p className="petale-eyebrow">{tabs.about_label ?? 'About'}</p>
                  <h2 className="petale-section-title">{about.heading ?? 'About'}</h2>
                  {about.body && renderAboutBody(about.body)}
                </div>
              </div>
              {Array.isArray(about.highlights) && about.highlights.length > 0 && (
                <ul className="petale-highlights">
                  {about.highlights.map((h: any, i: number) => (
                    <li key={i}>
                      {h.title && <h3>{h.title}</h3>}
                      {h.body && <p>{h.body}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <ScallopDivider />
          </div>
        )}

        {/* 7. Policies */}
        {enabledByTab.policy && (
          <div className={`petale-tab-panel${active === 'policy' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'policy'}>
            <PolicySection
              rows={[
                { label: 'Cancellation',   body: policies.cancellation_policy },
                { label: 'Late arrival',   body: policies.late_policy },
                { label: 'No-show',        body: policies.no_show_policy },
                { label: 'Deposit',        body: policies.deposit_policy },
                { label: 'Rescheduling',   body: policies.reschedule_policy },
                { label: 'Guests',         body: policies.guest_policy },
              ]}
              customGroups={(Array.isArray(policies.custom_groups) ? policies.custom_groups : []).map((g: any) => ({
                heading: g.heading,
                items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                  title: it.title,
                  content: it.content ?? it.body,
                })),
              }))}
              heading={settings.policy?.heading || 'The fine print'}
              eyebrow={tabs.policy_label ?? 'Details'}
              marker="none"
              emptyText="Booking details will appear here."
              ariaLabel={tabs.policy_label ?? 'Details'}
            />
            <ScallopDivider />
          </div>
        )}

        {/* 8. Advice / Care */}
        {enabledByTab.advice && (
          <div className={`petale-tab-panel${active === 'advice' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'advice'}>
            <InstructionsSection
              items={advice}
              heading={settings.advice?.heading ?? 'Care notes'}
              eyebrow={tabs.advice_label ?? 'Care'}
              cardKicker={settings.advice?.card_kicker}
              markGlyph="✦︎"
              emptyText="Gentle care guidance will appear here."
              ariaLabel={tabs.advice_label ?? 'Care'}
            />
            <ScallopDivider />
          </div>
        )}

        {/* 9. Timeline / Your day */}
        {enabledByTab.timeline && (
          <div className={`petale-tab-panel${active === 'timeline' ? ' is-active' : ''}`}
               role="tabpanel" aria-hidden={active !== 'timeline'}>
            <InstructionsSection
              items={timeline}
              heading={settings.timeline?.heading ?? 'Your day'}
              eyebrow={tabs.timeline_label ?? 'Your day'}
              cardKicker={settings.timeline?.card_kicker}
              numbered
              emptyText="The shape of your day will appear here."
              ariaLabel={tabs.timeline_label ?? 'Your day'}
            />
            <ScallopDivider />
          </div>
        )}

        {/* 10. FAQ */}
        {additionals.faq?.enabled !== false && (
          <FaqSection
            items={additionals.faq?.items}
            heading={additionals.faq?.heading ?? 'Questions, gently asked'}
            eyebrow="Questions"
          />
        )}

        {/* 11. Reviews */}
        {additionals.reviews?.enabled !== false && (
          <ReviewsSection
            items={additionals.reviews?.items}
            heading={additionals.reviews?.heading ?? 'Kind words'}
            eyebrow="Reviews"
            starGlyph="✦︎"
          />
        )}

        {/* 12. Thank-you — Playfair italic with Pinyon Script signature. */}
        <ThanksSection
          show={additionals.show_thank_you}
          title={additionals.thank_you_title ?? 'Thank you, truly'}
          body={additionals.thank_you_body}
          signature={additionals.thank_you_signature}
          fallbackSignature={display}
          eyebrow={additionals.thank_you_eyebrow || 'With love'}
        />

        <SiteFooter
          businessName={(settings.footer?.business_name_override ?? '').trim() || display}
          subtext={settings.footer?.subtext}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          brandLabel={settings.footer?.brand_label || 'The Atelier'}
          ctaLabel="Reserve your date"
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
  // Owner-defined custom links render after the platform buttons in the
  // same accent-aware neutral circle chrome. Only explicit https/http/
  // mailto/tel URLs pass — anything else is dropped at render time.
  const customLinks: any[] = Array.isArray(header.custom_links) ? header.custom_links : []
  for (const link of customLinks) {
    const url = typeof link?.url === 'string' ? link.url.trim() : ''
    if (!/^(https?:\/\/|mailto:|tel:)/i.test(url)) continue
    btns.push({ key: `custom-${link.id}`, href: url, label: link.label || url, icon: <LinkGlyph /> })
  }
  const visible = btns.filter(b => header[`show_${b.key}_button`] !== false && b.href)
  if (visible.length === 0) return null
  return (
    <nav className="petale-social" aria-label="Contact">
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
            className={`petale-social-btn petale-social-btn--${b.key}${isPrimary ? ' petale-social-btn--primary' : ''}`}
            onClick={onClick}
            aria-label={b.label}
            title={b.label}
          >
            {/* Primary keeps its visible label ("Reserve") as a wide pill;
                every other button is icon-only with the label moved to
                aria-label + native tooltip via the `title` attribute. */}
            {isPrimary ? b.label : (b.icon && <span className="petale-social-ico" aria-hidden="true">{b.icon}</span>)}
          </a>
        )
      })}
    </nav>
  )
}

function renderAboutBody(body: string) {
  // Drop cap on the first paragraph; remaining paragraphs render plain.
  const paragraphs = body.split(/\n{2,}/).map(s => s.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null
  return (
    <div className="petale-about-body">
      {paragraphs.map((para, i) => {
        if (i === 0) {
          const first = para.charAt(0)
          const rest  = para.slice(1)
          return (
            <p key={i} className="petale-about-lead">
              <span className="petale-dropcap">{first}</span>
              {rest}
            </p>
          )
        }
        return <p key={i}>{para}</p>
      })}
    </div>
  )
}

// ─── Scoped CSS ────────────────────────────────────────────────────────────────

const PETALE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Inter:wght@300;400;500;600&family=Pinyon+Script&display=swap');

.petale-template {
  ${tokensToCss()}
  --petale-bg: #F4DDE0;
  --petale-ink: #3D2027;
  --petale-muted: rgba(61,32,39,0.58);
  --petale-rule: rgba(61,32,39,0.14);
  --petale-surface: rgba(255,255,255,0.55);
  --petale-accent: #C9A876;
  --petale-on-accent: #3D2027;
  --petale-display: 'Playfair Display', Georgia, 'Times New Roman', serif;
  --petale-body: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --petale-script: 'Pinyon Script', 'Allura', cursive;

  /* Bridge Pétale's palette + fonts onto the canonical theme tokens used by
     the shared section components (@bkrdy/platform/sections). The variant
     overrides on --petale-bg/--petale-ink/etc. (set by inline style) flow
     through to the shared sections automatically. */
  --brk-color-bg: var(--petale-bg);
  --brk-color-surface: var(--petale-surface);
  --brk-color-text: var(--petale-ink);
  --brk-color-muted: var(--petale-muted);
  --brk-color-rule: var(--petale-rule);
  --brk-color-accent: var(--petale-accent);
  --brk-color-on-accent: var(--petale-on-accent);
  --brk-family-display: var(--petale-display);
  --brk-family-body: var(--petale-body);
  --brk-family-script: var(--petale-script);

  background: var(--petale-bg);
  color: var(--petale-ink);
  font-family: var(--petale-body);
  font-size: 16px;
  font-weight: 400;
  line-height: 1.7;
  letter-spacing: 0.005em;
  min-height: 100vh;
  /* overflow-x:clip (NOT hidden) so the sticky tab rail keeps sticking. */
  overflow-x: clip;
}
.petale-template *, .petale-template *::before, .petale-template *::after { box-sizing: border-box; }
.petale-template img { max-width: 100%; display: block; }
.petale-template a { color: inherit; text-decoration: none; }
.petale-template :focus-visible { outline: 2px solid var(--petale-accent); outline-offset: 3px; }

/* ── Shared eyebrow + section header ──
   The eyebrow uses Pinyon Script now (handwritten-romantic), NOT tracked
   Inter uppercase like Opaline. This is the single biggest visual move
   — what made Pétale read as an Opaline dupe before. The section title
   also gets a larger, more italic Playfair treatment. */
.petale-eyebrow {
  margin: 0;
  font-family: var(--petale-script);
  font-size: clamp(26px, 3.2vw, 38px);
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--petale-accent);
  line-height: 1;
}
.petale-section-title {
  margin: 4px 0 0;
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 600;
  font-size: clamp(42px, 6vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.012em;
  color: var(--petale-ink);
}

/* ── Announcement — narrow centered strip, italic Playfair (not Opaline's
   tracked uppercase). The bookend marks become small petal silhouettes. */
.petale-announce {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 24px;
  background: var(--petale-surface);
  border-bottom: 1px solid var(--petale-rule);
  font-family: var(--petale-display);
  font-style: italic;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--petale-ink);
  text-align: center;
}
.petale-announce-mark { color: var(--petale-accent); font-size: 14px; opacity: 0.7; }

/* ── Header / Hero — wedding-invitation layout. Left: identity text block
   (kicker + Pinyon Script brand name + Playfair italic tagline +
   botanical ornament + contact buttons). Right: vertical 3:4 portrait
   cover window with the avatar tucked as a "stamp" overlap at top-right.
   Asymmetric, romantic, instantly distinct from Opaline's centered
   editorial card-on-veil. */
.petale-header {
  position: relative;
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(48px, 6vw, 88px) var(--brk-space-md) clamp(48px, 6vw, 88px);
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(36px, 5vw, 64px);
  align-items: center;
}
@media (min-width: 880px) {
  .petale-header--has-cover {
    grid-template-columns: 1fr minmax(360px, 0.85fr);
  }
}
.petale-header-text {
  position: relative;
  text-align: left;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  /* On mobile, stay center-aligned for the narrow viewport */
}
@media (max-width: 879px) {
  .petale-header-text { align-items: center; text-align: center; }
}
.petale-hero-kicker {
  margin: 0 0 18px;
  font-family: var(--petale-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.34em;
  text-transform: uppercase;
  color: var(--petale-accent);
  opacity: 0.85;
}
/* THE brand-name move — Pinyon Script in display sizing. Wedding-paper
   coded. The single most distinct moment from Opaline's restrained
   Cormorant. */
.petale-name {
  margin: 0;
  font-family: var(--petale-script);
  font-style: normal;
  font-weight: 400;
  font-size: clamp(72px, 12vw, 144px);
  line-height: 0.96;
  letter-spacing: -0.005em;
  color: var(--petale-ink);
}
.petale-tagline {
  margin: 22px 0 0;
  max-width: 38ch;
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(17px, 2.1vw, 22px);
  line-height: 1.5;
  color: var(--petale-muted);
}
.petale-rule-ornament {
  display: inline-flex;
  align-items: center;
  margin: 30px 0 30px;
  color: var(--petale-accent);
  opacity: 0.85;
}
.petale-rule-ornament svg { display: block; }

/* Cover window — vertical 3:4 with a soft hairline frame and an avatar
   "stamp" overlapping the top-right corner. Floats inside the right
   column on desktop, full-width image on mobile (positioned ABOVE the
   text block via order:-1). */
.petale-cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3/4;
  border-radius: 8px;
  overflow: visible;
}
@media (max-width: 879px) {
  .petale-cover-wrap {
    aspect-ratio: 4/3;
    order: -1;
  }
}
.petale-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  filter: saturate(0.97) brightness(1.01);
}
.petale-cover-frame {
  position: absolute;
  inset: -6px;
  border: 1px solid var(--petale-accent);
  border-radius: 12px;
  opacity: 0.55;
  pointer-events: none;
}
.petale-cover-avatar {
  position: absolute;
  top: -28px;
  right: -28px;
  width: 96px;
  height: 96px;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid var(--petale-bg);
  background: var(--petale-surface);
  box-shadow: 0 10px 30px rgba(61,32,39,0.18);
  z-index: 2;
}
@media (max-width: 879px) {
  .petale-cover-avatar {
    top: auto;
    bottom: -32px;
    right: 50%;
    transform: translateX(50%);
    width: 80px;
    height: 80px;
  }
}
/* When no cover image, render the avatar as a soft standalone card
   above the text block — keeps the hero from feeling empty. */
.petale-avatar-standalone {
  width: 120px;
  height: 120px;
  border-radius: 999px;
  object-fit: cover;
  margin: 0 auto;
  border: 1px solid var(--petale-rule);
  background: var(--petale-surface);
  box-shadow: 0 10px 30px rgba(61,32,39,0.12);
  order: -1;
}

/* Hero contact strip — icon-only circular buttons in a tight horizontal
   row. The label is moved to aria-label + native tooltip; visible labels
   would compete with the Pinyon Script brand name's read. The Reserve
   CTA is the one exception: kept as a wide italic Playfair gold pill so
   the primary action still leads the row. */
.petale-social {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-start;
  align-items: center;
  margin-top: 8px;
}
@media (max-width: 879px) {
  .petale-social { justify-content: center; }
}
.petale-social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--petale-accent) 38%, transparent);
  border-radius: 999px;
  background: var(--petale-surface);
  color: var(--petale-accent);
  cursor: pointer;
  transition: border-color 180ms ease, background 180ms ease, color 180ms ease, transform 180ms ease, box-shadow 180ms ease;
}
.petale-social-btn:hover {
  border-color: var(--petale-accent);
  background: color-mix(in srgb, var(--petale-accent) 12%, var(--petale-surface));
  color: var(--petale-ink);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(201,168,118,0.20);
}
.petale-social-ico { display: inline-flex; align-items: center; color: currentColor; }
.petale-social-ico svg { display: block; }

/* Reserve CTA — keeps the wide italic Playfair gold pill. Sits inside
   the strip but visually breaks pattern, leading the row. */
/* Scoped under .petale-template so this color declaration outranks the
   ".petale-template a { color: inherit }" reset (specificity 0,1,1).
   Without the extra class the 0,1,0 selector loses and the button
   inherits --petale-ink, which only equals --petale-on-accent on the
   light variants. That coincidence is why Blush and Cream read fine but
   the dark variants showed near-black text on a dark accent. */
.petale-template .petale-social-btn--primary {
  width: auto;
  height: auto;
  padding: 13px 28px;
  background: var(--petale-accent);
  border-color: var(--petale-accent);
  color: var(--petale-on-accent);
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 500;
  font-size: 17px;
  letter-spacing: 0;
  box-shadow: 0 6px 18px rgba(201,168,118,0.22);
}
.petale-template .petale-social-btn--primary:hover {
  color: var(--petale-on-accent);
  background: var(--petale-accent);
  filter: brightness(1.04);
  box-shadow: 0 10px 26px rgba(201,168,118,0.30);
}
.petale-social-btn--primary .petale-social-ico { display: none; }

/* ── Sticky tab rail with scalloped active marker ── */
.petale-tab-rail {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--petale-bg) 86%, transparent);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid var(--petale-rule);
  border-bottom: 1px solid var(--petale-rule);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.petale-tab-rail::-webkit-scrollbar { display: none; }
.petale-tab-slider {
  display: flex;
  flex-wrap: nowrap;
  width: max-content;
  max-width: 100%;
  margin: 0 auto;
  padding: 14px var(--brk-space-md) 18px;
  gap: 6px;
}
.petale-tab-pill {
  position: relative;
  flex: 0 0 auto;
  background: transparent;
  border: 0;
  padding: 6px 16px 14px;
  font-family: var(--petale-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--petale-muted);
  cursor: pointer;
  white-space: nowrap;
  transition: color 200ms ease;
}
.petale-tab-pill:hover { color: var(--petale-ink); }
.petale-tab-pill.is-active { color: var(--petale-accent); }
/* The signature: a scalloped SVG underline beneath the active tab. */
.petale-tab-scallop {
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  color: var(--petale-accent);
  display: block;
}

.petale-tab-panel { display: none; }
.petale-tab-panel.is-active { display: block; }

/* ── Section frame ── */
.petale-section {
  max-width: var(--brk-container-standard);
  margin: 0 auto;
  padding: clamp(64px, 8vw, 104px) var(--brk-space-md);
}
.petale-book { padding-top: clamp(40px, 5vw, 64px); }

/* ── Scalloped section divider — repeated between sections ── */
.petale-divider {
  max-width: var(--brk-container-narrow);
  margin: 0 auto;
  padding: 8px var(--brk-space-md) 24px;
  text-align: center;
  color: var(--petale-accent);
  opacity: 0.55;
}
.petale-divider svg { display: inline-block; }

/* ── About ── 2-image asymmetric diptych: portrait-left larger, offset-right
   smaller, with Playfair italic heading + lead cap on the body. Stacks on
   mobile (images first, then text). */
.petale-about { max-width: 1000px; }
.petale-about-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  align-items: start;
}
@media (min-width: 820px) {
  .petale-about-grid {
    grid-template-columns: minmax(280px, 5fr) 7fr;
    gap: 56px;
  }
}
.petale-about-images {
  position: relative;
  min-height: 380px;
}
.petale-about-img {
  border: 1px solid var(--petale-rule);
  background: var(--petale-surface);
  overflow: hidden;
  border-radius: 4px;
}
.petale-about-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.petale-about-img--lead {
  aspect-ratio: 3/4;
  width: 100%;
}
.petale-about-img--offset {
  aspect-ratio: 4/5;
  width: 55%;
  margin: -42px 0 0 auto;
}
@media (min-width: 820px) {
  .petale-about-img--offset {
    margin: -64px -28px 0 auto;
    width: 64%;
  }
}
.petale-about-img--placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--petale-accent) 6%, var(--petale-surface)),
    color-mix(in srgb, var(--petale-accent) 14%, var(--petale-surface)));
}
.petale-about-text { padding-top: 4px; }
.petale-about-body {
  margin-top: 28px;
}
.petale-about-body p {
  margin: 0 0 18px;
  font-family: var(--petale-body);
  font-size: 16px;
  line-height: 1.85;
  color: color-mix(in srgb, var(--petale-ink) 86%, var(--petale-muted));
}
.petale-about-body p:last-child { margin-bottom: 0; }
.petale-about-lead { font-size: 17px; }
.petale-dropcap {
  float: left;
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 500;
  font-size: 64px;
  line-height: 0.84;
  padding-right: 12px;
  padding-top: 6px;
  color: var(--petale-accent);
}
.petale-highlights {
  list-style: none;
  margin: 56px auto 0;
  padding: 0;
  max-width: 760px;
  display: grid;
  gap: 0;
}
.petale-highlights > li {
  padding: 26px 0;
  border-top: 1px solid var(--petale-rule);
  text-align: center;
}
.petale-highlights > li:last-child { border-bottom: 1px solid var(--petale-rule); }
.petale-highlights h3 {
  margin: 0 0 6px;
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 500;
  font-size: 24px;
  letter-spacing: -0.005em;
  color: var(--petale-ink);
}
.petale-highlights p {
  margin: 0;
  font-family: var(--petale-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--petale-muted);
}

/* ── Skin layer over the shared platform sections ──
   Apply Pétale's signature flourishes over the canonical .brk-* base:
   italic Playfair section titles, gold tracked Inter eyebrows, italic
   Pinyon Script thank-you signature, scalloped pill CTAs in the footer. */

/* All shared section eyebrows render in Pinyon Script — gives every tab
   ("Gallery" → "Lookbook", "Reviews" → "Kind Words", etc.) the same
   wedding-handwritten treatment as the bespoke About + hero. */
.petale-template .brk-eyebrow {
  font-family: var(--petale-script);
  font-size: clamp(26px, 3.2vw, 38px);
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: var(--petale-accent);
  line-height: 1;
}
.petale-template .brk-section-title {
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 600;
  font-size: clamp(42px, 6vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.012em;
  color: var(--petale-ink);
  margin-top: 4px;
}

/* Thank-you — Playfair italic heading, Pinyon Script signature, gold ✦ ornament. */
.petale-template .brk-thanks {
  max-width: 720px;
  padding-top: 96px;
  padding-bottom: 32px;
}
.petale-template .brk-thanks-title {
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 500;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.06;
  letter-spacing: -0.005em;
  color: var(--petale-ink);
}
.petale-template .brk-thanks-body {
  font-family: var(--petale-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(17px, 1.8vw, 21px);
  line-height: 1.6;
  color: var(--petale-ink);
  opacity: 0.86;
}
/* The thank-you signature gets the Pinyon Script treatment — distinct from
   the regular display font, this is the calligraphic moment that ties the
   romantic-wedding-stationery vocabulary together. */
.petale-template .brk-thanks-signature {
  font-family: var(--petale-script) !important;
  font-style: normal !important;
  font-size: 44px !important;
  line-height: 1 !important;
  color: var(--petale-accent) !important;
  margin-top: 28px !important;
}

/* Footer CTA pill — soft mid-radius gold fill. */
.petale-template .brk-footer-book {
  border-radius: 4px;
  font-family: var(--petale-body);
  letter-spacing: 0.22em;
}
.petale-template .brk-footer-credit-band {
  font-family: var(--petale-body);
}

/* FAQ — italic summary, gold + marker (rotates to × on open like Velvet). */
.petale-template .brk-faq summary {
  font-family: var(--petale-display);
  font-style: italic;
  font-size: 18px;
  font-weight: 500;
}
.petale-template .brk-faq summary::after {
  color: var(--petale-accent);
  font-family: var(--petale-display);
}

/* Reviews — pressed-flower polaroid cards. Each card carries a soft
   alternating tilt (like keepsakes laid into a wedding album), a doubled
   gold border (outer ring → space → inner ring), and a soft shadow that
   lifts it off the pink canvas. The inner ring is drawn via ::before
   positioned 10px inside the outer border. Content sits 16px inside the
   inner ring (26px outer padding − 10px inset = 16px content padding). */
.petale-template .brk-review {
  position: relative;
  background: var(--petale-surface);
  border: 1px solid color-mix(in srgb, var(--petale-accent) 55%, transparent);
  border-radius: 4px;
  padding: 26px;
  box-shadow: 0 8px 22px rgba(61,32,39,0.10);
  transform: rotate(-1.2deg);
  transition: transform 240ms ease, box-shadow 240ms ease;
}
.petale-template .brk-review:nth-child(even)  { transform: rotate(0.9deg); }
.petale-template .brk-review:nth-child(3n)    { transform: rotate(-0.6deg); }
.petale-template .brk-review:hover {
  transform: rotate(0deg) scale(1.015);
  box-shadow: 0 14px 30px rgba(61,32,39,0.16);
}
.petale-template .brk-review::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px solid color-mix(in srgb, var(--petale-accent) 45%, transparent);
  border-radius: 2px;
  pointer-events: none;
}
.petale-template .brk-review blockquote {
  font-family: var(--petale-display);
  font-style: italic;
  font-size: 18px;
  line-height: 1.55;
  color: var(--petale-ink);
  position: relative; /* keep text above the ::before inner ring */
}
.petale-template .brk-review-stars {
  color: var(--petale-accent);
  letter-spacing: 0.22em;
  position: relative;
}
.petale-template .brk-review-attr {
  font-family: var(--petale-body);
  letter-spacing: 0.22em;
  position: relative;
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .petale-tab-pill,
  .petale-social-btn { transition: none !important; }
  .petale-template .brk-review,
  .petale-template .brk-review:hover,
  .petale-template .brk-review:nth-child(even),
  .petale-template .brk-review:nth-child(3n) {
    transform: none !important;
    transition: none !important;
  }
}

/* ── Mobile tweaks ── */
@media (max-width: 640px) {
  .petale-section { padding: 56px 20px; }
  .petale-about-grid { gap: 32px; }
}
`
