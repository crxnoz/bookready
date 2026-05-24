'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  FileText, Image as ImageIcon, Info, ListChecks,
  Eye, EyeOff, Lock, Plus, Smartphone, Monitor, ExternalLink, Copy,
  Check, Loader2, Heart, Phone, Mail, Instagram, MapPin, Sparkles,
  Megaphone, MessageSquare, ChevronRight, AlertCircle, RefreshCw,
  Edit2, Trash2, X, Link as LinkIcon, ArrowUp, ArrowDown, ChevronDown,
  Clock, Building2,
} from 'lucide-react'
import BusinessForm from '@/components/editor/BusinessForm'
import {
  getCurrentUser,
  getEditorTemplateSettings,
  updateEditorTemplateSettings,
  getEditorWebsiteSections,
  updateEditorWebsiteSection,
  getEditorGallery,
  createEditorGalleryItem,
  updateEditorGalleryItem,
  deleteEditorGalleryItem,
  getEditorBeforeAfter,
  createEditorBeforeAfterItem,
  updateEditorBeforeAfterItem,
  deleteEditorBeforeAfterItem,
  getEditorPolicies,
  updateEditorPolicies,
} from '@/lib/api'
import type {
  TemplateSettings,
  TemplateHeaderSettings,
  TemplateFooterSettings,
  TemplateAdditionalsSettings,
  TemplateAboutSettings,
  WebsiteSection,
  GalleryItem,
  GalleryItemPayload,
  BeforeAfterItem,
  BeforeAfterItemPayload,
  BusinessPolicy,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Types & constants ────────────────────────────────────────────────────────

type SubTab = 'overview' | 'business' | 'header' | 'content' | 'additionals' | 'footer'

const VALID_TABS: SubTab[] = ['overview', 'business', 'header', 'content', 'additionals', 'footer']

function hrefFor(tab: SubTab): string {
  return tab === 'overview' ? '/editor/website' : `/editor/website?tab=${tab}`
}

const SECTION_LABEL_FOR_KEY: Record<string, string> = {
  header:             'Header',
  book:               'Booking',
  gallery:            'Gallery',
  policy:             'Policy',
  about:              'About',
  before_after:       'Before & After',
  steps:              'Steps',
  before_appointment: 'Before Your Appointment',
  footer:             'Footer',
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  header:             Sparkles,
  book:               Heart,
  booking:            Heart,
  gallery:            ImageIcon,
  policy:             FileText,
  about:              Info,
  before_after:       Sparkles,
  steps:              ListChecks,
  before_appointment: ListChecks,
  instructions:       ListChecks,
  footer:             Lock,
  text_block:         FileText,
  announcement:       Megaphone,
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function WebsiteHub() {
  const searchParams = useSearchParams()
  const rawTab = searchParams?.get('tab') ?? 'overview'
  const tab: SubTab = VALID_TABS.includes(rawTab as SubTab)
    ? (rawTab as SubTab)
    : 'overview'

  const [slug, setSlug]               = useState<string | null>(null)
  const [templateSlug, setTplSlug]    = useState<string>('thefaderoom')
  const [settings, setSettings]       = useState<TemplateSettings | null>(null)
  const [sections, setSections]       = useState<WebsiteSection[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [previewKey, setPreviewKey]   = useState(0)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getCurrentUser(),
      getEditorTemplateSettings(),
      getEditorWebsiteSections(),
    ])
      .then(([user, tpl, secs]) => {
        if (cancelled) return
        setSlug(user.tenant_id)
        setTplSlug(tpl.template_slug)
        setSettings(tpl.settings)
        setSections(secs)
      })
      .catch(err => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Failed to load website settings')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? 'bkrdy.me'
  const publicUrl  = slug ? `https://${slug}.${baseDomain}` : ''

  async function saveSettings(partial: Partial<TemplateSettings>): Promise<void> {
    const res = await updateEditorTemplateSettings(partial)
    setSettings(res.settings)
    setPreviewKey(k => k + 1)
  }

  async function toggleSection(id: number, enabled: boolean): Promise<void> {
    const updated = await updateEditorWebsiteSection(id, { is_enabled: enabled })
    setSections(prev => prev.map(s => s.id === id ? updated : s))
    setPreviewKey(k => k + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-cream">
        <Loader2 size={20} className="animate-spin text-muted-text" />
      </div>
    )
  }

  if (loadError || !settings) {
    return (
      <div className="p-6 bg-cream min-h-full">
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5 text-sm text-red-700">
          {loadError ?? 'Could not load website settings.'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-cream">

      <div className="flex-1">
        <div className="px-4 md:px-8 py-6 w-full">

          {/* Page head */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-near-black tracking-tight">Website</h1>
              <p className="text-sm text-muted-text mt-0.5">
                Manage your public website content, template sections, and preview.
              </p>
            </div>
            {slug && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <CopyLinkButton url={publicUrl} />
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black border border-[rgba(18,18,18,0.15)] bg-white px-2.5 py-1.5 hover:border-near-black"
                >
                  <ExternalLink size={12} /> View Site
                </a>
              </div>
            )}
          </div>

          <div className="mb-6" />


          {/* Editor + preview split */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-6">

            {/* Editor */}
            <div className="space-y-5 min-w-0">
              {tab === 'overview' && (
                <OverviewPanel
                  templateSlug={templateSlug}
                  settings={settings}
                  sections={sections}
                  publicUrl={publicUrl}
                  onToggleSection={toggleSection}
                />
              )}

              {tab === 'business' && (
                <div className="bg-white border border-[rgba(18,18,18,0.10)]">
                  <BusinessForm onAfterSave={() => setPreviewKey(k => k + 1)} />
                </div>
              )}

              {tab === 'header' && (
                <HeaderPanel settings={settings} onSave={saveSettings} />
              )}

              {tab === 'content' && (
                <ContentTabsPanel
                  settings={settings}
                  sections={sections}
                  onSaveSettings={saveSettings}
                  onToggleSection={toggleSection}
                />
              )}

              {tab === 'additionals' && (
                <AdditionalsPanel settings={settings} onSave={saveSettings} />
              )}

              {tab === 'footer' && (
                <FooterPanel settings={settings} onSave={saveSettings} />
              )}
            </div>

            {/* Preview — sticky on desktop, stacks below on mobile */}
            <div className="xl:sticky xl:top-4 xl:self-start">
              <PreviewPanel url={publicUrl} refreshKey={previewKey} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── Shared atoms ─────────────────────────────────────────────────────────────

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* no-op */ }
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-near-black border border-[rgba(18,18,18,0.15)] bg-white px-2.5 py-1.5 hover:border-near-black"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5 space-y-4">
      <div>
        <h2 className="text-base font-bold text-near-black">{title}</h2>
        {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

/**
 * Collapsible variant of Panel. Same look + same children, but the header
 * row is a button that toggles a local open state, and an optional
 * statusBadge surfaces an at-a-glance summary while the section is closed.
 */
function CollapsibleSection({
  title, subtitle, statusBadge, defaultOpen = false, icon: Icon, children,
}: {
  title:        string
  subtitle?:    string
  statusBadge?: React.ReactNode
  defaultOpen?: boolean
  icon?:        React.ElementType
  children:     React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)]">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-cream/50 transition-colors"
      >
        {Icon && (
          <div className="w-8 h-8 flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-cream flex-shrink-0">
            <Icon size={14} className="text-near-black" strokeWidth={1.7} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-near-black">{title}</h2>
            {statusBadge}
          </div>
          {subtitle && <p className="text-xs text-muted-text mt-0.5">{subtitle}</p>}
        </div>
        <ChevronDown
          size={16}
          className={cn(
            'text-muted-text flex-shrink-0 transition-transform',
            open ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-[rgba(18,18,18,0.06)]">
          {children}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ children, tone = 'neutral' }: {
  children: React.ReactNode
  tone?: 'neutral' | 'muted' | 'accent'
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 border',
      tone === 'neutral' && 'border-[rgba(18,18,18,0.15)] bg-cream text-[rgba(18,18,18,0.7)]',
      tone === 'muted'   && 'border-transparent bg-lavender text-[rgba(18,18,18,0.55)]',
      tone === 'accent'  && 'border-transparent bg-blush text-[rgba(18,18,18,0.7)]',
    )}>
      {children}
    </span>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{children}</span>
      {hint && <span className="text-[10px] text-muted-text">{hint}</span>}
    </div>
  )
}

function TextField({
  label, value, onChange, placeholder, maxLength, hint, disabled, disabledHint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  hint?: string
  disabled?: boolean
  disabledHint?: string
}) {
  return (
    <label className="block">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        className={cn(
          'mt-1.5 w-full bg-white border px-3 py-2 text-sm text-near-black focus:outline-none',
          disabled
            ? 'border-[rgba(18,18,18,0.08)] bg-cream text-muted-text cursor-not-allowed'
            : 'border-[rgba(18,18,18,0.15)] focus:border-near-black',
        )}
      />
      {disabledHint && (
        <p className="text-[10px] text-muted-text mt-1 flex items-center gap-1">
          <AlertCircle size={10} /> {disabledHint}
        </p>
      )}
    </label>
  )
}

function TextareaField({
  label, value, onChange, placeholder, rows = 3, maxLength,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  maxLength?: number
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
      />
    </label>
  )
}

function ToggleRow({
  label, icon: Icon, on, onToggle, hint,
}: {
  label: string
  icon?: React.ElementType
  on: boolean
  onToggle: () => void
  hint?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-[rgba(18,18,18,0.08)] px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="text-near-black flex-shrink-0" strokeWidth={1.8} />}
        <div className="min-w-0">
          <span className="text-sm text-near-black block">{label}</span>
          {hint && <span className="text-[11px] text-muted-text">{hint}</span>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          'relative inline-flex items-center w-10 h-5 transition-colors border flex-shrink-0',
          on ? 'bg-near-black border-near-black' : 'bg-white border-[rgba(18,18,18,0.25)]',
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-3.5 h-3.5 bg-white border border-[rgba(18,18,18,0.15)] transition-all',
          on ? 'left-[22px]' : 'left-0.5',
        )} />
      </button>
    </div>
  )
}

function HeaderButtonRow({
  label, icon: Icon, on, onToggle, url, onUrlChange, placeholder,
}: {
  label: string
  icon: React.ElementType
  on: boolean
  onToggle: () => void
  url: string
  onUrlChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="border border-[rgba(18,18,18,0.08)] bg-white">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className="text-near-black flex-shrink-0" strokeWidth={1.8} />
          <span className="text-sm text-near-black">{label}</span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={onToggle}
          className={cn(
            'relative inline-flex items-center w-10 h-5 transition-colors border flex-shrink-0',
            on ? 'bg-near-black border-near-black' : 'bg-white border-[rgba(18,18,18,0.25)]',
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-3.5 h-3.5 bg-white border border-[rgba(18,18,18,0.15)] transition-all',
            on ? 'left-[22px]' : 'left-0.5',
          )} />
        </button>
      </div>
      {on && (
        <div className="px-3 pb-2.5 -mt-0.5">
          <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.15)] px-2 focus-within:border-near-black">
            <LinkIcon size={12} className="text-muted-text flex-shrink-0" />
            <input
              type="text"
              value={url}
              onChange={e => onUrlChange(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent py-1.5 text-xs text-near-black focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function SaveBar({
  dirty, saving, saved, error, onSave,
}: {
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string | null
  onSave: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-[rgba(18,18,18,0.08)]">
      <div className="text-xs flex items-center gap-2">
        {error && <span className="text-red-700">{error}</span>}
        {!error && saved && !saving && (
          <span className="text-green-700 inline-flex items-center gap-1">
            <Check size={12} /> Saved
          </span>
        )}
        {!error && !saved && dirty && (
          <span className="text-muted-text">Unsaved changes</span>
        )}
      </div>
      <button
        onClick={onSave}
        disabled={!dirty || saving}
        className={cn(
          'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
          dirty && !saving
            ? 'bg-near-black text-white'
            : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.12)] cursor-not-allowed',
        )}
      >
        {saving && <Loader2 size={11} className="animate-spin" />}
        {saving ? 'Saving' : 'Save changes'}
      </button>
    </div>
  )
}

// Tiny hook to manage local-vs-saved settings state
function useSettingsForm<T extends object>(
  initial: T,
  save: (next: T) => Promise<void>,
): {
  value: T
  setValue: (v: T) => void
  patch: (p: Partial<T>) => void
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string | null
  doSave: () => Promise<void>
} {
  const [value, setValue] = useState<T>(initial)
  const [baseline, setBaseline] = useState<T>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(
    () => JSON.stringify(value) !== JSON.stringify(baseline),
    [value, baseline],
  )

  function patch(p: Partial<T>) {
    setValue(v => ({ ...v, ...p }))
  }

  async function doSave() {
    setSaving(true); setError(null); setSaved(false)
    try {
      await save(value)
      setBaseline(value)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return { value, setValue, patch, dirty, saving, saved, error, doSave }
}

// ── Overview ─────────────────────────────────────────────────────────────────

function OverviewPanel({
  templateSlug, settings, sections, publicUrl, onToggleSection,
}: {
  templateSlug: string
  settings: TemplateSettings
  sections: WebsiteSection[]
  publicUrl: string
  onToggleSection: (id: number, enabled: boolean) => Promise<void>
}) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [sections],
  )
  const [busyId, setBusyId] = useState<number | null>(null)

  const enabledCount = sections.filter(s => s.is_enabled).length

  const QUICK_LINKS: { tab: SubTab; label: string; icon: React.ElementType; hint: string }[] = [
    { tab: 'business',    label: 'Business Info',  icon: Building2,  hint: 'Name, tagline, contact, address' },
    { tab: 'header',      label: 'Header / Hero',  icon: Sparkles,   hint: 'Announcement, tagline, buttons' },
    { tab: 'content',     label: 'Content / Tabs', icon: ListChecks, hint: 'Tab labels, gallery, policies' },
    { tab: 'additionals', label: 'Additionals',    icon: Plus,       hint: 'Thank-you, extra sections' },
    { tab: 'footer',      label: 'Footer',         icon: Info,       hint: 'Subtext, links, BookReady badge' },
  ]

  async function toggle(s: WebsiteSection) {
    if (s.is_locked) return
    setBusyId(s.id)
    try {
      await onToggleSection(s.id, !s.is_enabled)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Template + status */}
      <Panel
        title={templateSlug === 'thefaderoom' ? 'The Fade Room' : templateSlug}
        subtitle="Current template"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-transparent bg-blush text-[rgba(18,18,18,0.7)] px-1.5 py-0.5">
            Active
          </span>
          <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.12)] bg-white text-near-black px-1.5 py-0.5">
            {enabledCount} sections visible
          </span>
          <span className="text-xs text-muted-text font-mono">{templateSlug}</span>
        </div>
        <p className="text-xs text-muted-text leading-relaxed">
          Changing templates keeps your business info, services, bookings, staff,
          customers, availability, and policies. Template-specific settings may reset.
        </p>
        <button
          disabled
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.12)] bg-cream text-muted-text px-3 py-2 cursor-not-allowed"
        >
          Change Template — coming soon
        </button>
      </Panel>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_LINKS.map(({ tab, label, icon: Icon, hint }) => (
          <Link
            key={tab}
            href={hrefFor(tab)}
            scroll={false}
            className="text-left bg-white border border-[rgba(18,18,18,0.10)] p-4 hover:border-near-black transition-colors flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-cream flex-shrink-0">
                <Icon size={14} className="text-near-black" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-near-black">{label}</p>
                <p className="text-[11px] text-muted-text mt-0.5">{hint}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-text flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>

      {/* Section visibility controller */}
      <Panel
        title="Section visibility"
        subtitle="Show or hide sections on your public site. Locked sections always stay visible."
      >
        <div className="space-y-1.5">
          {sorted.map(s => {
            const Icon = SECTION_ICONS[s.section_type] ?? FileText
            const label = s.title ?? SECTION_LABEL_FOR_KEY[s.section_key] ?? s.section_key
            const busy = busyId === s.id
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center justify-between gap-3 border px-3 py-2.5',
                  s.is_enabled
                    ? 'border-[rgba(18,18,18,0.10)] bg-white'
                    : 'border-[rgba(18,18,18,0.06)] bg-white opacity-70',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={14} className="text-near-black flex-shrink-0" strokeWidth={1.7} />
                  <span className="text-sm text-near-black truncate">{label}</span>
                  {s.is_locked && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-[rgba(18,18,18,0.7)] px-1.5 py-0.5 flex-shrink-0">
                      <Lock size={9} /> Locked
                    </span>
                  )}
                </div>
                {s.is_locked ? (
                  <span className="text-[10px] uppercase tracking-[0.08em] text-muted-text font-semibold">Always on</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => toggle(s)}
                    disabled={busy}
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase border px-2 py-1.5 flex-shrink-0',
                      s.is_enabled
                        ? 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black'
                        : 'bg-near-black border-near-black text-white',
                    )}
                  >
                    {s.is_enabled ? <><Eye size={11} /> Visible</> : <><EyeOff size={11} /> Hidden</>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Core data hints */}
      <Panel
        title="Bookings data"
        subtitle="Services and availability live under Bookings — change them once and they update everywhere."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <CoreLink href="/editor/services"  label="Services"      hint="Lives under Bookings" />
          <CoreLink href="/editor/availability" label="Availability" hint="Lives under Bookings" />
        </div>
      </Panel>

      {publicUrl && (
        <Panel title="Public site" subtitle="Your live website URL.">
          <p className="text-sm font-mono text-near-black break-all">{publicUrl}</p>
        </Panel>
      )}
    </div>
  )
}

function CoreLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="bg-white border border-[rgba(18,18,18,0.10)] p-3 hover:border-near-black flex items-center justify-between gap-2"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-near-black truncate">{label}</p>
        <p className="text-[11px] text-muted-text">{hint}</p>
      </div>
      <ChevronRight size={14} className="text-muted-text flex-shrink-0" />
    </Link>
  )
}

// ── Header / Hero ────────────────────────────────────────────────────────────

function HeaderPanel({
  settings, onSave,
}: {
  settings: TemplateSettings
  onSave: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const form = useSettingsForm<TemplateHeaderSettings>(
    settings.header,
    async (next) => { await onSave({ header: next }) },
  )

  return (
    <Panel
      title="Header / Hero"
      subtitle="The top of your public website — announcement, cover, business identity, and contact buttons."
    >
      {/* Announcement */}
      <div className="space-y-2.5">
        <TextField
          label="Announcement bar text"
          value={form.value.announcement_text ?? ''}
          onChange={v => form.patch({ announcement_text: v })}
          placeholder="Now booking for the season — limited weekend slots."
          maxLength={200}
        />
        <ToggleRow
          label="Show announcement bar"
          icon={Megaphone}
          on={form.value.show_announcement ?? true}
          onToggle={() => form.patch({ show_announcement: !(form.value.show_announcement ?? true) })}
        />
      </div>

      {/* Images */}
      <div className="space-y-2.5 pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <TextField
          label="Cover image URL"
          value={form.value.cover_image_url ?? ''}
          onChange={v => form.patch({ cover_image_url: v || null })}
          placeholder="https://…"
          disabledHint="Uploads coming soon — for now, paste a hosted image URL."
        />
        <TextField
          label="Avatar / logo image URL"
          value={form.value.avatar_image_url ?? ''}
          onChange={v => form.patch({ avatar_image_url: v || null })}
          placeholder="https://…"
          disabledHint="Uploads coming soon — for now, paste a hosted image URL."
        />
      </div>

      {/* Identity note */}
      <div className="pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-3 py-2.5 flex items-start gap-2">
          <Info size={13} className="text-muted-text flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-text leading-relaxed">
            Business name and tagline come from your{' '}
            <Link href="/editor/website?tab=business" scroll={false} className="text-near-black font-semibold underline">Business Info</Link>.
          </p>
        </div>
      </div>

      {/* Header buttons */}
      <div className="space-y-2 pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
            Header buttons
          </p>
          <p className="text-[11px] text-muted-text mt-0.5">
            Toggle visibility and (optionally) override the link each button opens. Leave a URL blank to use the default from Business Info.
          </p>
        </div>
        <HeaderButtonRow
          label="Book"
          icon={Heart}
          on={form.value.show_book_button}
          onToggle={() => form.patch({ show_book_button: !form.value.show_book_button })}
          url={form.value.book_button_url ?? ''}
          onUrlChange={v => form.patch({ book_button_url: v || null })}
          placeholder="Defaults to scroll-to-booking"
        />
        <HeaderButtonRow
          label="Call"
          icon={Phone}
          on={form.value.show_call_button}
          onToggle={() => form.patch({ show_call_button: !form.value.show_call_button })}
          url={form.value.call_button_url ?? ''}
          onUrlChange={v => form.patch({ call_button_url: v || null })}
          placeholder="tel:+1… (defaults to business phone)"
        />
        <HeaderButtonRow
          label="Email"
          icon={Mail}
          on={form.value.show_email_button}
          onToggle={() => form.patch({ show_email_button: !form.value.show_email_button })}
          url={form.value.email_button_url ?? ''}
          onUrlChange={v => form.patch({ email_button_url: v || null })}
          placeholder="mailto:you@… (defaults to business email)"
        />
        <HeaderButtonRow
          label="Message"
          icon={MessageSquare}
          on={form.value.show_message_button ?? false}
          onToggle={() => form.patch({ show_message_button: !(form.value.show_message_button ?? false) })}
          url={form.value.message_button_url ?? ''}
          onUrlChange={v => form.patch({ message_button_url: v || null })}
          placeholder="sms:+1… or any chat link"
        />
        <HeaderButtonRow
          label="Directions"
          icon={MapPin}
          on={form.value.show_directions_button}
          onToggle={() => form.patch({ show_directions_button: !form.value.show_directions_button })}
          url={form.value.directions_button_url ?? ''}
          onUrlChange={v => form.patch({ directions_button_url: v || null })}
          placeholder="https://maps… (defaults to address lookup)"
        />
        <HeaderButtonRow
          label="Instagram"
          icon={Instagram}
          on={form.value.show_instagram_button}
          onToggle={() => form.patch({ show_instagram_button: !form.value.show_instagram_button })}
          url={form.value.instagram_button_url ?? ''}
          onUrlChange={v => form.patch({ instagram_button_url: v || null })}
          placeholder="https://instagram.com/… (defaults to Business Info)"
        />
        <HeaderButtonRow
          label="TikTok"
          icon={Sparkles}
          on={form.value.show_tiktok_button ?? false}
          onToggle={() => form.patch({ show_tiktok_button: !(form.value.show_tiktok_button ?? false) })}
          url={form.value.tiktok_button_url ?? ''}
          onUrlChange={v => form.patch({ tiktok_button_url: v || null })}
          placeholder="https://tiktok.com/@…"
        />
        <HeaderButtonRow
          label="YouTube"
          icon={Sparkles}
          on={form.value.show_youtube_button ?? false}
          onToggle={() => form.patch({ show_youtube_button: !(form.value.show_youtube_button ?? false) })}
          url={form.value.youtube_button_url ?? ''}
          onUrlChange={v => form.patch({ youtube_button_url: v || null })}
          placeholder="https://youtube.com/@…"
        />
        <HeaderButtonRow
          label="Facebook"
          icon={Sparkles}
          on={form.value.show_facebook_button ?? false}
          onToggle={() => form.patch({ show_facebook_button: !(form.value.show_facebook_button ?? false) })}
          url={form.value.facebook_button_url ?? ''}
          onUrlChange={v => form.patch({ facebook_button_url: v || null })}
          placeholder="https://facebook.com/…"
        />
        <HeaderButtonRow
          label="Pinterest"
          icon={Sparkles}
          on={form.value.show_pinterest_button ?? false}
          onToggle={() => form.patch({ show_pinterest_button: !(form.value.show_pinterest_button ?? false) })}
          url={form.value.pinterest_button_url ?? ''}
          onUrlChange={v => form.patch({ pinterest_button_url: v || null })}
          placeholder="https://pinterest.com/…"
        />
        <HeaderButtonRow
          label="WhatsApp"
          icon={MessageSquare}
          on={form.value.show_whatsapp_button ?? false}
          onToggle={() => form.patch({ show_whatsapp_button: !(form.value.show_whatsapp_button ?? false) })}
          url={form.value.whatsapp_button_url ?? ''}
          onUrlChange={v => form.patch({ whatsapp_button_url: v || null })}
          placeholder="https://wa.me/1… or chat link"
        />
      </div>

      <SaveBar
        dirty={form.dirty} saving={form.saving} saved={form.saved}
        error={form.error} onSave={form.doSave}
      />
    </Panel>
  )
}

// ── Content / Tabs ───────────────────────────────────────────────────────────

const TAB_LABEL_FIELDS: { key: keyof TemplateSettings['tabs']; sectionKey: string; label: string }[] = [
  { key: 'book_label',               sectionKey: 'book',               label: 'Book tab' },
  { key: 'gallery_label',            sectionKey: 'gallery',            label: 'Gallery tab' },
  { key: 'policy_label',             sectionKey: 'policy',             label: 'Policy tab' },
  { key: 'about_label',              sectionKey: 'about',              label: 'About tab' },
  { key: 'results_label',            sectionKey: 'before_after',       label: 'Before & After tab' },
  { key: 'steps_label',              sectionKey: 'steps',              label: 'Steps tab' },
  { key: 'before_appointment_label', sectionKey: 'before_appointment', label: 'Before Your Appointment tab' },
]

function ContentTabsPanel({
  settings, sections, onSaveSettings, onToggleSection,
}: {
  settings: TemplateSettings
  sections: WebsiteSection[]
  onSaveSettings: (p: Partial<TemplateSettings>) => Promise<void>
  onToggleSection: (id: number, enabled: boolean) => Promise<void>
}) {
  const form = useSettingsForm<TemplateSettings['tabs']>(
    settings.tabs,
    async (next) => { await onSaveSettings({ tabs: next }) },
  )

  const sectionByKey = useMemo(() => {
    const m: Record<string, WebsiteSection> = {}
    for (const s of sections) m[s.section_key] = s
    return m
  }, [sections])

  const [busyId, setBusyId] = useState<number | null>(null)

  async function toggle(s: WebsiteSection | undefined) {
    if (!s || s.is_locked) return
    setBusyId(s.id)
    try { await onToggleSection(s.id, !s.is_enabled) }
    finally { setBusyId(null) }
  }

  const hiddenCount = TAB_LABEL_FIELDS.filter(({ sectionKey }) => {
    const sec = sectionByKey[sectionKey]
    return sec && !sec.is_locked && !sec.is_enabled
  }).length

  return (
    <div className="space-y-4">
      <CollapsibleSection
        title="Tab Labels & Visibility"
        subtitle="Rename the tabs your visitors see and choose which sections appear. Booking is always visible."
        icon={ListChecks}
        defaultOpen
        statusBadge={hiddenCount > 0 && <StatusBadge tone="muted">{hiddenCount} hidden</StatusBadge>}
      >
        <div className="space-y-3">
          {TAB_LABEL_FIELDS.map(({ key, sectionKey, label }) => {
            const section = sectionByKey[sectionKey]
            const locked  = !!section?.is_locked || sectionKey === 'book'
            const visible = section ? section.is_enabled : true
            const busy    = section && busyId === section.id
            return (
              <div key={String(key)} className="border border-[rgba(18,18,18,0.08)] p-3 space-y-2.5 bg-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
                    {label}
                  </span>
                  {locked ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-[rgba(18,18,18,0.7)] px-1.5 py-0.5">
                      <Lock size={9} /> Always on
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(section)}
                      disabled={!section || busy}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.06em] uppercase border px-2 py-1',
                        visible
                          ? 'bg-white border-[rgba(18,18,18,0.15)] text-near-black hover:border-near-black'
                          : 'bg-near-black border-near-black text-white',
                      )}
                    >
                      {visible ? <><Eye size={11} /> Visible</> : <><EyeOff size={11} /> Hidden</>}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.value[key] ?? ''}
                  onChange={e => form.patch({ [key]: e.target.value } as Partial<TemplateSettings['tabs']>)}
                  maxLength={40}
                  className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                />
              </div>
            )
          })}
        </div>

        <SaveBar
          dirty={form.dirty} saving={form.saving} saved={form.saved}
          error={form.error} onSave={form.doSave}
        />
      </CollapsibleSection>

      <GalleryManagerPanel />

      <BeforeAfterManagerPanel />

      <InstructionsEditorPanel
        title="Advice"
        subtitle="Tips, advice, or care instructions shown on the Advice tab."
        addLabel="Add Tip"
        emptyText="No tips yet — add your first one."
        block={settings.steps ?? { heading: 'Advice', items: [] }}
        defaultHeading="Advice"
        icon={ListChecks}
        itemLabel="Box"
        onSave={(next) => onSaveSettings({ steps: next })}
      />

      <InstructionsEditorPanel
        title="Timeline"
        subtitle="A numbered list shown on the Timeline tab — great for booking flow or appointment prep."
        addLabel="Add Step"
        emptyText="No steps yet — add your first one."
        block={settings.before_appointment ?? { heading: 'Timeline', items: [] }}
        defaultHeading="Timeline"
        icon={Clock}
        onSave={(next) => onSaveSettings({ before_appointment: next })}
      />

      <AboutEditorPanel
        about={settings.about}
        onSave={(next) => onSaveSettings({ about: next })}
      />

      <PoliciesEditorPanel />
    </div>
  )
}

// ── Instructions editor (Steps & Before Your Appointment) ───────────────────

const INSTRUCTIONS_MAX_ITEMS = 8

interface InstructionItem { title: string; body: string }
interface InstructionBlock { heading: string; items: InstructionItem[] }

function InstructionsEditorPanel({
  title, subtitle, addLabel, emptyText, block, defaultHeading, icon, itemLabel = 'Step', onSave,
}: {
  title:          string
  subtitle:       string
  addLabel:       string
  emptyText:      string
  block:          InstructionBlock
  defaultHeading: string
  icon?:          React.ElementType
  itemLabel?:     string
  onSave:         (next: InstructionBlock) => Promise<void>
}) {
  // Seed with at least one empty item so the user has something to fill in.
  const initial: InstructionBlock = {
    heading: block.heading ?? defaultHeading,
    items:   block.items?.length ? block.items : [],
  }
  const form = useSettingsForm<InstructionBlock>(initial, onSave)
  const { value, patch, dirty, saving, saved, error, doSave } = form

  function setItems(next: InstructionItem[]) {
    patch({ items: next })
  }

  function addItem() {
    if (value.items.length >= INSTRUCTIONS_MAX_ITEMS) return
    setItems([...value.items, { title: '', body: '' }])
  }

  function updateItem(i: number, partial: Partial<InstructionItem>) {
    setItems(value.items.map((it, idx) => idx === i ? { ...it, ...partial } : it))
  }

  function removeItem(i: number) {
    setItems(value.items.filter((_, idx) => idx !== i))
  }

  function move(i: number, dir: 'up' | 'down') {
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= value.items.length) return
    const next = value.items.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
  }

  // Validation: every item must have non-empty title and body
  const invalidIndexes: number[] = value.items
    .map((it, i) => (!it.title.trim() || !it.body.trim()) ? i : -1)
    .filter(i => i >= 0)
  const hasValidationError = invalidIndexes.length > 0

  return (
    <CollapsibleSection
      title={title}
      subtitle={subtitle}
      icon={icon}
      statusBadge={<StatusBadge>{value.items.length} item{value.items.length === 1 ? '' : 's'}</StatusBadge>}
    >
      <TextField
        label="Section heading"
        value={value.heading}
        onChange={v => patch({ heading: v })}
        placeholder={defaultHeading}
        maxLength={120}
      />

      <div className="space-y-2.5">
        {value.items.length === 0 && (
          <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-4 py-5 text-center">
            <ListChecks size={18} className="mx-auto mb-1.5 text-muted-text" strokeWidth={1.5} />
            <p className="text-xs text-muted-text">{emptyText}</p>
          </div>
        )}

        {value.items.map((item, i) => {
          const invalid = invalidIndexes.includes(i)
          const isLast  = i === value.items.length - 1
          return (
            <div
              key={i}
              className={cn(
                'bg-white border p-3 space-y-2',
                invalid ? 'border-red-300' : 'border-[rgba(18,18,18,0.10)]',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
                  {itemLabel} {i + 1}
                </span>
                <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, 'up')}
                    disabled={i === 0}
                    className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 'down')}
                    disabled={isLast}
                    className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={value.items.length <= 1}
                    className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 disabled:opacity-30"
                    title={value.items.length <= 1 ? 'At least one step is required' : 'Delete'}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              <input
                type="text"
                value={item.title}
                onChange={e => updateItem(i, { title: e.target.value })}
                placeholder="Title"
                maxLength={120}
                className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
              />
              <textarea
                value={item.body}
                onChange={e => updateItem(i, { body: e.target.value })}
                placeholder="Body — what should happen at this step?"
                rows={2}
                maxLength={500}
                className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
              />

              {invalid && (
                <p className="text-[11px] text-red-700 flex items-center gap-1.5">
                  <AlertCircle size={11} /> Title and body are required.
                </p>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={addItem}
          disabled={value.items.length >= INSTRUCTIONS_MAX_ITEMS}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={12} /> {addLabel}
          {value.items.length >= INSTRUCTIONS_MAX_ITEMS && ` (max ${INSTRUCTIONS_MAX_ITEMS})`}
        </button>
      </div>

      <SaveBar
        dirty={dirty && !hasValidationError}
        saving={saving}
        saved={saved}
        error={error ?? (dirty && hasValidationError ? 'Fix the highlighted items before saving.' : null)}
        onSave={doSave}
      />
    </CollapsibleSection>
  )
}

// ── About editor (template settings.about) ──────────────────────────────────

const ABOUT_MAX_HIGHLIGHTS = 3

function AboutEditorPanel({
  about, onSave,
}: {
  about: TemplateAboutSettings | undefined
  onSave: (next: TemplateAboutSettings) => Promise<void>
}) {
  const initial: TemplateAboutSettings = {
    heading:    about?.heading    ?? 'About',
    eyebrow:    about?.eyebrow    ?? '',
    body:       about?.body       ?? '',
    highlights: about?.highlights ?? [],
  }
  const form = useSettingsForm<TemplateAboutSettings>(initial, onSave)
  const { value, patch, dirty, saving, saved, error, doSave } = form

  const highlights = value.highlights ?? []
  function setHighlights(next: { title: string; body: string }[]) {
    patch({ highlights: next })
  }
  function addHighlight() {
    if (highlights.length >= ABOUT_MAX_HIGHLIGHTS) return
    setHighlights([...highlights, { title: '', body: '' }])
  }
  function updateHighlight(i: number, p: Partial<{ title: string; body: string }>) {
    setHighlights(highlights.map((h, idx) => idx === i ? { ...h, ...p } : h))
  }
  function removeHighlight(i: number) {
    setHighlights(highlights.filter((_, idx) => idx !== i))
  }

  const filled = !!(value.body && value.body.trim().length > 0)

  return (
    <CollapsibleSection
      title="About"
      subtitle="The story shown on your About tab — who you are, what you do, what makes your work different."
      icon={Info}
      statusBadge={<StatusBadge tone={filled ? 'neutral' : 'muted'}>{filled ? 'Set' : 'Default'}</StatusBadge>}
    >
      <TextField
        label="Eyebrow (small label above the heading)"
        value={value.eyebrow ?? ''}
        onChange={v => patch({ eyebrow: v })}
        placeholder="The Studio"
        maxLength={60}
      />
      <TextField
        label="Heading"
        value={value.heading ?? ''}
        onChange={v => patch({ heading: v })}
        placeholder="About"
        maxLength={120}
      />
      <TextareaField
        label="Body"
        value={value.body ?? ''}
        onChange={v => patch({ body: v })}
        placeholder="Tell visitors who you are, what you do, and what makes your work different."
        rows={5}
        maxLength={2000}
      />

      <div className="space-y-2.5 pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
            Highlights ({highlights.length}/{ABOUT_MAX_HIGHLIGHTS})
          </p>
          <button
            type="button"
            onClick={addHighlight}
            disabled={highlights.length >= ABOUT_MAX_HIGHLIGHTS}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-1.5 hover:border-near-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Add Highlight
          </button>
        </div>
        {highlights.length === 0 && (
          <p className="text-xs text-muted-text">Optional — add small highlight cards under your About copy.</p>
        )}
        {highlights.map((h, i) => (
          <div key={i} className="bg-white border border-[rgba(18,18,18,0.10)] p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
                Highlight {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeHighlight(i)}
                className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600"
                title="Delete"
              >
                <Trash2 size={11} />
              </button>
            </div>
            <input
              type="text"
              value={h.title}
              onChange={e => updateHighlight(i, { title: e.target.value })}
              placeholder="Title"
              maxLength={120}
              className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
            <textarea
              value={h.body}
              onChange={e => updateHighlight(i, { body: e.target.value })}
              placeholder="Body"
              rows={2}
              maxLength={400}
              className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
            />
          </div>
        ))}
      </div>

      <SaveBar dirty={dirty} saving={saving} saved={saved} error={error} onSave={doSave} />
    </CollapsibleSection>
  )
}

// ── Policies editor (the single source of truth for policy editing) ─────────

const POLICY_FIELDS: { key: keyof BusinessPolicy; label: string; placeholder: string }[] = [
  { key: 'cancellation_policy', label: 'Cancellation policy', placeholder: 'How much notice do clients need to give?' },
  { key: 'late_policy',         label: 'Late arrival policy', placeholder: 'What happens if a client arrives late?' },
  { key: 'no_show_policy',      label: 'No-show policy',      placeholder: 'What happens if a client doesn\'t show up?' },
  { key: 'deposit_policy',      label: 'Deposit policy',      placeholder: 'Is a deposit required to book?' },
  { key: 'reschedule_policy',   label: 'Reschedule policy',   placeholder: 'How can clients reschedule?' },
  { key: 'extra_notes',         label: 'Additional notes',    placeholder: 'Anything else clients should know.' },
]

function PoliciesEditorPanel() {
  const [policies, setPolicies] = useState<BusinessPolicy | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [baseline, setBaseline] = useState<BusinessPolicy | null>(null)

  useEffect(() => {
    let cancelled = false
    getEditorPolicies()
      .then(p => {
        if (cancelled) return
        const normalized: BusinessPolicy = {
          id: p.id,
          cancellation_policy: p.cancellation_policy ?? '',
          late_policy:         p.late_policy         ?? '',
          no_show_policy:      p.no_show_policy      ?? '',
          deposit_policy:      p.deposit_policy      ?? '',
          reschedule_policy:   p.reschedule_policy   ?? '',
          extra_notes:         p.extra_notes         ?? '',
        }
        setPolicies(normalized)
        setBaseline(normalized)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load policies') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(
    () => JSON.stringify(policies) !== JSON.stringify(baseline),
    [policies, baseline],
  )

  const setCount = useMemo(() => {
    if (!policies) return 0
    return POLICY_FIELDS.filter(({ key }) => {
      const v = policies[key]
      return typeof v === 'string' && v.trim().length > 0
    }).length
  }, [policies])

  function patchField(key: keyof BusinessPolicy, value: string) {
    setPolicies(prev => prev ? { ...prev, [key]: value } : prev)
    if (saved) setSaved(false)
  }

  async function save() {
    if (!policies) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const payload: Record<string, string | null> = {}
      for (const { key } of POLICY_FIELDS) {
        const v = policies[key] as string
        payload[key] = v && v.trim().length > 0 ? v : null
      }
      const res = await updateEditorPolicies(payload)
      const normalized: BusinessPolicy = {
        id: res.id,
        cancellation_policy: res.cancellation_policy ?? '',
        late_policy:         res.late_policy         ?? '',
        no_show_policy:      res.no_show_policy      ?? '',
        deposit_policy:      res.deposit_policy      ?? '',
        reschedule_policy:   res.reschedule_policy   ?? '',
        extra_notes:         res.extra_notes         ?? '',
      }
      setPolicies(normalized)
      setBaseline(normalized)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save policies')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CollapsibleSection
      title="Policies"
      subtitle="Cancellation, late arrival, no-show, deposit, and reschedule policies shown on the Policy tab."
      icon={FileText}
      statusBadge={!loading && (
        <StatusBadge tone={setCount > 0 ? 'neutral' : 'muted'}>
          {setCount}/{POLICY_FIELDS.length} set
        </StatusBadge>
      )}
    >
      {loading && <p className="text-xs text-muted-text">Loading…</p>}
      {!loading && !policies && error && <p className="text-xs text-red-700">{error}</p>}
      {policies && (
        <>
          <p className="text-[11px] text-muted-text bg-cream border border-[rgba(18,18,18,0.08)] px-3 py-2">
            Edit your cancellation, late, no-show, deposit, and reschedule policies here. They appear on your public site under the Policy tab.
          </p>
          {POLICY_FIELDS.map(({ key, label, placeholder }) => (
            <TextareaField
              key={key}
              label={label}
              value={(policies[key] as string) ?? ''}
              onChange={v => patchField(key, v)}
              placeholder={placeholder}
              rows={2}
              maxLength={2000}
            />
          ))}
          <SaveBar
            dirty={dirty}
            saving={saving}
            saved={saved}
            error={error}
            onSave={save}
          />
        </>
      )}
    </CollapsibleSection>
  )
}

// ── Additionals ──────────────────────────────────────────────────────────────

function AdditionalsPanel({
  settings, onSave,
}: {
  settings: TemplateSettings
  onSave: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const initial: TemplateAdditionalsSettings = {
    show_thank_you:  settings.additionals?.show_thank_you  ?? true,
    thank_you_title: settings.additionals?.thank_you_title ?? 'Thank you for choosing us',
    thank_you_body:  settings.additionals?.thank_you_body  ?? '',
  }
  const form = useSettingsForm<TemplateAdditionalsSettings>(
    initial,
    async (next) => { await onSave({ additionals: next }) },
  )

  return (
    <div className="space-y-5">
      <Panel
        title="Thank you section"
        subtitle="A short closing note shown near the bottom of your public site."
      >
        <ToggleRow
          label="Show Thank You section"
          icon={MessageSquare}
          on={form.value.show_thank_you ?? true}
          onToggle={() => form.patch({ show_thank_you: !(form.value.show_thank_you ?? true) })}
        />
        <TextField
          label="Title"
          value={form.value.thank_you_title ?? ''}
          onChange={v => form.patch({ thank_you_title: v })}
          placeholder="Thank you for choosing us"
          maxLength={120}
        />
        <TextareaField
          label="Body (optional)"
          value={form.value.thank_you_body ?? ''}
          onChange={v => form.patch({ thank_you_body: v || null })}
          placeholder="A short note your visitors will see at the end of the page."
          rows={3}
          maxLength={400}
        />
        <SaveBar
          dirty={form.dirty} saving={form.saving} saved={form.saved}
          error={form.error} onSave={form.doSave}
        />
      </Panel>

      <Panel
        title="Add an extra section"
        subtitle="Custom blocks like care guides, parking info, or new-client info."
      >
        <div className="bg-cream border border-[rgba(18,18,18,0.08)] p-4 flex items-start gap-2">
          <Info size={14} className="text-muted-text mt-0.5" />
          <div className="text-xs text-muted-text leading-relaxed">
            Custom section editor is coming next. The backend already supports
            text blocks, instructions, and announcements — the inline UI lands
            in the next iteration.
          </div>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.12)] bg-cream text-muted-text px-3 py-2 cursor-not-allowed"
        >
          <Plus size={12} /> Add Section — coming soon
        </button>
      </Panel>
    </div>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

function FooterPanel({
  settings, onSave,
}: {
  settings: TemplateSettings
  onSave: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const initial: TemplateFooterSettings = {
    business_name_override: settings.footer.business_name_override ?? null,
    subtext:                settings.footer.subtext                ?? '',
    show_hours:             settings.footer.show_hours             ?? true,
    show_quick_book:        settings.footer.show_quick_book        ?? true,
    show_contact_links:     settings.footer.show_contact_links     ?? true,
    show_powered_by:        settings.footer.show_powered_by,
  }
  const form = useSettingsForm<TemplateFooterSettings>(
    initial,
    async (next) => { await onSave({ footer: next }) },
  )

  return (
    <Panel
      title="Footer"
      subtitle="The bottom of your public site — name, links, hours, and the BookReady badge."
    >
      <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-3 py-2.5 flex items-start gap-2">
        <Info size={13} className="text-muted-text flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-text leading-relaxed">
          Phone, email, address, and hours come from{' '}
          <Link href="/editor/website?tab=business" scroll={false} className="text-near-black font-semibold underline">Business Info</Link>
          {' '}and Bookings. Toggle below to choose what shows in the footer.
        </p>
      </div>

      <TextField
        label="Footer business name override (optional)"
        value={form.value.business_name_override ?? ''}
        onChange={v => form.patch({ business_name_override: v || null })}
        placeholder="Leave blank to use Business Info name"
        maxLength={120}
      />

      <TextareaField
        label="Footer subtext"
        value={form.value.subtext ?? ''}
        onChange={v => form.patch({ subtext: v || null })}
        placeholder="Booking by appointment. Walk-ins welcome when available."
        rows={2}
        maxLength={240}
      />

      <div className="space-y-1.5 pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <ToggleRow label="Show contact links" on={form.value.show_contact_links ?? true} onToggle={() => form.patch({ show_contact_links: !(form.value.show_contact_links ?? true) })} />
        <ToggleRow label="Show hours"         on={form.value.show_hours         ?? true} onToggle={() => form.patch({ show_hours:         !(form.value.show_hours         ?? true) })} />
        <ToggleRow label="Show Quick Book"    on={form.value.show_quick_book    ?? true} onToggle={() => form.patch({ show_quick_book:    !(form.value.show_quick_book    ?? true) })} />
        <ToggleRow label="Show Powered by BookReady" on={form.value.show_powered_by}     onToggle={() => form.patch({ show_powered_by:    !form.value.show_powered_by })} />
      </div>

      <SaveBar
        dirty={form.dirty} saving={form.saving} saved={form.saved}
        error={form.error} onSave={form.doSave}
      />
    </Panel>
  )
}

// ── Preview ──────────────────────────────────────────────────────────────────

const PREVIEW_MOBILE_W  = 390
const PREVIEW_DESKTOP_W = 1280
const PREVIEW_HEIGHT    = 720
const PREVIEW_FRAME_W   = 400  // visible width of preview column content

function PreviewPanel({ url, refreshKey }: { url: string; refreshKey: number }) {
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile')
  const [manualBump, setManualBump] = useState(0)

  // Cache-bust the iframe whenever refreshKey changes (auto on save) or user clicks Refresh
  const cacheKey = refreshKey + manualBump
  const src = url
    ? `${url}${url.includes('?') ? '&' : '?'}preview=${cacheKey}`
    : ''

  if (!url) {
    return (
      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4">
        <p className="text-sm text-muted-text">Sign in to preview your site.</p>
      </div>
    )
  }

  const desktopScale = PREVIEW_FRAME_W / PREVIEW_DESKTOP_W

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">Preview</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setManualBump(n => n + 1)}
            className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] uppercase px-2 py-1 border bg-white text-near-black border-[rgba(18,18,18,0.15)] hover:border-near-black"
            title="Refresh preview"
          >
            <RefreshCw size={11} />
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] uppercase px-2 py-1 border',
              mode === 'mobile' ? 'bg-near-black text-white border-near-black' : 'bg-white text-near-black border-[rgba(18,18,18,0.15)]',
            )}
          >
            <Smartphone size={11} /> Mobile
          </button>
          <button
            onClick={() => setMode('desktop')}
            className={cn(
              'inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] uppercase px-2 py-1 border',
              mode === 'desktop' ? 'bg-near-black text-white border-near-black' : 'bg-white text-near-black border-[rgba(18,18,18,0.15)]',
            )}
          >
            <Monitor size={11} /> Desktop
          </button>
        </div>
      </div>

      <div className="flex justify-center items-start bg-cream p-2 border border-[rgba(18,18,18,0.06)] overflow-hidden">
        {mode === 'mobile' ? (
          <iframe
            key={`mob-${cacheKey}`}
            src={src}
            title="Public site preview — mobile"
            style={{
              width:  PREVIEW_MOBILE_W,
              height: PREVIEW_HEIGHT,
              border: '1px solid rgba(18,18,18,0.10)',
              background: '#fff',
              transform: `scale(${PREVIEW_FRAME_W / PREVIEW_MOBILE_W < 1 ? PREVIEW_FRAME_W / PREVIEW_MOBILE_W : 1})`,
              transformOrigin: 'top center',
            }}
          />
        ) : (
          <div
            style={{
              width:  PREVIEW_FRAME_W,
              height: PREVIEW_HEIGHT * desktopScale,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <iframe
              key={`desk-${cacheKey}`}
              src={src}
              title="Public site preview — desktop"
              style={{
                width:  PREVIEW_DESKTOP_W,
                height: PREVIEW_HEIGHT,
                border: '1px solid rgba(18,18,18,0.10)',
                background: '#fff',
                transform: `scale(${desktopScale})`,
                transformOrigin: 'top left',
              }}
            />
          </div>
        )}
      </div>

      <p className="text-[10px] text-muted-text text-center">
        {mode === 'mobile'
          ? `Live preview at ${PREVIEW_MOBILE_W}px`
          : `Scaled from ${PREVIEW_DESKTOP_W}px desktop view`}
      </p>
    </div>
  )
}

// ── Gallery manager (lives inside Content & Tabs) ────────────────────────────

function GalleryManagerPanel() {
  const [items, setItems]     = useState<GalleryItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [busyId, setBusyId]   = useState<number | null>(null)
  const [editing, setEditing] = useState<GalleryItem | null>(null)
  const [adding, setAdding]   = useState(false)

  useEffect(() => {
    let cancelled = false
    getEditorGallery()
      .then(rows => { if (!cancelled) setItems(rows) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load gallery') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const sorted = useMemo(
    () => (items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items],
  )

  async function toggle(item: GalleryItem) {
    setBusyId(item.id); setError(null)
    try {
      const updated = await updateEditorGalleryItem(item.id, { is_active: !item.is_active })
      setItems(prev => (prev ?? []).map(i => i.id === item.id ? updated : i))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: GalleryItem) {
    if (!confirm(`Delete "${item.title ?? 'this image'}"? This can't be undone.`)) return
    setBusyId(item.id); setError(null)
    try {
      await deleteEditorGalleryItem(item.id)
      setItems(prev => (prev ?? []).filter(i => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setBusyId(null)
    }
  }

  async function move(item: GalleryItem, dir: 'up' | 'down') {
    const i = sorted.findIndex(s => s.id === item.id)
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= sorted.length) return
    const a = sorted[i], b = sorted[j]
    setBusyId(item.id); setError(null)
    try {
      const [updA, updB] = await Promise.all([
        updateEditorGalleryItem(a.id, { sort_order: b.sort_order }),
        updateEditorGalleryItem(b.id, { sort_order: a.sort_order }),
      ])
      setItems(prev => (prev ?? []).map(s => s.id === updA.id ? updA : s.id === updB.id ? updB : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSave(payload: GalleryItemPayload, existingId: number | null) {
    setError(null)
    if (existingId) {
      const updated = await updateEditorGalleryItem(existingId, payload)
      setItems(prev => (prev ?? []).map(i => i.id === existingId ? updated : i))
    } else {
      const created = await createEditorGalleryItem(payload)
      setItems(prev => [...(prev ?? []), created])
    }
    setEditing(null)
    setAdding(false)
  }

  return (
    <CollapsibleSection
      title="Gallery"
      subtitle="Add image URLs to show your work on your public website."
      icon={ImageIcon}
      statusBadge={!loading && (
        <StatusBadge>{sorted.length} image{sorted.length === 1 ? '' : 's'}</StatusBadge>
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-text">
          {loading ? 'Loading…' : 'Cuts, lashes, nails, facials, studio shots, or before/after photos.'}
        </p>
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2"
        >
          <Plus size={12} /> Add Image
        </button>
      </div>

      {error && (
        <div className="bg-white border border-red-200 text-red-700 text-xs p-3 flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-4 py-6 text-center">
          <ImageIcon size={20} className="mx-auto mb-2 text-muted-text" strokeWidth={1.5} />
          <p className="text-sm text-near-black font-semibold">No gallery images yet</p>
          <p className="text-xs text-muted-text mt-0.5">Add your first image to bring your public site to life.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((item, i) => {
            const busy = busyId === item.id
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white border flex gap-3 p-3',
                  item.is_active ? 'border-[rgba(18,18,18,0.10)]' : 'border-[rgba(18,18,18,0.06)] opacity-70',
                )}
              >
                {/* Preview */}
                <div className="w-16 h-16 bg-cream border border-[rgba(18,18,18,0.08)] flex-shrink-0 overflow-hidden">
                  {item.image_url
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={item.image_url} alt={item.alt_text ?? item.title ?? ''} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={16} /></div>
                  }
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-near-black truncate">
                      {item.title ?? 'Untitled'}
                    </span>
                    {!item.is_active && (
                      <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-transparent bg-lavender text-[rgba(18,18,18,0.6)] px-1.5 py-0.5">
                        Hidden
                      </span>
                    )}
                  </div>
                  {item.category && (
                    <span className="text-[10px] text-muted-text uppercase tracking-[0.1em] font-semibold">
                      {item.category}
                    </span>
                  )}
                  {item.caption && (
                    <p className="text-[11px] text-muted-text line-clamp-2">{item.caption}</p>
                  )}
                  {item.alt_text && (
                    <p className="text-[10px] text-muted-text italic line-clamp-1">alt: {item.alt_text}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      disabled={busy}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                      title="Edit"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={busy}
                      className={cn(
                        'h-7 px-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] uppercase border',
                        item.is_active
                          ? 'border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black'
                          : 'border-near-black bg-near-black text-white',
                      )}
                      title={item.is_active ? 'Hide' : 'Show'}
                    >
                      {item.is_active ? <><Eye size={10} /> Visible</> : <><EyeOff size={10} /> Hidden</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => move(item, 'up')}
                      disabled={busy || i === 0}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(item, 'down')}
                      disabled={busy || i === sorted.length - 1}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={busy}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 disabled:opacity-30"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(adding || editing) && (
        <GalleryItemDialog
          item={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </CollapsibleSection>
  )
}

function GalleryItemDialog({
  item, onClose, onSave,
}: {
  item: GalleryItem | null
  onClose: () => void
  onSave: (payload: GalleryItemPayload, existingId: number | null) => void | Promise<void>
}) {
  const [imageUrl,  setImageUrl]  = useState(item?.image_url ?? '')
  const [title,     setTitle]     = useState(item?.title     ?? '')
  const [caption,   setCaption]   = useState(item?.caption   ?? '')
  const [altText,   setAltText]   = useState(item?.alt_text  ?? '')
  const [category,  setCategory]  = useState(item?.category  ?? '')
  const [isActive,  setIsActive]  = useState(item?.is_active ?? true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!imageUrl.trim()) { setError('Image URL is required.'); return }
    setSaving(true); setError(null)
    try {
      await onSave({
        image_url: imageUrl.trim(),
        title:     title.trim()    || null,
        caption:   caption.trim()  || null,
        alt_text:  altText.trim()  || null,
        category:  category.trim() || null,
        is_active: isActive,
      }, item?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg border border-[rgba(18,18,18,0.15)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[rgba(18,18,18,0.10)] px-4 py-3 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-near-black">{item ? 'Edit image' : 'Add image'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <TextField
            label="Image URL *"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="https://images.unsplash.com/…"
            maxLength={2000}
          />

          {imageUrl && (
            <div className="bg-cream border border-[rgba(18,18,18,0.08)] p-2 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Preview"
                style={{ maxHeight: 240, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          )}

          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Fresh Fade"
            maxLength={255}
          />
          <TextField
            label="Category"
            value={category}
            onChange={setCategory}
            placeholder="Fresh Work, The Shop, Lashes…"
            maxLength={255}
            hint="Optional grouping"
          />
          <TextareaField
            label="Caption"
            value={caption}
            onChange={setCaption}
            placeholder="A short description shown on the public site."
            rows={2}
            maxLength={5000}
          />
          <TextField
            label="Alt text"
            value={altText}
            onChange={setAltText}
            placeholder="Describe the image for screen readers"
            maxLength={255}
          />

          <ToggleRow
            label="Visible on public site"
            icon={Eye}
            on={isActive}
            onToggle={() => setIsActive(v => !v)}
          />

          {error && (
            <p className="text-xs text-red-700 flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(18,18,18,0.08)]">
            <button
              type="button" onClick={onClose}
              className="text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-60"
            >
              {saving
                ? <><Loader2 size={11} className="animate-spin" /> Saving</>
                : <><Check size={12} /> {item ? 'Save changes' : 'Add image'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Before & After manager (lives inside Content & Tabs, after Gallery) ─────

function BeforeAfterManagerPanel() {
  const [items, setItems]     = useState<BeforeAfterItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [busyId, setBusyId]   = useState<number | null>(null)
  const [editing, setEditing] = useState<BeforeAfterItem | null>(null)
  const [adding, setAdding]   = useState(false)

  useEffect(() => {
    let cancelled = false
    getEditorBeforeAfter()
      .then(rows => { if (!cancelled) setItems(rows) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load before/after items') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const sorted = useMemo(
    () => (items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items],
  )

  async function toggle(item: BeforeAfterItem) {
    setBusyId(item.id); setError(null)
    try {
      const updated = await updateEditorBeforeAfterItem(item.id, { is_active: !item.is_active })
      setItems(prev => (prev ?? []).map(i => i.id === item.id ? updated : i))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: BeforeAfterItem) {
    if (!confirm(`Delete "${item.title ?? 'this pair'}"? This can't be undone.`)) return
    setBusyId(item.id); setError(null)
    try {
      await deleteEditorBeforeAfterItem(item.id)
      setItems(prev => (prev ?? []).filter(i => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setBusyId(null)
    }
  }

  async function move(item: BeforeAfterItem, dir: 'up' | 'down') {
    const i = sorted.findIndex(s => s.id === item.id)
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= sorted.length) return
    const a = sorted[i], b = sorted[j]
    setBusyId(item.id); setError(null)
    try {
      const [updA, updB] = await Promise.all([
        updateEditorBeforeAfterItem(a.id, { sort_order: b.sort_order }),
        updateEditorBeforeAfterItem(b.id, { sort_order: a.sort_order }),
      ])
      setItems(prev => (prev ?? []).map(s => s.id === updA.id ? updA : s.id === updB.id ? updB : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSave(payload: BeforeAfterItemPayload, existingId: number | null) {
    setError(null)
    if (existingId) {
      const updated = await updateEditorBeforeAfterItem(existingId, payload)
      setItems(prev => (prev ?? []).map(i => i.id === existingId ? updated : i))
    } else {
      const created = await createEditorBeforeAfterItem(payload)
      setItems(prev => [...(prev ?? []), created])
    }
    setEditing(null)
    setAdding(false)
  }

  return (
    <CollapsibleSection
      title="Before & After"
      subtitle="Add transformation pairs to show results on your public website."
      icon={Sparkles}
      statusBadge={!loading && (
        <StatusBadge>{sorted.length} pair{sorted.length === 1 ? '' : 's'}</StatusBadge>
      )}
    >
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2"
        >
          <Plus size={12} /> Add Pair
        </button>
      </div>

      {error && (
        <div className="bg-white border border-red-200 text-red-700 text-xs p-3 flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-4 py-6 text-center">
          <ImageIcon size={20} className="mx-auto mb-2 text-muted-text" strokeWidth={1.5} />
          <p className="text-sm text-near-black font-semibold">No before/after pairs yet</p>
          <p className="text-xs text-muted-text mt-0.5">Add your first transformation to show results on your public site.</p>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sorted.map((item, i) => {
            const busy = busyId === item.id
            return (
              <div
                key={item.id}
                className={cn(
                  'bg-white border flex gap-3 p-3',
                  item.is_active ? 'border-[rgba(18,18,18,0.10)]' : 'border-[rgba(18,18,18,0.06)] opacity-70',
                )}
              >
                {/* Twin thumbnails */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <BAThumb url={item.before_image_url} alt={item.before_alt_text} label="B" />
                  <BAThumb url={item.after_image_url}  alt={item.after_alt_text}  label="A" />
                </div>

                {/* Meta */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-near-black truncate">
                      {item.title ?? 'Untitled'}
                    </span>
                    {!item.is_active && (
                      <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-transparent bg-lavender text-[rgba(18,18,18,0.6)] px-1.5 py-0.5">
                        Hidden
                      </span>
                    )}
                  </div>
                  {item.category && (
                    <span className="text-[10px] text-muted-text uppercase tracking-[0.1em] font-semibold">
                      {item.category}
                    </span>
                  )}
                  {item.caption && (
                    <p className="text-[11px] text-muted-text line-clamp-2">{item.caption}</p>
                  )}

                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      disabled={busy}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                      title="Edit"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={busy}
                      className={cn(
                        'h-7 px-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] uppercase border',
                        item.is_active
                          ? 'border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black'
                          : 'border-near-black bg-near-black text-white',
                      )}
                      title={item.is_active ? 'Hide' : 'Show'}
                    >
                      {item.is_active ? <><Eye size={10} /> Visible</> : <><EyeOff size={10} /> Hidden</>}
                    </button>
                    <button
                      type="button"
                      onClick={() => move(item, 'up')}
                      disabled={busy || i === 0}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(item, 'down')}
                      disabled={busy || i === sorted.length - 1}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={busy}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 disabled:opacity-30"
                      title="Delete"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(adding || editing) && (
        <BeforeAfterItemDialog
          item={editing}
          onClose={() => { setAdding(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </CollapsibleSection>
  )
}

function BAThumb({ url, alt, label }: { url: string; alt: string | null; label: string }) {
  return (
    <div className="relative w-14 h-14 bg-cream border border-[rgba(18,18,18,0.08)] overflow-hidden flex-shrink-0">
      {url
        /* eslint-disable-next-line @next/next/no-img-element */
        ? <img src={url} alt={alt ?? ''} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={14} /></div>
      }
      <span className="absolute bottom-0 left-0 right-0 text-[8px] font-bold tracking-[0.18em] uppercase text-white bg-black/55 text-center py-[1px]">
        {label}
      </span>
    </div>
  )
}

function BeforeAfterItemDialog({
  item, onClose, onSave,
}: {
  item: BeforeAfterItem | null
  onClose: () => void
  onSave: (payload: BeforeAfterItemPayload, existingId: number | null) => void | Promise<void>
}) {
  const [beforeUrl, setBeforeUrl] = useState(item?.before_image_url ?? '')
  const [afterUrl,  setAfterUrl]  = useState(item?.after_image_url  ?? '')
  const [title,     setTitle]     = useState(item?.title            ?? '')
  const [caption,   setCaption]   = useState(item?.caption          ?? '')
  const [beforeAlt, setBeforeAlt] = useState(item?.before_alt_text  ?? '')
  const [afterAlt,  setAfterAlt]  = useState(item?.after_alt_text   ?? '')
  const [category,  setCategory]  = useState(item?.category         ?? '')
  const [isActive,  setIsActive]  = useState(item?.is_active        ?? true)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!beforeUrl.trim()) { setError('Before image URL is required.'); return }
    if (!afterUrl.trim())  { setError('After image URL is required.');  return }
    setSaving(true); setError(null)
    try {
      await onSave({
        before_image_url: beforeUrl.trim(),
        after_image_url:  afterUrl.trim(),
        title:            title.trim()     || null,
        caption:          caption.trim()   || null,
        before_alt_text:  beforeAlt.trim() || null,
        after_alt_text:   afterAlt.trim()  || null,
        category:         category.trim()  || null,
        is_active:        isActive,
      }, item?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg border border-[rgba(18,18,18,0.15)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[rgba(18,18,18,0.10)] px-4 py-3 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-near-black">{item ? 'Edit pair' : 'Add before/after pair'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <TextField
            label="Before image URL *"
            value={beforeUrl}
            onChange={setBeforeUrl}
            placeholder="https://…/before.jpg"
            maxLength={2000}
          />
          <TextField
            label="After image URL *"
            value={afterUrl}
            onChange={setAfterUrl}
            placeholder="https://…/after.jpg"
            maxLength={2000}
          />

          {/* Live side-by-side preview */}
          {(beforeUrl || afterUrl) && (
            <div className="bg-cream border border-[rgba(18,18,18,0.08)] p-2 grid grid-cols-2 gap-2">
              <BAPreviewBox url={beforeUrl} label="Before" />
              <BAPreviewBox url={afterUrl}  label="After" />
            </div>
          )}

          <TextField
            label="Title"
            value={title}
            onChange={setTitle}
            placeholder="Fade Transformation"
            maxLength={255}
          />
          <TextField
            label="Category"
            value={category}
            onChange={setCategory}
            placeholder="Fresh Work, Lashes, Nails…"
            maxLength={255}
            hint="Optional grouping"
          />
          <TextareaField
            label="Caption"
            value={caption}
            onChange={setCaption}
            placeholder="A short description shown on the public site."
            rows={2}
            maxLength={5000}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField
              label="Before alt text"
              value={beforeAlt}
              onChange={setBeforeAlt}
              placeholder="Describe the before image"
              maxLength={255}
            />
            <TextField
              label="After alt text"
              value={afterAlt}
              onChange={setAfterAlt}
              placeholder="Describe the after image"
              maxLength={255}
            />
          </div>

          <ToggleRow
            label="Visible on public site"
            icon={Eye}
            on={isActive}
            onToggle={() => setIsActive(v => !v)}
          />

          {error && (
            <p className="text-xs text-red-700 flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[rgba(18,18,18,0.08)]">
            <button
              type="button" onClick={onClose}
              className="text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-60"
            >
              {saving
                ? <><Loader2 size={11} className="animate-spin" /> Saving</>
                : <><Check size={12} /> {item ? 'Save changes' : 'Add pair'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BAPreviewBox({ url, label }: { url: string; label: string }) {
  return (
    <div className="relative bg-white border border-[rgba(18,18,18,0.08)] overflow-hidden" style={{ aspectRatio: '1/1' }}>
      {url
        /* eslint-disable-next-line @next/next/no-img-element */
        ? <img src={url} alt={label} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={20} /></div>
      }
      <span className="absolute top-1.5 left-1.5 text-[9px] font-bold tracking-[0.16em] uppercase text-white bg-black/55 px-1.5 py-0.5">
        {label}
      </span>
    </div>
  )
}
