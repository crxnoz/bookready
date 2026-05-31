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
import LushStudioBooking from './LushStudioBooking'
import LushCustomerAccountWidget from './LushCustomerAccountWidget'
import { LushCustomerAuthProvider } from './LushCustomerAuth'
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
    { id: 'results',   label: tabLabels.results_label,            key: 'before_after'       },
    { id: 'aftercare', label: tabLabels.steps_label,              key: 'steps'              },
    { id: 'before',    label: tabLabels.before_appointment_label, key: 'before_appointment' },
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
      <div className="lush-template" style={accentVars}>

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
              <section className="lush-booking-section">
                <div className="lush-booking-summary" style={{ maxWidth: 480, margin: '40px auto' }}>
                  <span className="lush-booking-block-label">Booking unavailable</span>
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
                items={site.before_after ?? []}
                groups={site.before_after_groups ?? []}
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
                items={site.template?.settings.steps?.items}
                heading={site.template?.settings.steps?.heading}
                cardKicker={site.template?.settings.steps?.card_kicker}
              />
            </div>
          )}

          {/* ── Before Your Appointment ── */}
          {enabledByTab.before && (
            <div className={`lush-tab-panel${active === 'before' ? ' is-active' : ''}`}>
              <BeforePanel
                items={site.template?.settings.before_appointment?.items}
                heading={site.template?.settings.before_appointment?.heading}
                cardKicker={site.template?.settings.before_appointment?.card_kicker}
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

const LUSH_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cookie&family=DM+Mono:wght@400;500&family=Molle:ital@1&family=DM+Serif+Text:ital@0;1&family=DM+Sans:opsz,wght@9..40,300..700&family=Roboto:wght@400;500;700&display=swap');

/* ── Tokens scoped to template root ── */
.lush-template {
  /* Lush Studio palette (soft spa). Cream page, near-black text,
     muted sage accent. Var names retain "pink" for now to avoid a
     full rename sweep — they're sage values internally. */
  --lush-bg:          #F6F3EE;
  --lush-card:        #FFFFFF;
  --lush-text:        #0E1111;
  --lush-muted:       #6B7280;
  --lush-pink:        #7FAF9A;
  /* Comma-separated RGB triplet for the same accent. Used by every
     rgba(var(--lush-pink-rgb), opacity) glow so swapping accents
     propagates everywhere via a single override on .lush-template. */
  --lush-pink-rgb:    127, 175, 154;
  /* Foreground color rendered ON TOP of a solid --lush-pink background.
     Default is white (legible on every preset except white itself);
     the editor flips this to dark when the white accent is picked. */
  --lush-on-pink:     #FFFFFF;
  --lush-pink-soft:   #B3D0C2;
  --lush-dark-border: rgba(14,17,17,0.10);
  /* Glow effects intentionally removed for the soft-spa direction —
     spa visual language is calm + flat, not luminous. The vars stay
     so the existing references still resolve; they just render as
     "no shadow". */
  --lush-glow:        none;
  --lush-text-glow:   none;
  /* Cookie — clean handwritten script for decorative headings.
     Molle — italic display script used for the highlight-color
     Before/After block; defined here so it propagates to any future
     use (the section pulls var(--lush-molle) directly). */
  --lush-script:      "Cookie", cursive;
  --lush-molle:       "Molle", cursive;
  --lush-serif:       "DM Serif Text", serif;
  --lush-sans:        "DM Sans", sans-serif;
  --lush-ui:          "Roboto", sans-serif;
  --lush-mono:        "DM Mono","Roboto Mono",monospace;
  width: 100%; background: var(--lush-bg); color: var(--lush-text);
  overflow-x: hidden; font-family: var(--lush-ui);
}
.lush-template *, .lush-template *::before, .lush-template *::after { box-sizing: border-box; }
.lush-template img { max-width: 100%; display: block; }
.lush-template a { text-decoration: none; }
.lush-template button, .lush-template a { -webkit-tap-highlight-color: transparent; cursor: pointer; }
.lush-template :focus-visible { outline: 2px solid var(--lush-pink); outline-offset: 3px; }

/* ── Announcement bar ── */
.lush-announce {
  width: 100%; overflow: hidden; position: relative;
  /* Flat sage tint on cream — flat colors only per the soft-spa
     direction. No multi-stop gradient. */
  background: rgba(var(--lush-pink-rgb),0.08);
  border-bottom: 1px solid rgba(var(--lush-pink-rgb),0.20);
}
.lush-announce::before, .lush-announce::after {
  content:""; position:absolute; top:0; bottom:0; width:60px; z-index:2; pointer-events:none;
}
.lush-announce::before { left:0; background:linear-gradient(90deg,#F6F3EE,transparent); }
.lush-announce::after  { right:0; background:linear-gradient(-90deg,#F6F3EE,transparent); }
.lush-announce-track {
  display:inline-flex; align-items:center; gap:20px; padding:10px 0;
  white-space:nowrap; animation:lushMarquee 42s linear infinite;
  color:var(--lush-text); font-family:var(--lush-sans); font-size:11px;
  letter-spacing:0.14em; text-transform:uppercase; font-weight:600;
}
.lush-announce-sep { color:var(--lush-pink); opacity:0.8; font-size:8px; }
@keyframes lushMarquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
@media (prefers-reduced-motion:reduce) { .lush-announce-track { animation:none; } }

/* ── Header ── */
.lush-header-section {
  width:100%; min-height:100vh; background:var(--lush-bg);
  overflow:hidden; position:relative;
}
/* ── Customer-account widget (BookReady house style) ──
   Absolutely positioned top-right of the FadeRoom header. Sharp
   rectangular pill — NO border-radius, hairline border, system font,
   uppercase 10px label with wide tracking. White by default, flips
   to near-black on hover so it reads BookReady not template-y on
   whatever cover image is behind it. Same base class is shared
   between an <a> (authed link) and a <button> (unauthed → opens
   LushAuthModal). */
.lush-account-widget {
  position:absolute; top:14px; right:14px; z-index:6;
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 12px; border-radius:0;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.15);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:10px; font-weight:700; line-height:1;
  letter-spacing:0.16em; text-transform:uppercase;
  text-decoration:none;
  box-shadow:0 1px 3px rgba(0,0,0,0.08);
  transition:background .15s ease,color .15s ease,border-color .15s ease;
  cursor:pointer; -webkit-appearance:none; appearance:none;
}
@media (hover:hover) and (pointer:fine) {
  .lush-account-widget:hover {
    background:#121212; color:#FFFFFF; border-color:#121212;
  }
}
.lush-account-widget--authed { padding:0; gap:0; overflow:hidden; }
.lush-account-widget-link {
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 12px; color:inherit; text-decoration:none;
  font-size:10px; font-weight:700;
  letter-spacing:0.16em; text-transform:uppercase;
}
.lush-account-widget-signout {
  display:inline-flex; align-items:center; justify-content:center;
  width:32px; height:32px; padding:0;
  border:none; border-left:1px solid rgba(18,18,18,0.15);
  background:transparent; color:inherit; cursor:pointer;
  transition:background .15s ease,color .15s ease;
}
@media (hover:hover) and (pointer:fine) {
  .lush-account-widget-signout:hover {
    background:rgba(0,0,0,0.06);
  }
  .lush-account-widget--authed:hover .lush-account-widget-signout {
    border-left-color:rgba(255,255,255,0.20);
  }
  .lush-account-widget--authed:hover .lush-account-widget-signout:hover {
    background:rgba(255,255,255,0.10);
  }
}
/* Hide the floating top-right widget on mobile — it competes with the
   header cover + floating hearts for limited real estate. The booking
   form's Step 4 already has its own in-flow "Sign in to autofill"
   prompt for visitors who need to authenticate. */
@media (max-width:768px) {
  .lush-account-widget { display:none !important; }
}

/* ── Customer-auth modal (LushCustomerAuth) ──
   Mounted at template root by LushCustomerAuthProvider. BookReady
   house style: sharp corners (no border-radius anywhere), dark brand
   bar across the top, system font, near-black solids. Mirrors the
   AuthShell pattern used on /login and /account/login so customers
   know they're authenticating into BookReady, not the salon. */
.lush-auth-modal-backdrop {
  position:fixed; inset:0; z-index:9999;
  background:rgba(14,17,17,0.65);
  -webkit-backdrop-filter:blur(3px); backdrop-filter:blur(3px);
  display:flex; align-items:center; justify-content:center;
  padding:16px;
  animation:lushAuthFade .15s ease both;
}
@keyframes lushAuthFade { from{opacity:0} to{opacity:1} }
.lush-auth-modal {
  position:relative; width:100%; max-width:440px;
  background:#FFFFFF; color:#121212;
  border-radius:0;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  box-shadow:0 24px 60px rgba(0,0,0,0.35);
  animation:lushAuthRise .2s ease both;
}
@keyframes lushAuthRise { from{transform:translateY(10px);opacity:0} to{transform:none;opacity:1} }

/* Dark brand bar across the top — sharp, full-bleed, BookReady wordmark
   on the left, close button on the right. */
.lush-auth-modal-brand {
  display:flex; align-items:center; justify-content:space-between;
  padding:14px 22px;
  background:#121212; color:#FFFFFF;
}
.lush-auth-modal-wordmark {
  font-size:10px; font-weight:700;
  letter-spacing:0.24em; text-transform:uppercase;
}
.lush-auth-modal-close {
  display:inline-flex; align-items:center; justify-content:center;
  width:24px; height:24px; padding:0;
  border:none; background:transparent;
  color:rgba(255,255,255,0.65); cursor:pointer;
  margin:-4px -6px -4px 0;
  transition:color .15s ease;
}
.lush-auth-modal-close:hover { color:#FFFFFF; }

/* Tab strip — same 2-col grid with bg-near-black-on-active treatment
   that the editor app auth pages use. */
.lush-auth-modal-tabs {
  display:grid; grid-template-columns:1fr 1fr;
  border-bottom:1px solid rgba(18,18,18,0.12);
}
.lush-auth-modal-tab {
  padding:14px 12px;
  border:none; background:transparent;
  font:inherit; font-size:11px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280; cursor:pointer;
  transition:color .15s ease, background .15s ease;
}
.lush-auth-modal-tab.is-active {
  background:#121212; color:#FFFFFF;
}
.lush-auth-modal-tab:not(.is-active):hover { color:#121212; }

.lush-auth-modal-body { padding:28px 26px 24px; }
.lush-auth-modal-eyebrow {
  display:block;
  font-size:10px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
  margin:0 0 6px;
}
.lush-auth-modal-title {
  font-family:inherit;
  font-size:26px; font-weight:700;
  letter-spacing:-0.01em; line-height:1.1;
  margin:0 0 6px; color:#121212;
}
.lush-auth-modal-tag {
  font-size:13px; color:#6B7280; line-height:1.5;
  margin:0 0 20px;
}
.lush-auth-modal-error {
  margin-bottom:14px; padding:10px 12px;
  background:#FEF2F2; border:1px solid #FECACA; border-radius:0;
  font-size:12px; color:#B91C1C;
}
.lush-auth-modal-form { display:grid; gap:14px; }
.lush-auth-modal-field { display:flex; flex-direction:column; gap:5px; }
.lush-auth-modal-field > span {
  font-size:10px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
}
.lush-auth-modal-form input {
  width:100%; padding:12px 14px;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.15); border-radius:0;
  font:inherit; font-size:14px; line-height:1.2;
  -webkit-appearance:none; appearance:none;
  transition:border-color .15s ease;
}
.lush-auth-modal-form input:focus { outline:none; border-color:#121212; }
.lush-auth-modal-form input::placeholder { color:#c4bcb6; }
.lush-auth-modal-submit {
  width:100%; padding:14px;
  background:#121212; color:#FFFFFF;
  border:none; border-radius:0;
  font:inherit; font-size:11px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  cursor:pointer; margin-top:4px;
  display:inline-flex; align-items:center; justify-content:center;
  transition:background .15s ease;
}
.lush-auth-modal-submit:hover:not(:disabled) { background:#2a2a2a; }
.lush-auth-modal-submit:disabled { opacity:0.6; cursor:default; }
.lush-auth-modal-foot {
  margin:16px 0 0; text-align:center;
  font-size:12px; color:#6B7280;
}
.lush-auth-modal-foot a {
  color:#121212; text-decoration:underline; text-underline-offset:2px;
}
.lush-auth-modal-fineprint { font-size:11px; line-height:1.45; }
.lush-spin { animation:lushAuthSpin .9s linear infinite; }
@keyframes lushAuthSpin { to { transform:rotate(360deg); } }
/* Mobile: stay centered (no bottom-sheet). Backdrop already has
   padding:16px so the modal gets breathing room on the sides; just
   tighten the internal padding so the form isn't cramped. */
@media (max-width:480px) {
  .lush-auth-modal { max-width:380px; }
  .lush-auth-modal-brand { padding:13px 18px; }
  .lush-auth-modal-body { padding:24px 20px 22px; }
}
/* ── Header cover ──
   Compact backdrop image; flat soft-spa direction (no veil / pulsing
   heart). A gradient floor + drop-shadow give the cover real depth
   so the content card visibly sits ON TOP of it instead of touching. */
.lush-header-cover {
  width:100%; height:31vh; min-height:230px; position:relative;
  background:#F6F3EE;
  overflow:hidden;
}
.lush-header-cover > img {
  width:100%; height:100%; object-fit:cover; display:block;
}
/* Bottom-edge gradient on the cover photo for depth. Subtle — the
   real shadow comes from the content card's top edge below. */
.lush-header-cover::after {
  content:""; position:absolute; left:0; right:0; bottom:0; height:120px;
  background:linear-gradient(to bottom, transparent 0%, rgba(14,17,17,0.22) 100%);
  pointer-events:none; z-index:1;
}
/* Legacy elements — hidden so any residual markup is invisible. */
.lush-cover-veil, .lush-cover-heart,
.lush-header-avatar, .lush-avatar-ring, .lush-avatar-heart, .lush-avatar-initials {
  display:none !important;
}
/* Floating hearts: hide everywhere — spa stays calm. */
.lush-floating-heart { display:none; }
@keyframes tfrHeartPulse {
  0%,100% { transform:scale(1); }
  50%      { transform:scale(1.12); }
}

/* ── Header content card ──
   Sits on top of the cover photo with the top corners rounded + translated
   up so the cover peeks above it. Strong top-edge shadow gives the
   "floating panel" depth. Solid cream bg so content reads cleanly on
   whatever cover image is below. Text is LEFT-aligned with generous
   top/left padding (editorial spa feel). */
.lush-header-content {
  position:relative; z-index:2;
  width:100%; margin:0 auto;
  padding:44px 30px 48px;
  text-align:left;
  background:var(--lush-bg);
  border-radius:36px 36px 0 0;
  margin-top:-48px;
  box-shadow:0 -14px 36px rgba(14,17,17,0.14);
}
.lush-header-content h1 {
  margin:0; color:var(--lush-text); font-family:var(--lush-serif);
  font-size:clamp(34px,8vw,56px); line-height:1.05;
  font-weight:400; letter-spacing:-0.02em;
}
.lush-header-subtype {
  margin:10px 0 0;
  font-family:var(--lush-ui); /* Roboto bold */
  font-size:14px; font-weight:700;
  letter-spacing:0.16em; text-transform:uppercase;
  color:rgba(14,17,17,0.55);
}
.lush-header-info {
  display:flex; flex-direction:column; align-items:flex-start; gap:10px;
  margin:18px 0 0;
}
/* Location + service-menu rows. Bold body text at lower opacity so
   the lines still read clearly without competing with the business
   name. Solid filled icons in highlight color, scaled to match. */
.lush-header-info-row {
  display:inline-flex; align-items:center; gap:12px;
  font-family:var(--lush-ui); /* Roboto bold */
  font-size:16px; line-height:1.3; font-weight:700;
  color:rgba(14,17,17,0.65);
}
.lush-header-info-row > svg {
  color:var(--lush-pink); flex-shrink:0;
}

/* ── Header buttons ──
   Grid: 5 columns of 50px circles. Every button is the same shape
   (including Book), so the visual rhythm is consistent. Centered
   under the info rows. Wraps to a second row if more than 5 are
   enabled. */
.lush-header-buttons {
  display:grid;
  grid-template-columns:repeat(5, 50px);
  gap:14px;
  margin-top:28px;
  justify-content:center;
}

/* Base button: 50px solid circle. The text label inside (a <span>)
   is hidden for sighted users but kept in the DOM for screen readers. */
.lush-header-btn {
  position:relative;
  display:inline-flex; align-items:center; justify-content:center;
  width:50px; height:50px; padding:0;
  border-radius:50%;
  color:#FFFFFF;
  border:none; cursor:pointer; text-decoration:none;
  font-size:0; line-height:1;
  transition:transform .15s ease, filter .15s ease;
  -webkit-tap-highlight-color:transparent; touch-action:manipulation;
}
@media (hover:hover) and (pointer:fine) {
  .lush-header-btn:hover { transform:translateY(-1px); filter:brightness(1.06); }
}
.lush-header-btn:active { transform:translateY(0); filter:brightness(1.0); }
.lush-header-btn[aria-disabled] { opacity:0.5; cursor:default; transform:none !important; }
.lush-header-btn > span {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0 0 0 0); border:0;
}
/* Default icon color = the accent-aware contrast var. Social brand
   buttons override this to forced white further down so platform
   gradients stay legible regardless of the chosen accent. */
.lush-header-btn svg {
  color:var(--lush-on-pink) !important;
  stroke:var(--lush-on-pink);
  fill:var(--lush-on-pink);
}

/* Book + Call + Email + Message → flat accent solids (highlight color),
   replacing the FadeRoom multi-color gradients. */
.lush-header-btn-book,
.lush-header-btn-call,
.lush-header-btn-chat,
.lush-header-btn-message {
  background:var(--lush-pink) !important;
  color:var(--lush-on-pink) !important;
}

/* The remaining contact + social buttons keep their brand gradients
   so the platform colors are recognizable at a glance. */
.lush-header-btn-directions { background:linear-gradient(45deg,#34D399 0%,#60A5FA 100%); }
.lush-header-btn-tiktok     { background:linear-gradient(45deg,#EA5F96 36%,#2FC2BF 100%); }
.lush-header-btn-youtube    { background:linear-gradient(45deg,#FB3354 49%,#FE879C 100%); }
.lush-header-btn-instagram  { background:linear-gradient(45deg,#F9CE34 0%,#EE2A7B 50%,#6228D7 100%); }
.lush-header-btn-facebook   { background:linear-gradient(45deg,#1877F2 0%,#5DA8FF 100%); }
.lush-header-btn-pinterest  { background:linear-gradient(45deg,#E60023 0%,#FF6E80 100%); }
.lush-header-btn-whatsapp   { background:linear-gradient(45deg,#25D366 0%,#A4F4C5 100%); }

/* Social-brand icons are always WHITE — the platform gradients are
   saturated enough that white is the only reliably-legible icon
   color across every accent choice. */
.lush-header-btn-directions svg,
.lush-header-btn-tiktok svg,
.lush-header-btn-youtube svg,
.lush-header-btn-instagram svg,
.lush-header-btn-facebook svg,
.lush-header-btn-pinterest svg,
.lush-header-btn-whatsapp svg {
  color:#FFFFFF !important;
  stroke:#FFFFFF !important;
  fill:#FFFFFF !important;
}

.lush-header-btn-mobile-only { display:inline-flex !important; }

/* ── Tabs ── */
.lush-tabbed-section { width:100%; background:var(--lush-bg); overflow:hidden; }
.lush-tab-rail {
  width:100%; background:var(--lush-bg); position:sticky; top:0; z-index:20;
  border-top:1px solid var(--lush-dark-border);
  border-bottom:1px solid var(--lush-dark-border);
  -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
          mask-image:linear-gradient(90deg,transparent 0,#000 28px,#000 calc(100% - 28px),transparent 100%);
}
.lush-tab-slider {
  width:100%; display:flex; align-items:stretch; gap:4px; padding:6px 22px;
  overflow-x:auto; scrollbar-width:none; -webkit-overflow-scrolling:touch;
  scroll-snap-type:x mandatory;
}
.lush-tab-slider::-webkit-scrollbar { display:none; }
.lush-tab-pill {
  position:relative; flex:0 0 auto;
  display:inline-flex; align-items:center; justify-content:center;
  padding:16px 14px; background:transparent; border:0;
  color:var(--lush-muted);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.16em; text-transform:uppercase; line-height:1;
  cursor:pointer; white-space:nowrap; scroll-snap-align:center;
  transition:color .22s ease;
}
.lush-tab-pill::after {
  content:""; position:absolute; left:14px; right:14px; bottom:0;
  height:2px; background:var(--lush-pink); border-radius:2px;
  transform:scaleX(0); transform-origin:center;
  transition:transform .28s cubic-bezier(.4,0,.2,1);
}
.lush-tab-pill:hover { color:var(--lush-text); }
.lush-tab-pill.is-active { color:var(--lush-text); }
.lush-tab-pill.is-active::after { transform:scaleX(1); }
.lush-tab-panel { display:none; }
.lush-tab-panel.is-active { display:block; }

/* ── Booking ── */
.lush-booking-section { padding:36px 22px 64px; max-width:860px; margin:0 auto; color:var(--lush-text); }
.lush-booking-head { text-align:center; margin-bottom:28px; }
.lush-booking-eyebrow {
  display:inline-block; font-family:var(--lush-ui); font-size:11px;
  font-weight:600; letter-spacing:0.22em; text-transform:uppercase;
  color:var(--lush-pink); margin-bottom:8px;
}
.lush-booking-head h2 {
  font-family:var(--lush-script); font-size:clamp(48px,9vw,64px);
  font-weight:400; line-height:1; letter-spacing:0; margin:0 0 22px;
  color:var(--lush-text);
}
/* Compact dot-timeline: small numbered circles connected by thin lines
   with a single caption underneath ("Step 3 of 5 · Date & Time"). */
.lush-booking-progress {
  display:flex; flex-direction:column; align-items:center;
  gap:12px; margin-bottom:6px;
}
.lush-booking-progress-track {
  display:flex; align-items:center; justify-content:center;
  gap:0; width:min(100%,360px);
}
.lush-booking-step {
  background:transparent; border:0; padding:0;
  display:inline-flex; align-items:center; justify-content:center;
  flex:0 0 auto;
  cursor:pointer; transition:transform .2s ease;
}
.lush-booking-step-num {
  width:28px; height:28px;
  display:inline-flex; align-items:center; justify-content:center;
  font-size:11px; font-weight:600; letter-spacing:0.02em;
  border:1px solid var(--lush-dark-border); border-radius:999px;
  color:var(--lush-muted); background:transparent;
  transition:all .25s ease;
}
.lush-booking-step + .lush-booking-step::before {
  content:""; flex:1 1 auto; height:1px; min-width:14px;
  background:var(--lush-dark-border); margin:0 4px;
  transition:background .25s ease;
}
.lush-booking-step.is-done + .lush-booking-step::before {
  background:var(--lush-pink);
}
.lush-booking-step.is-active { transform:scale(1.05); }
.lush-booking-step.is-active .lush-booking-step-num {
  background:var(--lush-pink); border-color:var(--lush-pink);
  color:var(--lush-on-pink);
}
.lush-booking-step.is-done .lush-booking-step-num {
  border-color:var(--lush-pink);
  color:var(--lush-pink);
  background:transparent;
}
.lush-booking-step:hover:not(.is-active) .lush-booking-step-num {
  border-color:var(--lush-pink);
}
.lush-booking-step-label {
  position:absolute; width:1px; height:1px; padding:0; margin:-1px;
  overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0;
}
.lush-booking-progress-caption {
  margin:0; font-family:var(--lush-ui);
  font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted); font-weight:600;
}
.lush-booking-progress-caption strong {
  color:var(--lush-pink); font-weight:600;
  margin-left:4px;
}
/* Add-on cards: hidden native checkbox + visible card with flat sage
   active state. No glow — flat soft-spa direction. */
.lush-addon-card {
  display:flex; align-items:flex-start; gap:12px;
  padding:14px 16px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  cursor:pointer;
  transition:border-color .2s ease, background .2s ease;
}
.lush-addon-card:hover:not(.is-locked) {
  border-color:var(--lush-pink);
}
.lush-addon-card.is-checked {
  border-color:var(--lush-pink);
  background:rgba(var(--lush-pink-rgb),0.06);
}
.lush-addon-card.is-locked { cursor:not-allowed; }
.lush-addon-input { position:absolute; opacity:0; pointer-events:none; }
.lush-addon-indicator {
  flex-shrink:0; width:22px; height:22px;
  display:inline-flex; align-items:center; justify-content:center;
  border:1.5px solid var(--lush-dark-border);
  background:transparent;
  color:var(--lush-on-pink);
  margin-top:1px;
  transition:all .2s ease;
}
.lush-addon-card.is-checked .lush-addon-indicator {
  border-color:var(--lush-pink);
  background:var(--lush-pink);
}
.lush-addon-body { flex:1; min-width:0; }
.lush-addon-head {
  display:flex; align-items:center; gap:8px; flex-wrap:wrap;
  margin-bottom:2px;
}
.lush-addon-name {
  font-family:var(--lush-ui); font-size:13px; font-weight:600;
  color:var(--lush-text); letter-spacing:0.01em;
}
.lush-addon-required {
  font-size:9px; font-weight:700; letter-spacing:0.12em;
  text-transform:uppercase;
  padding:2px 8px;
  color:var(--lush-pink);
  border:1px solid var(--lush-pink);
  background:rgba(var(--lush-pink-rgb),0.08);
}
.lush-addon-desc {
  font-size:11px; line-height:1.45;
  color:var(--lush-muted);
  margin:2px 0 6px;
}
.lush-addon-meta {
  display:inline-flex; gap:8px; align-items:center;
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.06em;
  color:var(--lush-pink);
}
.lush-addon-meta-dot { opacity:0.45; }

.lush-booking-slides { display:block; }
.lush-booking-slide { display:none; animation:lushBookingFade .35s ease both; }
.lush-booking-slide.is-active { display:block; }
@keyframes lushBookingFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* Services in booking */
.lush-booking-services { display:grid; gap:12px; }
.lush-booking-service-card {
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-left:2px solid var(--lush-pink);
  border-radius:6px; padding:18px 18px 16px;
  display:flex; flex-direction:column; gap:8px;
  transition:border-color .2s ease;
}
.lush-booking-service-card:hover { border-color:var(--lush-pink); }
.lush-booking-service-card.is-selected {
  border-color:var(--lush-pink);
  background:rgba(var(--lush-pink-rgb),0.06);
}
.lush-booking-service-top { display:flex; justify-content:space-between; align-items:baseline; gap:12px; }
.lush-booking-service-card h3 { margin:0; font-family:var(--lush-ui); font-size:16px; font-weight:600; letter-spacing:0.02em; color:var(--lush-text); }
.lush-booking-price { font-family:var(--lush-ui); font-size:15px; font-weight:600; color:var(--lush-pink); white-space:nowrap; }
.lush-booking-desc { margin:0; font-size:13px; color:var(--lush-muted); line-height:1.5; }
.lush-booking-meta { margin:0; font-size:12px; color:var(--lush-muted); display:inline-flex; gap:6px; align-items:center; }
.lush-booking-pick {
  align-self:flex-start; margin-top:4px; background:transparent;
  border:1px solid var(--lush-pink); color:var(--lush-text);
  border-radius:999px; padding:8px 14px;
  font-size:11px; letter-spacing:0.16em; text-transform:uppercase; font-weight:600;
  cursor:pointer; display:inline-flex; gap:8px; align-items:center;
  transition:background .2s ease;
}
.lush-booking-pick:hover { background:rgba(var(--lush-pink-rgb),0.10); }

/* Date & time */
.lush-booking-datetime { display:flex; flex-direction:column; gap:22px; }
.lush-booking-block { }
.lush-booking-block-label {
  display:block; font-size:11px; letter-spacing:0.18em;
  text-transform:uppercase; color:var(--lush-muted); margin-bottom:12px; font-weight:600;
}
.lush-booking-days { display:flex; flex-wrap:wrap; gap:8px; }
.lush-booking-day {
  flex:1 1 72px; min-width:68px; max-width:100px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-radius:8px; padding:12px 8px;
  display:flex; flex-direction:column; align-items:center; gap:3px;
  color:var(--lush-text); cursor:pointer; transition:all .2s ease;
}
.lush-booking-day span { font-size:10px; letter-spacing:0.14em; text-transform:uppercase; color:var(--lush-muted); }
.lush-booking-day strong { font-family:var(--lush-ui); font-size:18px; font-weight:600; }
.lush-booking-day:hover { border-color:var(--lush-pink); }
.lush-booking-day.is-selected {
  border-color:var(--lush-pink);
  background:var(--lush-pink);
  color:var(--lush-on-pink);
}
.lush-booking-day.is-selected span,
.lush-booking-day.is-selected strong { color:var(--lush-on-pink); }

/* ── Calendar ── */
.lush-booking-calendar {
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border); border-radius:10px;
  padding:14px; display:flex; flex-direction:column; gap:10px;
}
.lush-calendar-head {
  display:flex; align-items:center; justify-content:space-between; gap:8px;
}
.lush-calendar-title {
  font-family:var(--lush-ui); font-size:14px; font-weight:600;
  letter-spacing:0.08em; color:var(--lush-text); text-transform:uppercase;
}
.lush-calendar-nav {
  background:transparent; border:1px solid var(--lush-dark-border);
  color:var(--lush-text); width:34px; height:34px; border-radius:999px;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s ease;
}
.lush-calendar-nav:hover { border-color:var(--lush-pink); color:var(--lush-pink); }
.lush-calendar-nav:disabled { opacity:0.3; cursor:not-allowed; }
.lush-calendar-nav:disabled:hover { border-color:var(--lush-dark-border); color:var(--lush-text); }
.lush-calendar-dow {
  display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
  font-family:var(--lush-ui); font-size:10px; font-weight:600;
  letter-spacing:0.1em; text-transform:uppercase; color:var(--lush-muted);
  text-align:center; padding:0 2px;
}
.lush-calendar-dow span { padding:4px 0; }
.lush-calendar-grid {
  display:grid; grid-template-columns:repeat(7,1fr); gap:4px;
}
.lush-calendar-day {
  aspect-ratio:1/1; min-height:36px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-radius:6px; color:var(--lush-text);
  font-family:var(--lush-ui); font-size:13px; font-weight:500;
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .15s ease; padding:0;
}
.lush-calendar-day:hover:not(:disabled) { border-color:var(--lush-pink); transform:translateY(-1px); }
.lush-calendar-day--today {
  border-color:var(--lush-pink); color:var(--lush-text);
}
.lush-calendar-day--blocked {
  background:transparent; border-color:rgba(14,17,17,0.04);
  color:rgba(14,17,17,0.25); cursor:not-allowed;
}
.lush-calendar-day--blocked:hover { transform:none; }
.lush-calendar-day--selected {
  background:var(--lush-pink); border-color:var(--lush-pink); color:var(--lush-on-pink);
}
.lush-calendar-day--selected.lush-calendar-day--today { color:var(--lush-on-pink); }
.lush-calendar-day--empty {
  background:transparent; border:0; cursor:default; visibility:hidden;
}
.lush-booking-times { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:8px; }
.lush-booking-time {
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  border-radius:999px; padding:12px 10px; color:var(--lush-text);
  font-family:var(--lush-ui); font-size:13px; cursor:pointer; transition:all .2s ease; text-align:center;
}
.lush-booking-time:hover { border-color:var(--lush-pink); }
.lush-booking-time.is-selected {
  border-color:var(--lush-pink);
  background:var(--lush-pink);
  color:var(--lush-on-pink);
}
.lush-slot-msg { font-size:13px; color:var(--lush-muted); padding:16px 0; }
.lush-slot-error { color:#B91C1C; }

/* Details step */
/* Customer-account banner above the Details step inputs (BookReady
   house style). Sharp white card with a hairline border that
   deliberately reads as a BookReady inset, not a template element.
   Same class handles --authed (cream tint) and the default (white).
   Sign-in button opens the LushAuthModal in-page; the link variant
   navigates to /account in a new tab. */
.lush-booking-auth {
  display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:11px 14px; margin-bottom:14px;
  background:#FFFFFF;
  border:1px solid rgba(18,18,18,0.10);
  border-radius:0;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:12px; line-height:1.3;
  color:#121212;
}
.lush-booking-auth--authed { background:#F8F6F2; }
.lush-booking-auth strong { font-weight:700; }
.lush-booking-auth-link {
  margin-left:auto; color:#121212;
  text-decoration:underline; text-underline-offset:2px;
  font-weight:700; font-size:10px;
  letter-spacing:0.14em; text-transform:uppercase;
  white-space:nowrap;
  /* Button reset so the same class works on <a> and <button>. */
  background:transparent; border:none; padding:0;
  font-family:inherit; cursor:pointer;
}
@media (hover:hover) and (pointer:fine) {
  .lush-booking-auth-link:hover { color:#6B7280; }
}

/* Persistent thin sign-in row below the booking title. Centered,
   muted, single line — visible on every step without competing for
   attention. Bottom margin keeps it off the progress dots beneath. */
.lush-booking-auth-thin {
  margin:6px 0 20px;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:12px; line-height:1.4;
  color:var(--lush-muted);
  text-align:center;
}
.lush-booking-auth-thin strong { font-weight:600; color:var(--lush-text); }
.lush-booking-auth-thin button {
  background:transparent; border:none; padding:0;
  font:inherit; color:var(--lush-text);
  text-decoration:underline; text-underline-offset:2px;
  cursor:pointer;
}
@media (hover:hover) and (pointer:fine) {
  .lush-booking-auth-thin button:hover { opacity:0.7; }
}

/* Prominent "View your bookings" CTA for already-authed visitors at
   Step 4. Sharp BookReady house style — full-width card that reads
   as a button. Replaces the previous subtle inline "Manage bookings"
   link. */
.lush-booking-account-cta {
  display:flex; align-items:center; gap:14px;
  padding:14px 16px; margin-bottom:18px;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.12);
  border-radius:0;
  text-decoration:none;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  transition:background .15s ease, color .15s ease, border-color .15s ease;
}
@media (hover:hover) and (pointer:fine) {
  .lush-booking-account-cta:hover {
    background:#121212; color:#FFFFFF; border-color:#121212;
  }
}
.lush-booking-account-cta-icon {
  width:36px; height:36px;
  display:inline-flex; align-items:center; justify-content:center;
  background:rgba(18,18,18,0.06); flex-shrink:0;
  transition:background .15s ease;
}
.lush-booking-account-cta:hover .lush-booking-account-cta-icon {
  background:rgba(255,255,255,0.12);
}
.lush-booking-account-cta-body { display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; }
.lush-booking-account-cta-eyebrow {
  font-size:9px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  opacity:0.6;
}
.lush-booking-account-cta-title {
  font-size:15px; font-weight:700;
  letter-spacing:-0.005em;
}
.lush-booking-account-cta-sub {
  font-size:12px; opacity:0.7; line-height:1.3;
}
.lush-booking-account-cta-arrow {
  width:32px; height:32px;
  display:inline-flex; align-items:center; justify-content:center;
  flex-shrink:0;
}

/* Opt-in "Create a BookReady account" block in Step 4 (unauthed).
   Sits inside the form flow, bordered to read as a related-but-
   optional choice. Password field reveals when checkbox is checked. */
.lush-booking-create-account {
  margin-top:6px;
  padding:14px 16px;
  background:#FFFFFF;
  border:1px solid rgba(18,18,18,0.12);
  border-radius:0;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  color:#121212;
}
.lush-booking-create-account-row {
  display:flex; align-items:center; gap:10px;
  cursor:pointer; user-select:none;
}
.lush-booking-create-account-row > input[type="checkbox"] {
  width:16px; height:16px; flex-shrink:0;
  accent-color:#121212; cursor:pointer;
}
.lush-booking-create-account-row > strong {
  font-size:14px; font-weight:700; letter-spacing:-0.005em;
}
/* Benefits paragraph sits below the row at full width — no leading
   indent that would compete with the checkbox alignment above. */
.lush-booking-create-account-blurb {
  margin:8px 0 0;
  font-size:12px; line-height:1.45; color:#6B7280;
}
.lush-booking-create-account-pw {
  display:flex; flex-direction:column; gap:6px;
  margin-top:12px; padding-top:12px;
  border-top:1px solid rgba(18,18,18,0.10);
}
.lush-booking-create-account-pw > span:first-child {
  font-size:10px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
}
/* Password input — the higher-specificity selector (with [type] and
   the create-account scope) wins over .lush-booking-fields input which
   would otherwise paint white text on a near-transparent background.
   Also using stronger border + a visible placeholder color. */
.lush-booking-create-account .lush-booking-create-account-pw input[type="password"] {
  width:100%; padding:11px 13px;
  background:#FFFFFF; color:#121212;
  border:1px solid rgba(18,18,18,0.25); border-radius:0;
  font:inherit; font-size:14px; line-height:1.2;
  -webkit-appearance:none; appearance:none;
  box-shadow:none;
}
.lush-booking-create-account .lush-booking-create-account-pw input[type="password"]:focus {
  outline:none; border-color:#121212;
}
.lush-booking-create-account .lush-booking-create-account-pw input[type="password"]::placeholder {
  color:#c4bcb6;
}
.lush-booking-create-account-fineprint {
  font-size:11px; line-height:1.45; color:#6B7280;
}

/* Account-follow-up card. Used twice: at the top of the booking form
   when returning from Stripe with &account=new, and inside the
   success state when a non-payment booking just minted an account.
   Cream tint + Mail icon makes it visually distinct from the form. */
.lush-booking-account-followup {
  display:flex; gap:14px;
  padding:16px;
  margin:12px 0 0;
  background:#F8F6F2; color:#121212;
  border:1px solid rgba(18,18,18,0.10);
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  text-align:left;
}
.lush-booking-account-followup--success {
  margin:20px auto 0; max-width:520px;
}
.lush-booking-account-followup-icon {
  width:36px; height:36px; flex-shrink:0;
  display:inline-flex; align-items:center; justify-content:center;
  background:#FFFFFF; border:1px solid rgba(18,18,18,0.12);
}
.lush-booking-account-followup-body { display:flex; flex-direction:column; gap:4px; flex:1; min-width:0; }
.lush-booking-account-followup-eyebrow {
  margin:0;
  font-size:9px; font-weight:700;
  letter-spacing:0.18em; text-transform:uppercase;
  color:#6B7280;
}
.lush-booking-account-followup-title {
  margin:0;
  font-size:14px; font-weight:700; line-height:1.25;
}
.lush-booking-account-followup-sub {
  margin:0;
  font-size:12px; line-height:1.45; color:#6B7280;
}
.lush-booking-account-followup-cta {
  display:inline-flex; align-items:center; gap:6px;
  margin-top:6px; align-self:flex-start;
  padding:7px 11px;
  background:#121212; color:#FFFFFF;
  border:1px solid #121212;
  font-size:10px; font-weight:700;
  letter-spacing:0.14em; text-transform:uppercase;
  text-decoration:none;
  transition:background .15s ease,color .15s ease;
}
@media (hover:hover) and (pointer:fine) {
  .lush-booking-account-followup-cta:hover { background:#2a2a2a; }
}
@media (hover:hover) and (pointer:fine) {
  .lush-booking-auth-link:hover { opacity:0.75; }
}

.lush-booking-fields { display:grid; gap:14px; }

/* SMS consent row — small inline checkbox that sits below the Phone
   field when populated. Smaller and less prominent than the account-
   creation block above; this is regulatory plumbing, not a feature
   nudge. Same .lush-booking-field-defying scoping (no .lush-booking-
   field class) so the wrapper's column rule doesn't grab it. */
.lush-booking-sms-consent {
  display:flex; align-items:flex-start; gap:9px;
  margin-top:-4px; padding:8px 0;
  cursor:pointer; user-select:none;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
  font-size:11px; line-height:1.45; color:#6B7280;
}
.lush-booking-sms-consent > input[type="checkbox"] {
  width:14px; height:14px; margin-top:2px; flex-shrink:0;
  accent-color:#121212; cursor:pointer;
}

/* One standard identity field row (Name / Email / Phone / Notes).
   Scoped class instead of .lush-booking-fields label so nested labels
   inside the create-account block (the checkbox row, the password
   input, the fineprint) don't inherit this layout — and so the four
   standard fields can be styled independently (e.g. flex-direction:
   row) without disturbing the create-account UI. */
.lush-booking-field { display:flex; flex-direction:column; gap:6px; }
.lush-booking-field > span {
  font-size:10px; letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted); font-weight:600;
}
.lush-booking-fields input,
.lush-booking-textarea {
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  border-radius:6px; padding:12px 14px; color:var(--lush-text);
  font-family:var(--lush-ui); font-size:14px; width:100%;
  transition:border-color .2s ease;
}
.lush-booking-fields input::placeholder,
.lush-booking-textarea::placeholder { color:var(--lush-muted); }
.lush-booking-fields input:focus,
.lush-booking-textarea:focus { outline:0; border-color:var(--lush-pink); }
.lush-booking-textarea { resize:vertical; }

/* Phase 16 — custom questions on the Details step */
.lush-booking-questions {
  display:grid; gap:14px;
  padding-top:14px; margin-top:6px;
  border-top:1px solid var(--lush-dark-border);
}
.lush-booking-question { display:flex; flex-direction:column; gap:4px; }
.lush-booking-question > label { display:flex; flex-direction:column; gap:6px; }
.lush-booking-question select {
  width:100%; padding:12px 14px;
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  color:var(--lush-text); font-family:var(--lush-ui); font-size:14px;
  border-radius:6px;
}
.lush-booking-question select:focus { outline:0; border-color:var(--lush-pink); }
.lush-booking-question-hint { font-size:11px; color:var(--lush-muted); margin:0; }
.lush-booking-checkbox-row {
  display:flex; align-items:center; gap:10px;
  font-size:13px !important; color:var(--lush-text) !important;
  letter-spacing:normal !important; text-transform:none !important; font-weight:400 !important;
}
.lush-booking-checkbox-row input[type="checkbox"] { width:18px; height:18px; accent-color:var(--lush-pink); }

.lush-booking-image-upload { display:flex; flex-direction:column; gap:8px; }
.lush-booking-image-pick {
  display:inline-flex; align-items:center; gap:8px;
  align-self:flex-start; padding:10px 16px; border-radius:6px;
  background:var(--lush-card); border:1px dashed var(--lush-dark-border);
  color:var(--lush-text); font-size:12px; cursor:pointer;
  transition:border-color .2s ease;
  letter-spacing:normal !important; text-transform:none !important; font-weight:500 !important;
}
.lush-booking-image-pick:hover { border-color:var(--lush-pink); }
.lush-booking-image-preview {
  position:relative; display:inline-block; max-width:220px;
}
.lush-booking-image-preview img {
  width:100%; height:auto; max-height:180px; object-fit:cover;
  border-radius:6px; border:1px solid var(--lush-dark-border);
}
.lush-booking-image-remove {
  position:absolute; top:6px; right:6px;
  width:24px; height:24px; border-radius:50%;
  background:rgba(14,17,17,0.85); border:1px solid var(--lush-dark-border);
  color:#fff; display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer;
}
.lush-booking-image-err { font-size:11px; color:#B91C1C; }
.lush-spin { animation: lush-spin 1s linear infinite; }
@keyframes lush-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* Nav buttons */
.lush-booking-nav { display:flex; justify-content:space-between; gap:10px; padding-top:4px; flex-wrap:wrap; }
.lush-booking-back,
.lush-booking-next,
.lush-booking-confirm-btn {
  background:transparent; border:1px solid var(--lush-dark-border);
  color:var(--lush-text); padding:13px 20px; border-radius:999px;
  font-size:11px; letter-spacing:0.16em; text-transform:uppercase;
  font-weight:600; cursor:pointer;
  display:inline-flex; gap:8px; align-items:center;
  transition:all .25s ease; font-family:var(--lush-ui);
}
.lush-booking-back:hover { border-color:var(--lush-text); }
.lush-booking-next,
.lush-booking-confirm-btn {
  background:var(--lush-pink); border-color:var(--lush-pink);
  color:var(--lush-on-pink);
}
.lush-booking-next:hover,
.lush-booking-confirm-btn:hover { filter:brightness(1.06); transform:translateY(-1px); }
.lush-booking-next:disabled,
.lush-booking-confirm-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

/* Confirm step */
.lush-booking-confirm { display:flex; flex-direction:column; gap:18px; }
.lush-booking-summary {
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border); border-radius:8px; padding:18px;
}
.lush-booking-summary dl { margin:0; display:flex; flex-direction:column; gap:8px; margin-top:12px; }
.lush-booking-summary div {
  display:flex; justify-content:space-between; align-items:baseline; gap:12px;
  padding-bottom:8px; border-bottom:1px dashed var(--lush-dark-border);
}
.lush-booking-summary div:last-child { border-bottom:0; padding-bottom:0; }
.lush-booking-summary dt { font-size:10px; letter-spacing:0.16em; text-transform:uppercase; color:var(--lush-muted); margin:0; font-weight:600; }
.lush-booking-summary dd { margin:0; font-family:var(--lush-ui); font-size:14px; color:var(--lush-text); text-align:right; }
.lush-booking-total dt, .lush-booking-total dd { color:var(--lush-pink) !important; font-size:16px !important; }
.lush-booking-error { background:#FEF2F2; border:1px solid #FECACA; border-radius:6px; padding:12px 16px; font-size:13px; color:#B91C1C; }
.lush-booking-disclaimer { text-align:center; font-size:11px; color:var(--lush-muted); margin-top:4px; }

/* Success */
.lush-booking-success {
  text-align:center; padding:48px 24px; display:flex; flex-direction:column;
  align-items:center; gap:12px; max-width:500px; margin:0 auto;
}
.lush-booking-success-icon { font-size:48px; color:var(--lush-pink); }
.lush-booking-success h3 { font-family:var(--lush-serif); font-size:clamp(28px,5vw,40px); font-weight:400; letter-spacing:-0.02em; margin:0; }
.lush-booking-success-copy { font-size:15px; color:var(--lush-muted); line-height:1.55; margin:0; }
.lush-booking-success-summary {
  display:flex; flex-wrap:wrap; justify-content:center; gap:8px;
  background:rgba(var(--lush-pink-rgb),0.07); border:1px solid var(--lush-dark-border);
  border-radius:8px; padding:12px 18px; font-size:14px; color:var(--lush-text);
}
.lush-booking-success-dot { color:var(--lush-pink); }
.lush-booking-success-note { font-size:12px; color:var(--lush-muted); margin:0; }

/* ── Gallery ── */
.lush-gallery-section { width:100%; padding:0 0 clamp(64px,8vw,110px); background:var(--lush-bg); overflow:hidden; }
.lush-gallery-group { width:min(100%,396px); margin:0 auto; padding:36px 30px 0; }
.lush-gallery-group+.lush-gallery-group { padding-top:30px; }
.lush-gallery-group h2 {
  margin:0 0 22px; color:var(--lush-text); text-align:center;
  font-family:var(--lush-script); font-size:42px; line-height:1;
  font-weight:400; letter-spacing:0;
  display:inline-flex; align-items:center; gap:12px; width:100%; justify-content:center;
}
.lush-gallery-group h2::before,.lush-gallery-group h2::after {
  content:""; flex:1; height:1px; max-width:60px;
  background:var(--lush-dark-border);
}
.lush-gallery-grid {
  display:grid; grid-template-columns:repeat(2,1fr); grid-auto-flow:dense;
  gap:28px 18px;
  padding:10px 4px;
}
/* ── Polaroid gallery item ──
   Each tile is a casually-placed polaroid: white border-frame, a
   thicker strip at the bottom (the caption area), a soft drop
   shadow, and a gentle rotation that alternates with nth-child so
   the wall of prints feels hand-arranged. Hover straightens the
   tile and lifts the shadow. Aspect-ratio lives on the inner img
   (not the wrapper) so the polaroid hugs the image cleanly. */
.lush-gallery-img {
  position:relative;
  background:#FFFFFF;
  padding:8px 8px 30px;
  border:none;
  border-radius:2px;
  box-shadow:0 6px 18px rgba(14,17,17,0.12);
  overflow:visible;
  transition:transform .35s ease, box-shadow .35s ease;
}
.lush-gallery-img:nth-child(odd)  { transform:rotate(-2.5deg); }
.lush-gallery-img:nth-child(even) { transform:rotate(2deg); }
.lush-gallery-img:nth-child(3n)   { transform:rotate(-1deg); }
.lush-gallery-img:nth-child(5n)   { transform:rotate(1.5deg); }
.lush-gallery-img:hover {
  transform:rotate(0);
  box-shadow:0 10px 24px rgba(14,17,17,0.18);
  z-index:2;
}
.lush-gallery-img > img {
  width:100%; display:block; object-fit:cover;
}
.lush-gallery-img--square > img { aspect-ratio:1/1; }
.lush-gallery-img--tall   > img { aspect-ratio:160/200; }
.lush-gallery-img--wide   { grid-column:1/-1; }
.lush-gallery-img--wide   > img { aspect-ratio:331/160; }
.lush-gallery-placeholder {
  width:100%;
  background:#ECE7DD;
  display:flex; align-items:center; justify-content:center;
  min-height:auto;
}
.lush-gallery-img--square .lush-gallery-placeholder { aspect-ratio:1/1; }
.lush-gallery-img--tall   .lush-gallery-placeholder { aspect-ratio:160/200; }
.lush-gallery-img--wide   .lush-gallery-placeholder { aspect-ratio:331/160; }
.lush-gallery-placeholder span {
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-muted);
}

/* ── Before & After ── */
.lush-before-after-section { width:min(100%,396px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 0 70px; }
/* "Amazing" + "results" are both Molle italic in highlight-color sage
   with a hard sharp shadow (no blur). Big word on TOP (h2 = "Amazing"),
   small word BELOW (backdrop = "results") translated up so they sit
   close. About + Policy share the same pattern with their own
   ordering. */
.lush-results-heading {
  position:relative; text-align:center;
  display:flex; flex-direction:column; align-items:center;
  padding:0 16px 12px;
}
.lush-results-heading h2 {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(60px,15vw,80px); line-height:1; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:5px 5px 0 rgba(14,17,17,0.18);
}
.lush-results-backdrop {
  margin:-14px 0 0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(28px,7vw,40px); line-height:1;
  color:var(--lush-pink);
  text-shadow:3px 3px 0 rgba(14,17,17,0.18);
}
.lush-ba-stack { display:grid; gap:24px; padding:8px 0 0; }
.lush-ba-bucket+.lush-ba-bucket { margin-top:36px; }
.lush-ba-bucket-heading {
  margin:18px 0 4px; font-family:var(--lush-script); font-size:42px; font-weight:400;
  letter-spacing:0; color:var(--lush-text); text-align:center; line-height:1;
}
.lush-ba-pair { width:min(100%,350px); height:230px; margin:0 auto; position:relative; }
.lush-ba-label { position:absolute; z-index:5; color:var(--lush-text); font-size:22px; font-family:var(--lush-serif); font-weight:400; line-height:1.05; letter-spacing:-0.02em; pointer-events:none; }
.lush-ba-label--before { left:58px; top:0; }
.lush-ba-label--after  { right:50px; top:70px; }
.lush-ba-card {
  width:162px; height:162px; position:absolute;
  background:#ECE7DD; border:1px solid var(--lush-dark-border);
  overflow:hidden; border-radius:8px;
  transition:border-color .25s ease,transform .35s ease;
}
.lush-ba-card--before { left:22px; top:48px; transform:rotate(-6deg); z-index:1; border-color:var(--lush-dark-border); }
.lush-ba-card--after {
  right:22px; top:92px; transform:rotate(9deg); z-index:2;
  border-color:var(--lush-pink);
  appearance:none;
}
.lush-ba-card--after:hover { border-color:var(--lush-pink); }
.lush-ba-placeholder { width:100%; height:100%; background:#ECE7DD; }
.lush-ba-card > img { width:100%; height:100%; object-fit:cover; display:block; }
img.lush-ba-after-img { filter:blur(6px); transform:scale(1.06); transition:filter .35s ease,transform .35s ease; }
.lush-ba-after-img { filter:blur(6px); transform:scale(1.06); transition:filter .35s ease,transform .35s ease; }
.lush-ba-card--after span {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:11px; font-family:var(--lush-ui); font-weight:600;
  letter-spacing:0.16em; text-transform:uppercase; text-align:center;
  background:rgba(14,17,17,0.35); z-index:3; pointer-events:none;
}
.lush-ba-card--after.is-revealed .lush-ba-after-img { filter:blur(0); transform:scale(1); }
.lush-ba-card--after.is-revealed span { display:none; }

/* ── About ── */
.lush-about-section { width:min(100%,395px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:12px 20px 58px; }

/* About hero: a rounded 4-point star window that masks the about
   image into the spark shape, with the heading wrap stacked BELOW
   the star (heading-wrap pulled up slightly so it gently overlaps
   the star's bottom edge). When no about image is set, the star
   falls back to a solid sage fill (rendered server-side). */
.lush-about-hero {
  display:flex; flex-direction:column; align-items:center;
  padding:0 16px 24px;
  margin-bottom:24px;
}
.lush-about-star {
  width:min(94vw, 340px);
  aspect-ratio:1;
  color:var(--lush-pink);
  filter:drop-shadow(0 10px 22px rgba(14,17,17,0.14));
  flex-shrink:0;
}
.lush-about-star svg { width:100%; height:100%; display:block; }
.lush-about-heading-wrap {
  position:relative; z-index:2;
  text-align:center;
  display:flex; flex-direction:column; align-items:center;
  /* Slight negative margin so the headline overlaps the bottom of
     the star — gives the "heading sits on top of it" depth the
     design called for, even though the heading itself is below. */
  margin-top:-22px;
  max-width:min(86vw, 320px);
}
/* Small eyebrow kicker on top, big heading underneath. */
.lush-about-backdrop {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(24px,6vw,36px); line-height:1.05;
  color:var(--lush-pink);
  text-shadow:2px 2px 0 rgba(14,17,17,0.18);
}
.lush-about-heading-wrap h2 {
  margin:-12px 0 0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(44px,12vw,64px); line-height:1; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:3px 3px 0 rgba(14,17,17,0.18);
}
/* Tagline in DM Mono all caps — small typographic accent below the
   heading. Sits at full opacity sage so it reads as a tight
   secondary line, not a body-text muted afterthought. */
.lush-about-tagline {
  margin:14px 0 0;
  font-family:var(--lush-mono);
  font-size:11px; font-weight:500;
  letter-spacing:0.18em; text-transform:uppercase;
  color:var(--lush-pink);
  line-height:1.4;
  max-width:280px;
}
.lush-about-copy { width:min(100%,344px); margin:0 auto; color:var(--lush-text); font-family:var(--lush-ui); font-size:15px; line-height:1.55; }
.lush-about-copy p { margin:0 0 22px; padding:16px 0 0; border-top:1px solid var(--lush-dark-border); }
.lush-about-copy p:first-of-type { border-top:0; padding-top:0; }
.lush-about-copy span {
  display:inline-flex; align-items:center; gap:8px; color:var(--lush-pink);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.22em; text-transform:uppercase; margin-bottom:12px;
}
.lush-about-copy span::before { content:""; width:18px; height:1px; background:var(--lush-pink); display:inline-block; }
.lush-about-list { margin:0 0 22px; padding:16px 0 0; border-top:1px solid var(--lush-dark-border); }
.lush-about-list span {
  display:inline-flex; align-items:center; gap:8px; color:var(--lush-pink);
  font-family:var(--lush-ui); font-size:11px; font-weight:600;
  letter-spacing:0.22em; text-transform:uppercase; margin-bottom:12px;
}
.lush-about-list span::before { content:""; width:18px; height:1px; background:var(--lush-pink); display:inline-block; }
.lush-about-list ul { margin:0; padding-left:0; list-style:none; }
.lush-about-list li { position:relative; margin:0 0 12px; padding-left:22px; font-family:var(--lush-ui); font-size:14px; line-height:1.55; color:var(--lush-text); }
.lush-about-list li::before { content:""; position:absolute; left:0; top:10px; width:12px; height:1px; background:var(--lush-pink); }
.lush-about-list strong { display:block; color:var(--lush-text); font-weight:400; font-family:var(--lush-serif); font-size:18px; line-height:1.1; letter-spacing:-0.02em; margin-bottom:2px; }

/* ── Policy ── */
.lush-policy-section { width:min(100%,396px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 14px 64px; }
/* Policy heading is a Molle twin-line kicker pattern:
   small "Booking" kicker on top, big "Policies" heading underneath
   (translated up to close the gap). */
.lush-policy-heading {
  margin:0 0 24px;
  display:flex; flex-direction:column; align-items:center;
  text-align:center;
}
.lush-policy-heading span {
  margin:0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(28px,7vw,40px); line-height:1;
  color:var(--lush-pink);
  text-shadow:3px 3px 0 rgba(14,17,17,0.18);
}
.lush-policy-heading h2 {
  margin:-14px 0 0;
  font-family:var(--lush-molle); font-style:italic; font-weight:400;
  font-size:clamp(60px,15vw,80px); line-height:1; letter-spacing:-0.01em;
  color:var(--lush-pink);
  text-shadow:5px 5px 0 rgba(14,17,17,0.18);
}
.lush-policy-list { display:grid; gap:12px; }
.lush-policy-custom-group { margin-top:36px; }
.lush-policy-custom-heading {
  margin:0 0 16px; font-family:var(--lush-serif); font-weight:400;
  font-size:28px; letter-spacing:-0.02em; line-height:1.05;
  color:var(--lush-text); text-align:center;
}
.lush-policy-card {
  position:relative; width:100%; min-height:160px; padding:22px 22px;
  background:var(--lush-card);
  border:1px solid var(--lush-dark-border);
  border-radius:24px; overflow:hidden;
}
.lush-policy-card h3 { margin:0 0 14px; color:var(--lush-text); font-size:22px; font-family:var(--lush-serif); font-weight:400; line-height:1.05; letter-spacing:-0.02em; }
.lush-policy-copy { color:var(--lush-text); font-size:13px; font-family:var(--lush-ui); font-weight:400; line-height:1.55; }

/* ── Before appointment / Aftercare ── */
.lush-before-appointment-section { width:min(100%,395px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 16px 60px; }
.lush-before-appointment-section h2 { margin:0 0 38px; color:var(--lush-text); text-align:center; font-size:clamp(40px,9vw,52px); font-family:var(--lush-script); font-weight:400; line-height:1; letter-spacing:0; }
.lush-before-timeline { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:26px; position:relative; }
/* No connector line between steps — the alternating sage nodes carry
   the rhythm on their own. (Previous dashed line was removed per
   design feedback — felt too noisy on the cream bg.) */
.lush-before-step { display:grid; grid-template-columns:52px 1fr; gap:14px; align-items:flex-start; }
/* Alternating nodes echo the Steps section: odd = solid sage with
   white numeral; even = outlined sage with sage numeral. */
.lush-before-node {
  width:52px; height:52px;
  display:flex; align-items:center; justify-content:center;
  border-radius:999px;
  border:2px solid var(--lush-pink); background:var(--lush-bg);
  flex-shrink:0;
}
.lush-before-step:nth-child(odd) .lush-before-node {
  background:var(--lush-pink); border-color:var(--lush-pink);
}
.lush-before-node-num { font-family:var(--lush-ui); font-weight:700; font-size:16px; letter-spacing:0.04em; color:var(--lush-pink); }
.lush-before-step:nth-child(odd) .lush-before-node-num { color:#FFFFFF; }
.lush-before-step-body { padding:4px 4px 14px 6px; border-bottom:1px dashed var(--lush-dark-border); }
/* Spa-themed accent: a sage 4-point sparkle (Unicode ✦) before each
   title, scaled smaller than the title so it reads as decoration. */
.lush-before-step-body h3 { margin:0 0 8px; color:var(--lush-text); font-family:var(--lush-serif); font-weight:400; font-size:22px; line-height:1.1; letter-spacing:-0.02em; }
.lush-before-step-body h3::before {
  content:"\\2726";
  display:inline-block; margin-right:8px;
  color:var(--lush-pink); font-size:0.65em;
  vertical-align:0.1em;
}
.lush-before-step-body p { margin:0; color:var(--lush-muted); font-family:var(--lush-ui); font-size:13px; font-weight:400; line-height:1.55; }
.lush-before-step-kicker {
  display:block; margin-bottom:4px;
  color:var(--lush-pink); font-family:var(--lush-ui);
  font-size:10px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase;
}

.lush-aftercare-section { width:min(100%,396px); margin:0 auto; background:var(--lush-bg); overflow:hidden; padding:36px 14px 60px; }
.lush-aftercare-section h2 { margin:0 0 30px; color:var(--lush-text); text-align:center; font-size:clamp(42px,10vw,56px); font-family:var(--lush-script); font-weight:400; line-height:1; letter-spacing:0; }
.lush-aftercare-list { display:grid; gap:18px; }
/* Alternating cards: odd children are solid sage with white text;
   even children are transparent with a sage border + sage text.
   Both share the same big rounded shape so the alternation reads as
   a rhythm, not as different card types. */
.lush-aftercare-card {
  position:relative;
  padding:22px 22px 24px;
  overflow:hidden;
  border-radius:24px;
  border:2px solid var(--lush-pink);
  background:transparent;
}
.lush-aftercare-card:nth-child(odd) {
  background:var(--lush-pink);
  border-color:var(--lush-pink);
}
.lush-aftercare-head { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.lush-aftercare-dot { width:7px; height:7px; border-radius:999px; background:var(--lush-pink); display:inline-block; flex-shrink:0; }
.lush-aftercare-index { font-family:var(--lush-ui); font-size:11px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; }
.lush-aftercare-card h3 { margin:0 0 8px; font-family:var(--lush-serif); font-weight:400; font-size:22px; line-height:1.05; letter-spacing:-0.02em; }
.lush-aftercare-card p { margin:0; font-family:var(--lush-ui); font-size:13px; font-weight:400; line-height:1.55; }
/* Even cards: sage text + sage dot/index. */
.lush-aftercare-card:nth-child(even) h3,
.lush-aftercare-card:nth-child(even) p,
.lush-aftercare-card:nth-child(even) .lush-aftercare-index { color:var(--lush-pink); }
.lush-aftercare-card:nth-child(even) .lush-aftercare-dot { background:var(--lush-pink); }
/* Odd cards (sage fill): everything goes white so it sits cleanly on
   the highlight color. */
.lush-aftercare-card:nth-child(odd) h3,
.lush-aftercare-card:nth-child(odd) p,
.lush-aftercare-card:nth-child(odd) .lush-aftercare-index { color:#FFFFFF; }
.lush-aftercare-card:nth-child(odd) .lush-aftercare-dot { background:#FFFFFF; }

/* ── Contact cards ── */
.lush-contact-card {
  display:flex; align-items:center; gap:14px; padding:16px 18px;
  background:var(--lush-card); border:1px solid var(--lush-dark-border);
  border-left:2px solid var(--lush-pink); border-radius:4px;
  text-decoration:none; color:var(--lush-text); transition:border-color .2s ease;
}
.lush-contact-card:hover { border-color:var(--lush-pink); }
.lush-contact-icon { font-size:20px; flex-shrink:0; }
.lush-contact-card div { display:flex; flex-direction:column; gap:3px; }
.lush-contact-label { font-size:10px; letter-spacing:0.18em; text-transform:uppercase; color:var(--lush-pink); font-weight:600; }
.lush-contact-value { font-size:14px; color:var(--lush-text); }

/* ── FAQ — collapsible Q&A list ── */
.lush-faq-section { position:relative; width:100%; background:var(--lush-bg); padding:64px 22px 16px; }
.lush-faq-inner { max-width:720px; margin:0 auto; color:var(--lush-text); }
.lush-faq-heading { font-family:var(--lush-script); font-size:clamp(42px,8vw,56px); font-weight:400; line-height:1; letter-spacing:0; margin:0 0 24px; text-align:center; color:var(--lush-text); }
.lush-faq-list { display:flex; flex-direction:column; gap:10px; }
.lush-faq-item { background:var(--lush-card); border:1px solid var(--lush-dark-border); padding:14px 18px; border-radius:6px; }
.lush-faq-item > summary { cursor:pointer; font-family:var(--lush-ui); font-size:14px; font-weight:600; color:var(--lush-text); list-style:none; outline:none; }
.lush-faq-item > summary::-webkit-details-marker { display:none; }
.lush-faq-item > summary::after { content:'+'; float:right; font-size:18px; line-height:1; color:var(--lush-pink); transition:transform 0.15s; }
.lush-faq-item[open] > summary::after { content:'−'; }
.lush-faq-item > p { margin:10px 0 0; font-family:var(--lush-ui); font-size:13px; line-height:1.6; color:var(--lush-muted); }

/* Reviews — testimonial grid */
.lush-reviews-section { position:relative; width:100%; background:var(--lush-bg); padding:48px 22px 24px; }
.lush-reviews-inner { max-width:1080px; margin:0 auto; color:var(--lush-text); }
.lush-reviews-heading { font-family:var(--lush-script); font-size:clamp(42px,8vw,56px); font-weight:400; line-height:1; letter-spacing:0; margin:0 0 24px; text-align:center; color:var(--lush-text); }
.lush-reviews-grid { display:grid; grid-template-columns:1fr; gap:14px; }
@media (min-width:720px) { .lush-reviews-grid { grid-template-columns:repeat(2,1fr); } }
@media (min-width:1080px) { .lush-reviews-grid { grid-template-columns:repeat(3,1fr); } }
.lush-review-card { background:var(--lush-card); border:1px solid var(--lush-dark-border); padding:18px; border-radius:6px; display:flex; flex-direction:column; gap:10px; }
.lush-review-stars { color:var(--lush-pink); font-size:13px; letter-spacing:2px; }
.lush-review-body { margin:0; font-family:var(--lush-serif); font-size:15px; line-height:1.55; color:var(--lush-text); font-style:italic; }
.lush-review-author { margin:auto 0 0; font-family:var(--lush-ui); font-size:12px; font-weight:600; color:var(--lush-muted); }
.lush-review-loc { font-weight:400; color:var(--lush-muted); opacity:0.75; }

.lush-thanks-section { position:relative; width:100%; background:var(--lush-bg); padding:80px 22px 88px; border-top:1px solid var(--lush-dark-border); }
.lush-thanks-inner { max-width:720px; margin:0 auto; text-align:center; color:var(--lush-text); display:flex; flex-direction:column; align-items:center; gap:24px; }
.lush-thanks-eyebrow { display:inline-block; font-family:var(--lush-ui); font-size:11px; font-weight:600; letter-spacing:0.24em; text-transform:uppercase; color:var(--lush-pink); }
.lush-thanks-inner h2 { font-family:var(--lush-script); font-size:clamp(48px,10vw,72px); font-weight:400; line-height:1; letter-spacing:0; margin:0; color:var(--lush-text); }
.lush-thanks-inner em { font-family:var(--lush-script); font-style:normal; color:var(--lush-pink); font-size:1em; }
.lush-thanks-sig { display:inline-flex; align-items:center; gap:16px; font-family:var(--lush-script); font-size:28px; color:var(--lush-pink); }
.lush-thanks-sig em { font-style:italic; }
.lush-thanks-line { width:56px; height:1px; background:var(--lush-pink); opacity:0.5; }

/* ── Footer ── */
/* Footer: flat cream to match the page; hairline dark border for
   division. All text is the standard near-black so it reads cleanly
   on the cream bg (the FadeRoom #fff/#whites are invisible here). */
.lush-footer { position:relative; width:100%; background:var(--lush-bg); color:var(--lush-text); overflow:hidden; border-top:1px solid var(--lush-dark-border); }
.lush-footer-glow { display:none; }
.lush-footer-inner { position:relative; width:100%; max-width:1180px; margin:0 auto; padding:56px 24px 32px; display:grid; grid-template-columns:1fr; gap:36px; }
.lush-footer-brand { display:flex; flex-direction:column; gap:10px; }
.lush-footer-mark { font-family:var(--lush-serif); font-size:36px; line-height:1; letter-spacing:-0.03em; margin:0; }
.lush-footer-tag { margin:0; font-family:var(--lush-script); font-style:normal; font-size:32px; line-height:1; color:var(--lush-pink); }
.lush-footer-blurb { margin:0; color:var(--lush-muted); font-family:var(--lush-ui); font-size:13px; line-height:1.55; }
.lush-footer-col { display:flex; flex-direction:column; gap:10px; }
.lush-footer-label { font-family:var(--lush-ui); font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:var(--lush-pink); font-weight:600; margin-bottom:4px; }
.lush-footer-item { display:inline-flex; align-items:center; gap:10px; color:var(--lush-text); font-family:var(--lush-ui); font-size:13px; line-height:1.4; transition:color .2s ease; }
.lush-footer-item:hover { color:var(--lush-pink); }
.lush-footer-hour { display:flex; justify-content:space-between; gap:16px; font-family:var(--lush-ui); font-size:12px; color:var(--lush-text); padding-bottom:6px; border-bottom:1px dashed var(--lush-dark-border); }
.lush-footer-hour:last-of-type { border-bottom:0; }
.lush-footer-hour span:last-child { color:var(--lush-muted); font-family:var(--lush-ui); font-size:11px; }
.lush-footer-bottom { position:relative; border-top:1px solid var(--lush-dark-border); padding:18px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:10px; font-family:var(--lush-ui); font-size:11px; letter-spacing:0.08em; color:var(--lush-muted); }
.lush-footer-bottom strong { color:var(--lush-pink); font-weight:600; }
.lush-footer-dot { color:var(--lush-pink); opacity:0.5; font-size:6px; }

/* Footer Quick Book — full-width sage pill, identical pattern to the
   FadeRoom footer CTA. Distinct class so it doesn't inherit the
   header's 50 px circle styling. */
.lush-footer-book {
  width:100%;
  display:inline-flex; align-items:center; justify-content:center; gap:10px;
  padding:14px 22px;
  background:var(--lush-pink); color:var(--lush-on-pink);
  border:none; border-radius:14px;
  font-family:var(--lush-ui); font-size:14px; font-weight:700;
  letter-spacing:0.04em; line-height:1;
  cursor:pointer;
  transition:filter .15s ease, transform .15s ease;
}
.lush-footer-book svg { color:var(--lush-on-pink); fill:var(--lush-on-pink); }
@media (hover:hover) and (pointer:fine) {
  .lush-footer-book:hover { filter:brightness(1.06); transform:translateY(-1px); }
}
.lush-footer-book:active { transform:translateY(0); }

/* ── Desktop ── */
@media (min-width:1025px) {
  /* Header at desktop: deferred to a future pass; mobile-first design
     applies. Slightly taller cover so the photo gets room to breathe
     on wider viewports. Content card stays full-width and overlaps
     the cover (same as mobile). */
  .lush-header-cover { min-height:300px; }
  .lush-header-content { max-width:1180px; padding:56px 64px 64px; }
  .lush-tab-slider { justify-content:center; padding:8px 40px; gap:12px; }
  .lush-tab-pill { padding:22px 18px; font-size:12px; letter-spacing:0.2em; }
  .lush-tab-pill::after { left:18px; right:18px; height:2px; }
  .lush-gallery-group, .lush-before-after-section, .lush-about-section, .lush-policy-section, .lush-before-appointment-section, .lush-aftercare-section { width:min(100%,1180px); }
  .lush-gallery-section { padding:0 40px 96px; }
  .lush-gallery-group { padding:56px 0 0; }
  .lush-gallery-group+.lush-gallery-group { padding-top:56px; }
  .lush-gallery-group h2 { font-size:64px; margin:0 0 34px; }
  .lush-gallery-grid { grid-template-columns:repeat(4,1fr); gap:32px 22px; }
  .lush-gallery-img--tall > img { aspect-ratio:1/1.25; }
  .lush-gallery-img--wide { grid-column:span 2; }
  .lush-gallery-img--wide > img { aspect-ratio:2/1; }
  .lush-before-after-section { padding:74px 40px 110px; }
  .lush-results-heading { padding:0 0 32px; }
  .lush-results-heading h2 { font-size:clamp(96px,10vw,140px); text-shadow:7px 7px 0 rgba(14,17,17,0.18); }
  .lush-results-backdrop { font-size:clamp(48px,5vw,68px); text-shadow:5px 5px 0 rgba(14,17,17,0.18); margin-top:-20px; }
  .lush-ba-stack { grid-template-columns:repeat(3,minmax(0,1fr)); gap:36px; padding:30px 0 0; }
  .lush-ba-pair { max-width:380px; height:340px; }
  .lush-ba-label { font-size:38px; }
  .lush-ba-card { width:205px; height:205px; }
  .lush-ba-card--before { left:0; top:64px; }
  .lush-ba-card--after  { right:0; top:128px; left:auto; }
  .lush-about-section { min-height:auto; padding:80px 40px 110px; display:grid; grid-template-columns:0.95fr 1.05fr; gap:64px; align-items:center; }
  .lush-about-hero { padding:0; margin-bottom:0; }
  .lush-about-star { width:min(40vw, 480px); }
  .lush-about-heading-wrap { max-width:380px; margin-top:-30px; }
  .lush-about-backdrop { font-size:clamp(32px,3.5vw,56px); text-shadow:3px 3px 0 rgba(14,17,17,0.18); }
  .lush-about-heading-wrap h2 { font-size:clamp(72px,7vw,108px); text-shadow:5px 5px 0 rgba(14,17,17,0.18); margin-top:-20px; }
  .lush-about-tagline { font-size:13px; margin-top:18px; }
  .lush-about-copy { max-width:none; font-size:18px; line-height:1.55; }
  .lush-policy-section { padding:70px 40px 110px; }
  .lush-policy-heading { align-items:center; margin-bottom:34px; }
  .lush-policy-heading span { font-size:clamp(48px,5vw,68px); text-shadow:5px 5px 0 rgba(14,17,17,0.18); }
  .lush-policy-heading h2 { font-size:clamp(96px,10vw,140px); text-shadow:7px 7px 0 rgba(14,17,17,0.18); margin-top:-20px; }
  .lush-policy-list { grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; align-items:stretch; }
  .lush-policy-card { min-height:320px; padding:24px 24px 28px; display:flex; flex-direction:column; }
  .lush-policy-card h3 { font-size:32px; margin-bottom:18px; }
  .lush-policy-copy { font-size:15px; line-height:1.55; }
  .lush-before-appointment-section, .lush-aftercare-section { padding:74px 40px 110px; }
  .lush-before-appointment-section h2, .lush-aftercare-section h2 { font-size:84px; margin-bottom:58px; }
  .lush-before-timeline { max-width:880px; margin:0 auto; gap:36px; }
  .lush-before-timeline::before { left:33px; }
  .lush-before-step { grid-template-columns:70px 1fr; gap:28px; }
  .lush-before-node { width:68px; height:68px; }
  .lush-before-node-num { font-size:18px; }
  .lush-before-step-body { padding:10px 0 22px; }
  .lush-before-step-body h3 { font-size:42px; margin-bottom:14px; }
  .lush-before-step-body p { font-size:16px; line-height:1.6; }
  .lush-aftercare-list { max-width:1080px; margin:0 auto; grid-template-columns:repeat(3,minmax(0,1fr)); gap:22px; }
  .lush-aftercare-card { padding:28px 28px 30px; }
  .lush-aftercare-card h3 { font-size:38px; margin-bottom:14px; }
  .lush-aftercare-card p { font-size:15px; line-height:1.6; }
  .lush-footer-inner { padding:72px 48px 36px; grid-template-columns:1.4fr 1fr 1fr 1fr; gap:48px; align-items:start; }
  .lush-booking-section { padding:48px 48px 80px; }
  .lush-booking-services { grid-template-columns:repeat(2,1fr); }
}

/* ── Tablet ── */
@media (min-width:641px) and (max-width:1024px) {
  /* Header at tablet: same mobile-first design, just slightly more
     generous container padding. Buttons grid + circle sizing stays
     uniform across breakpoints (5 × 50 px circles). */
  .lush-header-cover { min-height:260px; }
  .lush-header-content { padding:48px 44px 52px; max-width:760px; }
  .lush-tab-slider { padding:6px 28px; justify-content:center; gap:8px; }
  .lush-gallery-group, .lush-before-after-section, .lush-about-section, .lush-policy-section, .lush-before-appointment-section, .lush-aftercare-section { width:min(100%,720px); }
  .lush-gallery-grid { grid-template-columns:repeat(3,1fr); gap:14px; }
  .lush-policy-list { grid-template-columns:repeat(2,1fr); }
  .lush-aftercare-list { grid-template-columns:repeat(2,1fr); }
  .lush-footer-inner { grid-template-columns:1fr 1fr; }
  .lush-footer-brand { grid-column:1/-1; }
}

/* ── Mobile ── */
@media (max-width:640px) {
  /* Mobile owns the canonical design. Header is a compact 31vh / 230px
     cover with the overlapping content card defined above. Buttons
     are the same centered 5 × 50 px grid defined in the base. */
  .lush-header-section { min-height:auto; }
  .lush-tab-pill { padding:14px 12px; font-size:10px; letter-spacing:0.12em; }
  .lush-tab-pill::after { left:12px; right:12px; }
  .lush-booking-section { padding:28px 16px 56px; }
  .lush-booking-days { gap:6px; }
  .lush-booking-day { flex:1 1 64px; min-width:60px; padding:10px 6px; }
  .lush-booking-times { grid-template-columns:repeat(auto-fill,minmax(96px,1fr)); gap:6px; }
  .lush-gallery-group { padding-left:18px; padding-right:18px; }
  /* progress pills already use a sr-only label; no mobile override needed */
}
`
