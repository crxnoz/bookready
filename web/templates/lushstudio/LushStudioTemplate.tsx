'use client'

import { useState, useRef } from 'react'
import {
  Heart, Dot, CalendarCheck,
} from 'lucide-react'

// Brand glyphs that lucide doesn't ship.
function TikTokGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.91a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1.84-.31z"/>
    </svg>
  )
}
function PinterestGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.5 2 2 6.5 2 12.04c0 4.25 2.65 7.88 6.39 9.34-.09-.79-.17-2 .03-2.86.18-.78 1.17-4.97 1.17-4.97s-.3-.6-.3-1.48c0-1.39.81-2.43 1.81-2.43.85 0 1.27.64 1.27 1.41 0 .86-.55 2.14-.83 3.34-.24 1 .5 1.81 1.49 1.81 1.79 0 3.17-1.89 3.17-4.62 0-2.42-1.74-4.11-4.22-4.11-2.87 0-4.56 2.15-4.56 4.38 0 .87.33 1.8.75 2.31a.3.3 0 0 1 .07.29c-.08.32-.26 1.04-.29 1.18-.05.2-.16.24-.36.15-1.34-.62-2.17-2.59-2.17-4.16 0-3.39 2.46-6.5 7.09-6.5 3.72 0 6.61 2.65 6.61 6.19 0 3.7-2.33 6.68-5.57 6.68-1.09 0-2.11-.57-2.46-1.24l-.67 2.55c-.24.93-.89 2.1-1.33 2.81.99.31 2.04.47 3.13.47 5.54 0 10.04-4.5 10.04-10.04C22.08 6.5 17.58 2 12.04 2z"/>
    </svg>
  )
}
function WhatsAppGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.07 4.49.71.31 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35zM12.04 2C6.5 2 2 6.5 2 12.04c0 1.94.55 3.74 1.5 5.27L2 22l4.84-1.46a10.05 10.05 0 0 0 5.2 1.46c5.54 0 10.04-4.5 10.04-10.04S17.58 2 12.04 2zm0 18.13a8.07 8.07 0 0 1-4.4-1.27l-.31-.19-2.87.87.86-2.8-.2-.32a8.07 8.07 0 0 1-1.27-4.38c0-4.47 3.63-8.1 8.1-8.1s8.1 3.63 8.1 8.1-3.63 8.09-8.09 8.09z"/>
    </svg>
  )
}

// Filled / solid versions of the contact + social icons so they render as
// "filled" not "hollow outline" inside the small header circles. Single
// paths fill cleanly with currentColor; sized via the width/height props.
function PhoneSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.58l2.2-2.21a.96.96 0 0 0 .25-1A11.36 11.36 0 0 1 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z"/>
    </svg>
  )
}
function MailSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
    </svg>
  )
}
function MessageSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  )
}
function NavigationSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
    </svg>
  )
}
function InstagramSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M7 2C4.24 2 2 4.24 2 7v10c0 2.76 2.24 5 5 5h10c2.76 0 5-2.24 5-5V7c0-2.76-2.24-5-5-5H7zm10 2H7c-1.66 0-3 1.34-3 3v10c0 1.66 1.34 3 3 3h10c1.66 0 3-1.34 3-3V7c0-1.66-1.34-3-3-3zm-5 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm4.5-3.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5z"/>
    </svg>
  )
}
function YoutubeSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.2C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14c.5-1.88.5-5.81.5-5.81s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z"/>
    </svg>
  )
}
function FacebookSolid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.44 18.63.07 12 .07S0 5.44 0 12.07c0 5.99 4.39 10.95 10.13 11.85v-8.39H7.08v-3.47h3.05V9.43c0-3.01 1.79-4.67 4.53-4.67 1.31 0 2.69.23 2.69.23v2.96H15.83c-1.49 0-1.96.93-1.96 1.87v2.25h3.33l-.53 3.47h-2.8v8.39C19.62 23.02 24 18.06 24 12.07z"/>
    </svg>
  )
}
// Solid versions of the info-row icons (filled, no outline). Used in
// the hero's location + service-menu rows.
function MapPinSolid({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C7.86 2 4.5 5.36 4.5 9.5c0 5.65 6.69 11.95 7.02 12.26.27.27.69.27.96 0 .33-.3 7.02-6.61 7.02-12.26C19.5 5.36 16.14 2 12 2zm0 10.25a2.75 2.75 0 1 1 0-5.5 2.75 2.75 0 0 1 0 5.5z"/>
    </svg>
  )
}
function SparklesSolid({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1.5 13.85 7.15a2 2 0 0 0 1.27 1.27L20.5 10.5l-5.38 2.08a2 2 0 0 0-1.27 1.27L12 19.5l-1.85-5.65a2 2 0 0 0-1.27-1.27L3.5 10.5l5.38-2.08a2 2 0 0 0 1.27-1.27L12 1.5z"/>
      <circle cx="19.5" cy="4.5" r="1.5"/>
      <circle cx="4.5" cy="19.5" r="1.25"/>
    </svg>
  )
}
// M2a — booking + auth + widget moved to the shared platform module.
// Names retain the Lush* prefix for one release; M2b renames them to
// Platform*/Customer* and introduces CSS variable theming hooks so
// TheFadeRoom can also wrap the same primitives.
// M2a/M2b → Phase 0 step 2: booking primitives + CSS now live in @bkrdy/platform.
import {
  PlatformBookingFlow as LushStudioBooking,
  CustomerAuthProvider as LushCustomerAuthProvider,
  CustomerAccountWidget as LushCustomerAccountWidget,
  PLATFORM_BOOKING_CSS as LUSH_CSS,
} from '@bkrdy/platform/booking'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'
import { tokensToCss } from '@bkrdy/platform'
import type { PublicSite, Service } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'

// ── Helpers ───────────────────────────────────────────────────────────────────

// Pick a readable text color (#0E1111 or #FFFFFF) for use on top of a
// solid accent fill. Uses the standard sRGB relative-luminance formula;
// anything brighter than ~75% luminance gets dark text. Threshold is
// tuned so the Lush sage default (#7FAF9A, lum ≈ 0.64) still gets
// WHITE text — only genuinely pale accents (light blue at 0.81) drop
// to dark text. Unknown input falls back to white so dark accents
// (hot pink, sage, coral) keep their on-accent white text.
function pickOnAccentColor(hex: string | null | undefined): string {
  if (!hex) return '#FFFFFF'
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  // Quick perceived luminance (Rec. 709 coefficients).
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.75 ? '#0E1111' : '#FFFFFF'
}

