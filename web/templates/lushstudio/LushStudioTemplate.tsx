'use client'

import { useState, useRef } from 'react'
import {
  Heart, Phone, Mail, MapPin, Dot, CalendarCheck,
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

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
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

  const tabs = allTabs.filter(t => t.id === 'book' || enabledByTab[t.id])

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
      <LushCustomerAuthProvider>
      {/* `lush-femme` is the marker that scopes the feminine-luxury
          decorations (scalloped hero edge, sparkle field, polaroid before/
          after, etc.). VelvetTheoryBooking re-uses the Lush flow but only
          adds `.lush-template` — so these decorations stay off the VT
          embed. */}
      <div className="lush-template lush-femme" style={accentVars}>

        {/* ── Announcement bar ── */}
        {(header.show_announcement ?? true) && (
          <div className="lush-announce" aria-hidden="true">
            <div className="lush-announce-track">
              <AnnounceMsgs
                tagline={p?.tagline}
                name={displayName}
                custom={header.announcement_text ?? null}
              />
              <AnnounceMsgs
                tagline={p?.tagline}
                name={displayName}
                custom={header.announcement_text ?? null}
              />
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <section className="lush-header-section">
          {/* Customer-account widget: absolutely positioned top-right of header. */}
          <LushCustomerAccountWidget />

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

          {/* ── Book ── */}
          <div className={`lush-tab-panel${active === 'book' ? ' is-active' : ''}`}>
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

          {/* ── Gallery ── */}
          {enabledByTab.gallery && (
            <div className={`lush-tab-panel${active === 'gallery' ? ' is-active' : ''}`}>
              <GalleryPanel
                items={site.gallery ?? []}
                groups={site.gallery_groups ?? []}
                displayName={displayName}
              />
            </div>
          )}

          {/* ── Results ── */}
          {enabledByTab.results && (
            <div className={`lush-tab-panel${active === 'results' ? ' is-active' : ''}`}>
              <ResultsPanel
                items={site.results ?? site.before_after ?? []}
                groups={site.results_groups ?? site.before_after_groups ?? []}
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

          {/* ── Policy ── */}
          {enabledByTab.policies && (
            <div className={`lush-tab-panel${active === 'policies' ? ' is-active' : ''}`}>
              <PoliciesPanel policies={policies} />
            </div>
          )}

          {/* ── Steps (aftercare) ── */}
          {enabledByTab.aftercare && (
            <div className={`lush-tab-panel${active === 'aftercare' ? ' is-active' : ''}`}>
              <AftercarePanel
                items={(site.template?.settings as any)?.advice?.items ?? (site.template?.settings as any)?.steps?.items}
                heading={(site.template?.settings as any)?.advice?.heading ?? (site.template?.settings as any)?.steps?.heading}
                cardKicker={(site.template?.settings as any)?.advice?.card_kicker ?? (site.template?.settings as any)?.steps?.card_kicker}
              />
            </div>
          )}

          {/* ── Before Your Appointment ── */}
          {enabledByTab.before && (
            <div className={`lush-tab-panel${active === 'before' ? ' is-active' : ''}`}>
              <BeforePanel
                items={(site.template?.settings as any)?.timeline?.items ?? (site.template?.settings as any)?.before_appointment?.items}
                heading={(site.template?.settings as any)?.timeline?.heading ?? (site.template?.settings as any)?.before_appointment?.heading}
                cardKicker={(site.template?.settings as any)?.timeline?.card_kicker ?? (site.template?.settings as any)?.before_appointment?.card_kicker}
              />
            </div>
          )}

        </section>

        {/* ── FAQ ── */}
        {(() => {
          const faq = site.template?.settings.additionals?.faq
          if (!faq?.enabled) return null
          const items = (faq.items ?? []).filter(i => i.question?.trim() && i.answer?.trim())
          if (items.length === 0) return null
          return (
            <section className="lush-faq-section" aria-label="Frequently asked questions">
              <div className="lush-faq-inner">
                <h2 className="lush-faq-heading">{faq.heading || 'Frequently asked'}</h2>
                <div className="lush-faq-list">
                  {items.map((it, i) => (
                    <details key={i} className="lush-faq-item">
                      <summary>{it.question}</summary>
                      <p>{it.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )
        })()}

        {/* ── Reviews ── */}
        {(() => {
          const r = site.template?.settings.additionals?.reviews
          if (!r?.enabled) return null
          const items = (r.items ?? []).filter(it => it.body?.trim() && it.author?.trim())
          if (items.length === 0) return null
          return (
            <section className="lush-reviews-section" aria-label="Reviews">
              <div className="lush-reviews-inner">
                <h2 className="lush-reviews-heading">{r.heading || 'What clients say'}</h2>
                <div className="lush-reviews-grid">
                  {items.map((it, i) => (
                    <div key={i} className="lush-review-card">
                      {typeof it.rating === 'number' && it.rating > 0 && (
                        <div className="lush-review-stars" aria-label={`${it.rating} of 5 stars`}>
                          {'★'.repeat(Math.max(0, Math.min(5, Math.round(it.rating))))}
                        </div>
                      )}
                      <p className="lush-review-body">&ldquo;{it.body}&rdquo;</p>
                      <p className="lush-review-author">
                        — {it.author}
                        {it.location ? <span className="lush-review-loc"> · {it.location}</span> : null}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )
        })()}

        {/* ── Thanks outro ── */}
        {(site.template?.settings.additionals?.show_thank_you ?? true) && (
          <section className="lush-thanks-section" aria-label="Thank you">
            <div className="lush-thanks-inner">
              <span className="lush-thanks-eyebrow">From us, with love</span>
              {site.template?.settings.additionals?.thank_you_title
                ? <h2>{site.template.settings.additionals.thank_you_title}</h2>
                : <h2>Thank you<br />for choosing <em>{displayName}</em></h2>
              }
              {site.template?.settings.additionals?.thank_you_body && (
                <p style={{
                  fontFamily: 'var(--lush-ui)', fontSize: 15,
                  lineHeight: 1.55, color: 'var(--lush-muted)',
                  maxWidth: 540, margin: 0,
                }}>
                  {site.template.settings.additionals.thank_you_body}
                </p>
              )}
              <div className="lush-thanks-sig">
                <span className="lush-thanks-line" />
                <em>{
                  // Owner-overridden signature wins; otherwise drop leading
                  // articles from the business name so "The Fade Room" signs
                  // as "Fade" instead of "The".
                  site.template?.settings.additionals?.thank_you_signature?.trim()
                    || signatureWord(displayName)
                }</em>
                <span className="lush-thanks-line" />
              </div>
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <Footer
          profile={p}
          hours={hours}
          displayName={footerSettings.business_name_override?.trim() || displayName}
          address={address}
          onBook={goBook}
          showPoweredBy={footerSettings.show_powered_by}
          subtext={footerSettings.subtext ?? null}
          showHours={footerSettings.show_hours ?? true}
          showQuickBook={footerSettings.show_quick_book ?? true}
          showContactLinks={footerSettings.show_contact_links ?? true}
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

// ── Gallery panel ─────────────────────────────────────────────────────────────

const GALLERY_GROUPS = [
  {
    label: 'Fresh Work',
    images: [
      { label: 'Fresh Fade' },
      { label: 'Beard Detail' },
      { label: 'Clean Lineup' },
      { label: 'Chair View' },
    ],
  },
  {
    label: 'The Shop',
    images: [
      { label: 'Shop Floor' },
      { label: 'Shop Detail' },
      { label: 'Tools' },
      { label: 'Vibe' },
    ],
  },
]

interface PublicGalleryItem {
  id: number
  title: string | null
  caption: string | null
  alt_text: string | null
  image_url: string
  category: string | null
  sort_order: number
  group_id?: number | null
}

interface PublicGroup {
  id: number
  heading: string
  sort_order: number
}

function GalleryPanel({
  items,
  groups,
  displayName,
}: {
  items: PublicGalleryItem[]
  groups: PublicGroup[]
  displayName: string
}) {
  // No items at all → polished placeholders (lifted from the original layout)
  if (items.length === 0 && groups.length === 0) {
    return (
      <section className="lush-gallery-section">
        {GALLERY_GROUPS.map(g => (
          <div key={g.label} className="lush-gallery-group">
            <h2>{g.label}</h2>
            <div className="lush-gallery-grid">
              {g.images.map((img, i) => (
                <div key={i} className="lush-gallery-img lush-gallery-img--square">
                  <div className="lush-gallery-placeholder">
                    <span>{img.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    )
  }

  // Group items by group_id. Owner-defined groups own a heading; items
  // without a group_id fall through to a final "More" bucket so legacy data
  // (created before the groups feature shipped) still renders.
  const byGroup = new Map<number, PublicGalleryItem[]>()
  const ungrouped: PublicGalleryItem[] = []
  for (const it of items) {
    const gid = it.group_id ?? null
    if (gid === null) { ungrouped.push(it); continue }
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid)!.push(it)
  }

  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)

  return (
    <section className="lush-gallery-section">
      {sortedGroups.map(g => {
        const list = (byGroup.get(g.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        if (list.length === 0) return null
        return (
          <div key={g.id} className="lush-gallery-group">
            <h2>{g.heading}</h2>
            <div className="lush-gallery-grid">
              {list.map(item => (
                <div key={item.id} className="lush-gallery-img lush-gallery-img--square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.alt_text ?? item.title ?? displayName}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
      {ungrouped.length > 0 && (
        <div className="lush-gallery-group">
          <h2>{sortedGroups.length > 0 ? 'More' : 'Gallery'}</h2>
          <div className="lush-gallery-grid">
            {ungrouped.slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id).map(item => (
              <div key={item.id} className="lush-gallery-img lush-gallery-img--square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image_url}
                  alt={item.alt_text ?? item.title ?? displayName}
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

// ── Results (before/after) panel ──────────────────────────────────────────────

const BA_PAIRS = [
  { label: 'Fade' },
  { label: 'Lineup' },
  { label: 'Beard' },
]

interface PublicBeforeAfterItem {
  id: number
  title: string | null
  caption: string | null
  before_image_url: string
  after_image_url: string
  before_alt_text: string | null
  after_alt_text: string | null
  category: string | null
  sort_order: number
  group_id?: number | null
}

function ResultsPanel({
  items, groups,
}: {
  items: PublicBeforeAfterItem[]
  groups: PublicGroup[]
}) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())

  function toggle(i: number) {
    setRevealed(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  // Real items take precedence over placeholders
  if (items.length > 0) {
    // Bucket by group, mirroring GalleryPanel. Legacy items (no group_id)
    // fall into a final unlabeled bucket so nothing disappears on upgrade.
    const byGroup = new Map<number, PublicBeforeAfterItem[]>()
    const ungrouped: PublicBeforeAfterItem[] = []
    for (const it of items) {
      const gid = it.group_id ?? null
      if (gid === null) { ungrouped.push(it); continue }
      if (!byGroup.has(gid)) byGroup.set(gid, [])
      byGroup.get(gid)!.push(it)
    }
    const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    const buckets: { key: string; heading: string | null; list: PublicBeforeAfterItem[] }[] = []
    for (const g of sortedGroups) {
      const list = (byGroup.get(g.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      if (list.length > 0) buckets.push({ key: `g-${g.id}`, heading: g.heading, list })
    }
    if (ungrouped.length > 0) {
      const sortedUngrouped = ungrouped.slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      buckets.push({ key: 'g-none', heading: sortedGroups.length > 0 ? 'More' : null, list: sortedUngrouped })
    }

    // Single-bucket case keeps the original RESULTS / Amazing header.
    // Multi-bucket uses the bucket's heading per section.
    let runningIndex = 0
    return (
      <section className="lush-before-after-section">
        <div className="lush-results-heading">
          <h2>Amazing</h2>
          <div className="lush-results-backdrop">results</div>
        </div>
        {buckets.map(b => {
          const block = (
            <div key={b.key} className="lush-ba-bucket">
              {b.heading && buckets.length > 1 && (
                <h3 className="lush-ba-bucket-heading">{b.heading}</h3>
              )}
              <div className="lush-ba-stack">
                {b.list.map((item) => {
                  const i = runningIndex++
                  return (
                    <div key={item.id} className="lush-ba-pair">
                      <span className="lush-ba-label lush-ba-label--before">Before</span>
                      <span className="lush-ba-label lush-ba-label--after">After</span>
                      <div className="lush-ba-card lush-ba-card--before">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.before_image_url}
                          alt={item.before_alt_text ?? `${b.heading ?? 'Result'} — before`}
                          loading="lazy"
                        />
                      </div>
                      <button
                        className={`lush-ba-card lush-ba-card--after${revealed.has(i) ? ' is-revealed' : ''}`}
                        onClick={() => toggle(i)}
                        aria-label={revealed.has(i) ? 'Hide result' : 'Tap to reveal result'}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.after_image_url}
                          alt={item.after_alt_text ?? `${b.heading ?? 'Result'} — after`}
                          loading="lazy"
                          className="lush-ba-after-img"
                        />
                        <span>Tap to Reveal</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
          return block
        })}
      </section>
    )
  }

  // Placeholder fallback when no real items exist
  return (
    <section className="lush-before-after-section">
      <div className="lush-results-heading">
        <div className="lush-results-backdrop">RESULTS</div>
        <h2>Amazing</h2>
      </div>
      <div className="lush-ba-stack">
        {BA_PAIRS.map((pair, i) => (
          <div key={i} className="lush-ba-pair">
            <span className="lush-ba-label lush-ba-label--before">Before</span>
            <span className="lush-ba-label lush-ba-label--after">After</span>
            <div className="lush-ba-card lush-ba-card--before">
              <div className="lush-ba-placeholder" />
            </div>
            <button
              className={`lush-ba-card lush-ba-card--after${revealed.has(i) ? ' is-revealed' : ''}`}
              onClick={() => toggle(i)}
              aria-label={revealed.has(i) ? 'Hide result' : 'Tap to reveal result'}
            >
              <div className="lush-ba-placeholder lush-ba-after-img" />
              <span>Tap to Reveal</span>
            </button>
          </div>
        ))}
      </div>
    </section>
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

  // Saved values win; fall back to the previous default styling.
  const heading      = about?.heading?.trim()    || `The ${signatureWord(displayName)} Experience`
  // Eyebrow drives the small descriptor under the big headline. Title
  // case (no .toUpperCase) so the spa Molle italic reads naturally.
  const backdropText = about?.eyebrow?.trim() || businessWord
  const bodyOverride = about?.body?.trim()       || ''
  const highlights   = about?.highlights?.filter(h => h.title?.trim() || h.body?.trim()) ?? []
  const useHighlights = highlights.length > 0

  return (
    <section className="lush-about-section">
      {/* Hero: rounded 4-point star window that masks the tenant
          about-image (about.images[0]) into the spark shape. The
          heading wrap sits BELOW the star (with a slight negative
          margin-top so it gently overlaps the star's bottom edge).
          Tagline below the heading is rendered in DM Mono all caps
          as a small typographic accent. */}
      <div className="lush-about-hero">
        <div className="lush-about-star" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
            <defs>
              {/* Rounded 4-point spark — each tip has horizontal /
                  vertical tangents on both sides (both control points
                  share the tip's coordinate axis), so the four tips
                  are SMOOTH ARCS instead of sharp points. The lobes
                  between tips bulge convexly outward, leaving the
                  masked image with plenty of room to show. Rotated
                  35° so the points sit diagonally. */}
              <clipPath id="lush-about-star-clip" transform="rotate(35 50 50)">
                <path d="M50 10 C60 10 95 40 95 50 C95 60 60 90 50 90 C40 90 5 60 5 50 C5 40 40 10 50 10 Z" />
              </clipPath>
            </defs>
            {about?.images?.[0] ? (
              <image
                href={about.images[0]}
                x="0" y="0" width="100" height="100"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#lush-about-star-clip)"
              />
            ) : (
              <path
                d="M50 10 C60 10 95 40 95 50 C95 60 60 90 50 90 C40 90 5 60 5 50 C5 40 40 10 50 10 Z"
                fill="currentColor"
                transform="rotate(35 50 50)"
              />
            )}
          </svg>
        </div>
        <div className="lush-about-heading-wrap">
          <div className="lush-about-backdrop">{backdropText}</div>
          <h2>{heading}</h2>
          {p?.tagline && (
            <p className="lush-about-tagline">{p.tagline}</p>
          )}
        </div>
      </div>
      <div>
        <div className="lush-about-copy">
          <p>
            {bodyOverride
              ? bodyOverride
              : (p?.tagline
                  ? `${p.tagline} — we're dedicated to delivering an exceptional experience every visit.`
                  : `At ${displayName}, every appointment is an experience. We bring precision, care, and craft to every client.`)}
          </p>
          {useHighlights ? (
            <div className="lush-about-list">
              <span>What we deliver</span>
              <ul>
                {highlights.map((h, i) => (
                  <li key={i}>
                    {h.title?.trim() && <strong>{h.title}</strong>}
                    {h.title?.trim() && h.body?.trim() && ' '}
                    {h.body?.trim()}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="lush-about-list">
              <span>What we deliver</span>
              <ul>
                <li><strong>Expert technique</strong> refined through years of hands-on practice.</li>
                <li><strong>Personalized service</strong> tailored to your style and preferences.</li>
                <li><strong>A welcoming atmosphere</strong> where you can relax and trust the process.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Policies panel ────────────────────────────────────────────────────────────

const POLICY_KEYS: [string, string][] = [
  ['cancellation_policy', 'Cancellation'],
  ['late_policy',         'Late Arrival'],
  ['no_show_policy',      'No-Show'],
  ['deposit_policy',      'Deposit'],
  ['reschedule_policy',   'Rescheduling'],
  ['extra_notes',         'Additional Notes'],
]

const FALLBACK_POLICIES = [
  { label: 'Cancellation', text: 'We require 24 hours notice for cancellations. Cancellations made with less than 24 hours notice may be subject to a fee.' },
  { label: 'Late Arrival',  text: 'Please arrive on time. Clients arriving more than 10 minutes late may need to be rescheduled to protect other clients\' appointments.' },
  { label: 'No-Show',      text: 'No-shows may be charged a no-show fee. Repeated no-shows may result in prepayment requirements for future bookings.' },
]

function PoliciesPanel({ policies }: { policies: PublicSite['policies'] }) {
  const activeReal = policies
    ? POLICY_KEYS.filter(([key]) => (policies as unknown as Record<string, string | null>)[key])
    : []

  // Owner-defined extra sections — rendered after the 6 named ones, each as
  // its own card per item so a single "Aftercare" group can list several
  // bullet-style sub-policies without leaving Markdown in the body text.
  const customGroups = (policies?.custom_groups ?? [])
    .filter(g => (g.heading?.trim().length ?? 0) > 0)
    .map(g => ({
      heading: g.heading.trim(),
      items: (g.items ?? []).filter(it => (it.title?.trim().length ?? 0) > 0),
    }))
    .filter(g => g.items.length > 0)

  return (
    <section className="lush-policy-section">
      <div className="lush-policy-heading">
        <span>Booking</span>
        <h2>Policies</h2>
      </div>
      <div className="lush-policy-list">
        {activeReal.length > 0
          ? activeReal.map(([key, label]) => (
              <div key={key} className="lush-policy-card">
                <h3>{label}</h3>
                <div className="lush-policy-copy">
                  <p style={{ whiteSpace: 'pre-wrap' }}>
                    {(policies as unknown as Record<string, string | null>)[key]}
                  </p>
                </div>
              </div>
            ))
          : FALLBACK_POLICIES.map(fp => (
              <div key={fp.label} className="lush-policy-card">
                <h3>{fp.label}</h3>
                <div className="lush-policy-copy"><p>{fp.text}</p></div>
              </div>
            ))
        }
      </div>

      {customGroups.map((g, gi) => (
        <div key={`cg-${gi}`} className="lush-policy-custom-group">
          <h3 className="lush-policy-custom-heading">{g.heading}</h3>
          <div className="lush-policy-list">
            {g.items.map((it, ii) => (
              <div key={ii} className="lush-policy-card">
                <h3>{it.title.trim()}</h3>
                {it.content?.trim() && (
                  <div className="lush-policy-copy">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{it.content.trim()}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

// ── Before Your Appointment panel ─────────────────────────────────────────────

const BEFORE_STEPS = [
  { title: 'Arrive on Time',          body: 'Plan to arrive 5 minutes early so you can settle in and we can start your service right on schedule.' },
  { title: 'Come Prepared',           body: 'Wear comfortable clothing and avoid heavy product in your hair or beard before your appointment.' },
  { title: 'Bring Reference Photos',  body: 'Not sure exactly what you want? Bring photos of styles you like — it helps us dial in the perfect look.' },
  { title: 'Confirm Your Service',    body: 'Review your booked service before arriving. If anything has changed, give us a call and we\'ll sort it out.' },
]

function BeforePanel({
  items,
  heading,
  cardKicker,
}: {
  items?: { title: string; body: string }[]
  heading?: string
  /** Phase 8 — optional kicker rendered above each step's title. The
   *  numbered timeline node stays regardless (it carries the structural
   *  meaning of "step 1 of N"). */
  cardKicker?: string
}) {
  const steps = items && items.length > 0 ? items : BEFORE_STEPS
  const kicker = (cardKicker ?? '').trim()
  return (
    <section className="lush-before-appointment-section">
      <h2>{heading ?? 'Before Your Appointment'}</h2>
      <ol className="lush-before-timeline">
        {steps.map((s, i) => (
          <li key={i} className="lush-before-step">
            <div className="lush-before-node">
              <span className="lush-before-node-num">{i + 1}</span>
            </div>
            <div className="lush-before-step-body">
              {kicker && <span className="lush-before-step-kicker">{kicker}</span>}
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

// ── Aftercare panel ───────────────────────────────────────────────────────────

const AFTERCARE_CARDS = [
  { title: 'Keep It Fresh',            body: 'Maintain your look between appointments with the right products for your hair type.' },
  { title: 'Avoid Heavy Products',     body: 'Let any treatments settle for 24–48 hours before applying styling products.' },
  { title: 'Book Your Maintenance',    body: 'Most styles look best when touched up every 2–4 weeks. Book your next visit before you leave.' },
  { title: 'Follow Your Care Guide',   body: 'Your barber may give specific instructions for your service — follow them for the best results.' },
]

function AftercarePanel({
  items,
  heading,
  cardKicker,
}: {
  items?: { title: string; body: string }[]
  heading?: string
  /** Phase 8 — optional shared label rendered above every card's title
   *  ("Aftercare Advice", "How To..."). Blank/missing = no label row,
   *  just the heading + body. Replaces the old auto-numbered
   *  "Step 01/02/03" treatment. */
  cardKicker?: string
}) {
  const cards = items && items.length > 0 ? items : AFTERCARE_CARDS
  const kicker = (cardKicker ?? '').trim()
  return (
    <section className="lush-aftercare-section">
      <h2>{heading ?? 'Steps'}</h2>
      <div className="lush-aftercare-list">
        {cards.map((c, i) => (
          <div key={i} className="lush-aftercare-card">
            {kicker && (
              <div className="lush-aftercare-head">
                <span className="lush-aftercare-dot" aria-hidden="true" />
                <span className="lush-aftercare-index">{kicker}</span>
              </div>
            )}
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({
  profile: p,
  hours,
  displayName,
  address,
  onBook,
  showPoweredBy = true,
  subtext = null,
  showHours = true,
  showQuickBook = true,
  showContactLinks = true,
}: {
  profile: Profile | null
  hours: PublicSite['hours']
  displayName: string
  address: string
  onBook: () => void
  showPoweredBy?: boolean
  subtext?: string | null
  showHours?: boolean
  showQuickBook?: boolean
  showContactLinks?: boolean
}) {
  const sorted = hours
    ? [...hours.filter(h => h.day_of_week !== 0), ...hours.filter(h => h.day_of_week === 0)]
    : []
  const blurb = subtext && subtext.trim().length > 0
    ? subtext
    : 'Booking by appointment. Walk-ins welcome when available.'

  return (
    <footer className="lush-footer">
      <div className="lush-footer-glow" aria-hidden="true" />
      <div className="lush-footer-inner">

        <div className="lush-footer-brand">
          <span className="lush-footer-mark">{displayName}</span>
          {p?.tagline && <p className="lush-footer-tag">{p.tagline}</p>}
          <p className="lush-footer-blurb">{blurb}</p>
        </div>

        {showContactLinks && (p?.public_phone || p?.public_email || address) && (
          <div className="lush-footer-col">
            <span className="lush-footer-label">Contact</span>
            {p?.public_phone && (
              <a className="lush-footer-item" href={`tel:${p.public_phone}`}>
                <Phone size={14} /> {p.public_phone}
              </a>
            )}
            {p?.public_email && (
              <a className="lush-footer-item" href={`mailto:${p.public_email}`}>
                <Mail size={14} /> {p.public_email}
              </a>
            )}
            {address && (
              <a
                className="lush-footer-item"
                href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin size={14} /> {address}
              </a>
            )}
          </div>
        )}

        {showHours && sorted.length > 0 && (
          <div className="lush-footer-col">
            <span className="lush-footer-label">Hours</span>
            {sorted.map(h => (
              <div key={h.day_of_week} className="lush-footer-hour">
                <span>{h.day_name}</span>
                <span>
                  {h.is_open && h.open_time && h.close_time
                    ? `${fmt12(h.open_time)} – ${fmt12(h.close_time)}`
                    : 'Closed'}
                </span>
              </div>
            ))}
          </div>
        )}

        {showQuickBook && (
          <div className="lush-footer-col">
            <span className="lush-footer-label">Quick Book</span>
            <button className="lush-footer-book" onClick={onBook}>
              <CalendarCheck size={18} fill="currentColor" strokeWidth={1.5} />
              <span>Book Now</span>
            </button>
          </div>
        )}

      </div>
      <div className="lush-footer-bottom">
        <span>© {new Date().getFullYear()} {displayName}</span>
        {showPoweredBy && (
          <>
            <span className="lush-footer-dot" aria-hidden="true"><Dot size={14} /></span>
            <span>Powered by <strong>BookReady</strong></span>
          </>
        )}
      </div>
    </footer>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────────────────────

// Phase 0 step 2: LUSH_CSS is imported at the top alongside the other
// booking primitives and used as <style>{LUSH_CSS}</style> below. The
// re-export here keeps the existing public name available to any
// in-flight consumer that imports `{ LUSH_CSS } from './LushStudioTemplate'`.
// M2c.3 retires the LUSH_CSS alias once CSS variable theming lands.
export { LUSH_CSS }
