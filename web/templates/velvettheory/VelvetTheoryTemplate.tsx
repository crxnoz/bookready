'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, Mail, Instagram, MapPin, MessageSquare, Youtube, Facebook, Link2 } from 'lucide-react'
import VelvetTheoryBooking from './VelvetTheoryBooking'
import type { PublicSite, Service } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'
import { tokensToCss } from '@bkrdy/platform'
import { FaqSection, ReviewsSection, ThanksSection, SiteFooter, InstructionsSection, GallerySection, BeforeAfterSection, PolicySection, SECTIONS_CSS } from '@bkrdy/platform/sections'

// ── Brand glyphs lucide doesn't ship ─────────────────────────────────────────

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

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function signatureWord(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return name
  const STOP = new Set(['the', 'a', 'an'])
  const real = parts.find(p => ! STOP.has(p.toLowerCase()))
  return real ?? parts[0]
}

// ── Background variants ──────────────────────────────────────────────────────
//
// Velvet Theory swaps BACKGROUND across variants while the gold accent stays
// constant. The editor reuses the existing theme.accent_color field to pick
// a variant (we treat it as a background hex here). Unknown values fall back
// to Burgundy default.
interface Variant { bg: string; fg: string; fgMuted: string; rule: string }
const VARIANTS: Record<string, Variant> = {
  '#2D0F19': { bg: '#2D0F19', fg: '#F5EFE6', fgMuted: 'rgba(245,239,230,0.62)', rule: 'rgba(245,239,230,0.18)' },
  '#0E1A2B': { bg: '#0E1A2B', fg: '#F5EFE6', fgMuted: 'rgba(245,239,230,0.62)', rule: 'rgba(245,239,230,0.18)' },
  '#0F2620': { bg: '#0F2620', fg: '#F5EFE6', fgMuted: 'rgba(245,239,230,0.62)', rule: 'rgba(245,239,230,0.18)' },
  '#1F1130': { bg: '#1F1130', fg: '#F5EFE6', fgMuted: 'rgba(245,239,230,0.62)', rule: 'rgba(245,239,230,0.18)' },
  '#1A1A1C': { bg: '#1A1A1C', fg: '#F5EFE6', fgMuted: 'rgba(245,239,230,0.55)', rule: 'rgba(245,239,230,0.16)' },
  // Bone (#F5EFE6) light variant removed — Velvet Theory is dark-only by design.
}
const DEFAULT_VARIANT_HEX = '#2D0F19'

function resolveVariant(raw: string | null | undefined): Variant {
  const key = (raw ?? '').toUpperCase().trim()
  return VARIANTS[key] ?? VARIANTS[DEFAULT_VARIANT_HEX]
}

// ── Tab registry ─────────────────────────────────────────────────────────────

type TabId = 'book' | 'gallery' | 'policies' | 'about' | 'results' | 'aftercare' | 'before'

const SECTION_KEY_TO_TAB: Record<string, TabId | null> = {
  book:               'book',
  gallery:            'gallery',
  policy:             'policies',
  about:              'about',
  before_after:       'results',
  steps:              'aftercare',
  before_appointment: 'before',
  header:             null,
  footer:             null,
}

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
  announcement_text: 'Now booking — limited availability.',
  show_announcement: true,
  cover_image_url: null as string | null,
  avatar_image_url: null as string | null,
}

// Default labels rebrand TFR's playful words to Velvet Theory's editorial voice.
// Owners can override every label via the existing Template Settings editor.
const FALLBACK_TAB_LABELS = {
  book_label: 'Reserve',
  gallery_label: 'Atelier',
  policy_label: 'Manifesto',
  about_label: 'About',
  results_label: 'Transformations',
  steps_label: 'Notes',
  before_appointment_label: 'Itinerary',
}

interface Profile {
  business_name?: string | null
  tagline?: string | null
  public_phone?: string | null
  public_email?: string | null
  address_line?: string | null
  city?: string | null
  state?: string | null
  zip?: string | null
  instagram_url?: string | null
}

// ── Main template ────────────────────────────────────────────────────────────