// Convert a #RRGGBB hex string to a "R, G, B" triplet (comma-space
// separated) for use inside `rgba(var(--lush-pink-rgb), x)`. Returns null
// for unrecognized input so the caller can fall back to the default.
function hexToRgbTriplet(hex: string | null | undefined): string | null {
  if (!hex) return null
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}`
}

// Pick the first "meaningful" word of a business name for use as a single-
// word signature ("The Fade Room" → "Fade"). Falls back to the full name
// if every word is a stripped article (e.g. someone literally named "The").
function signatureWord(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return name
  const STOP = new Set(['the', 'a', 'an'])
  const real = parts.find(p => ! STOP.has(p.toLowerCase()))
  return real ?? parts[0]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}

// User-entered URL overrides may be raw phone numbers or email addresses
// without a scheme. Coerce them so the resulting <a href> actually works.
//
// Phase S5+ — the result is then ALWAYS funneled through safeHref(), which
// enforces the http/https/mailto/tel/sms allowlist. A tenant who pastes
// `javascript:alert(1)` into the call URL will hit the allowlist and the
// href is dropped, even though ensureScheme would otherwise let it through
// because it matches the generic SCHEME_RE.
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i
function ensureScheme(raw: string | null | undefined, fallback: 'tel' | 'mailto' | 'sms'): string | null {
  if (!raw) return null
  const v = raw.trim()
  if (!v) return null
  if (SCHEME_RE.test(v)) return v                  // already tel:/mailto:/sms:/http:/etc.
  if (v.startsWith('//')) return `https:${v}`      // protocol-relative
  if (fallback === 'mailto' && v.includes('@')) return `mailto:${v}`
  if (fallback === 'tel') return `tel:${v.replace(/[^\d+]/g, '')}`
  if (fallback === 'sms') return `sms:${v.replace(/[^\d+]/g, '')}`
  return v
}

// Compose ensureScheme + safeHref so the editor's "type a bare phone /
// email" convenience still works AND tenant-controlled URL fields can't
// inject javascript:/data:/vbscript: schemes at click time.
function safeContactHref(raw: string | null | undefined, fallback: 'tel' | 'mailto' | 'sms'): string | null {
  return safeHref(ensureScheme(raw, fallback)) ?? null
}

// ── Profile shape ─────────────────────────────────────────────────────────────

interface Profile {
  business_name?: string | null
  business_type?: string | null
  tagline?: string | null
  public_phone?: string | null
  public_email?: string | null
  address_line?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  instagram_url?: string | null
}

// ── Tab registry ──────────────────────────────────────────────────────────────

type TabId = 'book' | 'gallery' | 'policies' | 'about'
           | 'results' | 'aftercare' | 'before'

// Map editor section_key → in-template TabId for visibility gating
const SECTION_KEY_TO_TAB: Record<string, TabId | null> = {
  book:               'book',
  gallery:            'gallery',
  policy:             'policies',
  about:              'about',
  before_after:       'results',
  steps:              'aftercare',
  before_appointment: 'before',
  // header/footer aren't tabs; locked sections always render
  header:             null,
  footer:             null,
}

// Fallback defaults so the template never crashes if backend is offline.
const FALLBACK_HEADER_SETTINGS = {
  show_book_button: true,
  show_call_button: true,
  show_email_button: true,
  show_instagram_button: true,
  show_directions_button: true,
  show_pinterest_button: false,
  show_youtube_button: false,
  show_whatsapp_button: false,
  show_tiktok_button: false,
  show_facebook_button: false,
  show_message_button: false,
  book_button_url: null as string | null,
  call_button_url: null as string | null,
  email_button_url: null as string | null,
  instagram_button_url: null as string | null,
  directions_button_url: null as string | null,
  pinterest_button_url: null as string | null,
  youtube_button_url: null as string | null,
  whatsapp_button_url: null as string | null,
  tiktok_button_url: null as string | null,
  facebook_button_url: null as string | null,
  message_button_url: null as string | null,
  announcement_text: 'Now booking for the season — limited weekend slots.',
  show_announcement: true,
  cover_image_url: null as string | null,
  avatar_image_url: null as string | null,
}
const FALLBACK_TAB_LABELS = {
  book_label: 'Book',
  gallery_label: 'Gallery',
  policy_label: 'Policy',
  about_label: 'About',
  results_label: 'Before & After',
  // Internal keys stay `steps` and `before_appointment`; user-facing
  // fallback labels are now Advice + Timeline.
  steps_label: 'Advice',
  before_appointment_label: 'Timeline',
}

// ── Main template ─────────────────────────────────────────────────────────────

export default function LushStudioTemplate({ site, slug }: { site: PublicSite; slug: string }) {
  const p           = site.profile as Profile | null
  const displayName = p?.business_name ?? site.business_name ?? site.slug
  const services    = (site.services ?? []).filter((s: Service) => s.is_active)
  const hours       = site.hours     ?? []
  const policies    = site.policies  ?? null
  const availability = site.availability ?? null
  const address     = [p?.address_line, p?.city, p?.state, p?.zip].filter(Boolean).join(', ')

  // ── Template settings + sections (graceful fallback) ──
  const header = { ...FALLBACK_HEADER_SETTINGS, ...(site.template?.settings.header ?? {}) }
  const tabLabels = { ...FALLBACK_TAB_LABELS, ...(site.template?.settings.tabs ?? {}) }
  const footerSettings = site.template?.settings.footer ?? { show_powered_by: true }

  // Build enabledByTab map from website_sections.is_enabled
  // (default to true when sections missing entirely)
  const enabledByTab: Record<TabId, boolean> = {
    book: true, gallery: true, policies: true, about: true,
    results: true, aftercare: true, before: true,
  }
  const sectionsList = site.template?.sections ?? []
  if (sectionsList.length > 0) {
    for (const s of sectionsList) {
      const tabId = SECTION_KEY_TO_TAB[s.section_key]
      if (tabId) enabledByTab[tabId] = s.is_enabled
    }
  }

  // Tab labels come from settings.tabs (edited in Website → Content & Tabs).
  // website_sections.title is only used in the editor UI for the section list;
  // it is intentionally NOT used to override the public-facing tab label here.
  const allTabs: { id: TabId; label: string; key: string }[] = [
    { id: 'book',      label: tabLabels.book_label,               key: 'book'               },
    { id: 'gallery',   label: tabLabels.gallery_label,            key: 'gallery'            },
    { id: 'policies',  label: tabLabels.policy_label,             key: 'policy'             },
    { id: 'about',     label: tabLabels.about_label,              key: 'about'              },
    // M3 rename — section_keys + label keys updated.
    { id: 'results',   label: tabLabels.results_label ?? (tabLabels as any).before_after_label, key: 'results'  },
    { id: 'aftercare', label: tabLabels.advice_label  ?? (tabLabels as any).steps_label,        key: 'advice'   },
    { id: 'before',    label: tabLabels.timeline_label ?? (tabLabels as any).before_appointment_label, key: 'timeline' },
  ]

  // Resolved tab label keyed by tab id, so each section's eyebrow can show
  // the editable tab label (renaming a tab in the editor renames the eyebrow).
  const tabLabelById = Object.fromEntries(allTabs.map(t => [t.id, t.label])) as Record<string, string>

  // Map each tab id → its website_sections.sort_order so the rail renders in
  // the order the owner arranged sections in the editor. Tabs without a
  // matching section (or when sections are missing) fall back to 999 so they
  // sort after ordered tabs while keeping their registry order via the stable sort.
  const orderByTab: Record<string, number> = {}
  for (const s of sectionsList) {
    const tid = SECTION_KEY_TO_TAB[s.section_key]
    if (tid) orderByTab[tid] = s.sort_order
  }

  const tabs = allTabs
    .filter(t => t.id === 'book' || enabledByTab[t.id])
    .sort((a, b) => (orderByTab[a.id] ?? 999) - (orderByTab[b.id] ?? 999))

  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)

  function goBook() {
    setActive('book')
    setTimeout(() => tabRailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30)
  }

  // Per-tenant accent override. Owner picks one of the preset hexes in the
  // editor; we resolve it to an RGB triplet here so the rgba(var(--lush-pink-rgb),…)
  // glows scale correctly. Unknown / missing → fall back to Lush's default pink.
  const accentHex = site.template?.settings.theme?.accent_color ?? null
  // Fallback triplet must match the default --lush-pink (sage). It used
  // to be the FadeRoom hot-pink (255,61,190), which leaked through every
  // rgba(var(--lush-pink-rgb), …) usage (announcement bar tint + border,
  // glows, etc.) and made the page read pink-ish on the cream bg.
  const accentRgb = hexToRgbTriplet(accentHex) ?? '127, 175, 154'
  const accentHexResolved = accentHex ?? '#7FAF9A'
  // On a light accent (currently only the "white" preset), the default
  // white-on-pink button text becomes invisible. Pick a readable
  // foreground based on the perceived luminance of the chosen accent.
  const onAccent = pickOnAccentColor(accentHexResolved)
  const accentVars: React.CSSProperties = {
    // CSS vars passed via inline style override the root :root declarations
    // inside LUSH_CSS because they're scoped to the .lush-template element.
    ['--lush-pink' as any]:     accentHexResolved,
    ['--lush-pink-rgb' as any]: accentRgb,
    ['--lush-on-pink' as any]:  onAccent,
  }

  return (
    <>
      <style>{LUSH_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <style>{LUSH_SECTIONS_SKIN}</style>
      <LushCustomerAuthProvider>
      {/* `lush-femme` is the marker that scopes the feminine-luxury
          decorations (scalloped hero edge, sparkle field, polaroid before/
          after, etc.). VelvetTheoryBooking re-uses the Lush flow but only
          adds `.lush-template` — so these decorations stay off the VT
          embed. */}
      <div className="lush-template lush-femme" style={accentVars}>

        {/* ── Announcement bar ──
            Static centered strip matching TFR + Blackline. The
            scrolling marquee was charming but inconsistent with the
            other BookReady templates — and the sparkle/heart vocabulary
            tucks neatly into the bookend slots TFR uses for ✦. Falls
            back to a tagline or default copy when no announcement is
            set so the bar still renders. */}
        {(header.show_announcement ?? true) && (
          <div className="lush-announce">
            <span className="lush-announce-spark" aria-hidden="true">
              <Heart size={11} fill="currentColor" />
            </span>
            <span>
              {(header.announcement_text?.trim()
                || p?.tagline?.trim()
                || `Now booking with ${displayName}`)}
            </span>
            <span className="lush-announce-spark" aria-hidden="true">
              <Heart size={11} fill="currentColor" />
            </span>
          </div>
        )}

        {/* ── Header ── */}
        <section className="lush-header-section">
          {/* Customer-account widget intentionally NOT rendered on Lush —
              the floating sign-in pill at the top-right read as clutter
              against the soft cream canvas + floating-heart decorations.
              The CustomerAuthProvider still wraps the tree so the booking
              flow's "View your bookings" CTA still works. */}

          <span className="lush-floating-heart lush-fh-1" aria-hidden="true"><Heart size={14} fill="currentColor" /></span>
          <span className="lush-floating-heart lush-fh-2" aria-hidden="true"><Heart size={18} fill="currentColor" /></span>
          <span className="lush-floating-heart lush-fh-3" aria-hidden="true"><Heart size={12} /></span>

          <div className="lush-header-cover">
            {header.cover_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={header.cover_image_url} alt="" />
            )}
          </div>

          <div className="lush-header-content">
            <h1>{displayName}</h1>
            {(p?.business_type || p?.tagline) && (
              <p className="lush-header-subtype">{p?.business_type ?? p?.tagline}</p>
            )}

            {/* Compact info rows: location + services. The services row
                prefers tenant-defined service_categories (a curated
                short list); when none are set, it falls back to the
                first few active service names so the row still has
                useful content. Either row is omitted gracefully if
                the data isn't set so sparse profiles don't break. */}
            {(() => {
              const locationText = [p?.city, p?.state].filter(Boolean).join(', ')
              const categoryNames = (site.service_categories ?? [])
                .map(c => c?.name)
                .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
                .slice(0, 4)
              const fallbackServiceNames = services
                .map(s => s?.name)
                .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
                .slice(0, 4)
              const menuItems = categoryNames.length > 0 ? categoryNames : fallbackServiceNames
              const servicesText = menuItems.join(' • ')
              if (! locationText && ! servicesText) return null
              return (
                <div className="lush-header-info">
                  {locationText && (
                    <div className="lush-header-info-row">
                      <MapPinSolid size={22} />
                      <span>{locationText}</span>
                    </div>
                  )}
                  {servicesText && (
                    <div className="lush-header-info-row">
                      <SparklesSolid size={22} />
                      <span>{servicesText}</span>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="lush-header-buttons">
              {header.show_book_button && (() => {
                // Phase S2 — safeHref strips javascript:/data:/vbscript: from
                // tenant-controlled URLs. Falls back to the scroll-to-book
                // button when the URL is missing or unsafe.
                const url = safeHref(header.book_button_url)
                if (url) {
                  return (
                    <a className="lush-header-btn lush-header-btn-book" href={url} target="_blank" rel="noopener noreferrer">
                      <CalendarCheck size={18} fill="currentColor" strokeWidth={1.5} /><span>Book</span>
                    </a>
                  )
                }
                return (
                  <button className="lush-header-btn lush-header-btn-book" onClick={goBook}>
                    <CalendarCheck size={18} fill="currentColor" strokeWidth={1.5} /><span>Book</span>
                  </button>
                )
              })()}
              {header.show_call_button && (() => {
                // Phase S5+ — safeContactHref strips javascript:/data:/etc.
                // after ensureScheme normalizes bare phone numbers.
                const override = safeContactHref(header.call_button_url, 'tel')
                const href = override ?? (p?.public_phone ? `tel:${p.public_phone.replace(/[^\d+]/g, '')}` : null)
                return (
                  <a className="lush-header-btn lush-header-btn-call lush-header-btn-mobile-only" href={href ?? '#'} aria-disabled={!href || undefined}>
                    <PhoneSolid size={18} /><span>Call</span>
                  </a>
                )
              })()}
              {header.show_email_button && (() => {
                // Phase S5+ — safeContactHref enforces the scheme allowlist.
                const override = safeContactHref(header.email_button_url, 'mailto')
                const href = override ?? (p?.public_email ? `mailto:${p.public_email}` : null)
                return (
                  <a className="lush-header-btn lush-header-btn-chat lush-header-btn-mobile-only" href={href ?? '#'} aria-disabled={!href || undefined}>
                    <MailSolid size={18} /><span>Email</span>
                  </a>
                )
              })()}
              {header.show_message_button && (() => {
                // Phase S5+ — safeContactHref strips disallowed schemes. The
                // isWeb check below still works because http/https survive
                // the allowlist, while javascript:/data: are dropped.
                const href = safeContactHref(header.message_button_url, 'sms')
                const isWeb = !!href && /^https?:/i.test(href)
                return (
                  <a className={`lush-header-btn lush-header-btn-message${isWeb ? '' : ' lush-header-btn-mobile-only'}`} href={href ?? '#'} target={isWeb ? '_blank' : undefined} rel={isWeb ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <MessageSolid size={18} /><span>Message</span>
                  </a>
                )
              })()}
              {header.show_directions_button && (() => {
                // Phase S2 — safeHref blocks javascript:/data: schemes. The
                // address fallback is a static maps URL so no encoding gap.
                const override = safeHref(header.directions_button_url)
                const href = override ?? (address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null)
                return (
                  <a className="lush-header-btn lush-header-btn-directions" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <NavigationSolid size={18} /><span>Directions</span>
                  </a>
                )
              })()}
              {header.show_instagram_button && (() => {
                const href = safeHref(header.instagram_button_url) ?? safeHref(p?.instagram_url) ?? null
                return (
                  <a className="lush-header-btn lush-header-btn-instagram" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <InstagramSolid size={18} /><span>Instagram</span>
                  </a>
                )
              })()}
              {header.show_tiktok_button && (() => {
                const href = safeHref(header.tiktok_button_url) ?? null
                return (
                  <a className="lush-header-btn lush-header-btn-tiktok" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <TikTokGlyph size={18} /><span>TikTok</span>
                  </a>
                )
              })()}
              {header.show_youtube_button && (() => {
                const href = safeHref(header.youtube_button_url) ?? null
                return (
                  <a className="lush-header-btn lush-header-btn-youtube" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <YoutubeSolid size={18} /><span>YouTube</span>
                  </a>
                )
              })()}
              {header.show_facebook_button && (() => {
                const href = safeHref(header.facebook_button_url) ?? null
                return (
                  <a className="lush-header-btn lush-header-btn-facebook" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <FacebookSolid size={18} /><span>Facebook</span>
                  </a>
                )
              })()}
              {header.show_pinterest_button && (() => {
                const href = safeHref(header.pinterest_button_url) ?? null
                return (
                  <a className="lush-header-btn lush-header-btn-pinterest" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <PinterestGlyph size={18} /><span>Pinterest</span>
                  </a>
                )
              })()}
              {header.show_whatsapp_button && (() => {
                const href = safeHref(header.whatsapp_button_url) ?? null
                return (
                  <a className="lush-header-btn lush-header-btn-whatsapp" href={href ?? '#'} target={href ? '_blank' : undefined} rel={href ? 'noopener noreferrer' : undefined} aria-disabled={!href || undefined}>
                    <WhatsAppGlyph size={18} /><span>WhatsApp</span>
                  </a>
                )
              })()}
            </div>
          </div>
        </section>

        {/* ── Sticky tab nav ── */}
        <section className="lush-tabbed-section">
          <div className="lush-tab-rail" ref={tabRailRef}>
            <div className="lush-tab-slider" role="tablist">
              {tabs.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active === t.id}
                  className={`lush-tab-pill${active === t.id ? ' is-active' : ''}`}
                  onClick={() => setActive(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Book ── Wrapped in .lush-section.lush-book so the
              booking flow gets the same outer section padding the
              other BookReady templates use. Naming matches the trio:
              .tfr-section.tfr-book / .blackline-section.blackline-book
              / .vt-section.vt-book. */}
          <div className={`lush-tab-panel${active === 'book' ? ' is-active' : ''}`}>
            <div className="lush-section lush-book">
              {site.booking_settings && site.booking_settings.booking_enabled === false ? (
                <section className="brk-booking-section">
                  <div className="brk-booking-summary" style={{ maxWidth: 480, margin: '40px auto' }}>
                    <span className="brk-booking-block-label">Booking unavailable</span>
                    <p style={{ marginTop: 8, fontSize: 14, opacity: 0.85 }}>
                      Online booking is currently paused. Please check back soon — or reach out to the business directly.
                    </p>
                  </div>
                </section>
              ) : (
                <LushStudioBooking
                  slug={slug}
                  services={services}
                  displayName={displayName}
                  availability={availability}
                  paymentSettings={site.payment_settings ?? null}
                  requirePolicyAgreement={!! site.policies?.require_policy_agreement}
                  serviceAddons={site.service_addons ?? []}
                  staffMembers={site.staff ?? []}
                  serviceCategories={site.service_categories ?? []}
                  bookingQuestions={site.booking_questions ?? []}
                />
              )}
            </div>
          </div>

          {/* ── Gallery ── shared platform section. Lush skin
              (LUSH_SECTIONS_SKIN) restores the tilted white-framed
              polaroid tiles + Cookie group headings. */}
          {enabledByTab.gallery && (
            <div className={`lush-tab-panel${active === 'gallery' ? ' is-active' : ''}`}>
              <GallerySection
                items={site.gallery}
                groups={site.gallery_groups}
                heading="Recent work"
                eyebrow={tabLabelById.gallery}
                displayName={displayName}
                variant="grid"
                emptyText="A gallery of recent work will appear here."
                ariaLabel={tabLabelById.gallery ?? 'Gallery'}
              />
            </div>
          )}

          {/* ── Results ── shared platform section. Lush skin restyles
              the diptych with a sage ✦ separator, serif-italic
              Before/After labels + script caption. */}
          {enabledByTab.results && (
            <div className={`lush-tab-panel${active === 'results' ? ' is-active' : ''}`}>
              <BeforeAfterSection
                items={site.results ?? site.before_after}
                groups={site.results_groups ?? site.before_after_groups}
                heading="Before & after"
                eyebrow={tabLabelById.results}
                separator="✦"
                labels
                emptyText="Before-and-after results will be shown here."
                ariaLabel={tabLabelById.results ?? 'Results'}
              />
            </div>
          )}

          {/* ── About ── */}
          {enabledByTab.about && (
            <div className={`lush-tab-panel${active === 'about' ? ' is-active' : ''}`}>
              <AboutPanel
                profile={p}
                displayName={displayName}
                about={site.template?.settings.about}
              />
            </div>
          )}

          {/* ── Policy ── shared platform section. Lush skin restores
              the ✦-marked divided list with serif titles. When the
              tenant has set no named policies, Lush falls back to a
              set of sensible defaults so the tab never reads empty. */}
          {enabledByTab.policies && (() => {
            // Lush's named policy keys → [field, label]. Same set the old
            // PoliciesPanel used.
            const policyKeys: [string, string][] = [
              ['cancellation_policy', 'Cancellation'],
              ['late_policy',         'Late Arrival'],
              ['no_show_policy',      'No-Show'],
              ['deposit_policy',      'Deposit'],
              ['reschedule_policy',   'Rescheduling'],
              ['extra_notes',         'Additional Notes'],
            ]
            // Lush's default house rules — shown when the tenant has set
            // none of the named policies (mirrors the old FALLBACK_POLICIES).
            const fallbackPolicies: { label: string; body: string }[] = [
              { label: 'Cancellation', body: 'We require 24 hours notice for cancellations. Cancellations made with less than 24 hours notice may be subject to a fee.' },
              { label: 'Late Arrival',  body: 'Please arrive on time. Clients arriving more than 10 minutes late may need to be rescheduled to protect other clients\' appointments.' },
              { label: 'No-Show',      body: 'No-shows may be charged a no-show fee. Repeated no-shows may result in prepayment requirements for future bookings.' },
            ]
            // Build label/body rows from Lush's named policy keys. The
            // shared PolicySection drops empty-body rows, so we don't
            // pre-filter here. When nothing is set, fall back to the
            // default house rules above.
            const pol = (policies ?? null) as Record<string, string | null> | null
            const namedRows = policyKeys.map(([key, label]) => ({ label, body: pol?.[key] ?? null }))
            const hasAnyNamed = namedRows.some(r => (r.body ?? '').trim())
            const rows = hasAnyNamed ? namedRows : fallbackPolicies
            const customGroups = ((policies?.custom_groups ?? []) as any[]).map(g => ({
              heading: g.heading,
              items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                title: it.title,
                content: it.content ?? it.body,
              })),
            }))
            return (
              <div className={`lush-tab-panel${active === 'policies' ? ' is-active' : ''}`}>
                <PolicySection
                  rows={rows}
                  customGroups={customGroups}
                  heading="House rules"
                  eyebrow={tabLabelById.policies}
                  marker="glyph"
                  markGlyph="✦"
                  emptyText="Booking policies will appear here."
                  ariaLabel={tabLabelById.policies ?? 'Policies'}
                />
              </div>
            )
          })()}

          {/* ── Advice (aftercare) ── shared platform section. Lush skin
              (LUSH_SECTIONS_SKIN) restores the editorial un-numbered
              "Ritual" look: no per-item glyph (showMark={false}), a sage
              ✦ separator between rows, Cookie kicker + DM Serif title. */}
          {enabledByTab.aftercare && (
            <div className={`lush-tab-panel${active === 'aftercare' ? ' is-active' : ''}`}>
              <InstructionsSection
                items={(site.template?.settings as any)?.advice?.items ?? (site.template?.settings as any)?.steps?.items}
                heading={(site.template?.settings as any)?.advice?.heading ?? (site.template?.settings as any)?.steps?.heading ?? 'Care notes'}
                eyebrow={tabLabelById.aftercare ?? 'Advice'}
                cardKicker={(site.template?.settings as any)?.advice?.card_kicker ?? (site.template?.settings as any)?.steps?.card_kicker}
                numbered={false}
                showMark={false}
                emptyText="Aftercare guidance will appear here."
                ariaLabel={tabLabelById.aftercare ?? 'Advice'}
              />
            </div>
          )}

          {/* ── Timeline (before your appointment) ── shared platform
              section. Lush skin restyles the numbered marks into the
              alternating circular sage nodes + dashed-rule bodies. */}
          {enabledByTab.before && (
            <div className={`lush-tab-panel${active === 'before' ? ' is-active' : ''}`}>
              <InstructionsSection
                items={(site.template?.settings as any)?.timeline?.items ?? (site.template?.settings as any)?.before_appointment?.items}
                heading={(site.template?.settings as any)?.timeline?.heading ?? (site.template?.settings as any)?.before_appointment?.heading ?? 'Before you arrive'}
                eyebrow={tabLabelById.before ?? 'Timeline'}
                cardKicker={(site.template?.settings as any)?.timeline?.card_kicker ?? (site.template?.settings as any)?.before_appointment?.card_kicker}
                numbered
                emptyText="A simple step-by-step of your visit will appear here."
                ariaLabel={tabLabelById.before ?? 'Timeline'}
              />
            </div>
          )}

        </section>

        {/* ── FAQ ── shared platform section; Lush skin re-applies the
            DM Serif italic summary + rotating ✦ marker + sage wash. */}
        {site.template?.settings.additionals?.faq?.enabled !== false && (
          <FaqSection
            items={site.template?.settings.additionals?.faq?.items}
            heading={site.template?.settings.additionals?.faq?.heading ?? 'Frequently asked'}
            eyebrow="Things people ask"
          />
        )}

        {/* ── Reviews ── shared platform section; Lush skin restyles the
            cards to DM Serif italic bodies, Cookie author names, the Molle
            quote glyph + sage ✦ stars (starGlyph). */}
        {site.template?.settings.additionals?.reviews?.enabled !== false && (
          <ReviewsSection
            items={site.template?.settings.additionals?.reviews?.items}
            heading={site.template?.settings.additionals?.reviews?.heading ?? 'What clients say'}
            eyebrow="From the chair"
            starGlyph="✦︎"
          />
        )}

        {/* ── Thanks outro ── shared platform section; Lush skin gives the
            Cookie title + sage signature flanked by hairlines. */}
        <ThanksSection
          show={site.template?.settings.additionals?.show_thank_you}
          title={site.template?.settings.additionals?.thank_you_title}
          body={site.template?.settings.additionals?.thank_you_body}
          signature={site.template?.settings.additionals?.thank_you_signature}
          fallbackSignature={signatureWord(displayName)}
          eyebrow="From us, with love"
        />

        {/* ── Footer ── shared platform section; Lush skin restores the
            sage pill CTA + Lush typography over the 3-band base. */}
        <SiteFooter
          businessName={footerSettings.business_name_override?.trim() || displayName}
          subtext={footerSettings.subtext ?? null}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          ctaLabel="Reserve your chair"
          brandLabel="The Studio"
          hoursLabel="Hours"
          contactLabel="Contact"
          show={{
            quickBook: footerSettings.show_quick_book,
            hours: footerSettings.show_hours,
            contact: footerSettings.show_contact_links,
            poweredBy: footerSettings.show_powered_by,
          }}
        />

      </div>
      </LushCustomerAuthProvider>
    </>
  )
}

// ── Announcement bar ──────────────────────────────────────────────────────────

function AnnounceMsgs({
  tagline, name, custom,
}: {
  tagline?: string | null
  name: string
  custom?: string | null
}) {
  const msgs = custom && custom.trim().length > 0
    ? [custom, name, custom, tagline ?? name]
    : [
        tagline ?? name,
        'Book your appointment online',
        'Now accepting new clients',
        'Walk-ins welcome — call ahead',
        name,
      ]
  return (
    <>
      {msgs.flatMap((msg, i) => [
        <span key={`m${i}`}>{msg}</span>,
        <span key={`s${i}`} className="lush-announce-sep" aria-hidden="true"><Dot size={14} /></span>,
      ])}
    </>
  )
}

// ── About panel ───────────────────────────────────────────────────────────────

interface PublicAboutSettings {
  heading?: string
  eyebrow?: string
  body?: string
  highlights?: { title: string; body: string }[]
  images?: (string | null)[]
}

function AboutPanel({
  profile: p, displayName, about,
}: {
  profile: Profile | null
  displayName: string
  about?: PublicAboutSettings
}) {
  // Strip leading articles ("The Fade Room" → "Fade") so the headline
  // signature word is meaningful, not just "The".
  const businessWord = signatureWord(displayName)

  // Saved values win; fall back to brand-flavored defaults so empty
  // tenants still feel intentional rather than placeholder-y.
  const heading = about?.heading?.trim() || `The ${businessWord} Experience`
  const eyebrow = about?.eyebrow?.trim() || businessWord
  const body    = about?.body?.trim()
    || (p?.tagline?.trim()
          ? `${p.tagline} — we're dedicated to delivering an exceptional experience every visit.`
          : `At ${displayName}, every appointment is an experience. We bring precision, care, and craft to every client.`)
  const userHighlights = about?.highlights?.filter(h => h.title?.trim() || h.body?.trim()) ?? []
  const highlights = userHighlights.length > 0 ? userHighlights : [
    { title: 'Expert technique',         body: 'Refined through years of hands-on practice — each appointment built on craft.' },
    { title: 'Personalized service',     body: 'Tailored to your style, your skin, your hair — every visit shaped around you.' },
    { title: 'A welcoming atmosphere',   body: 'Calm room, soft music, no rushed checkouts. The kind of space you actually relax in.' },
  ]
  const images = about?.images ?? []
  const hasImages = images.some(img => !! img)

  // Pull the lead image out of the array so it can be a single wide
  // feature at the top. The remaining two slots run as a 2-up between
  // the body and the highlights. Empty slots gracefully fall away.
  const leadImage    = images[0] ?? null
  const sideImages   = [images[1] ?? null, images[2] ?? null]
  const hasSideImages = sideImages.some(img => !! img)

  return (
    <section className="lush-about-section">
      {/* Wide lead image at the top — single 16:9 panel that gives the
          About a strong photographic entrance. Reads as the magazine
          opener before the article begins. */}
      {leadImage && (
        <div className="lush-about-feature">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={leadImage} alt="" loading="lazy" />
        </div>
      )}

      {/* Cohesive section header — same eyebrow + Cookie-script title
          treatment every other Lush tab uses (gallery/results/policy/etc).
          Dropped the bespoke Molle layered title — it broke the family
          feel and didn't survive a redesign pass. */}
      <header className="lush-about-header">
        <p className="lush-eyebrow">{eyebrow}</p>
        <h2 className="lush-section-title">{heading}</h2>
      </header>

      <div className="lush-about-copy">
        <p className="lush-about-body">{body}</p>

        {/* Two staggered companion images breaking up the prose. Only
            renders when there's at least one image to show; otherwise
            the section flows straight from body → highlights. */}
        {hasSideImages && (
          <div className="lush-about-images">
            {sideImages.map((img, i) => (
              img
                ? <div key={i} className="lush-about-img">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={img} alt="" loading="lazy" /></div>
                : <div key={i} className="lush-about-img lush-about-img--placeholder" aria-hidden="true" />
            ))}
          </div>
        )}

        {/* Highlights — divided list with sage hairlines, DM Serif
            titles + Roboto body. */}
        <ul className="lush-about-highlights">
          {highlights.map((h, i) => (
            <li key={i}>
              {h.title?.trim() && <h3>{h.title}</h3>}
              {h.body?.trim() && <p>{h.body}</p>}
            </li>
          ))}
        </ul>

        {/* Signature closer — Cookie script, signs with the business's
            signature word. Reads like the last line of a handwritten
            letter. */}
        <p className="lush-about-sign">
          With care,<br />
          <em>{signatureWord(displayName)}</em>
        </p>
      </div>
    </section>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LUSH SKIN over the shared platform sections (@bkrdy/platform/sections)
// ────────────────────────────────────────────────────────────────────────────
// The FAQ / Reviews / Thank-you / Footer now render the canonical .brk-*
// markup. These rules (scoped under .lush-template, injected AFTER
// SECTIONS_CSS) re-apply Lush's signatures over the shared base:
//   - the Cookie-script section titles + sage Roboto eyebrows,
//   - DM Serif italic FAQ summaries with the rotating ✦ chevron + sage wash,
//   - DM Serif italic review bodies, Cookie author names, the big Molle
//     quote glyph + sage ✦ stars, hairline cards,
//   - the Cookie thank-you title with the script signature flanked by
//     hairlines,
//   - the sage pill footer CTA + Lush footer typography.
//
// LUSH_CSS lives in the SHARED booking module (lushBookingCss.ts) and is NOT
// edited here. It does NOT inject tokensToCss(), so the shared sections'
// --brk-* SIZE tokens would resolve empty — hence ${tokensToCss()} below,
// alongside the color/font aliases that bridge Lush's --lush-* onto the
// canonical --brk-* roles. Lush injects --lush-pink/-rgb/-on-pink inline on
// the root via accentVars; the remaining --lush-* tokens come from LUSH_CSS.
//
// This is a real template literal (not CSS embedded inside another literal),
// so the single ${tokensToCss()} interpolation below is intentional and the
// ONLY interpolation — no other ${} or nested backticks.
const LUSH_SECTIONS_SKIN = `
.lush-template {
  ${tokensToCss()}
  --brk-color-bg: var(--lush-bg);
  --brk-color-surface: var(--lush-card);
  --brk-color-text: var(--lush-text);
  --brk-color-muted: var(--lush-muted);
  --brk-color-rule: var(--lush-dark-border);
  --brk-color-accent: var(--lush-pink);
  --brk-color-on-accent: var(--lush-on-pink);
  --brk-family-display: var(--lush-serif);
  --brk-family-body: var(--lush-ui);
  --brk-family-script: var(--lush-script);
}

/* ── Shared section header → Lush voice ──
   Title: Cookie script (NOT the display serif), sage-on-cream metrics.
   Eyebrow: Roboto micro-caps in sage with Lush's wider tracking. */
.lush-template .brk-section-title {
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: clamp(48px, 9vw, 68px);
  line-height: 1;
  letter-spacing: 0;
  color: var(--lush-text);
}
.lush-template .brk-eyebrow {
  font-family: var(--lush-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--lush-pink);
}

/* ── FAQ skin — DM Serif italic summary, space-between row, rotating ✦
   chevron marker, soft sage wash on open. Matches the old .lush-faq-item. */
.lush-template .brk-faq[open] { background: rgba(var(--lush-pink-rgb), 0.04); }
.lush-template .brk-faq summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 22px 18px;
  font-family: var(--lush-serif);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(17px, 2.4vw, 20px);
  line-height: 1.25;
  letter-spacing: -0.02em;
  color: var(--lush-text);
}
.lush-template .brk-faq summary::after {
  content: "\\2726\\FE0E";
  position: static;
  transform: none;
  flex-shrink: 0;
  font-family: var(--lush-ui);
  font-size: 16px;
  line-height: 1;
  color: var(--lush-pink);
  transition: transform .25s ease;
}
.lush-template .brk-faq[open] summary::after {
  content: "\\2726\\FE0E";
  transform: rotate(45deg);
}
.lush-template .brk-faq p {
  padding: 0 18px 22px 18px;
  font-family: var(--lush-ui);
  font-size: 14px;
  line-height: 1.65;
  color: var(--lush-muted);
}

/* ── Reviews skin — hairline editorial cards (transparent, sage rule),
   DM Serif italic body, Cookie author name, Molle quote glyph, sage ✦
   stars. Matches the old .lush-review-card. ── */
.lush-template .brk-reviews { gap: 0; max-width: 960px; }
@media (min-width: 821px) {
  .lush-template .brk-reviews {
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
    border-top: 1px solid var(--lush-dark-border);
    border-left: 1px solid var(--lush-dark-border);
  }
}
.lush-template .brk-review {
  position: relative;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--lush-dark-border);
  border-radius: 0;
  padding: 32px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
@media (min-width: 821px) {
  .lush-template .brk-review {
    border-right: 1px solid var(--lush-dark-border);
    border-bottom: 1px solid var(--lush-dark-border);
    border-top: none;
    border-left: none;
  }
}
.lush-template .brk-review-quote {
  top: 14px;
  left: 18px;
  font-family: var(--lush-molle);
  font-style: italic;
  font-size: 72px;
  line-height: 0.6;
  color: var(--lush-pink);
  opacity: 0.85;
  text-shadow: 2px 2px 0 rgba(14, 17, 17, 0.14);
}
.lush-template .brk-review-stars {
  align-self: flex-start;
  margin: 24px 0 0;
  color: var(--lush-pink);
  font-family: var(--lush-ui);
  font-size: 12px;
  letter-spacing: 6px;
}
.lush-template .brk-review blockquote {
  margin: 0;
  font-family: var(--lush-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 17px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  color: var(--lush-text);
}
.lush-template .brk-review-attr {
  margin: auto 0 0;
  padding-top: 8px;
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: 24px;
  line-height: 1;
  letter-spacing: 0;
  text-transform: none;
  color: var(--lush-text);
}
.lush-template .brk-review-attr span {
  display: block;
  margin-top: 6px;
  font-family: var(--lush-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--lush-muted);
}

/* ── Thanks skin — Cookie title, sage script signature flanked by
   hairlines. Matches the old .lush-thanks-* block. ── */
.lush-template .brk-thanks { border-top: 1px solid var(--lush-dark-border); padding-top: 80px; padding-bottom: 88px; }
.lush-template .brk-thanks .brk-eyebrow { letter-spacing: 0.24em; }
.lush-template .brk-thanks-title {
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: clamp(48px, 10vw, 72px);
  line-height: 1;
  letter-spacing: 0;
  color: var(--lush-text);
}
.lush-template .brk-thanks-body {
  font-family: var(--lush-ui);
  font-size: 15px;
  line-height: 1.55;
  color: var(--lush-muted);
  max-width: 540px;
}
.lush-template .brk-thanks-sign {
  display: inline-flex;
  align-items: center;
  gap: 16px;
  margin: 30px auto 0;
  font-family: var(--lush-script);
  font-style: italic;
  font-size: 28px;
  color: var(--lush-pink);
}
.lush-template .brk-thanks-sign::before,
.lush-template .brk-thanks-sign::after {
  content: "";
  width: 56px;
  height: 1px;
  background: var(--lush-pink);
  opacity: 0.5;
}

/* ── Footer skin — sage pill CTA + Lush typography over the 3-band base.
   Matches the old .lush-footer-* block. ── */
.lush-template .brk-footer { background: var(--lush-bg); }
.lush-template .brk-footer-book {
  gap: 10px;
  padding: 18px 44px;
  background: var(--lush-pink);
  color: var(--lush-on-pink);
  border: none;
  border-radius: 999px;
  font-family: var(--lush-ui);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1;
}
.lush-template .brk-footer-book:hover { filter: brightness(1.06); transform: translateY(-1px); }
.lush-template .brk-footer-name {
  font-family: var(--lush-serif);
  font-weight: 400;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: var(--lush-text);
}
.lush-template .brk-footer-subtext {
  font-family: var(--lush-ui);
  font-size: 13px;
  line-height: 1.55;
  color: var(--lush-muted);
  max-width: 32ch;
}
.lush-template .brk-footer-hours-row dt {
  font-family: var(--lush-ui);
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-size: 11px;
  color: var(--lush-text);
}
.lush-template .brk-footer-hours-row dd { color: var(--lush-muted); }
.lush-template .brk-footer-contact a { color: var(--lush-text); }
.lush-template .brk-footer-contact a:hover { color: var(--lush-pink); }
.lush-template .brk-footer-credit-band p {
  font-family: var(--lush-ui);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--lush-muted);
}

/* ── Advice skin (.brk-instructions--plain) — playful "ritual" cards.
   Each tip is its own soft sage-tinted card with a heart ♥ floating
   before the heading. Distinct from the .brk-policy ✦-marker list so
   advice doesn't read as a second policies section. ── */
.lush-template .brk-instructions--plain {
  /* Flex so the gap property actually separates the cards — base
     .brk-instructions is a block list (gap is a no-op there). 18px gives
     a comfortable breath between cards without breaking the rhythm. */
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 720px;
  margin: 0 auto;
}
/* Override base divider lines + zero-padding from the plain variant. */
.lush-template .brk-instructions--plain .brk-instruction {
  border-top: none;
  background: rgba(var(--lush-pink-rgb), 0.06);
  border: 1px solid rgba(var(--lush-pink-rgb), 0.22);
  border-left: 3px solid var(--lush-pink);
  border-radius: 14px;
  padding: 22px 24px 24px;
  transition: background 200ms ease, transform 200ms ease;
}
.lush-template .brk-instructions--plain .brk-instruction:last-child { border-bottom: 1px solid rgba(var(--lush-pink-rgb), 0.22); }
.lush-template .brk-instructions--plain .brk-instruction:hover {
  background: rgba(var(--lush-pink-rgb), 0.10);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  .lush-template .brk-instructions--plain .brk-instruction,
  .lush-template .brk-instructions--plain .brk-instruction:hover { transform: none; }
}
.lush-template .brk-instructions--plain .brk-instruction-kicker {
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: 22px;
  line-height: 1;
  letter-spacing: 0;
  text-transform: none;
  color: var(--lush-pink);
  margin-bottom: 6px;
}
.lush-template .brk-instructions--plain .brk-instruction-body h3 {
  margin: 0 0 10px;
  font-family: var(--lush-serif);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--lush-text);
  display: flex;
  align-items: baseline;
  gap: 10px;
}
/* Heart ♥ flourish — inline BEFORE the heading text. Lush already uses
   the heart as the template's floating motif; reusing it here ties the
   ritual cards to the brand without dragging in the policy ✦. */
.lush-template .brk-instructions--plain .brk-instruction-body h3::before {
  content: "\\2665";
  font-family: var(--lush-ui);
  font-size: 0.78em;
  line-height: 1;
  color: var(--lush-pink);
  flex-shrink: 0;
}
.lush-template .brk-instructions--plain .brk-instruction-body p {
  font-family: var(--lush-ui);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--lush-text);
}

/* ── Timeline skin (.brk-instructions--numbered) — the numbered mark
   becomes a circular sage node. Alternating fill: odd rows are solid
   sage with a white numeral, even rows are outlined sage with a sage
   numeral. Bodies carry a dashed hairline rule + a small ✦ before the
   DM Serif title. Matches the old .lush-before-* block. ── */
.lush-template .brk-instructions--numbered .brk-instruction {
  grid-template-columns: 52px 1fr;
  gap: 14px;
  padding: 13px 0;
  align-items: start;
}
.lush-template .brk-instructions--numbered .brk-instruction-mark {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 2px solid var(--lush-pink);
  background: var(--lush-bg);
  font-family: var(--lush-ui);
  font-weight: 700;
  font-size: 16px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: var(--lush-pink);
}
.lush-template .brk-instructions--numbered .brk-instruction:nth-child(odd) .brk-instruction-mark {
  background: var(--lush-pink);
  border-color: var(--lush-pink);
  color: #FFFFFF;
}
.lush-template .brk-instructions--numbered .brk-instruction-body {
  padding: 4px 4px 14px 6px;
  border-bottom: 1px dashed var(--lush-dark-border);
}
.lush-template .brk-instructions--numbered .brk-instruction-kicker {
  font-family: var(--lush-ui);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--lush-pink);
  margin-bottom: 4px;
}
.lush-template .brk-instructions--numbered .brk-instruction-body h3 {
  margin: 0 0 8px;
  font-family: var(--lush-serif);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--lush-text);
}
.lush-template .brk-instructions--numbered .brk-instruction-body h3::before {
  content: "\\2726";
  display: inline-block;
  margin-right: 8px;
  color: var(--lush-pink);
  font-size: 0.65em;
  vertical-align: 0.1em;
}
.lush-template .brk-instructions--numbered .brk-instruction-body p {
  margin: 0;
  font-family: var(--lush-ui);
  font-size: 13px;
  font-weight: 400;
  line-height: 1.55;
  color: var(--lush-muted);
}

/* ── Gallery skin — casually-placed POLAROIDS. Each tile is a white
   border-frame with a thicker bottom strip + soft drop shadow, tilted
   by nth-child so the wall of prints reads hand-arranged. Hover
   straightens + lifts. The aspect-ratio lives on the inner <img> (1/1)
   so the white frame hugs the photo. Group headings are Cookie script
   flanked by sage hairlines. Matches the old .lush-gallery* block. ── */
.lush-template .brk-gallery-section { max-width: 1080px; }
.lush-template .brk-gallery-group { width: min(100%, 396px); margin: 0 auto; }
.lush-template .brk-gallery-group + .brk-gallery-group { margin-top: 30px; }
.lush-template .brk-gallery-group-heading {
  margin: 0 0 22px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  justify-content: center;
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: 42px;
  line-height: 1;
  letter-spacing: 0;
  color: var(--lush-text);
}
.lush-template .brk-gallery-group-heading::before,
.lush-template .brk-gallery-group-heading::after {
  content: "";
  flex: 1;
  height: 1px;
  max-width: 60px;
  background: var(--lush-dark-border);
}
.lush-template .brk-gallery-grid {
  grid-template-columns: repeat(2, 1fr);
  grid-auto-flow: dense;
  gap: 28px 18px;
  padding: 10px 4px;
}
.lush-template .brk-gallery-item {
  position: relative;
  background: #FFFFFF;
  padding: 8px 8px 30px;
  border: none;
  border-radius: 2px;
  box-shadow: 0 6px 18px rgba(14, 17, 17, 0.12);
  overflow: visible;
  aspect-ratio: auto;
  transition: transform .35s ease, box-shadow .35s ease;
}
.lush-template .brk-gallery-item:nth-child(odd)  { transform: rotate(-2.5deg); }
.lush-template .brk-gallery-item:nth-child(even) { transform: rotate(2deg); }
.lush-template .brk-gallery-item:nth-child(3n)   { transform: rotate(-1deg); }
.lush-template .brk-gallery-item:nth-child(5n)   { transform: rotate(1.5deg); }
.lush-template .brk-gallery-item:hover {
  transform: rotate(0);
  box-shadow: 0 10px 24px rgba(14, 17, 17, 0.18);
  z-index: 2;
}
.lush-template .brk-gallery-item img {
  width: 100%;
  height: auto;
  aspect-ratio: 1/1;
  object-fit: cover;
  display: block;
}

/* ── Before & After skin — editorial DIPTYCH. Side-by-side panes with a
   serif-italic Before/After label ABOVE each photo, a sage ✦ between,
   and an optional Cookie-script caption below. The shared base floats
   the label as an absolute pill — Lush lifts it out into a static
   centered caption. Matches the old .lush-ba* block. ── */
.lush-template .brk-ba-section { max-width: 1080px; }
.lush-template .brk-ba-stack { display: grid; gap: 36px; max-width: none; padding: 14px 0 0; }
.lush-template .brk-ba-group + .brk-ba-group { margin-top: 48px; }
.lush-template .brk-ba-group-heading {
  margin: 18px 0 4px;
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: 42px;
  line-height: 1;
  letter-spacing: 0;
  color: var(--lush-text);
}
.lush-template .brk-ba {
  /* Was capped at 360px (each before/after pane ended up ~170px wide
     on mobile — way too small to actually compare the result). Let the
     diptych breathe to the section column so each pane reads. */
  width: 100%;
  margin: 0 auto;
  padding: 6px 0 0;
}
.lush-template .brk-ba-pair {
  /* 40/60 split — before is the supporting context, after is the
     showcase. Editorial asymmetry that reads stronger than equal panes
     while keeping both visible. */
  grid-template-columns: 2fr auto 3fr;
  gap: 8px;
  align-items: stretch;
}
/* Mobile diptych — tighter 1.3fr/2fr (~39/61) two-column grid; the
   centered ✦ separator is removed on phones so the two photos sit
   directly side-by-side. Before image height is dropped a notch below
   the after so the after is the clear focal point. */
@media (max-width: 640px) {
  .lush-template .brk-ba-pair {
    grid-template-columns: 1.3fr 2fr;
    gap: 6px;
  }
  .lush-template .brk-ba-pair .brk-ba-sep { display: none; }
  .lush-template .brk-ba-before img { height: clamp(180px, 32vw, 280px); }
  .lush-template .brk-ba-after  img { height: clamp(220px, 38vw, 340px); }
}
/* Lift the label out of the absolute pill into a static serif-italic
   caption stacked above the photo. */
.lush-template .brk-ba-pane {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.lush-template .brk-ba-label {
  position: static;
  top: auto;
  left: auto;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  text-align: center;
  font-family: var(--lush-serif);
  font-style: italic;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0;
  line-height: 1;
  text-transform: none;
  color: var(--lush-muted);
}
.lush-template .brk-ba-pane img {
  /* SAME HEIGHT both panes — width is determined by the 2fr/3fr grid
     cells (40/60), but heights stay equal so the before is readable.
     With aspect-ratio:1/1 (the old rule) each square also grew in HEIGHT
     proportionally — making the before a tiny ~130px square on mobile
     and the after a huge ~200px square. Equal height + object-fit:cover
     keeps the asymmetry purely horizontal. */
  width: 100%;
  height: clamp(220px, 38vw, 360px);
  object-fit: cover;
  border-radius: 0;
  border: 1px solid var(--lush-dark-border);
  background: #ECE7DD;
  display: block;
}
.lush-template .brk-ba-after img { border-color: var(--lush-pink); }
.lush-template .brk-ba-sep {
  align-self: center;
  font-family: var(--lush-ui);
  font-size: 18px;
  line-height: 1;
  color: var(--lush-pink);
  padding: 0 2px;
  /* drop past the label baseline so the ✦ sits between the photos */
  margin-top: 18px;
}
.lush-template .brk-ba-caption {
  margin: 14px 0 0;
  font-family: var(--lush-script);
  font-style: normal;
  font-size: 22px;
  font-weight: 400;
  line-height: 1.1;
  color: var(--lush-text);
}

/* ── Policy skin — ✦-marked divided brand-book list. Each row carries a
   sage ✦ on the left (markGlyph), a DM Serif title + Roboto body, and a
   sage hairline rule between. Custom-group subheadings are Cookie
   script. Matches the old .lush-policy* block. ── */
.lush-template .brk-policy-section { max-width: 720px; }
.lush-template .brk-policy-list { border-top: 1px solid var(--lush-dark-border); }
.lush-template .brk-policy-list--marked .brk-policy-row { grid-template-columns: 32px 1fr; gap: 18px; }
.lush-template .brk-policy-row {
  padding: 24px 4px 28px;
  border-bottom: 1px solid var(--lush-dark-border);
  align-items: flex-start;
}
.lush-template .brk-policy-mark {
  color: var(--lush-pink);
  font-family: var(--lush-ui);
  font-size: 18px;
  line-height: 1;
  padding-top: 10px;
  text-align: center;
}
.lush-template .brk-policy-title {
  margin: 0 0 10px;
  font-family: var(--lush-serif);
  font-weight: 400;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--lush-text);
}
.lush-template .brk-policy-text {
  margin: 0;
  font-family: var(--lush-ui);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--lush-text);
}
.lush-template .brk-policy-group + .brk-policy-group,
.lush-template .brk-policy-list + .brk-policy-group { margin-top: 48px; }
.lush-template .brk-policy-group-heading {
  margin: 0 0 18px;
  font-family: var(--lush-script);
  font-weight: 400;
  font-size: 36px;
  line-height: 1;
  letter-spacing: 0;
  color: var(--lush-text);
}

/* ── Femme decorations over the shared gallery/ba markup ──
   Re-applies the .lush-femme flourishes that used to target the local
   .lush-gallery / .lush-ba-pair markup: ✺ ornaments flanking gallery
   group headings + tilted polaroid before/after panes. Scoped to
   .lush-femme so the Velvet embed (only .lush-template) is unaffected. */
.lush-femme .brk-gallery-group-heading::before { content: "\\2733"; flex: none; max-width: none; height: auto; background: none; margin-right: 10px; opacity: 0.75; font-family: serif; color: currentColor; }
.lush-femme .brk-gallery-group-heading::after  { content: "\\2733"; flex: none; max-width: none; height: auto; background: none; margin-left: 10px;  opacity: 0.75; font-family: serif; color: currentColor; }
.lush-femme .brk-ba-pair .brk-ba-pane img {
  box-shadow:
    0 12px 28px rgba(118, 75, 90, 0.18),
    0 4px 8px rgba(0, 0, 0, 0.06);
}

/* ── Desktop — wider columns + larger type for the shared section
   markup (mirrors the old .lush-gallery/.lush-ba/.lush-policy desktop
   rules that lived in lushBookingCss.ts media queries). ── */
@media (min-width: 1025px) {
  .lush-template .brk-gallery-section { max-width: 1180px; }
  .lush-template .brk-gallery-group { width: min(100%, 1100px); }
  .lush-template .brk-gallery-group + .brk-gallery-group { margin-top: 56px; }
  .lush-template .brk-gallery-group-heading { font-size: 54px; margin: 0 0 34px; }
  .lush-template .brk-gallery-grid { grid-template-columns: repeat(4, 1fr); gap: 34px 26px; }

  .lush-template .brk-ba-section { max-width: 1080px; }
  .lush-template .brk-ba-stack { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 56px 48px; padding: 24px 0 0; }
  .lush-template .brk-ba { width: 100%; max-width: 480px; }
  .lush-template .brk-ba-label { font-size: 15px; }
  .lush-template .brk-ba-caption { font-size: 24px; margin-top: 16px; }

  .lush-template .brk-policy-section { max-width: 780px; }
  .lush-template .brk-policy-list--marked .brk-policy-row { grid-template-columns: 40px 1fr; gap: 22px; }
  .lush-template .brk-policy-row { padding: 30px 4px 34px; }
  .lush-template .brk-policy-mark { font-size: 20px; }
  .lush-template .brk-policy-title { font-size: 26px; margin-bottom: 12px; }
  .lush-template .brk-policy-text { font-size: 15px; line-height: 1.65; }
  .lush-template .brk-policy-group-heading { font-size: 42px; }
}

/* ── Tablet — mid columns + scale. ── */
@media (min-width: 641px) and (max-width: 1024px) {
  .lush-template .brk-gallery-section { max-width: 900px; }
  .lush-template .brk-gallery-group { width: min(100%, 760px); }
  .lush-template .brk-gallery-group-heading { font-size: 46px; margin: 0 0 28px; }
  .lush-template .brk-gallery-grid { grid-template-columns: repeat(3, 1fr); gap: 22px 18px; }

  .lush-template .brk-ba-section { max-width: 760px; }
  .lush-template .brk-ba-stack { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 36px 28px; }
  .lush-template .brk-ba { width: 100%; max-width: none; margin: 0; }

  .lush-template .brk-policy-section { max-width: 680px; }
  .lush-template .brk-policy-title { font-size: 24px; }
}
`

// ── Scoped CSS ────────────────────────────────────────────────────────────────

// Phase 0 step 2: LUSH_CSS is imported at the top alongside the other
// booking primitives and used as <style>{LUSH_CSS}</style> below. The
// re-export here keeps the existing public name available to any
// in-flight consumer that imports `{ LUSH_CSS } from './LushStudioTemplate'`.
// M2c.3 retires the LUSH_CSS alias once CSS variable theming lands.
export { LUSH_CSS }
