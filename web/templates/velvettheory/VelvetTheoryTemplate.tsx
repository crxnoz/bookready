'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, Mail, Instagram, MapPin, MessageSquare, Youtube, Facebook } from 'lucide-react'
import VelvetTheoryBooking from './VelvetTheoryBooking'
import type { PublicSite, Service } from '@/lib/types'
import { safeHref } from '@/lib/safeHref'

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

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

// Roman numerals for policy/about sections — first 20 covers any realistic list.
const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX']
function roman(n: number): string { return ROMAN[n - 1] ?? String(n) }

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
  '#F5EFE6': { bg: '#F5EFE6', fg: '#2D0F19', fgMuted: 'rgba(45,15,25,0.62)',     rule: 'rgba(45,15,25,0.18)' },
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
  const policies    = site.policies  ?? null
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
    { id: 'results',   label: tabLabels.results_label,            key: 'before_after'       },
    { id: 'aftercare', label: tabLabels.steps_label,              key: 'steps'              },
    { id: 'before',    label: tabLabels.before_appointment_label, key: 'before_appointment' },
    { id: 'policies',  label: tabLabels.policy_label,             key: 'policy'             },
  ]
  const tabs = allTabs.filter(t => t.id === 'book' || enabledByTab[t.id])

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
  const stepsList: any[]  = Array.isArray(settings.steps) ? settings.steps : []
  const beforeList: any[] = Array.isArray(settings.before_appointment) ? settings.before_appointment : []
  const additionals: any = settings.additionals ?? {}

  return (
    <>
      <style>{VT_CSS}</style>
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
            </ul>
          </div>
        </section>

        {/* ── Sticky tab nav (serif underline) ── */}
        <nav className="vt-tabs" ref={tabRailRef} aria-label="Sections">
          <div className="vt-tabs-inner">
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
              <p className="vt-eyebrow">Reserve</p>
              <h2 className="vt-h2">Bookings are paused.</h2>
              <p className="vt-prose">
                Online booking is currently unavailable. Please reach out directly — we&rsquo;ll find a time.
              </p>
            </div>
          ) : (
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
          )}
        </section>

        {/* ── Atelier (gallery as strips) ── */}
        <section className={`vt-panel${active === 'gallery' ? ' is-active' : ''}`}>
          <div className="vt-section">
            <p className="vt-eyebrow">{tabLabels.gallery_label}</p>
            <h2 className="vt-h2">Work, on file.</h2>
            <p className="vt-prose vt-prose-lede">
              A selection of recent work from the {signatureWord(displayName)} studio.
            </p>
            {renderGallery(site)}
          </div>
        </section>

        {/* ── About (drop cap) ── */}
        <section className={`vt-panel${active === 'about' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            <p className="vt-eyebrow">Introduction</p>
            <h2 className="vt-h2">{(aboutBlock as any).eyebrow ?? `On ${signatureWord(displayName)}.`}</h2>
            {renderAbout(aboutBlock as any, displayName, p)}
          </div>
        </section>

        {/* ── Transformations (before & after) ── */}
        <section className={`vt-panel${active === 'results' ? ' is-active' : ''}`}>
          <div className="vt-section">
            <p className="vt-eyebrow">{tabLabels.results_label}</p>
            <h2 className="vt-h2">Then, and now.</h2>
            {renderBeforeAfter(site)}
          </div>
        </section>

        {/* ── Notes (advice cards) ── */}
        <section className={`vt-panel${active === 'aftercare' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            <p className="vt-eyebrow">{tabLabels.steps_label}</p>
            <h2 className="vt-h2">Care, prolonged.</h2>
            <div className="vt-notes">
              {(stepsList.length > 0 ? stepsList : DEFAULT_STEPS).map((step: any, i: number) => (
                <article key={i} className="vt-note">
                  <span className="vt-note-num">{roman(i + 1).toLowerCase()}</span>
                  <div className="vt-note-body">
                    <h3 className="vt-note-title">{step.title ?? `Note ${i + 1}`}</h3>
                    {step.content && <p>{step.content}</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Itinerary (diary timeline) ── */}
        <section className={`vt-panel${active === 'before' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            <p className="vt-eyebrow">{tabLabels.before_appointment_label}</p>
            <h2 className="vt-h2">Before your visit.</h2>
            <dl className="vt-diary">
              {(beforeList.length > 0 ? beforeList : DEFAULT_BEFORE).map((item: any, i: number) => (
                <div key={i} className="vt-diary-entry">
                  <dt>{item.when ?? `Step ${i + 1}`}</dt>
                  <dd>
                    <h3 className="vt-diary-title">{item.title ?? ''}</h3>
                    {item.content && <p>{item.content}</p>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Manifesto (policies as Roman numeral sections) ── */}
        <section className={`vt-panel${active === 'policies' ? ' is-active' : ''}`}>
          <div className="vt-section vt-section-narrow">
            <p className="vt-eyebrow">{tabLabels.policy_label}</p>
            <h2 className="vt-h2">The practice.</h2>
            {renderPolicies(policies)}
          </div>
        </section>

        {/* ── Additionals: thank-you opens it, then FAQs ── */}
        <section className="vt-additionals">
          {/* Thank-you note — first impression at the bottom of every tab.
              Editorial treatment: italic Fraunces title, italic body, gold
              signature line. Reads as a handwritten note from the studio. */}
          {additionals.show_thank_you !== false
            && (additionals.thank_you_title || additionals.thank_you_body) && (
            <div className="vt-section vt-section-narrow vt-thanks">
              <p className="vt-eyebrow vt-thanks-eyebrow">A note</p>
              <span className="vt-thanks-mark" aria-hidden="true">&#x2733;</span>
              <h2 className="vt-thanks-title">
                {additionals.thank_you_title ?? 'Thank you.'}
              </h2>
              {additionals.thank_you_body && (
                <p className="vt-thanks-body">{additionals.thank_you_body}</p>
              )}
              <span className="vt-thanks-sign">&mdash;&nbsp;{signatureWord(displayName)}</span>
            </div>
          )}

          {/* FAQs — only render when present + enabled. The backend shape is
              additionals.faq.{ enabled, heading, items[{q,a}] }. */}
          {additionals.faq?.enabled !== false
            && Array.isArray(additionals.faq?.items)
            && additionals.faq.items.length > 0 && (
            <div className="vt-section vt-section-narrow">
              <p className="vt-eyebrow">Questions</p>
              <h2 className="vt-h2">{additionals.faq.heading ?? 'Frequently asked.'}</h2>
              <div className="vt-faqs">
                {additionals.faq.items.map((f: any, i: number) => (
                  <details key={i} className="vt-faq">
                    <summary>{f.q ?? f.question ?? ''}</summary>
                    <p>{f.a ?? f.answer ?? ''}</p>
                  </details>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Footer: Reserve CTA, contact info, colophon ── */}
        <footer className="vt-footer">
          <div className="vt-footer-inner">

            {/* Book CTA — same typography as the hero CTA */}
            <button type="button" className="vt-link-cta vt-footer-cta" onClick={goBook}>
              Reserve
            </button>

            {/* Hours — moved into the footer so business info reads as one
                contiguous block at the bottom of the page rather than two
                competing sections. */}
            {hours.length > 0 && (
              <dl className="vt-footer-hours">
                {hours.map((h: any) => (
                  <div key={h.id} className="vt-footer-hours-row">
                    <dt>{h.day_name}</dt>
                    <dd>
                      {h.is_open && h.open_time && h.close_time
                        ? `${fmt12(h.open_time)} — ${fmt12(h.close_time)}`
                        : 'Closed'}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Contact info strip */}
            {(address || p?.public_phone || p?.public_email) && (
              <div className="vt-footer-contact">
                {address && <span>{address}</span>}
                {p?.public_phone && (() => {
                  const tel = `tel:${p.public_phone.replace(/[^\d+]/g, '')}`
                  return <a href={tel}>{p.public_phone}</a>
                })()}
                {p?.public_email && (
                  <a href={`mailto:${p.public_email}`}>{p.public_email}</a>
                )}
              </div>
            )}

            {/* Colophon */}
            <div className="vt-footer-meta">
              <span>Velvet Theory</span>
              <span className="vt-footer-dot">·</span>
              <span>&copy; {new Date().getFullYear()} {displayName}</span>
              {footerSettings.show_powered_by !== false && (
                <>
                  <span className="vt-footer-dot">·</span>
                  <span>Powered by BookReady</span>
                </>
              )}
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

// ── Section renderers ────────────────────────────────────────────────────────

function renderGallery(site: PublicSite) {
  const groups = (site as any).gallery_groups ?? []
  const items  = ((site as any).gallery ?? []).filter((i: any) => i.is_active !== false)
  if (items.length === 0) {
    return <p className="vt-empty-line">No work on file yet.</p>
  }
  // Group items by group_id; ungrouped items collapse into a single "Selected" group
  const byGroup = new Map<number | null, any[]>()
  for (const item of items) {
    const gid = (item.group_id ?? null) as number | null
    if (!byGroup.has(gid)) byGroup.set(gid, [])
    byGroup.get(gid)!.push(item)
  }
  const groupedSections: { title: string | null; items: any[] }[] = []
  for (const g of groups) {
    const its = byGroup.get(g.id)
    if (its && its.length > 0) groupedSections.push({ title: g.title ?? null, items: its })
  }
  const ungrouped = byGroup.get(null)
  if (ungrouped && ungrouped.length > 0) {
    groupedSections.push({ title: groupedSections.length === 0 ? null : 'Other work', items: ungrouped })
  }
  return (
    <div className="vt-gallery">
      {groupedSections.map((grp, gi) => (
        <div key={gi} className="vt-gallery-group">
          {grp.title && <h3 className="vt-gallery-title">{grp.title}</h3>}
          {grp.items.map((it: any) => (
            <figure key={it.id} className="vt-strip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image_url} alt={it.caption ?? ''} />
              {it.caption && <figcaption>{it.caption}</figcaption>}
            </figure>
          ))}
        </div>
      ))}
    </div>
  )
}

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
  const imgs: string[] = [
    aboutBlock?.image_1_url, aboutBlock?.image_2_url, aboutBlock?.image_3_url,
  ].filter(Boolean)
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
      {imgs.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <figure key={i} className="vt-strip"><img src={src} alt="" /></figure>
      ))}
    </div>
  )
}

function renderBeforeAfter(site: PublicSite) {
  const items  = ((site as any).before_after ?? []).filter((i: any) => i.is_active !== false)
  if (items.length === 0) {
    return <p className="vt-empty-line">No transformations on file yet.</p>
  }
  return (
    <div className="vt-ba">
      {items.map((it: any) => (
        <div key={it.id} className="vt-ba-pair">
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.before_image_url} alt="Before" />
            <figcaption>Before</figcaption>
          </figure>
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.after_image_url} alt="After" />
            <figcaption>After</figcaption>
          </figure>
        </div>
      ))}
    </div>
  )
}

function renderPolicies(policies: any) {
  if (!policies) {
    return <p className="vt-empty-line">No published policies yet.</p>
  }
  const items: { heading: string; body: string }[] = []
  const tryPush = (heading: string, body: string | null | undefined) => {
    const b = (body ?? '').trim()
    if (b !== '') items.push({ heading, body: b })
  }
  tryPush('On Deposits',           policies.deposit_policy)
  tryPush('On Cancellations',      policies.cancellation_policy)
  tryPush('On Late Arrivals',      policies.late_policy)
  tryPush('On No-Shows',           policies.no_show_policy)
  tryPush('On Refunds',            policies.refund_policy)
  tryPush('On Children & Guests',  policies.guest_policy)

  // Custom groups from the policies editor.
  if (Array.isArray(policies.custom_groups)) {
    for (const grp of policies.custom_groups) {
      if (!grp || typeof grp !== 'object') continue
      const heading = (grp.heading ?? '').trim()
      const groupItems = Array.isArray(grp.items) ? grp.items : []
      if (heading === '' && groupItems.length === 0) continue
      // Custom groups can have multiple items; merge them under the group heading
      const body = groupItems
        .map((it: any) => `${it.title ? it.title + '. ' : ''}${it.content ?? ''}`.trim())
        .filter((s: string) => s !== '')
        .join('\n\n')
      tryPush(heading || 'Additional', body)
    }
  }

  if (items.length === 0) {
    return <p className="vt-empty-line">No published policies yet.</p>
  }
  return (
    <ol className="vt-manifesto">
      {items.map((it, i) => (
        <li key={i}>
          <h3 className="vt-manifesto-h"><span className="vt-roman">{roman(i + 1)}.</span> {it.heading}</h3>
          {it.body.split(/\n{2,}/).map((para, pi) => <p key={pi} className="vt-prose">{para}</p>)}
        </li>
      ))}
    </ol>
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
  --vt-bg: #2D0F19;
  --vt-fg: #F5EFE6;
  --vt-fg-muted: rgba(245,239,230,0.62);
  --vt-rule: rgba(245,239,230,0.18);
  --vt-accent: #C9A876;
  --vt-display: 'Fraunces', 'Cormorant Garamond', Georgia, serif;
  --vt-body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
   `border: 0` was killing the gold underline on button-rendered CTAs. */
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
/* Underline sits flush with the parent's border-bottom (bottom: -1px lines
   up exactly with the 1px hairline) and spans just the text area, not the
   full padded tab — feels more like a typesetter's mark than a button
   state. */
.vt-tab.is-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
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
.vt-prose-lede {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 19px;
  opacity: 0.95;
  margin-bottom: 56px;
  max-width: 560px;
}
.vt-empty-line {
  font-family: var(--vt-display);
  font-style: italic;
  color: var(--vt-fg-muted);
  font-size: 16px;
  padding: 24px 0;
}
.vt-empty {
  text-align: center;
  padding: 120px 32px;
}

/* ── Gallery: full-width strips, not grids ── */
.vt-gallery {
  display: flex;
  flex-direction: column;
  gap: 88px;
}
.vt-gallery-group {
  display: flex;
  flex-direction: column;
  gap: 32px;
}
.vt-gallery-title {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 22px;
  color: var(--vt-fg);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vt-accent);
  margin-bottom: 16px;
}
.vt-strip {
  margin: 0;
}
.vt-strip img {
  width: 100%;
  display: block;
  aspect-ratio: 2.4 / 1;
  object-fit: cover;
}
.vt-strip figcaption {
  margin-top: 12px;
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--vt-fg-muted);
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
.vt-about .vt-strip {
  margin: 48px 0;
}

/* ── Transformations: before/after ── */
.vt-ba {
  display: flex;
  flex-direction: column;
  gap: 80px;
}
.vt-ba-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.vt-ba-pair figure {
  margin: 0;
}
.vt-ba-pair img {
  width: 100%;
  aspect-ratio: 3 / 4;
  object-fit: cover;
  display: block;
}
.vt-ba-pair figcaption {
  margin-top: 12px;
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--vt-fg-muted);
}
@media (max-width: 640px) {
  .vt-ba-pair { grid-template-columns: 1fr; gap: 16px; }
}

/* ── Notes ── */
.vt-notes {
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-top: 16px;
}
.vt-note {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--vt-rule);
}
.vt-note:first-child { border-top: 0; padding-top: 0; }
.vt-note-num {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 28px;
  color: var(--vt-accent);
  line-height: 1;
}
.vt-note-title {
  font-family: var(--vt-display);
  font-size: 22px;
  font-weight: 400;
  margin-bottom: 10px;
}
.vt-note-body p {
  font-family: var(--vt-body);
  font-size: 15px;
  line-height: 1.7;
  opacity: 0.85;
}

/* ── Itinerary / diary ── */
.vt-diary {
  display: flex;
  flex-direction: column;
}
.vt-diary-entry {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 32px;
  padding: 28px 0;
  border-top: 1px solid var(--vt-rule);
}
.vt-diary-entry:first-child { border-top: 0; }
.vt-diary-entry dt {
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--vt-accent);
  padding-top: 8px;
}
.vt-diary-title {
  font-family: var(--vt-display);
  font-size: 20px;
  font-weight: 400;
  margin-bottom: 8px;
}
.vt-diary-entry dd p {
  font-family: var(--vt-body);
  font-size: 15px;
  line-height: 1.7;
  opacity: 0.85;
}
@media (max-width: 640px) {
  .vt-diary-entry { grid-template-columns: 1fr; gap: 12px; }
}

/* ── Manifesto / Roman-numeral policies ── */
.vt-manifesto {
  counter-reset: vt-manifesto;
}
.vt-manifesto li {
  padding: 36px 0;
  border-top: 1px solid var(--vt-rule);
}
.vt-manifesto li:first-child { border-top: 0; padding-top: 0; }
.vt-manifesto-h {
  font-family: var(--vt-display);
  font-size: 24px;
  font-weight: 400;
  letter-spacing: -0.005em;
  margin-bottom: 16px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.vt-roman {
  font-family: var(--vt-display);
  font-style: italic;
  font-size: 18px;
  color: var(--vt-accent);
  letter-spacing: 0.04em;
}

/* ── Additionals (thank-you + FAQs only — hours now lives in the footer) ── */
.vt-additionals { padding: 0; }
.vt-additionals > .vt-section { border-top: 1px solid var(--vt-rule); padding-top: 80px; }

/* Thank-you: editorial moment. Italic Fraunces title, italic body,
   asterisk mark above, gold-rule signature below. Reads as a real note
   from the studio rather than a template placeholder. */
.vt-thanks {
  text-align: center;
  padding-top: 112px;
  padding-bottom: 112px;
}
.vt-thanks-eyebrow {
  margin-bottom: 20px;
}
.vt-thanks-mark {
  display: block;
  font-family: var(--vt-display);
  font-size: 32px;
  color: var(--vt-accent);
  line-height: 1;
  margin-bottom: 24px;
}
.vt-thanks-title {
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 300;
  font-size: clamp(40px, 6vw, 64px);
  line-height: 1.06;
  letter-spacing: -0.018em;
  color: var(--vt-fg);
  margin: 0 auto 28px;
  max-width: 640px;
}
.vt-thanks-body {
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
/* Signature underline only — no asterisk repeated. */
.vt-thanks-sign {
  display: inline-block;
  font-family: var(--vt-display);
  font-style: italic;
  font-weight: 400;
  font-size: 17px;
  color: var(--vt-accent);
  padding-top: 28px;
  border-top: 1px solid var(--vt-rule);
  min-width: 240px;
}

/* ── FAQs ── */
.vt-faqs { display: flex; flex-direction: column; }
.vt-faq {
  border-top: 1px solid var(--vt-rule);
  padding: 20px 0;
}
.vt-faq:first-child { border-top: 0; padding-top: 0; }
.vt-faq summary {
  font-family: var(--vt-display);
  font-size: 18px;
  cursor: pointer;
  list-style: none;
  position: relative;
  padding-right: 32px;
}
.vt-faq summary::-webkit-details-marker { display: none; }
.vt-faq summary::after {
  content: '+';
  position: absolute;
  right: 0;
  top: 0;
  font-family: var(--vt-display);
  font-size: 22px;
  color: var(--vt-accent);
  transition: transform 200ms ease;
}
.vt-faq[open] summary::after { transform: rotate(45deg); }
.vt-faq p {
  margin-top: 14px;
  font-family: var(--vt-body);
  font-size: 14px;
  line-height: 1.7;
  opacity: 0.85;
}

/* ── Footer: Reserve CTA + hours + contact info + colophon ── */
.vt-footer {
  border-top: 1px solid var(--vt-rule);
  padding: 56px 24px 32px;
  margin-top: 32px;
}
.vt-footer-inner {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36px;
  text-align: center;
}
.vt-footer-cta {
  /* Inherits the gold-underlined Fraunces styling from .vt-link-cta. */
}
.vt-footer-hours {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  text-align: left;
}
.vt-footer-hours-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--vt-rule);
  font-family: var(--vt-body);
  font-size: 12px;
  letter-spacing: 0.04em;
}
.vt-footer-hours-row:first-child { border-top: 0; }
.vt-footer-hours-row dt {
  font-weight: 500;
  color: var(--vt-fg);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 11px;
}
.vt-footer-hours-row dd {
  color: var(--vt-fg-muted);
}
.vt-footer-contact {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 28px;
  width: 100%;
  padding: 28px 0;
  border-top: 1px solid var(--vt-rule);
  border-bottom: 1px solid var(--vt-rule);
  font-family: var(--vt-body);
  font-size: 12px;
  line-height: 1.7;
  color: var(--vt-fg);
  opacity: 0.85;
}
.vt-footer-contact a {
  color: var(--vt-fg);
  transition: color 160ms ease;
}
.vt-footer-contact a:hover { color: var(--vt-accent); }
.vt-footer-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 14px;
  font-family: var(--vt-body);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--vt-fg-muted);
}
.vt-footer-dot { color: var(--vt-accent); }

/* Mobile tweaks (tab-specific rules live in the .vt-tabs block above) */
@media (max-width: 640px) {
  .vt-hero { padding: 60px 20px 80px; }
  .vt-section { padding: 60px 20px; }
  .vt-hero-contacts { gap: 14px; }
  .vt-strip img { aspect-ratio: 1.5 / 1; }
}
`