export default function VelvetTheoryTemplate({ site, slug }: { site: PublicSite; slug: string }) {
  const p           = site.profile as Profile | null
  const displayName = p?.business_name ?? site.business_name ?? site.slug
  const services    = (site.services ?? []).filter((s: Service) => s.is_active)
  const hours       = site.hours     ?? []
  // Loosely-typed policy bag for the shared PolicySection — owner-extra keys
  // (refund_policy, guest_policy, custom_groups) aren't all on the strict type.
  const pol: any    = site.policies  ?? {}
  const availability = site.availability ?? null
  const address     = [p?.address_line, p?.city, p?.state, p?.zip].filter(Boolean).join(', ')

  // ── Template settings ──
  const header = { ...FALLBACK_HEADER_SETTINGS, ...(site.template?.settings.header ?? {}) }
  const tabLabels = { ...FALLBACK_TAB_LABELS, ...(site.template?.settings.tabs ?? {}) }
  const footerSettings = site.template?.settings.footer ?? { show_powered_by: true }

  // Variant lives on theme.accent_color (repurposed for VT — see comment on
  // VARIANTS above). Unknown / missing → Burgundy default.
  const variant = resolveVariant(site.template?.settings.theme?.accent_color ?? null)
  const variantVars: React.CSSProperties = {
    ['--vt-bg' as any]:       variant.bg,
    ['--vt-fg' as any]:       variant.fg,
    ['--vt-fg-muted' as any]: variant.fgMuted,
    ['--vt-rule' as any]:     variant.rule,
    ['--vt-accent' as any]:   '#C9A876',
    backgroundColor: variant.bg,
    color:           variant.fg,
  }

  // ── Visible tab list (gated by website_sections.is_enabled) ──
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

  const allTabs: { id: TabId; label: string; key: string }[] = [
    { id: 'book',      label: tabLabels.book_label,               key: 'book'               },
    { id: 'gallery',   label: tabLabels.gallery_label,            key: 'gallery'            },
    { id: 'about',     label: tabLabels.about_label,              key: 'about'              },
    // M3 rename — section_keys + label keys updated.
    { id: 'results',   label: tabLabels.results_label ?? (tabLabels as any).before_after_label, key: 'results'  },
    { id: 'aftercare', label: tabLabels.advice_label  ?? (tabLabels as any).steps_label,        key: 'advice'   },
    { id: 'before',    label: tabLabels.timeline_label ?? (tabLabels as any).before_appointment_label, key: 'timeline' },
    { id: 'policies',  label: tabLabels.policy_label,             key: 'policy'             },
  ]
  const orderByTab: Record<string, number> = {}
  for (const s of (site.template?.sections ?? [])) {
    const tid = SECTION_KEY_TO_TAB[s.section_key]
    if (tid) orderByTab[tid] = s.sort_order
  }
  const tabs = allTabs
    .filter(t => t.id === 'book' || enabledByTab[t.id])
    .sort((a, b) => (orderByTab[a.id] ?? 999) - (orderByTab[b.id] ?? 999))

  const [active, setActive] = useState<TabId>('book')
  const tabRailRef = useRef<HTMLDivElement>(null)
  const bookPanelRef = useRef<HTMLElement>(null)

  // Switch to the Reserve tab AND actually scroll the booking content into
  // view. The previous implementation called scrollIntoView on the sticky
  // tab rail, which is a no-op once the rail is pinned to top — clicking
  // Reserve from the footer felt broken. Now we scroll to the panel itself,
  // offset by the rail height so the content lands just below it.
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

  // ── Pull settings dump for sub-sections (typed loosely — these are
  // freeform JSON blobs maintained by TemplateDefaults.php on the backend
  // and shaped per-template, so the strict TemplateSettings type doesn't
  // try to enumerate them) ──
  const settings: any = site.template?.settings ?? {}
  const aboutBlock: any = settings.about ?? {}
  // M3 rename — read canonical keys, fall back to legacy for one release.
  const stepsList: any[]  = Array.isArray(settings.advice?.items)   ? settings.advice.items
                          : Array.isArray(settings.steps?.items)    ? settings.steps.items
                          : Array.isArray(settings.advice)          ? settings.advice
                          : Array.isArray(settings.steps)           ? settings.steps : []
  const beforeList: any[] = Array.isArray(settings.timeline?.items) ? settings.timeline.items
                          : Array.isArray(settings.before_appointment?.items) ? settings.before_appointment.items
                          : Array.isArray(settings.timeline)        ? settings.timeline
                          : Array.isArray(settings.before_appointment) ? settings.before_appointment : []
  const additionals: any = settings.additionals ?? {}

  return (
    <>
      <style>{VT_CSS}</style>
      <style>{SECTIONS_CSS}</style>
      <div className="vt-template" style={variantVars}>

        {/* ── Masthead announcement (above hero, above image) ── */}
        {(header.show_announcement ?? true) && (header.announcement_text ?? '').trim() !== '' && (
          <div className="vt-masthead" aria-hidden="true">
            <span className="vt-masthead-text">{header.announcement_text}</span>
          </div>
        )}

        {/* ── Hero: backdrop image that fades into the page ── */}
        <section className="vt-hero">
          {header.cover_image_url && (
            <div className="vt-hero-backdrop">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={header.cover_image_url} alt="" />
              <div className="vt-hero-fade" aria-hidden="true" />
            </div>
          )}
          <div className="vt-hero-content">
            <p className="vt-hero-eyebrow">Velvet Theory</p>
            <h1 className="vt-hero-name">{displayName}</h1>
            {p?.tagline && <p className="vt-hero-tagline">{p.tagline}</p>}
            <div className="vt-hero-cta">
              {header.show_book_button && (() => {
                const url = safeHref(header.book_button_url)
                if (url) {
                  return (
                    <a className="vt-link-cta" href={url} target="_blank" rel="noopener noreferrer">
                      Reserve
                    </a>
                  )
                }
                return <button className="vt-link-cta" onClick={goBook}>Reserve</button>
              })()}
            </div>
            <ul className="vt-hero-contacts" aria-label="Contact">
              {header.show_call_button && (() => {
                const override = safeContactHref(header.call_button_url, 'tel')
                const href = override ?? (p?.public_phone ? `tel:${p.public_phone.replace(/[^\d+]/g, '')}` : null)
                return href ? (
                  <li><a href={href} aria-label="Call"><Phone size={18} /></a></li>
                ) : null
              })()}
              {header.show_email_button && (() => {
                const override = safeContactHref(header.email_button_url, 'mailto')
                const href = override ?? (p?.public_email ? `mailto:${p.public_email}` : null)
                return href ? (
                  <li><a href={href} aria-label="Email"><Mail size={18} /></a></li>
                ) : null
              })()}
              {header.show_message_button && (() => {
                const href = safeContactHref(header.message_button_url, 'sms')
                const isWeb = !!href && /^https?:/i.test(href)
                return href ? (
                  <li><a href={href} target={isWeb ? '_blank' : undefined} rel={isWeb ? 'noopener noreferrer' : undefined} aria-label="Message">
                    <MessageSquare size={18} />
                  </a></li>
                ) : null
              })()}
              {header.show_directions_button && (() => {
                const override = safeHref(header.directions_button_url)
                const href = override ?? (address ? `https://maps.google.com/?q=${encodeURIComponent(address)}` : null)
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="Directions"><MapPin size={18} /></a></li>
                ) : null
              })()}
              {header.show_instagram_button && (() => {
                const href = safeHref(header.instagram_button_url) ?? safeHref(p?.instagram_url) ?? null
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={18} /></a></li>
                ) : null
              })()}
              {header.show_tiktok_button && (() => {
                const href = safeHref(header.tiktok_button_url) ?? null
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><TikTokGlyph size={18} /></a></li>
                ) : null
              })()}
              {header.show_youtube_button && (() => {
                const href = safeHref(header.youtube_button_url) ?? null
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Youtube size={18} /></a></li>
                ) : null
              })()}
              {header.show_facebook_button && (() => {
                const href = safeHref(header.facebook_button_url) ?? null
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={18} /></a></li>
                ) : null
              })()}
              {header.show_pinterest_button && (() => {
                const href = safeHref(header.pinterest_button_url) ?? null
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="Pinterest"><PinterestGlyph size={18} /></a></li>
                ) : null
              })()}
              {header.show_whatsapp_button && (() => {
                const href = safeHref(header.whatsapp_button_url) ?? null
                return href ? (
                  <li><a href={href} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppGlyph size={18} /></a></li>
                ) : null
              })()}
              {(header.custom_links ?? []).map(link => {
                const href = safeHref(link.url)
                if (!href || !/^(https?:\/\/|mailto:|tel:)/i.test(href)) return null
                const isWeb = /^https?:/i.test(href)
                return (
                  <li key={link.id}>
                    <a href={href} target={isWeb ? '_blank' : undefined} rel={isWeb ? 'noopener noreferrer' : undefined} aria-label={link.label} title={link.label}>
                      <Link2 size={18} />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>

        {/* ── Sticky tab nav (serif underline) ──
            M5: role="tablist" on the inner container so the role="tab"
            children compose into valid ARIA. Without a tablist parent,
            screen readers don't announce these as tab UI. */}
        <nav className="vt-tabs" ref={tabRailRef} aria-label="Sections">
          <div className="vt-tabs-inner" role="tablist">
            {tabs.map(t => (
              <button
                key={t.id}
                className={`vt-tab${active === t.id ? ' is-active' : ''}`}
                onClick={() => setActive(t.id)}
                role="tab"
                aria-selected={active === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Reserve / Book ── */}
        <section ref={bookPanelRef} className={`vt-panel${active === 'book' ? ' is-active' : ''}`}>
          {site.booking_settings && site.booking_settings.booking_enabled === false ? (
            <div className="vt-section vt-empty">
              <p className="vt-eyebrow">{tabLabels.book_label ?? 'Reserve'}</p>
              <h2 className="vt-h2">Bookings are paused.</h2>
              <p className="vt-prose">
                Online booking is currently unavailable. Please reach out directly — we&rsquo;ll find a time.
              </p>
            </div>
          ) : (
            // Wrapped in vt-section to give the booking flow the same
            // outer padding the other VT panels get (mirrors how
            // .blackline-section.blackline-book frames the booking).
            <div className="vt-section vt-book">
              <VelvetTheoryBooking
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
            </div>
          )}
        </section>

        {/* ── Atelier (gallery as full-width strips) — shared GallerySection.
            VT renders the gallery as full-width strips (variant="strips"); the
            skin restyles .brk-gallery-grid--strips into VT's 2.4:1 sharp-corner
            rows with the gold-underlined italic group heading. The old per-strip
            caption is dropped (the shared component renders image-only tiles),
            as is the italic lede line — both VT-specific flourishes the shared
            structure doesn't carry. ── */}
        <section className={`vt-panel${active === 'gallery' ? ' is-active' : ''}`}>
          <GallerySection
            items={site.gallery}
            groups={site.gallery_groups}
            heading={settings.gallery?.heading || 'Work, on file.'}
            eyebrow={tabLabels.gallery_label}
            displayName={displayName}
            variant={settings.gallery?.layout ? 'grid' : 'strips'}
            layout={settings.gallery?.layout ?? null}
            emptyText="No work on file yet."
            ariaLabel={tabLabels.gallery_label}
          />
        </section>

        {/* ── About (lead image, drop cap, highlight bullets) ── */}
        <section className={`vt-panel${active === 'about' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            {/* Lead image — sits above the heading. Per feedback the strip
                pattern (3 images below) is dropped in favour of a single
                editorial hero. */}
            {((aboutBlock as any)?.images?.[0] ?? (aboutBlock as any)?.image_1_url) && (
              // eslint-disable-next-line @next/next/no-img-element
              <figure className="vt-about-hero">
                <img src={(aboutBlock as any).images?.[0] ?? (aboutBlock as any).image_1_url} alt="" />
              </figure>
            )}
            <p className="vt-eyebrow">{tabLabels.about_label ?? 'About'}</p>
            <h2 className="vt-h2">{(aboutBlock as any).eyebrow ?? `On ${signatureWord(displayName)}.`}</h2>
            {renderAbout(aboutBlock as any, displayName, p)}
            {/* Highlights — editor-editable bullet list. Sits after the
                drop-cap paragraphs as the closing motif. */}
            {Array.isArray((aboutBlock as any)?.highlights) && (aboutBlock as any).highlights.length > 0 && (
              <ul className="vt-highlights">
                {(aboutBlock as any).highlights.map((h: any, i: number) => (
                  <li key={i}>
                    {h.title && <h3>{h.title}</h3>}
                    {h.body && <p>{h.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* ── Transformations (before & after) — shared BeforeAfterSection.
            VT's diptych had NO center separator and labelled each pane; the
            shared `labels` flag supplies the Before/After tags, which the skin
            flattens into VT's sharp, gold-hairline corner marks (no pill fill).
            Canonical `results`, falling back to legacy `before_after`. ── */}
        <section className={`vt-panel${active === 'results' ? ' is-active' : ''}`}>
          <BeforeAfterSection
            items={site.results ?? site.before_after}
            groups={site.results_groups ?? site.before_after_groups}
            heading={settings.results?.heading || 'Then, and now.'}
            eyebrow={tabLabels.results_label}
            labels
            layout={settings.results?.layout ?? null}
            emptyText="No transformations on file yet."
            ariaLabel={tabLabels.results_label}
          />
        </section>

        {/* ── Notes (advice) — shared InstructionsSection (un-numbered).
            VT decorates each row with a lowercase Roman numeral; that
            ornament is reproduced in the skin via a CSS counter on
            .brk-instruction-mark (markGlyph is left empty so the counter
            supplies the glyph). Items normalize legacy `content` → body so
            DEFAULT_STEPS + older payloads still render. ── */}
        <section className={`vt-panel${active === 'aftercare' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            <InstructionsSection
              items={(stepsList.length > 0 ? stepsList : DEFAULT_STEPS).map((s: any) => ({ title: s.title, body: s.body ?? s.content }))}
              heading={typeof settings.advice?.heading === 'string' && settings.advice.heading.trim() !== '' ? settings.advice.heading : 'Care, prolonged.'}
              eyebrow={(tabLabels as any).advice_label ?? tabLabels.steps_label ?? 'Notes'}
              cardKicker={settings.advice?.card_kicker}
              markGlyph=""
              emptyText="Care notes will appear here."
              ariaLabel={(tabLabels as any).advice_label ?? tabLabels.steps_label ?? 'Notes'}
            />
          </div>
        </section>

        {/* ── Itinerary (timeline) — shared InstructionsSection (numbered).
            The old diary keyed each entry by a `when` label (T-7 DAYS, …)
            in the <dt>; `when` is NOT a canonical field, so migrating to the
            numbered shared list drops it (the arabic ordinal takes its place,
            per the shared-structure principle). Items normalize legacy
            `content` → body. ── */}
        <section className={`vt-panel${active === 'before' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            <InstructionsSection
              items={(beforeList.length > 0 ? beforeList : DEFAULT_BEFORE).map((it: any) => ({ title: it.title, body: it.body ?? it.content }))}
              heading={typeof settings.timeline?.heading === 'string' && settings.timeline.heading.trim() !== '' ? settings.timeline.heading : 'Before your visit.'}
              eyebrow={(tabLabels as any).timeline_label ?? tabLabels.before_appointment_label ?? 'Itinerary'}
              cardKicker={settings.timeline?.card_kicker}
              numbered
              emptyText="Your visit timeline will appear here."
              ariaLabel={(tabLabels as any).timeline_label ?? tabLabels.before_appointment_label ?? 'Itinerary'}
            />
          </div>
        </section>

        {/* ── Manifesto (policies as Roman numeral sections) — shared
            PolicySection. VT keyed each clause with a lowercase Roman numeral;
            with marker="numeral" the shared component supplies an ordinal we
            blank out in the skin and replace with a CSS counter (lower-roman)
            on .vt-template .brk-policy-list--marked, restoring i. ii. iii. …
            VT's exact "On Deposits / On Cancellations / …" labels + field map
            are preserved; custom_groups carry through under their headings. ── */}
        <section className={`vt-panel${active === 'policies' ? ' is-active' : ''}`}>
          <PolicySection
            rows={[
              { label: 'On Deposits',          body: pol.deposit_policy },
              { label: 'On Cancellations',     body: pol.cancellation_policy },
              { label: 'On Late Arrivals',     body: pol.late_policy },
              { label: 'On No-Shows',          body: pol.no_show_policy },
              { label: 'On Refunds',           body: pol.refund_policy },
              { label: 'On Children & Guests', body: pol.guest_policy },
            ]}
            customGroups={(Array.isArray(pol.custom_groups) ? pol.custom_groups : []).map((g: any) => ({
              heading: g.heading,
              items: (Array.isArray(g.items) ? g.items : []).map((it: any) => ({
                title: it.title,
                content: it.content ?? it.body,
              })),
            }))}
            heading={settings.policy?.heading || 'The practice.'}
            eyebrow={tabLabels.policy_label}
            marker="numeral"
            emptyText="No published policies yet."
            ariaLabel={tabLabels.policy_label}
          />
        </section>

        {/* ── Additionals: thank-you opens it, then FAQs + Reviews ──
            All four now render the canonical .brk-* markup from the shared
            platform sections (@bkrdy/platform/sections). VT's burgundy/gold
            palette is bridged onto the --brk-* tokens above; the .vt-* skin
            at the end of VT_CSS re-applies the editorial-luxe treatment
            (serif titles, gold ornaments, hairline rules). The old VT-scoped
            thanks/FAQ/review CSS is now dead (left inert). */}
        <section className="vt-additionals">
          {/* Thank-you — editorial note. Title keeps VT's 'Thank you.'
              fallback; signature falls back to the studio's signature word
              (not the full display name). Eyebrow "A note". */}
          <ThanksSection
            show={additionals.show_thank_you}
            title={additionals.thank_you_title ?? 'Thank you.'}
            body={additionals.thank_you_body}
            signature={additionals.thank_you_signature}
            fallbackSignature={signatureWord(displayName)}
            eyebrow={settings.additionals?.thank_you_eyebrow || 'A note'}
          />

          {/* FAQ — shared component. Heading fallback 'Frequently asked.',
              eyebrow "Questions". The +/× toggle mark is restyled by the
              skin to VT's gold 45°-rotate asterisk. */}
          {additionals.faq?.enabled !== false && (
            <FaqSection
              items={additionals.faq?.items}
              heading={additionals.faq?.heading ?? 'Frequently asked.'}
              eyebrow="Questions"
            />
          )}

          {/* Reviews — shared component. Heading fallback 'What guests say.',
              eyebrow "Reviews", gold ★ rating. The skin flattens the cards
              (no surface/border), restores the ✻ corner ornament, and keeps
              the italic serif blockquote + uppercase attribution. */}
          {additionals.reviews?.enabled !== false && (
            <ReviewsSection
              items={additionals.reviews?.items}
              heading={additionals.reviews?.heading ?? 'What guests say.'}
              eyebrow="Reviews"
              starGlyph="★"
            />
          )}
        </section>

        {/* ── Footer — shared 3-band component. Mirrors the old local
              vt-footer: businessName = override || displayName, eyebrow
              labels The Studio / Hours / Contact, CTA "Reserve a chair",
              credit band is "Powered by BookReady" only (no © prefix →
              copyrightName omitted). VT's gold-edged CTA + serif name are
              restored by the skin. NOTE: the shared footer renders only
              phone/email in the contact column — VT's old address line is
              intentionally dropped (matches the TFR migration). ── */}
        <SiteFooter
          businessName={(footerSettings.business_name_override ?? '').trim() || displayName}
          subtext={footerSettings.subtext}
          hours={hours}
          phone={p?.public_phone}
          email={p?.public_email}
          servicesCount={services.length}
          onBook={goBook}
          brandLabel={footerSettings.brand_label || 'The Studio'}
          ctaLabel="Reserve a chair"
          show={{
            quickBook: footerSettings.show_quick_book,
            hours: footerSettings.show_hours,
            contact: footerSettings.show_contact_links,
            poweredBy: footerSettings.show_powered_by,
          }}
        />
      </div>
    </>
  )
}

// ── Section renderers ────────────────────────────────────────────────────────

function renderAbout(aboutBlock: any, displayName: string, p: Profile | null) {
  const paragraphs: string[] = []
  if (typeof aboutBlock?.body === 'string' && aboutBlock.body.trim() !== '') {
    paragraphs.push(...aboutBlock.body.split(/\n{2,}/).map((s: string) => s.trim()).filter(Boolean))
  }
  if (paragraphs.length === 0) {
    paragraphs.push(
      `${displayName} is a small studio built around quiet, careful work. We take fewer appointments so each one can be considered.`,
      `Reach out through the form — we&rsquo;ll be in touch within the day.`,
    )
  }
  // Images now render as a single hero above the heading (see the About
  // section markup). The strip rendering below is intentionally dropped.
  return (
    <div className="vt-about">
      {paragraphs.map((para, i) => {
        // Drop cap on first paragraph
        if (i === 0) {
          const first = para.charAt(0)
          const rest  = para.slice(1)
          return (
            <p key={i} className="vt-about-lead">
              <span className="vt-dropcap">{first}</span>
              {rest}
            </p>
          )
        }
        return <p key={i} className="vt-prose">{para}</p>
      })}
    </div>
  )
}

// ── Default content when owner hasn't customized ────────────────────────────

const DEFAULT_STEPS = [
  { title: 'Wash less, condition more.', content: 'Hard water and over-washing strip the color tone. Once every 2-3 days is plenty.' },
  { title: 'Treat the ends.', content: 'A weekly bond mask keeps ends from cracking between visits.' },
  { title: 'Heat with care.', content: 'A heat protectant on damp hair, dryer on medium, irons no higher than 320°F.' },
  { title: 'Rebook early.', content: 'Touch-ups every 5-7 weeks keep color even and the shape sharp.' },
]

const DEFAULT_BEFORE = [
  { when: 'T-7 DAYS',  title: 'Avoid chemical work.',          content: 'No home color, glosses, or clarifying shampoos in the week before. They strip your hair&rsquo;s ability to take new product.' },
  { when: 'T-2 DAYS',  title: 'Hydrate.',                       content: 'Drink water — properly. Hydrated hair takes color more evenly and finishes glossier.' },
  { when: 'THE DAY OF', title: 'Arrive with clean, dry hair.', content: 'Skip the leave-ins and oils. We&rsquo;ll start with a fresh canvas.' },
  { when: 'AFTER',     title: 'Wait 48 hours.',                 content: 'No washing for two days. Let the cuticle close around the color so the tone holds longer.' },
]

// ── CSS ──────────────────────────────────────────────────────────────────────

const VT_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=Inter:wght@300;400;500;600&display=swap');

.vt-template {
  ${tokensToCss()}
  --vt-bg: #2D0F19;
  --vt-fg: #F5EFE6;
  --vt-fg-muted: rgba(245,239,230,0.62);
  --vt-rule: rgba(245,239,230,0.18);
  --vt-accent: #C9A876;
  --vt-display: 'Fraunces', 'Cormorant Garamond', Georgia, serif;
  --vt-body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  /* Bridge VT's burgundy/gold palette + serif fonts onto the canonical
     --brk-* tokens the shared section components (@bkrdy/platform/sections)
     are styled against. CSS aliasing means VT's background-variant overrides
     (set on --vt-bg/--vt-fg/etc. by the inline style) flow through to the
     shared sections automatically. The .vt-* skin at the end of this file
     then re-applies VT's editorial-luxe signatures over the base. */
  --brk-color-bg: var(--vt-bg);
  --brk-color-surface: var(--vt-bg);
  --brk-color-text: var(--vt-fg);
  --brk-color-muted: var(--vt-fg-muted);
  --brk-color-rule: var(--vt-rule);
  --brk-color-accent: var(--vt-accent);
  --brk-color-on-accent: var(--vt-bg);
  --brk-family-display: var(--vt-display);
  --brk-family-body: var(--vt-body);

  font-family: var(--vt-body);
  font-weight: 400;
  color: var(--vt-fg);
  background: var(--vt-bg);
  min-height: 100vh;
  font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Reset that doesn't fight the editor app's tailwind.
   IMPORTANT: do NOT reset padding/font/color on the universal button
   selector — .vt-template button has higher specificity (0,1,1) than a
   single class like .vt-tab (0,1,0), so blanket resets there silently
   override every class-based button styling. Just neutralize the chrome
   the browser adds. */
.vt-template *, .vt-template *::before, .vt-template *::after { box-sizing: border-box; }
.vt-template button { background: none; border: 0; cursor: pointer; }
.vt-template a { color: inherit; text-decoration: none; }
.vt-template p { margin: 0; }
.vt-template h1, .vt-template h2, .vt-template h3 { margin: 0; font-weight: 400; }
.vt-template ul, .vt-template ol, .vt-template dl { margin: 0; padding: 0; list-style: none; }

/* ── Masthead announcement ── */
.vt-masthead {
  border-bottom: 1px solid var(--vt-rule);
  padding: 14px 24px;
  text-align: center;
}
.vt-masthead-text {
  font-family: var(--vt-body);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--vt-fg);
  opacity: 0.85;
}

/* ── Hero ── */
.vt-hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 32px 120px;
  overflow: hidden;
  isolation: isolate;
}
.vt-hero-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.vt-hero-backdrop img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: brightness(0.72) saturate(1.05);
}
/* The fade — transparent at top, solid bg at bottom. Creates the seamless
   merge into the page. */
.vt-hero-fade {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, var(--vt-bg) 24%, transparent) 0%,
    color-mix(in srgb, var(--vt-bg) 38%, transparent) 35%,
    color-mix(in srgb, var(--vt-bg) 70%, transparent) 72%,
    var(--vt-bg) 100%
  );
}
.vt-hero-content {
  position: relative;
  z-index: 1;
  max-width: 760px;
  text-align: center;
  padding: 0 16px;
}
.vt-hero-eyebrow {
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--vt-accent);
  margin-bottom: 32px;
}
.vt-hero-name {
  font-family: var(--vt-display);
  font-size: clamp(48px, 9vw, 112px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.018em;
  color: var(--vt-fg);
  margin-bottom: 18px;
  font-feature-settings: 'ss01' 1, 'ss02' 1;
}
.vt-hero-tagline {
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 300;
  font-size: clamp(15px, 1.8vw, 19px);
  line-height: 1.5;
  color: var(--vt-fg);
  opacity: 0.85;
  margin-bottom: 44px;
  max-width: 520px;
  margin-left: auto;
  margin-right: auto;
}
.vt-hero-cta {
  margin-bottom: 56px;
}
/* Scoped to .vt-template so it beats the universal '.vt-template button'
   reset on specificity (0,2,0 vs 0,1,1). Without this the button reset's
   border:0 was killing the gold underline on button-rendered CTAs. */
.vt-template .vt-link-cta {
  display: inline-block;
  font-family: var(--vt-display);
  font-size: 22px;
  font-weight: 400;
  color: var(--vt-accent);
  padding: 4px 0;
  border-bottom: 1px solid var(--vt-accent);
  transition: opacity 160ms ease, border-color 160ms ease;
}
.vt-template .vt-link-cta:hover { opacity: 0.78; }
/* Minimal hero contacts — icon-only, no labels, no borders, just the
   glyph in foreground color. Spaced so the row reads as a quiet contact
   strip rather than a button bar. */
.vt-hero-contacts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 28px;
}
.vt-hero-contacts li a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--vt-fg);
  opacity: 0.62;
  transition: opacity 180ms ease, color 180ms ease;
}
.vt-hero-contacts li a:hover {
  opacity: 1;
  color: var(--vt-accent);
}

/* No-image hero variant — just type on flat bg with a hairline */
.vt-hero:not(:has(.vt-hero-backdrop)) {
  min-height: auto;
  padding: 120px 32px 80px;
}

/* ── Tabs ──
   Editorial serif labels, hairline gold underline on active.
   The underline sits ON the parent's bottom border (not below it) so
   the seam reads as one continuous fine line, not two stacked ones.
   On mobile the row scrolls horizontally instead of wrapping — keeps
   the rhythm consistent when there are 6-7 labels of varying widths. */
.vt-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--vt-bg);
  border-bottom: 1px solid var(--vt-rule);
}
.vt-tabs-inner {
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 24px;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.vt-tabs-inner::-webkit-scrollbar { display: none; }
.vt-tab {
  font-family: var(--vt-display);
  font-size: 15px;
  font-weight: 400;
  letter-spacing: 0.015em;
  color: var(--vt-fg);
  opacity: 0.48;
  padding: 20px 14px 18px;
  position: relative;
  white-space: nowrap;
  flex-shrink: 0;
  transition: opacity 180ms ease;
}
.vt-tab:hover { opacity: 0.85; }
.vt-tab.is-active { opacity: 1; }
/* Underline sits flush over the parent's border-bottom (bottom: 0 keeps it
   inside the content box so .vt-tabs-inner's overflow-y: hidden never clips
   it, while still landing on the 1px hairline) and spans just the text area,
   not the full padded tab — feels more like a typesetter's mark than a button
   state. */
.vt-tab.is-active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 14px;
  right: 14px;
  height: 1px;
  background: var(--vt-accent);
}
@media (max-width: 640px) {
  .vt-tabs-inner { justify-content: flex-start; padding: 0 16px; gap: 4px; }
  .vt-tab { padding: 16px 10px 14px; font-size: 14px; }
  .vt-tab.is-active::after { left: 10px; right: 10px; }
}

/* ── Panels ── */
.vt-panel { display: none; }
.vt-panel.is-active { display: block; }

/* ── Section helpers ── */
.vt-section {
  max-width: 1080px;
  margin: 0 auto;
  padding: 96px 32px;
}
.vt-section-narrow {
  max-width: 720px;
}
.vt-eyebrow {
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--vt-accent);
  margin-bottom: 24px;
}
.vt-h2 {
  font-family: var(--vt-display);
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.014em;
  color: var(--vt-fg);
  margin-bottom: 36px;
}
.vt-prose {
  font-family: var(--vt-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--vt-fg);
  opacity: 0.85;
  margin-bottom: 20px;
}
.vt-empty {
  text-align: center;
  padding: 120px 32px;
}

/* ── About / drop cap ── */
.vt-about {
  margin-top: 8px;
}
.vt-about-lead {
  font-family: var(--vt-body);
  font-size: 17px;
  line-height: 1.65;
  color: var(--vt-fg);
  margin-bottom: 28px;
}
.vt-dropcap {
  float: left;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: 76px;
  line-height: 0.84;
  padding-right: 14px;
  padding-top: 6px;
  color: var(--vt-accent);
}
/* Lead image above the About heading — replaces the old 3-strip
   pattern. Editorial 16:10 frame with VT's sharp 2px corners. */
.vt-about-hero {
  margin: 0 0 56px;
  border-radius: 2px;
  overflow: hidden;
  aspect-ratio: 16/10;
}
.vt-about-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Highlights — editorial bullet list with hairline-gold bounded rows.
   Closes the About panel after the drop-cap paragraphs. */
.vt-highlights {
  list-style: none;
  padding: 0;
  margin: 56px 0 0;
}
.vt-highlights > li {
  padding: 24px 0;
  border-top: 1px solid color-mix(in srgb, var(--vt-accent) 50%, transparent);
}
.vt-highlights > li:last-child {
  border-bottom: 1px solid color-mix(in srgb, var(--vt-accent) 50%, transparent);
}
.vt-highlights h3 {
  font-family: var(--vt-display);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.005em;
  margin: 0 0 6px;
  color: var(--vt-fg);
}
.vt-highlights p {
  margin: 0;
  color: var(--vt-fg-muted);
  font-size: 15px;
  line-height: 1.65;
}

/* ── Additionals (thank-you + FAQs only — hours now lives in the footer) ── */
.vt-additionals { padding: 0; }
.vt-additionals > .vt-section { border-top: 1px solid var(--vt-rule); padding-top: 80px; }

/* Mobile tweaks (tab-specific rules live in the .vt-tabs block above) */
@media (max-width: 640px) {
  .vt-hero { padding: 60px 20px 80px; }
  .vt-section { padding: 60px 20px; }
  .vt-hero-contacts { gap: 14px; }
}

/* ════════════════════════════════════════════════════════════════════
   VT SKIN over the shared platform sections (@bkrdy/platform/sections)
   ────────────────────────────────────────────────────────────────────
   FAQ / Reviews / Thank-you / Footer now render the canonical .brk-*
   markup. These overrides (scoped under .vt-template, AFTER SECTIONS_CSS)
   re-apply Velvet Theory's editorial-luxe signatures: upright serif
   section titles, gold uppercase eyebrows, FLAT hairline-divided review
   rows with the gold ✻ corner ornament + italic serif quote, the
   centered thank-you note with its ✳ mark + gold-rule signature, and the
   sharp gold footer CTA + italic serif business name. All colors/fonts
   come from the bridged --brk-* tokens. The old .vt-thanks/.vt-faq*/
   .vt-review*/.vt-footer* rules above are now dead (left inert).
   ════════════════════════════════════════════════════════════════════ */

/* VT's additionals sat in the narrow (720px) editorial column. */
.vt-template .brk-section { max-width: 720px; }

/* FAQ + Reviews keep VT's LEFT-aligned editorial header (the shared
   default is centered). Thank-you doesn't use .brk-section-head, so it
   stays centered via .brk-thanks. */
.vt-template .brk-section-head {
  text-align: left;
  margin: 0 0 36px;
  max-width: none;
}
/* Match .vt-eyebrow — gold, tracked, uppercase micro-label. */
.vt-template .brk-eyebrow {
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: var(--vt-accent);
}
/* Match .vt-h2 — upright serif display title (no italic, no neon). */
.vt-template .brk-section-title {
  margin: 24px 0 0;
  font-family: var(--vt-display);
  font-size: clamp(32px, 5vw, 56px);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.014em;
  color: var(--vt-fg);
}

/* ── FAQ skin — match .vt-faq: rule ABOVE each row (none on first), serif
   summary, gold + marker that rotates to × on open. ── */
.vt-template .brk-faq-list { border-top: 0; }
.vt-template .brk-faq {
  border-bottom: 0;
  border-top: 1px solid var(--vt-rule);
}
.vt-template .brk-faq:first-child { border-top: 0; }
.vt-template .brk-faq summary {
  font-family: var(--vt-display);
  font-size: 18px;
  font-weight: 400;
  padding: 20px 40px 20px 0;
}
.vt-template .brk-faq summary::after {
  content: '+';
  font-family: var(--vt-display);
  font-size: 22px;
  font-weight: 400;
  color: var(--vt-accent);
  right: 0;
}
/* VT rotates the + into an × on open (rather than swapping the glyph). */
.vt-template .brk-faq[open] summary::after {
  content: '+';
  transform: translateY(-50%) rotate(45deg);
}
.vt-template .brk-faq p {
  padding: 14px 40px 22px 0;
  font-family: var(--vt-body);
  font-size: 14px;
  line-height: 1.7;
  color: var(--vt-fg);
  opacity: 0.85;
}

/* ── Reviews skin — FLAT hairline-divided rows (no card bg/border), gold ✻
   corner ornament, italic serif blockquote, uppercase attribution. The
   shared inline quote glyph is hidden. Matches .vt-review*. ── */
.vt-template .brk-reviews {
  gap: 0;
  max-width: none;
}
@media (min-width: 720px) {
  .vt-template .brk-reviews { grid-template-columns: 1fr 1fr; gap: 0 48px; }
}
@media (min-width: 821px) {
  .vt-template .brk-reviews { grid-template-columns: 1fr 1fr; }
}
.vt-template .brk-review {
  background: transparent;
  border: 0;
  border-radius: 0;
  border-top: 1px solid var(--vt-rule);
  padding: 32px 0 28px;
}
.vt-template .brk-review:first-child {
  border-top: 0;
  padding-top: 8px;
}
@media (min-width: 720px) {
  .vt-template .brk-review:nth-child(2) {
    border-top: 0;
    padding-top: 8px;
  }
}
/* Hide the shared oversized quotation mark — VT uses no quote glyph. */
.vt-template .brk-review-quote { display: none; }
/* Gold ✻ ornament in the top-right of each review (matches .vt-review::after). */
.vt-template .brk-review::after {
  content: '\\273B';
  position: absolute;
  top: 28px;
  right: 4px;
  color: var(--vt-accent);
  font-family: var(--vt-display);
  font-size: 13px;
  opacity: 0.75;
}
.vt-template .brk-review blockquote {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 19px;
  line-height: 1.55;
  color: var(--vt-fg);
  opacity: 0.94;
  margin: 0 0 18px;
}
.vt-template .brk-review-stars {
  font-family: var(--vt-body);
  font-size: 11px;
  letter-spacing: 0.22em;
  color: var(--vt-accent);
  margin: 0 0 12px;
}
.vt-template .brk-review-attr {
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--vt-fg);
}
/* The location span (rendered as " · {location}") reads back muted. */
.vt-template .brk-review-attr span {
  font-weight: 400;
  opacity: 0.62;
}

/* ── Thank-you skin — centered editorial note. ✳ mark above the title,
   italic serif title + body, gold-rule signature. Matches .vt-thanks*. ── */
.vt-template .brk-thanks {
  max-width: 720px;
  padding-top: 112px;
  padding-bottom: 112px;
}
.vt-template .brk-thanks .brk-eyebrow { margin-bottom: 20px; }
/* The ✳ mark VT rendered as its own span, reproduced above the title.
   U+FE0E forces a text glyph (not a color-emoji) on mobile. */
.vt-template .brk-thanks-title::before {
  content: '\\2733\\FE0E';
  display: block;
  font-family: var(--vt-display);
  font-size: 32px;
  line-height: 1;
  color: var(--vt-accent);
  margin-bottom: 24px;
}
.vt-template .brk-thanks-title {
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 300;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.06;
  letter-spacing: -0.018em;
  color: var(--vt-fg);
  max-width: 640px;
  margin: 0 auto 28px;
}
.vt-template .brk-thanks-body {
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(17px, 1.8vw, 21px);
  line-height: 1.6;
  color: var(--vt-fg);
  opacity: 0.92;
  max-width: 560px;
  margin: 0 auto 48px;
}
.vt-template .brk-thanks-sign {
  display: inline-block;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: 17px;
  color: var(--vt-accent);
  padding-top: 28px;
  border-top: 1px solid var(--vt-rule);
  min-width: 240px;
  margin: 0;
}

/* ── Footer skin — sharp gold CTA + italic serif name + VT hairline cols.
   Matches .vt-footer*. ── */
.vt-template .brk-footer {
  background: transparent;
  margin-top: 32px;
}
/* Keep the shared bottom rule under the CTA band (matches Opaline's
   anchored look); just tune the padding to VT's rhythm. */
.vt-template .brk-footer-cta-band { padding: 48px 24px; }
/* VT's footer CTA is just typography — gold "Reserve" in the body font,
   no fill, no border, no radius. Reads quieter and more editorial than a
   button, consistent with VT's restrained voice. The shared base paints
   it with the accent bg + on-accent text + a border; reset all of those
   so only the type remains. */
.vt-template .brk-footer-book {
  background: transparent;
  color: var(--vt-accent);
  border: 0;
  /* A gold underline below the "Reserve" word — anchors the type the
     way a button surface normally would, while keeping VT's quiet
     editorial voice. Matches the visual weight of the CTAs in the
     other templates without becoming a filled pill. */
  border-bottom: 1px solid var(--vt-accent);
  border-radius: 0;
  padding: 6px 2px 8px;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: clamp(28px, 4vw, 38px);
  letter-spacing: 0.005em;
  text-transform: none;
  transition: opacity 160ms ease, border-color 160ms ease;
}
.vt-template .brk-footer-book:hover {
  filter: none;
  opacity: 0.78;
}
.vt-template .brk-footer-inner {
  max-width: 1080px;
  padding: 72px 24px;
}
.vt-template .brk-footer-name {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--vt-fg);
}
.vt-template .brk-footer-subtext {
  font-family: var(--vt-body);
  font-size: 13px;
  line-height: 1.6;
}
.vt-template .brk-footer-hours-row {
  font-size: 12px;
  padding: 10px 0;
}
.vt-template .brk-footer-hours-row dt { letter-spacing: 0.08em; }
.vt-template .brk-footer-contact {
  font-size: 13px;
  gap: 8px;
}
.vt-template .brk-footer-contact a:hover { color: var(--vt-accent); }
.vt-template .brk-footer-credit-band p { letter-spacing: 0.2em; }

/* ── Instructions skin (Notes + Itinerary) ──────────────────────────────
   Both tab panels now render the shared InstructionsSection. These
   overrides re-apply Velvet Theory's editorial-luxe treatment: gold
   ornaments, upright/italic Fraunces serif, and the gold uppercase kicker.

   • Notes (un-numbered, markGlyph=""): VT decorated each row with a
     lowercase Roman numeral. Reproduced here with a CSS counter on the
     (empty) .brk-instruction-mark — :not(--numbered) scopes it to Notes
     only. Wider 56px marker column matches the old .vt-note grid.
   • Itinerary (numbered): the base ordinal is restyled to VT's italic gold
     serif numeral. ── */

/* Kicker — match the old .vt-card-kicker (gold uppercase micro-label). */
.vt-template .brk-instruction-kicker {
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.24em;
  color: var(--vt-accent);
  margin-bottom: 8px;
}
/* Body title — upright Fraunces serif (matches .vt-note-title). */
.vt-template .brk-instruction-body h3 {
  font-family: var(--vt-display);
  font-weight: 400;
  font-size: 22px;
  color: var(--vt-fg);
  margin-bottom: 10px;
}
.vt-template .brk-instruction-body p {
  font-family: var(--vt-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--vt-fg);
  opacity: 0.85;
}
.vt-template .brk-instruction {
  border-top: 1px solid var(--vt-rule);
}
.vt-template .brk-instruction:last-child { border-bottom: 0; }

/* Notes (advice): no per-row marker — relies on the hairline divider
   between rows for rhythm. (Previously had lowercase roman counters; they
   read as policy-style rules instead of soft editorial notes.) */
.vt-template .brk-instructions:not(.brk-instructions--numbered) .brk-instruction-mark { display: none; }
.vt-template .brk-instructions:not(.brk-instructions--numbered) .brk-instruction {
  grid-template-columns: 1fr;
  align-items: start;
}

/* ── Itinerary only — italic gold serif ordinal (matches VT's numerals) ── */
.vt-template .brk-instructions--numbered .brk-instruction-mark {
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  color: var(--vt-accent);
}
.vt-template .brk-instructions--numbered .brk-instruction-body h3 { font-size: 20px; }

/* ════════════════════════════════════════════════════════════════════
   VT SKIN — Gallery / Before-After / Policy (shared platform sections)
   ────────────────────────────────────────────────────────────────────
   Gallery / Results / Manifesto now render the canonical .brk-gallery* /
   .brk-ba* / .brk-policy* markup. These overrides re-apply Velvet
   Theory's editorial-luxe treatment: flat (no card fills / no borders),
   sharp corners, gold hairlines, Fraunces serif headings, and the
   lowercase Roman-numeral policy marks via a CSS counter. Colors/fonts
   come from the bridged --brk-* tokens.

   Width: the blanket .vt-template .brk-section (max-width:720px) above
   keeps the additionals (FAQ/Reviews/Thanks) in VT's narrow column and
   also frames the Manifesto (which used .vt-section-narrow). Gallery +
   Results lived in the wider 1080px .vt-section, so they're re-widened
   here. Section padding matches the old .vt-section (96px block). ── */
.vt-template .brk-gallery-section,
.vt-template .brk-ba-section {
  max-width: 1080px;
  padding: 96px 32px;
}
.vt-template .brk-policy-section { padding: 96px 32px; }

/* ── Gallery — full-width strips, flat & sharp (matches old .vt-strip).
   The shared strips variant gives full-width rows; VT restores its 2.4:1
   crop, removes the tile border/surface/radius, and widens the group gap.
   Per-item captions don't exist in the shared markup (image-only tiles),
   so VT's old uppercase strip caption is intentionally gone. ── */
.vt-template .brk-gallery-group { display: flex; flex-direction: column; gap: 32px; }
.vt-template .brk-gallery-group + .brk-gallery-group { margin-top: 88px; }
/* Italic Fraunces group heading with the gold underline (old .vt-gallery-title). */
.vt-template .brk-gallery-group-heading {
  text-align: left;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: 22px;
  color: var(--vt-fg);
  padding-bottom: 12px;
  margin: 0 0 16px;
  border-bottom: 1px solid var(--vt-accent);
}
.vt-template .brk-gallery-grid--strips { gap: 32px; }
.vt-template .brk-gallery-grid--strips .brk-gallery-item {
  border: 0;
  border-radius: 0;
  background: transparent;
  aspect-ratio: 2.4 / 1;
}

/* ── Before & After — flat 2-up diptych (matches old .vt-ba-pair).
   Override the shared 3-col (with center separator slot) back to VT's
   even 1fr/1fr; sharp corners, no pane border; gold-hairline FLAT corner
   tags (no pill fill); italic serif caption. ── */
.vt-template .brk-ba-stack { gap: 80px; max-width: none; }
.vt-template .brk-ba-group + .brk-ba-group { margin-top: 88px; }
.vt-template .brk-ba-group-heading {
  text-align: left;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: 22px;
  color: var(--vt-fg);
  padding-bottom: 12px;
  margin: 0 0 16px;
  border-bottom: 1px solid var(--vt-accent);
}
.vt-template .brk-ba-pair { grid-template-columns: 1fr 1fr; gap: 24px; }
.vt-template .brk-ba-pane img {
  aspect-ratio: 3 / 4;
  border: 0;
  border-radius: 0;
}
/* Flat editorial corner tag — VT had captions, reproduced here as a sharp
   gold-hairline mark in the top-left of each pane (no surface, no pill). */
.vt-template .brk-ba-label {
  top: 14px;
  left: 14px;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--vt-bg) 80%, transparent);
  border: 1px solid var(--vt-accent);
  border-radius: 0;
  font-family: var(--vt-body);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.22em;
  color: var(--vt-fg);
}
.vt-template .brk-ba-caption {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 18px;
  color: var(--vt-fg-muted);
}
@media (max-width: 640px) {
  .vt-template .brk-ba-pair { grid-template-columns: 1fr; gap: 16px; }
}

/* ── Manifesto / Policies — hairline-divided clauses with lowercase Roman
   numeral marks (matches old .vt-manifesto + .vt-roman). marker="numeral"
   emits a zero-padded ordinal we BLANK (font-size:0) and replace with a
   CSS counter rendered lower-roman, giving i. ii. iii. … in italic gold
   serif. Rows are flat; the first row drops its top rule (VT had no rule
   above the opening clause). ── */
.vt-template .brk-policy-group-heading {
  text-align: left;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: 22px;
  color: var(--vt-fg);
  border-bottom: 1px solid var(--vt-accent);
  padding-bottom: 12px;
  margin: 0 0 8px;
}
.vt-template .brk-policy-list { border-top: 0; }
.vt-template .brk-policy-list--marked {
  counter-reset: vt-manifesto;
  grid-template-columns: none;
}
.vt-template .brk-policy-row {
  grid-template-columns: auto 1fr;
  gap: 14px;
  padding: 36px 0;
  border-bottom: 0;
  border-top: 1px solid var(--vt-rule);
  align-items: baseline;
  counter-increment: vt-manifesto;
}
.vt-template .brk-policy-list .brk-policy-row:first-child {
  border-top: 0;
  padding-top: 0;
}
/* Hide the shared padded ordinal; the counter ::before supplies i/ii/iii. */
.vt-template .brk-policy-mark {
  font-size: 0;
  font-family: var(--vt-display);
  font-style: italic;
  color: var(--vt-accent);
  text-align: left;
  line-height: 1.2;
}
.vt-template .brk-policy-mark::before {
  content: counter(vt-manifesto, lower-roman) '.';
  font-size: 18px;
  letter-spacing: 0.04em;
}
/* Upright Fraunces clause heading (matches old .vt-manifesto-h). */
.vt-template .brk-policy-title {
  font-family: var(--vt-display);
  font-weight: 400;
  font-size: 24px;
  letter-spacing: -0.005em;
  color: var(--vt-fg);
  margin: 0 0 16px;
}
.vt-template .brk-policy-text {
  font-family: var(--vt-body);
  font-size: 15px;
  line-height: 1.7;
  color: var(--vt-fg);
  opacity: 0.85;
}
`
