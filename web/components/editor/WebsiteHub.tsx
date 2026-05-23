'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  FileText, Image as ImageIcon, Info, ListChecks,
  Eye, EyeOff, Lock, Plus, Smartphone, Monitor, ExternalLink, Copy,
  Check, Loader2, Heart, Phone, Mail, Instagram, MapPin, Sparkles,
  Megaphone, MessageSquare, ChevronRight, AlertCircle, RefreshCw,
} from 'lucide-react'
import {
  getCurrentUser,
  getEditorTemplateSettings,
  updateEditorTemplateSettings,
  getEditorWebsiteSections,
  updateEditorWebsiteSection,
} from '@/lib/api'
import type {
  TemplateSettings,
  TemplateHeaderSettings,
  TemplateFooterSettings,
  TemplateAdditionalsSettings,
  WebsiteSection,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Types & constants ────────────────────────────────────────────────────────

type SubTab = 'overview' | 'header' | 'content' | 'additionals' | 'footer'

const VALID_TABS: SubTab[] = ['overview', 'header', 'content', 'additionals', 'footer']

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
        <div className="px-4 md:px-8 py-6 max-w-[1440px] mx-auto w-full">

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
    { tab: 'header',      label: 'Header / Hero',  icon: Sparkles,   hint: 'Announcement, tagline, buttons' },
    { tab: 'content',     label: 'Content / Tabs', icon: ListChecks, hint: 'Tab labels and section content' },
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
        title="Core data lives in Bookings & Business"
        subtitle="These editors are separate from website settings — change them once and they update everywhere."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <CoreLink href="/editor/business"  label="Business Info" hint="Name, tagline, contact, address" />
          <CoreLink href="/editor/policies"  label="Policies"      hint="Cancellation, deposits, no-show" />
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

      {/* Identity */}
      <div className="space-y-2.5 pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <div className="bg-cream border border-[rgba(18,18,18,0.08)] px-3 py-2.5 flex items-start gap-2">
          <Info size={13} className="text-muted-text flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-text leading-relaxed">
            Business name comes from your{' '}
            <Link href="/editor/business" className="text-near-black font-semibold underline">Business Info</Link>.
            The tagline below overrides the displayed subtext on this template.
          </p>
        </div>
        <TextField
          label="Tagline / subtext"
          value={form.value.tagline}
          onChange={v => form.patch({ tagline: v })}
          placeholder="Sharp cuts. Smooth booking."
          maxLength={120}
        />
      </div>

      {/* Header buttons */}
      <div className="space-y-1.5 pt-2 border-t border-[rgba(18,18,18,0.08)]">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1">
          Header buttons
        </p>
        <ToggleRow label="Show Book button"       icon={Heart}     on={form.value.show_book_button}       onToggle={() => form.patch({ show_book_button: !form.value.show_book_button })} />
        <ToggleRow label="Show Call button"       icon={Phone}     on={form.value.show_call_button}       onToggle={() => form.patch({ show_call_button: !form.value.show_call_button })} />
        <ToggleRow label="Show Email button"      icon={Mail}      on={form.value.show_email_button}      onToggle={() => form.patch({ show_email_button: !form.value.show_email_button })} />
        <ToggleRow label="Show Instagram button"  icon={Instagram} on={form.value.show_instagram_button}  onToggle={() => form.patch({ show_instagram_button: !form.value.show_instagram_button })} />
        <ToggleRow label="Show Directions button" icon={MapPin}    on={form.value.show_directions_button} onToggle={() => form.patch({ show_directions_button: !form.value.show_directions_button })} />
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

  return (
    <div className="space-y-5">
      <Panel
        title="Content / Tabs"
        subtitle="Rename the tabs your visitors see and choose which sections appear. Booking is always visible."
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
      </Panel>

      <Panel
        title="Steps content"
        subtitle="Card-style instructions shown on the Steps tab."
      >
        <ItemsSummary
          items={settings.steps?.items ?? []}
          empty="No steps yet."
        />
        <p className="text-[11px] text-muted-text">
          Inline item editor coming soon. The Fade Room template ships with
          sensible defaults until then.
        </p>
      </Panel>

      <Panel
        title="Before Your Appointment content"
        subtitle="Numbered timeline shown on the Before Your Appointment tab."
      >
        <ItemsSummary
          items={settings.before_appointment?.items ?? []}
          empty="No items yet."
        />
        <p className="text-[11px] text-muted-text">
          Inline item editor coming soon. The Fade Room template ships with
          sensible defaults until then.
        </p>
      </Panel>
    </div>
  )
}

function ItemsSummary({ items, empty }: { items: { title: string; body: string }[]; empty: string }) {
  if (items.length === 0) return <p className="text-xs text-muted-text">{empty}</p>
  return (
    <ol className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="border border-[rgba(18,18,18,0.08)] px-3 py-2">
          <p className="text-sm font-semibold text-near-black">{i + 1}. {it.title}</p>
          <p className="text-xs text-muted-text mt-0.5 line-clamp-2">{it.body}</p>
        </li>
      ))}
    </ol>
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
          <Link href="/editor/business" className="text-near-black font-semibold underline">Business Info</Link>
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
