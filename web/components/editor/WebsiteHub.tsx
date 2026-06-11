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
import ImageUploadField from '@/components/editor/ImageUploadField'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/SegmentedControl'
import {
  ComingSoonPanel as ComingSoonHero,
  ComingSoonCard,
} from '@/components/editor/ComingSoonPanel'
import {
  Calendar as CalendarIcon, Users, Layers, Bell as BellIcon, Mail as MailIcon, Megaphone as MegaphoneIcon,
  PartyPopper, Snowflake, Heart as HeartIcon, Sun, Gift, Timer, UserCircle as UserIcon,
} from 'lucide-react'
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
  getEditorGalleryGroups,
  createEditorGalleryGroup,
  updateEditorGalleryGroup,
  deleteEditorGalleryGroup,
  getEditorResults,
  createEditorResultsItem,
  updateEditorResultsItem,
  deleteEditorResultsItem,
  getEditorResultsGroups,
  createEditorResultsGroup,
  updateEditorResultsGroup,
  deleteEditorResultsGroup,
  getEditorPolicies,
  updateEditorPolicies,
  selectActiveTemplate,
} from '@/lib/api'
import { SITE_TEMPLATES } from '@/lib/templates'
import type {
  TemplateSettings,
  TemplateHeaderSettings,
  TemplateHeaderCustomLink,
  TemplateFooterSettings,
  TemplateAdditionalsSettings,
  TemplateAboutSettings,
  WebsiteSection,
  GalleryItem,
  GalleryItemPayload,
  GalleryGroup,
  ResultsItem,
  ResultsItemPayload,
  ResultsGroup,
  BusinessPolicy,
  PolicyCustomGroup,
} from '@/lib/types'
import { cn } from '@/lib/cn'
// M4 — manifest-driven editor surface. The hook reads each template's
// declared header / footer fields + color role + palette, so the editor
// shows only controls that the active template actually surfaces.
import {
  useTemplateManifest,
  supportsHeaderField,
  supportsFooterField,
  aboutImageCountFor,
  supportsPatternPicker,
  patternOptionsFor,
  type TemplateManifest,
  type PatternOption,
} from '@bkrdy/platform'

// ── Types & constants ────────────────────────────────────────────────────────

type SubTab =
  | 'overview' | 'header' | 'introduction' | 'content'
  | 'gallery' | 'policies'
  | 'additionals' | 'announcements' | 'footer' | 'seo'

// M3 rename: 'before_after' section_key is now 'results'. Existing
// deep-links from old emails / bookmarks still land on the merged
// Gallery tab because we map both keys above in SECTION_KEY_TO_TAB
// (results), and the migration rewrites stored values to 'results'.
const VALID_TABS: SubTab[] = [
  'overview', 'header', 'introduction', 'content',
  'gallery', 'policies',
  'additionals', 'announcements', 'footer', 'seo',
]

function hrefFor(tab: SubTab): string {
  return tab === 'overview' ? '/editor/website' : `/editor/website?tab=${tab}`
}

// Palette + display-name fallbacks for when the manifest hasn't loaded
// yet (or isn't registered). These mirror The Fade Room's manifest so a
// missing-manifest tenant gets the same UX as before.
//
// M4: ACCENT_PALETTES + TEMPLATE_LABELS + colorPickerLabels are no
// longer hardcoded here. They come from each template's manifest at
// web/templates/{slug}/manifest.ts. See useTemplateManifest below.
const FALLBACK_PALETTE = [
  { hex: '#FF3DBE', label: 'Pink (default)' },
  { hex: '#F9FAFB', label: 'White' },
  { hex: '#22F5A3', label: 'Mint' },
  { hex: '#FF3B5C', label: 'Red' },
  { hex: '#FFD84D', label: 'Yellow' },
  { hex: '#3DA9FC', label: 'Blue' },
]

function paletteFor(manifest: TemplateManifest | null) {
  if (!manifest) return FALLBACK_PALETTE
  return manifest.color_palette.map(c => ({ hex: c.hex, label: c.label }))
}

function defaultAccentFor(manifest: TemplateManifest | null): string {
  return paletteFor(manifest)[0]?.hex ?? '#FF3DBE'
}

function templateLabel(slug: string, manifest: TemplateManifest | null): string {
  if (manifest?.name) return manifest.name
  // Last-resort fallback before the manifest resolves.
  if (slug === 'thefaderoom')  return 'The Fade Room'
  if (slug === 'lushstudio')   return 'Lush Studio'
  if (slug === 'velvettheory') return 'Velvet Theory'
  return slug
}

// Picker copy follows manifest.color_role. 'background' templates (Velvet
// Theory) surface "Background variant"; 'accent' templates use the
// classic "Accent color" copy.
function colorPickerLabels(manifest: TemplateManifest | null): { title: string; hint: string; ariaPrefix: string } {
  if (manifest?.color_role === 'background') {
    return {
      title:      'Background variant',
      hint:       'Changes the page background. Your accent color stays the same.',
      ariaPrefix: 'Background',
    }
  }
  return {
    title:      'Accent color',
    hint:       'Swaps the highlight color across the site',
    ariaPrefix: 'Accent',
  }
}

// Pick a readable check-mark color on top of a swatch. Light variants
// (e.g. Bone) need a dark check; everything else gets white.
function checkColorOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '#FFFFFF'
  const n = parseInt(m[1], 16)
  const r = ((n >> 16) & 0xff) / 255
  const g = ((n >> 8) & 0xff) / 255
  const b = (n & 0xff) / 255
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return lum > 0.6 ? '#121212' : '#FFFFFF'
}

const SECTION_LABEL_FOR_KEY: Record<string, string> = {
  header:   'Header',
  book:     'Booking',
  gallery:  'Gallery',
  policy:   'Policy',
  about:    'About',
  results:  'Results',
  advice:   'Advice',
  timeline: 'Timeline',
  footer:   'Footer',
}

// Maps a section key to the inner Website tab that edits it. Used by the
// Section visibility row's link icon so owners can jump straight to the
// right editor instead of hunting through tabs.
const SECTION_KEY_TO_TAB: Record<string, SubTab> = {
  header:   'header',
  // 'book' is intentionally omitted — the booking section is configured
  // entirely outside the Website hub (Settings → Booking + Services). The
  // section is locked-on, so we don't surface an edit jump-link for it.
  gallery:  'gallery',
  policy:   'policies',
  about:    'content',
  results:  'gallery',
  advice:   'content',
  timeline: 'content',
  footer:   'footer',
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  header:       Sparkles,
  book:         Heart,
  booking:      Heart,
  gallery:      ImageIcon,
  policy:       FileText,
  about:        Info,
  results:      Sparkles,
  advice:       ListChecks,
  timeline:     ListChecks,
  instructions: ListChecks,
  footer:       Lock,
  text_block:   FileText,
  announcement: Megaphone,
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
  // M4 — load the active template's manifest so editor panels can gate
  // their fields. While loading we render fields anyway (no flash of
  // missing controls); panels treat a null manifest as "show everything".
  const { manifest } = useTemplateManifest(templateSlug)

  // Reset the page scroll to the top whenever the active tab changes.
  // Without this, jumping from a long panel (Content) to a shorter one
  // (Gallery) leaves the viewport mid-page where the previous panel was.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [tab])

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

  // Reorder a section among the NON-locked ones by swapping its sort_order
  // with the adjacent movable section. Locked sections (header/book/footer)
  // keep their fixed positions. Templates render their content tabs in
  // sort_order, so this changes the public site's section order.
  async function reorderSection(id: number, direction: 'up' | 'down'): Promise<void> {
    const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    const movable = ordered.filter(s => !s.is_locked)
    const idx = movable.findIndex(s => s.id === id)
    if (idx < 0) return
    const swapWith = direction === 'up' ? movable[idx - 1] : movable[idx + 1]
    if (!swapWith) return
    const current = movable[idx]
    // If the two share a sort_order (legacy data), nudge to guarantee a
    // visible swap rather than a no-op.
    const currentOrder = current.sort_order
    const swapOrder = swapWith.sort_order === currentOrder
      ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1)
      : swapWith.sort_order
    const [a, b] = await Promise.all([
      updateEditorWebsiteSection(current.id, { sort_order: swapOrder }),
      updateEditorWebsiteSection(swapWith.id, { sort_order: currentOrder }),
    ])
    setSections(prev => prev.map(s => (s.id === a.id ? a : s.id === b.id ? b : s)))
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
        <div className="bg-white border border-hairline-soft p-5 text-sm text-danger">
          {loadError ?? 'Could not load website settings.'}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-cream">

      <div className="flex-1">
        {/* Matches PaymentsHub/SettingsHub padding so all hubs feel aligned. */}
        <div className="p-3 sm:p-5 md:p-6 w-full">

          {/* Site link toolbar — page title now lives in EditorShell */}
          {slug && (
            <div className="flex items-center justify-end gap-2 mb-4">
              <CopyLinkButton url={publicUrl} />
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black border border-hairline-strong bg-white px-2.5 py-1.5 hover:border-near-black"
              >
                <ExternalLink size={12} /> View Site
              </a>
            </div>
          )}

          {/* Editor + preview split */}
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_440px] gap-6">

            {/* Editor */}
            <div className="space-y-5 min-w-0">
              {tab === 'overview' && (
                <OverviewPanel
                  templateSlug={templateSlug}
                  manifest={manifest}
                  settings={settings}
                  sections={sections}
                  publicUrl={publicUrl}
                  onToggleSection={toggleSection}
                  onReorderSection={reorderSection}
                  onSaveSettings={saveSettings}
                />
              )}

              {tab === 'header' && (
                <HeaderPanel settings={settings} onSave={saveSettings} manifest={manifest} />
              )}

              {tab === 'content' && (
                <ContentTabsPanel
                  settings={settings}
                  sections={sections}
                  manifest={manifest}
                  onSaveSettings={saveSettings}
                  onToggleSection={toggleSection}
                />
              )}

              {tab === 'gallery' && (
                <>
                  <GalleryManagerPanel settings={settings} onSaveSettings={saveSettings} />
                  <ResultsManagerPanel settings={settings} onSaveSettings={saveSettings} />
                </>
              )}
              {tab === 'policies'     && <PoliciesEditorPanel settings={settings} onSaveSettings={saveSettings} />}

              {tab === 'additionals' && (
                <AdditionalsPanel settings={settings} onSave={saveSettings} />
              )}

              {tab === 'footer' && (
                <FooterPanel settings={settings} onSave={saveSettings} manifest={manifest} />
              )}

              {tab === 'seo' && <SeoComingSoonPanel />}
              {tab === 'announcements' && <AnnouncementsComingSoonPanel />}
              {tab === 'introduction'  && <IntroductionComingSoonPanel />}
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
      className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-tight text-near-black border border-hairline-strong bg-white px-2.5 py-1.5 hover:border-near-black"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy Link'}
    </button>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-hairline-soft p-5 space-y-4">
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
    <div className="bg-white border border-hairline-soft">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-cream/50 transition-colors"
      >
        {Icon && (
          <div className="w-8 h-8 flex items-center justify-center border border-hairline-soft bg-cream flex-shrink-0">
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
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-hairline-soft">
          {children}
        </div>
      )}
    </div>
  )
}

function Chip({ children, tone = 'neutral' }: {
  children: React.ReactNode
  tone?: 'neutral' | 'muted' | 'accent'
}) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.06em] uppercase px-1.5 py-0.5 border',
      tone === 'neutral' && 'border-hairline-strong bg-cream text-muted-text',
      tone === 'muted'   && 'border-transparent bg-lavender text-faint-text',
      tone === 'accent'  && 'border-transparent bg-blush text-near-black',
    )}>
      {children}
    </span>
  )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">{children}</span>
      {hint && <span className="text-eyebrow text-muted-text">{hint}</span>}
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
            ? 'border-hairline-soft bg-cream text-muted-text cursor-not-allowed'
            : 'border-hairline-strong focus:border-near-black',
        )}
      />
      {disabledHint && (
        <p className="text-eyebrow text-muted-text mt-1 flex items-center gap-1">
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
        className="mt-1.5 w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
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
    <div className="flex items-center justify-between gap-3 border border-hairline-soft px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon size={14} className="text-near-black flex-shrink-0" strokeWidth={1.8} />}
        <div className="min-w-0">
          <span className="text-sm text-near-black block">{label}</span>
          {hint && <span className="text-2xs text-muted-text">{hint}</span>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={cn(
          'relative inline-flex items-center w-10 h-5 transition-colors border flex-shrink-0',
          on ? 'bg-near-black border-near-black' : 'bg-white border-hairline-strong',
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-3.5 h-3.5 bg-white border border-hairline-strong transition-all',
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
    <div className="border border-hairline-soft bg-white">
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
            on ? 'bg-near-black border-near-black' : 'bg-white border-hairline-strong',
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-3.5 h-3.5 bg-white border border-hairline-strong transition-all',
            on ? 'left-[22px]' : 'left-0.5',
          )} />
        </button>
      </div>
      {on && (
        <div className="px-3 pb-2.5 -mt-0.5">
          <div className="flex items-center gap-2 border border-hairline-strong px-2 focus-within:border-near-black">
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
    <div className="flex items-center justify-between gap-3 pt-2 border-t border-hairline-soft">
      <div className="text-xs flex items-center gap-2">
        {error && <span className="text-danger">{error}</span>}
        {!error && saved && !saving && (
          <span className="text-success inline-flex items-center gap-1">
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
          'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2',
          dirty && !saving
            ? 'bg-near-black text-white'
            : 'bg-cream text-muted-text border border-hairline cursor-not-allowed',
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
  templateSlug, manifest, settings, sections, publicUrl, onToggleSection, onReorderSection, onSaveSettings,
}: {
  templateSlug: string
  manifest: TemplateManifest | null
  settings: TemplateSettings
  sections: WebsiteSection[]
  publicUrl: string
  onToggleSection: (id: number, enabled: boolean) => Promise<void>
  onReorderSection: (id: number, direction: 'up' | 'down') => Promise<void>
  onSaveSettings: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [sections],
  )
  const [busyId, setBusyId] = useState<number | null>(null)

  const enabledCount = sections.filter(s => s.is_enabled).length

  // Accent color picker — single source of truth lives in
  // settings.theme.accent_color. Null = use the template's default
  // (resolved per-template via defaultAccentFor). Each swatch click
  // PATCHes the template and the preview iframe re-keys via the
  // existing previewKey bump in the parent.
  const accent = settings.theme?.accent_color ?? null
  const accentPalette = paletteFor(manifest)
  const defaultAccent = defaultAccentFor(manifest)
  const [savingAccent, setSavingAccent] = useState<string | null>(null)
  const [accentError,  setAccentError]  = useState<string | null>(null)
  async function pickAccent(hex: string | null) {
    if ((accent ?? null) === (hex ?? null)) return
    setSavingAccent(hex ?? '__default__'); setAccentError(null)
    try {
      await onSaveSettings({ theme: { accent_color: hex } })
    } catch (e) {
      setAccentError(e instanceof Error ? e.message : 'Failed to update accent')
    } finally {
      setSavingAccent(null)
    }
  }

  const QUICK_LINKS: { tab: SubTab; label: string; icon: React.ElementType; hint: string }[] = [
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

  // IDs of reorderable (non-locked) sections in display order — used to
  // disable the up/down arrows at the ends of the movable range.
  const movableIds = sorted.filter(s => !s.is_locked).map(s => s.id)

  async function move(s: WebsiteSection, direction: 'up' | 'down') {
    if (s.is_locked) return
    setBusyId(s.id)
    try {
      await onReorderSection(s.id, direction)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">

      {/* Template + status */}
      <Panel
        title={templateLabel(templateSlug, manifest)}
        subtitle="Current template"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-transparent bg-blush text-[rgba(18,18,18,0.7)] px-1.5 py-0.5">
            Active
          </span>
          <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline bg-white text-near-black px-1.5 py-0.5">
            {enabledCount} sections visible
          </span>
        </div>
        <p className="text-xs text-muted-text leading-relaxed">
          Changing templates keeps your business info, services, bookings, staff,
          customers, availability, and policies. Template-specific settings may reset.
        </p>

        {/* ── Theme picker —
            Templates that declare pattern_options in their manifest
            (currently only Bottega) show a PATTERN picker here instead
            of the accent-color picker. The selected key writes to
            settings.theme.pattern_motif and the template's PATTERNS map
            resolves it to a URL + tuned overlay opacity at render time.
            ── */}
        {supportsPatternPicker(manifest) ? (
          <PatternPickerBlock
            options={patternOptionsFor(manifest)}
            current={(settings.theme as any)?.pattern_motif ?? null}
            onPick={async (key) => {
              await onSaveSettings({ theme: { pattern_motif: key } } as any)
            }}
          />
        ) : (
          <div className="space-y-2 pt-2 border-t border-hairline-soft">
            {(() => {
              const { title, hint } = colorPickerLabels(manifest)
              return (
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                    {title}
                  </p>
                  <p className="text-eyebrow text-muted-text">{hint}</p>
                </div>
              )
            })()}
            <div className="flex items-center gap-2 flex-wrap">
              {accentPalette.map(({ hex, label }) => {
                const isActive = (accent ?? defaultAccent).toUpperCase() === hex.toUpperCase()
                const isBusy   = savingAccent === hex
                const checkCol = checkColorOn(hex)
                const { ariaPrefix } = colorPickerLabels(manifest)
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => pickAccent(hex === defaultAccent ? null : hex)}
                    disabled={!!savingAccent}
                    title={label}
                    aria-label={`${ariaPrefix}: ${label}`}
                    aria-pressed={isActive}
                    className={cn(
                      'relative w-8 h-8 border transition-shadow disabled:opacity-50',
                      isActive
                        ? 'border-near-black ring-2 ring-offset-2 ring-near-black/20'
                        : 'border-hairline-strong hover:border-near-black',
                    )}
                    style={{ background: hex }}
                  >
                    {isBusy && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Loader2 size={12} className="animate-spin text-white" />
                      </span>
                    )}
                    {isActive && !isBusy && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <Check
                          size={14}
                          style={{ color: checkCol, filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.45))' }}
                        />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            {accentError && (
              <p className="text-2xs text-danger flex items-center gap-1.5">
                <AlertCircle size={12} /> {accentError}
              </p>
            )}
          </div>
        )}

        {/* Phase 18 — Seasonal themes teaser. Sits right under accent color
            because both are "site-wide flavor" choices in the owner's head. */}
        <div className="space-y-2 pt-3 border-t border-hairline-soft">
          <SeasonalThemesTeaser />
        </div>

        <ChangeTemplateBlock currentSlug={templateSlug} />
      </Panel>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {QUICK_LINKS.map(({ tab, label, icon: Icon, hint }) => (
          <Link
            key={tab}
            href={hrefFor(tab)}
            scroll={false}
            className="text-left bg-white border border-hairline-soft p-4 hover:border-near-black transition-colors flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 flex items-center justify-center border border-hairline-soft bg-cream flex-shrink-0">
                <Icon size={14} className="text-near-black" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-near-black">{label}</p>
                <p className="text-2xs text-muted-text mt-0.5">{hint}</p>
              </div>
            </div>
            <ChevronRight size={14} className="text-muted-text flex-shrink-0 mt-1" />
          </Link>
        ))}
      </div>

      {/* Section visibility controller */}
      <Panel
        title="Section visibility"
        subtitle="Show or hide sections on your public site. Some sections are always on and can't be hidden."
      >
        <div className="space-y-1.5">
          {sorted.map(s => {
            const Icon = SECTION_ICONS[s.section_type] ?? FileText
            // SECTION_LABEL_FOR_KEY wins over the DB title so renames in
            // this map propagate to all tenants without needing a per-row
            // data migration. Fall back to s.title for anything we don't
            // explicitly know about, then to the raw section_key.
            const label = SECTION_LABEL_FOR_KEY[s.section_key] ?? s.title ?? s.section_key
            const busy = busyId === s.id
            // Row is no longer a Link — only the editor-jump icon is clickable
            // for navigation. The visibility toggle stays its own button.
            return (
              <div
                key={s.id}
                className={cn(
                  'flex items-center justify-between gap-3 border px-3 py-2.5',
                  s.is_enabled
                    ? 'border-hairline-soft bg-white'
                    : 'border-hairline-soft bg-white opacity-70',
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={14} className="text-near-black flex-shrink-0" strokeWidth={1.7} />
                  <span className="text-sm text-near-black truncate">{label}</span>
                  {s.is_locked && (
                    <span className="inline-flex items-center gap-1 text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-cream text-[rgba(18,18,18,0.7)] px-1.5 py-0.5 flex-shrink-0">
                      <Lock size={9} /> Always on
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Reorder arrows — non-locked sections only. Swaps
                      sort_order with the adjacent movable section; templates
                      render content tabs in sort_order so this reorders the
                      public site too. */}
                  {!s.is_locked && movableIds.length > 1 && (
                    <div className="inline-flex flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => move(s, 'up')}
                        disabled={busy || movableIds.indexOf(s.id) === 0}
                        title="Move up"
                        aria-label={`Move ${label} up`}
                        className="p-1.5 border border-hairline-soft bg-white text-muted-text hover:text-near-black hover:border-near-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(s, 'down')}
                        disabled={busy || movableIds.indexOf(s.id) === movableIds.length - 1}
                        title="Move down"
                        aria-label={`Move ${label} down`}
                        className="p-1.5 border border-l-0 border-hairline-soft bg-white text-muted-text hover:text-near-black hover:border-near-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown size={11} />
                      </button>
                    </div>
                  )}
                  {/* Jump-to-editor link — only this icon is clickable for nav. */}
                  {SECTION_KEY_TO_TAB[s.section_key] && (
                    <Link
                      href={hrefFor(SECTION_KEY_TO_TAB[s.section_key])}
                      scroll={false}
                      title={`Edit ${label}`}
                      aria-label={`Edit ${label}`}
                      className="p-1.5 border border-hairline-soft bg-white text-muted-text hover:text-near-black hover:border-near-black transition-colors"
                    >
                      <Edit2 size={11} />
                    </Link>
                  )}
                  {s.is_locked ? (
                    <span className="text-eyebrow uppercase tracking-[0.08em] text-muted-text font-semibold pl-1">Always on</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(s)}
                      disabled={busy}
                      className={cn(
                        'inline-flex items-center gap-1.5 text-eyebrow font-semibold tracking-[0.06em] uppercase border px-2 py-1.5',
                        s.is_enabled
                          ? 'bg-white border-hairline-strong text-near-black hover:border-near-black'
                          : 'bg-near-black border-near-black text-white',
                      )}
                    >
                      {s.is_enabled ? <><Eye size={11} /> Visible</> : <><EyeOff size={11} /> Hidden</>}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* Core data hints */}
      <Panel
        title="Bookings data"
        subtitle="Services and availability live under Bookings. Change them once and they update everywhere."
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
      className="bg-white border border-hairline-soft p-3 hover:border-near-black flex items-center justify-between gap-2"
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-near-black truncate">{label}</p>
        <p className="text-2xs text-muted-text">{hint}</p>
      </div>
      <ChevronRight size={14} className="text-muted-text flex-shrink-0" />
    </Link>
  )
}

// ── Header / Hero ────────────────────────────────────────────────────────────

const HEADER_CUSTOM_LINKS_MAX = 8

// Custom-link URLs must be absolute so they work from any tenant
// subdomain — http(s) pages, mailto: and tel: are the supported schemes.
function customLinkUrlInvalid(url: string): boolean {
  const v = url.trim()
  if (!v) return false
  return !/^(https?:\/\/|mailto:|tel:)/i.test(v)
}

function HeaderPanel({
  settings, onSave, manifest,
}: {
  settings: TemplateSettings
  onSave: (p: Partial<TemplateSettings>) => Promise<void>
  manifest: TemplateManifest | null
}) {
  // M4 — gate fields by manifest. Null manifest = show everything
  // (the template's still-loading state, or an un-manifested legacy
  // template). The defaults match The Fade Room's surface, so a
  // missing-manifest tenant is no worse off than before.
  const showAvatar = !manifest || supportsHeaderField(manifest, 'avatar_image')
  const form = useSettingsForm<TemplateHeaderSettings>(
    settings.header,
    async (next) => { await onSave({ header: next }) },
  )

  // Custom links — owner-defined header buttons, saved alongside the rest
  // of the header settings via the same SaveBar.
  const customLinks = form.value.custom_links ?? []

  function setCustomLinks(next: TemplateHeaderCustomLink[]) {
    form.patch({ custom_links: next })
  }

  function addCustomLink() {
    if (customLinks.length >= HEADER_CUSTOM_LINKS_MAX) return
    setCustomLinks([...customLinks, { id: crypto.randomUUID(), label: '', url: '' }])
  }

  function updateCustomLink(i: number, partial: Partial<TemplateHeaderCustomLink>) {
    setCustomLinks(customLinks.map((l, idx) => idx === i ? { ...l, ...partial } : l))
  }

  function removeCustomLink(i: number) {
    setCustomLinks(customLinks.filter((_, idx) => idx !== i))
  }

  // Validation: every link needs a label + a URL with a supported scheme.
  const invalidLinkIndexes: number[] = customLinks
    .map((l, i) => (!l.label.trim() || !l.url.trim() || customLinkUrlInvalid(l.url)) ? i : -1)
    .filter(i => i >= 0)
  const hasLinkValidationError = invalidLinkIndexes.length > 0

  return (
    <Panel
      title="Header / Hero"
      subtitle="The top of your public website: announcement, cover, business identity, and contact buttons."
    >
      {/* Announcement */}
      <div className="space-y-2.5">
        <TextField
          label="Announcement bar text"
          value={form.value.announcement_text ?? ''}
          onChange={v => form.patch({ announcement_text: v })}
          placeholder="Now booking for the season, limited weekend slots."
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
      <div className={cn(
        'grid gap-4 pt-2 border-t border-hairline-soft',
        showAvatar ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
      )}>
        <div className="max-w-[260px]">
          <ImageUploadField
            label="Cover image"
            value={form.value.cover_image_url ?? null}
            onChange={v => form.patch({ cover_image_url: v })}
            kind="header"
            aspectClass="aspect-[16/9]"
            hint="Wide image behind your header."
          />
        </div>
        {showAvatar && (
          <div className="max-w-[180px]">
            <ImageUploadField
              label="Avatar / logo"
              value={form.value.avatar_image_url ?? null}
              onChange={v => form.patch({ avatar_image_url: v })}
              kind="header"
              aspectClass="aspect-square"
              hint="Square photo or logo."
            />
          </div>
        )}
      </div>

      {/* Identity note */}
      <div className="pt-2 border-t border-hairline-soft">
        <div className="bg-cream border border-hairline-soft px-3 py-2.5 flex items-start gap-2">
          <Info size={13} className="text-muted-text flex-shrink-0 mt-0.5" />
          <p className="text-2xs text-muted-text leading-relaxed">
            Business name and tagline come from your{' '}
            <Link href="/editor/settings?tab=business" className="text-near-black font-semibold underline">Business Profile</Link>.
          </p>
        </div>
      </div>

      {/* Header buttons */}
      <div className="space-y-2 pt-2 border-t border-hairline-soft">
        <div>
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
            Header buttons
          </p>
          <p className="text-2xs text-muted-text mt-0.5">
            Toggle visibility and (optionally) override the link each button opens. Leave a URL blank to use the default from your Business Profile.
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
          placeholder="https://instagram.com/… (defaults to Business Profile)"
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

      {/* Custom links */}
      <div className="space-y-2 pt-2 border-t border-hairline-soft">
        <div>
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
            Custom links
          </p>
          <p className="text-2xs text-muted-text mt-0.5">
            Add up to {HEADER_CUSTOM_LINKS_MAX} of your own links. They render as buttons in your site header next to the social buttons.
          </p>
        </div>

        {customLinks.map((link, i) => {
          const urlBad  = customLinkUrlInvalid(link.url)
          const invalid = invalidLinkIndexes.includes(i)
          return (
            <div
              key={link.id}
              className={cn(
                'bg-white border p-3 space-y-2',
                invalid ? 'border-danger' : 'border-hairline-soft',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                  Link {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCustomLink(i)}
                  className="w-7 h-7 ml-auto inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger flex-shrink-0"
                  title="Delete"
                >
                  <Trash2 size={11} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={link.label}
                  onChange={e => updateCustomLink(i, { label: e.target.value })}
                  placeholder="Label (e.g. Gift Cards)"
                  maxLength={40}
                  className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                />
                <input
                  type="text"
                  value={link.url}
                  onChange={e => updateCustomLink(i, { url: e.target.value })}
                  placeholder="https://…"
                  maxLength={500}
                  className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                />
              </div>

              {invalid && (
                <p className="text-2xs text-danger flex items-center gap-1.5">
                  <AlertCircle size={11} />
                  {urlBad
                    ? 'URL must start with http://, https://, mailto: or tel:.'
                    : 'Label and URL are required.'}
                </p>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={addCustomLink}
          disabled={customLinks.length >= HEADER_CUSTOM_LINKS_MAX}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Add Link
          {customLinks.length >= HEADER_CUSTOM_LINKS_MAX && ` (max ${HEADER_CUSTOM_LINKS_MAX})`}
        </button>
      </div>

      <SaveBar
        dirty={form.dirty && !hasLinkValidationError}
        saving={form.saving}
        saved={form.saved}
        error={form.error ?? (form.dirty && hasLinkValidationError ? 'Fix the highlighted links before saving.' : null)}
        onSave={form.doSave}
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
  { key: 'results_label',  sectionKey: 'results',  label: 'Results tab'  },
  { key: 'advice_label',   sectionKey: 'advice',   label: 'Advice tab'   },
  { key: 'timeline_label', sectionKey: 'timeline', label: 'Timeline tab' },
]

function ContentTabsPanel({
  settings, sections, manifest, onSaveSettings, onToggleSection,
}: {
  settings: TemplateSettings
  sections: WebsiteSection[]
  manifest: TemplateManifest | null
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
        statusBadge={hiddenCount > 0 && <Chip tone="muted">{hiddenCount} hidden</Chip>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TAB_LABEL_FIELDS.map(({ key, sectionKey, label }) => {
            const section = sectionByKey[sectionKey]
            const locked  = !!section?.is_locked || sectionKey === 'book'
            const visible = section ? section.is_enabled : true
            const busy    = section && busyId === section.id
            return (
              <div key={String(key)} className="border border-hairline-soft p-2 bg-white">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-eyebrow font-bold tracking-[0.12em] uppercase text-muted-text truncate">
                    {label}
                  </span>
                  {locked ? (
                    <span
                      className="inline-flex items-center text-eyebrow text-muted-text/80 flex-shrink-0"
                      title="Always on"
                    >
                      <Lock size={9} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(section)}
                      disabled={!section || busy}
                      title={visible ? 'Hide tab' : 'Show tab'}
                      className={cn(
                        'inline-flex items-center justify-center w-6 h-6 border flex-shrink-0',
                        visible
                          ? 'bg-white border-hairline-strong text-near-black hover:border-near-black'
                          : 'bg-near-black border-near-black text-white',
                      )}
                    >
                      {visible ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={form.value[key] ?? ''}
                  onChange={e => form.patch({ [key]: e.target.value } as Partial<TemplateSettings['tabs']>)}
                  maxLength={40}
                  className="w-full bg-white border border-hairline-strong px-2 py-1.5 text-xs text-near-black focus:outline-none focus:border-near-black"
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

      <InstructionsEditorPanel
        title="Advice"
        subtitle="Tips, advice, or care instructions shown on the Advice tab."
        addLabel="Add Tip"
        emptyText="No tips yet. Add your first one."
        block={settings.advice ?? { heading: 'Advice', items: [] }}
        defaultHeading="Advice"
        icon={ListChecks}
        itemLabel="Box"
        onSave={(next) => onSaveSettings({ advice: next })}
      />

      <InstructionsEditorPanel
        title="Timeline"
        subtitle="A numbered list shown on the Timeline tab, great for booking flow or appointment prep."
        addLabel="Add Step"
        emptyText="No steps yet. Add your first one."
        block={settings.timeline ?? { heading: 'Timeline', items: [] }}
        defaultHeading="Timeline"
        icon={Clock}
        onSave={(next) => onSaveSettings({ timeline: next })}
      />

      <AboutEditorPanel
        about={settings.about}
        manifest={manifest}
        onSave={(next) => onSaveSettings({ about: next })}
      />
    </div>
  )
}

// ── SEO placeholder ─────────────────────────────────────────────────────────

function SeoComingSoonPanel() {
  return (
    <div className="bg-white border border-hairline-soft p-6 sm:p-8 text-center">
      <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-2">
        Coming Soon
      </p>
      <h2 className="text-base font-bold text-near-black mb-1">Get found on Google</h2>
      <p className="text-xs text-muted-text max-w-md mx-auto">
        Set your page title, the short description that shows in Google results,
        and the image people see when your site is shared. We&apos;re finishing this up.
      </p>
    </div>
  )
}

// ── Instructions editor (Advice & Timeline) ───────────────────

const INSTRUCTIONS_MAX_ITEMS = 8

interface InstructionItem { title: string; body: string }
interface InstructionBlock {
  heading: string
  /** Phase 8 — optional shared label rendered above every card's title
   *  (e.g. "Aftercare Advice", "Prep Notes"). Empty/missing = no label. */
  card_kicker?: string
  items: InstructionItem[]
}

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
    heading:     block.heading ?? defaultHeading,
    card_kicker: block.card_kicker ?? '',
    items:       block.items?.length ? block.items : [],
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
      statusBadge={<Chip>{value.items.length} item{value.items.length === 1 ? '' : 's'}</Chip>}
    >
      <TextField
        label="Section heading"
        value={value.heading}
        onChange={v => patch({ heading: v })}
        placeholder={defaultHeading}
        maxLength={120}
      />

      {/* Phase 8 — shared kicker shown above every card's title. Replaces
          the old auto-generated 'Step 01/02/03' labels. Owner picks the
          tone (Aftercare advice, How To…, Prep notes, etc) or leaves it
          blank for no kicker. */}
      <TextField
        label="Card label (optional)"
        hint="Renders above every card's heading, e.g. “Aftercare Advice”. Leave blank for no label."
        value={value.card_kicker ?? ''}
        onChange={v => patch({ card_kicker: v })}
        placeholder="Aftercare advice"
        maxLength={40}
      />

      <div className="space-y-2.5">
        {value.items.length === 0 && (
          <div className="bg-cream border border-hairline-soft px-4 py-5 text-center">
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
                invalid ? 'border-danger' : 'border-hairline-soft',
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                  {itemLabel} {i + 1}
                </span>
                <div className="flex items-center gap-1 ml-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => move(i, 'up')}
                    disabled={i === 0}
                    className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-near-black disabled:opacity-30"
                    title="Move up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 'down')}
                    disabled={isLast}
                    className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-near-black disabled:opacity-30"
                    title="Move down"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={value.items.length <= 1}
                    className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger disabled:opacity-30"
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
                className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
              />
              <textarea
                value={item.body}
                onChange={e => updateItem(i, { body: e.target.value })}
                placeholder="Body: what should happen at this step?"
                rows={2}
                maxLength={500}
                className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
              />

              {invalid && (
                <p className="text-2xs text-danger flex items-center gap-1.5">
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
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black disabled:opacity-50 disabled:cursor-not-allowed"
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
  about, manifest, onSave,
}: {
  about: TemplateAboutSettings | undefined
  manifest: TemplateManifest | null
  onSave: (next: TemplateAboutSettings) => Promise<void>
}) {
  // Manifest gating — when the template declares `about_fields`, only show
  // controls for fields it actually renders. Null manifest = show everything
  // (the deep-merge default; matches header/footer panel behavior). Eyebrow
  // is no longer an editable input here — every template derives it from
  // the About tab name — so we only gate images + highlights.
  const showImages     = !manifest?.about_fields || manifest.about_fields.includes('images')
  const showHighlights = !manifest?.about_fields || manifest.about_fields.includes('highlights')
  // How many slots to expose in the editor — Blackline opts into 1, all
  // others get the legacy default of 3. The stored array still stays
  // length-3 so existing data isn't truncated; we just hide the extra
  // slots from the UI.
  const imageSlots = manifest ? aboutImageCountFor(manifest) : 3
  // Always normalize images to length 3 — the TFR template renders 3 slots
  // unconditionally and we don't want sparse arrays leaking into save payloads.
  const seedImages = about?.images ?? []
  const initial: TemplateAboutSettings = {
    heading:    about?.heading    ?? 'About',
    eyebrow:    about?.eyebrow    ?? '',
    body:       about?.body       ?? '',
    highlights: about?.highlights ?? [],
    images:     [seedImages[0] ?? null, seedImages[1] ?? null, seedImages[2] ?? null],
  }
  const form = useSettingsForm<TemplateAboutSettings>(initial, onSave)
  const { value, patch, dirty, saving, saved, error, doSave } = form

  const images = value.images ?? [null, null, null]
  function setImage(slot: 0 | 1 | 2, url: string | null) {
    const next: (string | null)[] = [images[0] ?? null, images[1] ?? null, images[2] ?? null]
    next[slot] = url
    patch({ images: next })
  }

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
      subtitle="The story shown on your About tab: who you are, what you do, what makes your work different."
      icon={Info}
      statusBadge={<Chip tone={filled ? 'neutral' : 'muted'}>{filled ? 'Set' : 'Default'}</Chip>}
    >
      {/* Image slots rendered with the About section. Most templates expose
          three (e.g. TFR's offset triptych); Blackline opts into a single
          hero via `about_image_count: 1` on its manifest.
          Manifest-gated: hidden when the template's about_fields omits 'images'. */}
      {showImages && (
        <div>
          <FieldLabel hint={imageSlots === 1 ? 'Recommended portrait, about 720×1080px.' : 'Recommended portrait, about 600×1000px each.'}>
            {imageSlots === 1 ? 'Photo' : `Photos (${imageSlots} slots)`}
          </FieldLabel>
          <div
            className={cn(
              'gap-2 mt-1.5',
              imageSlots === 1 ? 'grid grid-cols-1 max-w-[260px]' :
              imageSlots === 2 ? 'grid grid-cols-2' :
              'grid grid-cols-3',
            )}
          >
            {Array.from({ length: Math.min(imageSlots, 3) }).map((_, i) => (
              <ImageUploadField
                key={i}
                label={imageSlots === 1 ? 'Photo' : `Photo ${i + 1}`}
                value={images[i] ?? null}
                onChange={url => setImage(i as 0 | 1 | 2, url)}
                kind="about"
                aspectClass="aspect-[3/5]"
              />
            ))}
          </div>
        </div>
      )}

      {/* About eyebrow input removed — every template now uses the About
          tab name as the section eyebrow (so renaming the tab renames the
          eyebrow too, matching how the other tabbed sections work). */}
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

      {showHighlights && (
      <div className="space-y-2.5 pt-2 border-t border-hairline-soft">
        <div className="flex items-center justify-between gap-3">
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
            Highlights ({highlights.length}/{ABOUT_MAX_HIGHLIGHTS})
          </p>
          <button
            type="button"
            onClick={addHighlight}
            disabled={highlights.length >= ABOUT_MAX_HIGHLIGHTS}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-1.5 hover:border-near-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Add Highlight
          </button>
        </div>
        {highlights.length === 0 && (
          <p className="text-xs text-muted-text">Optional: add small highlight cards under your About copy.</p>
        )}
        {highlights.map((h, i) => (
          <div key={i} className="bg-white border border-hairline-soft p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                Highlight {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removeHighlight(i)}
                className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
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
              className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
            <textarea
              value={h.body}
              onChange={e => updateHighlight(i, { body: e.target.value })}
              placeholder="Body"
              rows={2}
              maxLength={400}
              className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
            />
          </div>
        ))}
      </div>
      )}

      <SaveBar dirty={dirty} saving={saving} saved={saved} error={error} onSave={doSave} />
    </CollapsibleSection>
  )
}

// ── Policies editor (the single source of truth for policy editing) ─────────

const POLICY_FIELDS: { key: keyof BusinessPolicy; label: string; placeholder: string }[] = [
  { key: 'cancellation_policy', label: 'Cancellation policy', placeholder: 'How much notice do customers need to give?' },
  { key: 'late_policy',         label: 'Late arrival policy', placeholder: 'What happens if a customer arrives late?' },
  { key: 'no_show_policy',      label: 'No-show policy',      placeholder: 'What happens if a customer doesn\'t show up?' },
  { key: 'deposit_policy',      label: 'Deposit policy',      placeholder: 'Is a deposit required to book?' },
  { key: 'reschedule_policy',   label: 'Reschedule policy',   placeholder: 'How can customers reschedule?' },
  { key: 'extra_notes',         label: 'Additional notes',    placeholder: 'Anything else customers should know.' },
]

function PoliciesEditorPanel({ settings, onSaveSettings }: {
  settings: TemplateSettings
  onSaveSettings: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const [policies, setPolicies] = useState<BusinessPolicy | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [baseline, setBaseline] = useState<BusinessPolicy | null>(null)
  // Section heading lives on template_settings, but it's edited + saved here
  // through the single section Save (no separate heading button).
  const [heading, setHeading]                 = useState<string>(settings.policy?.heading ?? '')
  const [headingBaseline, setHeadingBaseline] = useState<string>(settings.policy?.heading ?? '')

  useEffect(() => {
    let cancelled = false
    getEditorPolicies()
      .then(p => {
        if (cancelled) return
        const normalized = normalizePoliciesShape(p)
        setPolicies(normalized)
        setBaseline(normalized)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load policies') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const dirty = useMemo(
    () => JSON.stringify(policies) !== JSON.stringify(baseline) || heading !== headingBaseline,
    [policies, baseline, heading, headingBaseline],
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
      // Heading (template_settings) saves together with the policies, so the
      // section has a single Save button at the bottom.
      if (heading !== headingBaseline) {
        await onSaveSettings({ policy: { heading: heading.trim() || null } })
        setHeadingBaseline(heading)
      }
      const payload: Partial<BusinessPolicy> & Record<string, unknown> = {}
      for (const { key } of POLICY_FIELDS) {
        const v = policies[key] as string
        ;(payload as Record<string, unknown>)[key] = v && v.trim().length > 0 ? v : null
      }
      payload.custom_groups = (policies.custom_groups ?? [])
        .map(g => ({
          heading: (g.heading ?? '').trim(),
          items: (g.items ?? [])
            .map(it => ({
              title:   (it.title   ?? '').trim(),
              content: (it.content ?? '').trim(),
            }))
            .filter(it => it.title.length > 0),
        }))
        .filter(g => g.heading.length > 0)
      const res = await updateEditorPolicies(payload)
      const normalized = normalizePoliciesShape(res)
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
        <Chip tone={setCount > 0 ? 'neutral' : 'muted'}>
          {setCount}/{POLICY_FIELDS.length} set
        </Chip>
      )}
    >
      <div className="space-y-2 pb-3 border-b border-hairline-soft">
        <TextField
          label="Section heading (the big title above your policies)"
          value={heading}
          onChange={setHeading}
          placeholder="House Rules"
          maxLength={80}
        />
      </div>
      {loading && <p className="text-xs text-muted-text">Loading…</p>}
      {!loading && !policies && error && <p className="text-xs text-danger">{error}</p>}
      {policies && (
        <>
          <p className="text-2xs text-muted-text bg-cream border border-hairline-soft px-3 py-2">
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

          <WebsiteCustomPolicyGroupsEditor
            groups={policies.custom_groups ?? []}
            onChange={(next) => {
              setPolicies(prev => prev ? { ...prev, custom_groups: next } : prev)
              if (saved) setSaved(false)
            }}
          />

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

const FAQ_MAX_ITEMS = 4

function AdditionalsPanel({
  settings, onSave,
}: {
  settings: TemplateSettings
  onSave: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  // Normalize the whole shape on mount — guarantees faq/reviews are always
  // present so the form's dirty-tracking compares apples to apples.
  const initial: TemplateAdditionalsSettings = {
    show_thank_you:      settings.additionals?.show_thank_you      ?? true,
    thank_you_eyebrow:   settings.additionals?.thank_you_eyebrow   ?? '',
    thank_you_title:     settings.additionals?.thank_you_title     ?? 'Thank you for choosing us',
    thank_you_body:      settings.additionals?.thank_you_body      ?? '',
    thank_you_signature: settings.additionals?.thank_you_signature ?? '',
    faq: {
      enabled: settings.additionals?.faq?.enabled ?? false,
      heading: settings.additionals?.faq?.heading ?? 'Frequently asked',
      items:   settings.additionals?.faq?.items   ?? [],
    },
    reviews: {
      enabled: settings.additionals?.reviews?.enabled ?? false,
      heading: settings.additionals?.reviews?.heading ?? 'What customers say',
      items:   settings.additionals?.reviews?.items   ?? [],
    },
  }
  const form = useSettingsForm<TemplateAdditionalsSettings>(
    initial,
    async (next) => { await onSave({ additionals: next }) },
  )

  // ── FAQ helpers ──
  const faq = form.value.faq ?? initial.faq!
  function patchFaq(p: Partial<NonNullable<TemplateAdditionalsSettings['faq']>>) {
    form.patch({ faq: { ...faq, ...p } })
  }
  function addFaqItem() {
    if ((faq.items ?? []).length >= FAQ_MAX_ITEMS) return
    patchFaq({ items: [...(faq.items ?? []), { question: '', answer: '' }] })
  }
  function updateFaqItem(i: number, p: Partial<{ question: string; answer: string }>) {
    patchFaq({ items: (faq.items ?? []).map((it, idx) => idx === i ? { ...it, ...p } : it) })
  }
  function removeFaqItem(i: number) {
    patchFaq({ items: (faq.items ?? []).filter((_, idx) => idx !== i) })
  }

  // ── Review helpers ──
  const reviews = form.value.reviews ?? initial.reviews!
  function patchReviews(p: Partial<NonNullable<TemplateAdditionalsSettings['reviews']>>) {
    form.patch({ reviews: { ...reviews, ...p } })
  }
  function addReview() {
    patchReviews({ items: [...(reviews.items ?? []), { author: '', body: '', location: '', rating: 5 }] })
  }
  function updateReview(i: number, p: Partial<{ author: string; body: string; location?: string | null; rating?: number | null }>) {
    patchReviews({ items: (reviews.items ?? []).map((it, idx) => idx === i ? { ...it, ...p } : it) })
  }
  function removeReview(i: number) {
    patchReviews({ items: (reviews.items ?? []).filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-5">
      {/* Thank-you (unchanged) */}
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
          label="Small label above the title"
          value={form.value.thank_you_eyebrow ?? ''}
          onChange={v => form.patch({ thank_you_eyebrow: v || null })}
          placeholder="Outro"
          maxLength={40}
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
        <TextField
          label="Signature (optional)"
          value={form.value.thank_you_signature ?? ''}
          onChange={v => form.patch({ thank_you_signature: v || null })}
          placeholder="Leave empty to use your business name"
          maxLength={40}
          hint="One short word or phrase shown between the two thin lines at the bottom of the section."
        />
      </Panel>

      {/* FAQ — up to 4 Q&A items */}
      <Panel
        title="FAQ"
        subtitle="Up to 4 short answers to questions customers ask before they book."
      >
        <ToggleRow
          label="Show FAQ section"
          icon={ListChecks}
          on={faq.enabled ?? false}
          onToggle={() => patchFaq({ enabled: !(faq.enabled ?? false) })}
        />
        <TextField
          label="Section heading"
          value={faq.heading ?? ''}
          onChange={v => patchFaq({ heading: v })}
          placeholder="Frequently asked"
          maxLength={80}
        />

        <div className="space-y-2.5 pt-2 border-t border-hairline-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
              Questions ({(faq.items ?? []).length}/{FAQ_MAX_ITEMS})
            </p>
            <button
              type="button"
              onClick={addFaqItem}
              disabled={(faq.items ?? []).length >= FAQ_MAX_ITEMS}
              className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-1.5 hover:border-near-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={12} /> Add question
            </button>
          </div>
          {(faq.items ?? []).length === 0 && (
            <p className="text-xs text-muted-text">No questions yet. Add up to {FAQ_MAX_ITEMS}.</p>
          )}
          {(faq.items ?? []).map((it, i) => (
            <div key={i} className="bg-white border border-hairline-soft p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                  Question {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeFaqItem(i)}
                  className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <TextField
                label="Question"
                value={it.question}
                onChange={v => updateFaqItem(i, { question: v })}
                placeholder="Do you take walk-ins?"
                maxLength={200}
              />
              <TextareaField
                label="Answer"
                value={it.answer}
                onChange={v => updateFaqItem(i, { answer: v })}
                placeholder="Walk-ins are welcome when there's an open slot, though booking ahead is always safest."
                rows={3}
                maxLength={1000}
              />
            </div>
          ))}
        </div>
      </Panel>

      {/* Reviews / Testimonials — static list (no Stripe/Google integration). */}
      <Panel
        title="Reviews & testimonials"
        subtitle="Static quotes from happy customers. Add the words you want shown."
      >
        <ToggleRow
          label="Show Reviews section"
          icon={MessageSquare}
          on={reviews.enabled ?? false}
          onToggle={() => patchReviews({ enabled: !(reviews.enabled ?? false) })}
        />
        <TextField
          label="Section heading"
          value={reviews.heading ?? ''}
          onChange={v => patchReviews({ heading: v })}
          placeholder="What customers say"
          maxLength={80}
        />

        <div className="space-y-2.5 pt-2 border-t border-hairline-soft">
          <div className="flex items-center justify-between gap-3">
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
              Testimonials ({(reviews.items ?? []).length})
            </p>
            <button
              type="button"
              onClick={addReview}
              className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-1.5 hover:border-near-black"
            >
              <Plus size={12} /> Add review
            </button>
          </div>
          {(reviews.items ?? []).length === 0 && (
            <p className="text-xs text-muted-text">No reviews yet. Add a few of your favorites.</p>
          )}
          {(reviews.items ?? []).map((r, i) => (
            <div key={i} className="bg-white border border-hairline-soft p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                  Review {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeReview(i)}
                  className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <TextareaField
                label="Quote"
                value={r.body}
                onChange={v => updateReview(i, { body: v })}
                placeholder="“Best haircut I've ever had. Anna nailed exactly what I asked for.”"
                rows={3}
                maxLength={500}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <TextField
                  label="Name"
                  value={r.author}
                  onChange={v => updateReview(i, { author: v })}
                  placeholder="Jess M."
                  maxLength={80}
                />
                <TextField
                  label="Location (optional)"
                  value={r.location ?? ''}
                  onChange={v => updateReview(i, { location: v || null })}
                  placeholder="Brooklyn, NY"
                  maxLength={80}
                />
                <div>
                  <FieldLabel>Rating</FieldLabel>
                  <select
                    value={String(r.rating ?? 5)}
                    onChange={e => updateReview(i, { rating: Number(e.target.value) })}
                    className="w-full mt-1.5 bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                  >
                    {[5, 4, 3, 2, 1].map(n => (
                      <option key={n} value={n}>{'★'.repeat(n) + '☆'.repeat(5 - n)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Single save bar covers all three blocks above. */}
      <SaveBar
        dirty={form.dirty} saving={form.saving} saved={form.saved}
        error={form.error} onSave={form.doSave}
      />
    </div>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

function FooterPanel({
  settings, onSave, manifest,
}: {
  settings: TemplateSettings
  onSave: (p: Partial<TemplateSettings>) => Promise<void>
  manifest: TemplateManifest | null
}) {
  // M4 — gate footer toggles by manifest. See HeaderPanel for the
  // null-manifest fallback rule.
  const showHours        = !manifest || supportsFooterField(manifest, 'show_hours')
  const showQuickBook    = !manifest || supportsFooterField(manifest, 'show_quick_book')
  const showContactLinks = !manifest || supportsFooterField(manifest, 'show_contact_links')
  const showPoweredBy    = !manifest || supportsFooterField(manifest, 'show_powered_by')
  const showNameOverride = !manifest || supportsFooterField(manifest, 'business_name_override')
  const showSubtext      = !manifest || supportsFooterField(manifest, 'subtext')
  const initial: TemplateFooterSettings = {
    business_name_override: settings.footer.business_name_override ?? null,
    subtext:                settings.footer.subtext                ?? '',
    brand_label:            settings.footer.brand_label            ?? '',
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
      subtitle="The bottom of your public site: name, links, hours, and the BookReady badge."
    >
      <div className="bg-cream border border-hairline-soft px-3 py-2.5 flex items-start gap-2">
        <Info size={13} className="text-muted-text flex-shrink-0 mt-0.5" />
        <p className="text-2xs text-muted-text leading-relaxed">
          Hours come from your{' '}
          <Link href="/editor/availability" className="text-near-black font-semibold underline">Availability</Link>
          {' '}schedule. Toggle below to choose what shows in the footer.
        </p>
      </div>

      <TextField
        label="Brand label (small text above your business name in the footer)"
        value={form.value.brand_label ?? ''}
        onChange={v => form.patch({ brand_label: v || null })}
        placeholder="The Studio"
        maxLength={40}
      />

      {showNameOverride && (
        <TextField
          label="Footer business name override (optional)"
          value={form.value.business_name_override ?? ''}
          onChange={v => form.patch({ business_name_override: v || null })}
          placeholder="Leave blank to use your Business Profile name"
          maxLength={120}
        />
      )}

      {showSubtext && (
        <TextareaField
          label="Footer subtext"
          value={form.value.subtext ?? ''}
          onChange={v => form.patch({ subtext: v || null })}
          placeholder="Booking by appointment. Walk-ins welcome when available."
          rows={2}
          maxLength={240}
        />
      )}

      <div className="space-y-1.5 pt-2 border-t border-hairline-soft">
        {showContactLinks && (
          <ToggleRow label="Show contact links" on={form.value.show_contact_links ?? true} onToggle={() => form.patch({ show_contact_links: !(form.value.show_contact_links ?? true) })} />
        )}
        {showHours && (
          <ToggleRow label="Show hours"         on={form.value.show_hours         ?? true} onToggle={() => form.patch({ show_hours:         !(form.value.show_hours         ?? true) })} />
        )}
        {showQuickBook && (
          <ToggleRow label="Show Quick Book"    on={form.value.show_quick_book    ?? true} onToggle={() => form.patch({ show_quick_book:    !(form.value.show_quick_book    ?? true) })} />
        )}
        {showPoweredBy && (
          <ToggleRow label="Show the BookReady badge" on={form.value.show_powered_by}     onToggle={() => form.patch({ show_powered_by:    !form.value.show_powered_by })} />
        )}
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
      <div className="bg-white border border-hairline-soft p-4">
        <p className="text-sm text-muted-text">Sign in to preview your site.</p>
      </div>
    )
  }

  const desktopScale = PREVIEW_FRAME_W / PREVIEW_DESKTOP_W

  return (
    <div className="bg-white border border-hairline-soft p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">Preview</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setManualBump(n => n + 1)}
            className="inline-flex items-center gap-1 text-eyebrow font-semibold tracking-[0.08em] uppercase px-2 py-1 border bg-white text-near-black border-hairline-strong hover:border-near-black"
            title="Refresh preview"
          >
            <RefreshCw size={11} />
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={cn(
              'inline-flex items-center gap-1 text-eyebrow font-semibold tracking-[0.08em] uppercase px-2 py-1 border',
              mode === 'mobile' ? 'bg-near-black text-white border-near-black' : 'bg-white text-near-black border-hairline-strong',
            )}
          >
            <Smartphone size={11} /> Mobile
          </button>
          <button
            onClick={() => setMode('desktop')}
            className={cn(
              'inline-flex items-center gap-1 text-eyebrow font-semibold tracking-[0.08em] uppercase px-2 py-1 border',
              mode === 'desktop' ? 'bg-near-black text-white border-near-black' : 'bg-white text-near-black border-hairline-strong',
            )}
          >
            <Monitor size={11} /> Desktop
          </button>
        </div>
      </div>

      <div className="flex justify-center items-start bg-cream p-2 border border-hairline-soft overflow-hidden">
        {mode === 'mobile' ? (
          <iframe
            key={`mob-${cacheKey}`}
            src={src}
            title="Public site preview, mobile"
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
              title="Public site preview, desktop"
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

      <p className="text-eyebrow text-muted-text text-center">
        {mode === 'mobile'
          ? `Live preview at ${PREVIEW_MOBILE_W}px`
          : `Scaled from ${PREVIEW_DESKTOP_W}px desktop view`}
      </p>
    </div>
  )
}

// ── Gallery manager (lives inside Content & Tabs) ────────────────────────────

const GALLERY_MAX_GROUPS         = 3
const GALLERY_MAX_ITEMS_PER_GROUP = 6

// Layout picker — 'auto' maps to null in settings.gallery.layout (follow
// the template's own grid); the rest force columns x rows on every group.
type GalleryLayoutChoice = 'auto' | '1x6' | '2x3' | '3x2'

const GALLERY_LAYOUT_OPTIONS: SegmentedOption<GalleryLayoutChoice>[] = [
  { value: 'auto', label: 'Auto'  },
  { value: '1x6',  label: '1 x 6' },
  { value: '2x3',  label: '2 x 3' },
  { value: '3x2',  label: '3 x 2' },
]

function GalleryManagerPanel({ settings, onSaveSettings }: {
  settings: TemplateSettings
  onSaveSettings: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const [items, setItems]     = useState<GalleryItem[] | null>(null)
  const [groups, setGroups]   = useState<GalleryGroup[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [busyId, setBusyId]   = useState<number | null>(null)
  const [editing, setEditing] = useState<GalleryItem | null>(null)
  const confirm = useConfirm()
  // When the user clicks "Add image" inside a group we remember which group
  // it was so the new item is created with the right group_id pre-filled.
  const [addingForGroup, setAddingForGroup] = useState<number | null | 'none'>(null)
  const [addingGroup, setAddingGroup]       = useState(false)
  const headingForm = useSettingsForm<{ heading: string; layout: GalleryLayoutChoice }>(
    {
      heading: settings.gallery?.heading ?? '',
      layout:  settings.gallery?.layout ?? 'auto',
    },
    async (next) => {
      await onSaveSettings({ gallery: {
        heading: next.heading || null,
        layout:  next.layout === 'auto' ? null : next.layout,
      } })
    },
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([getEditorGallery(), getEditorGalleryGroups()])
      .then(([rows, gs]) => {
        if (cancelled) return
        setItems(rows)
        setGroups(gs)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load gallery') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const sortedItems  = useMemo(
    () => (items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items],
  )
  const sortedGroups = useMemo(
    () => (groups ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [groups],
  )

  function itemsForGroup(gid: number | null): GalleryItem[] {
    return sortedItems.filter(i => (i.group_id ?? null) === gid)
  }

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
    const ok = await confirm({ title: `Delete "${item.title ?? 'this image'}"?`, message: "This can't be undone.", confirmLabel: 'Delete', tone: 'danger' })
    if (! ok) return
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
    setAddingForGroup(null)
  }

  async function createGroup(heading: string) {
    setError(null)
    const created = await createEditorGalleryGroup({ heading })
    setGroups(prev => [...(prev ?? []), created])
    setAddingGroup(false)
  }

  async function renameGroup(g: GalleryGroup, heading: string) {
    setError(null)
    const updated = await updateEditorGalleryGroup(g.id, { heading })
    setGroups(prev => (prev ?? []).map(x => x.id === g.id ? updated : x))
  }

  async function removeGroup(g: GalleryGroup) {
    const inGroup = itemsForGroup(g.id).length
    const ok = await confirm({
      title: `Delete the "${g.heading}" collection?`,
      message: inGroup === 0
        ? 'The collection will be removed.'
        : `Its ${inGroup} image${inGroup === 1 ? '' : 's'} will be kept but moved to "Ungrouped".`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (! ok) return
    setError(null)
    try {
      await deleteEditorGalleryGroup(g.id)
      setGroups(prev => (prev ?? []).filter(x => x.id !== g.id))
      // Orphan items locally to match what the backend did server-side.
      setItems(prev => (prev ?? []).map(i =>
        (i.group_id ?? null) === g.id ? { ...i, group_id: null } : i,
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete group')
    }
  }

  const totalImages = sortedItems.length
  const ungrouped   = itemsForGroup(null)

  return (
    <CollapsibleSection
      title="Gallery"
      subtitle="Organize your work into up to 3 collections. Each can hold up to 6 photos."
      icon={ImageIcon}
      statusBadge={!loading && (
        <Chip>{totalImages} image{totalImages === 1 ? '' : 's'}</Chip>
      )}
    >
      <TextField
        label="Section heading (the big title above your gallery)"
        value={headingForm.value.heading}
        onChange={v => headingForm.patch({ heading: v })}
        placeholder="Recent work"
        maxLength={80}
      />
      <div className="space-y-1.5">
        <FieldLabel>Layout</FieldLabel>
        <SegmentedControl
          options={GALLERY_LAYOUT_OPTIONS}
          value={headingForm.value.layout}
          onChange={v => headingForm.patch({ layout: v })}
          ariaLabel="Gallery layout"
          size="sm"
        />
        <p className="text-2xs text-muted-text">
          Auto follows the template design. Pick a grid to override it on every group.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-text">
          {loading
            ? 'Loading…'
            : `Up to ${GALLERY_MAX_GROUPS} collections × ${GALLERY_MAX_ITEMS_PER_GROUP} images each.`}
        </p>
        <button
          onClick={() => setAddingGroup(true)}
          disabled={(groups?.length ?? 0) >= GALLERY_MAX_GROUPS}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Add Collection
        </button>
      </div>

      {error && (
        <div className="bg-white border border-danger text-danger text-xs p-3 flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {!loading && sortedGroups.length === 0 && ungrouped.length === 0 && (
        <div className="bg-cream border border-hairline-soft px-4 py-6 text-center">
          <ImageIcon size={20} className="mx-auto mb-2 text-muted-text" strokeWidth={1.5} />
          <p className="text-sm text-near-black font-semibold">No collections yet</p>
          <p className="text-xs text-muted-text mt-0.5">Add your first collection to start showing your work.</p>
        </div>
      )}

      {/* Groups */}
      {sortedGroups.map(g => (
        <GalleryGroupBlock
          key={g.id}
          group={g}
          items={itemsForGroup(g.id)}
          busyId={busyId}
          onRename={(h) => renameGroup(g, h)}
          onDelete={() => removeGroup(g)}
          onAddImage={() => setAddingForGroup(g.id)}
          onEdit={(it) => setEditing(it)}
          onToggle={toggle}
          onRemove={remove}
        />
      ))}

      {/* Ungrouped — only shown when there are loose items (e.g. legacy data). */}
      {ungrouped.length > 0 && (
        <GalleryGroupBlock
          key="__ungrouped"
          group={null}
          items={ungrouped}
          busyId={busyId}
          onRename={null}
          onDelete={null}
          onAddImage={() => setAddingForGroup('none')}
          onEdit={(it) => setEditing(it)}
          onToggle={toggle}
          onRemove={remove}
        />
      )}

      {addingGroup && (
        <GalleryGroupDialog
          group={null}
          onClose={() => setAddingGroup(false)}
          onSave={async (heading) => { await createGroup(heading) }}
        />
      )}

      {(editing || addingForGroup !== null) && (
        <GalleryItemDialog
          item={editing}
          groups={sortedGroups}
          defaultGroupId={editing ? (editing.group_id ?? null) : (addingForGroup === 'none' ? null : (addingForGroup ?? null))}
          onClose={() => { setEditing(null); setAddingForGroup(null) }}
          onSave={handleSave}
        />
      )}

      <SaveBar dirty={headingForm.dirty} saving={headingForm.saving} saved={headingForm.saved} error={headingForm.error} onSave={headingForm.doSave} />
    </CollapsibleSection>
  )
}

function GalleryGroupBlock({
  group, items, busyId, onRename, onDelete, onAddImage, onEdit, onToggle, onRemove,
}: {
  group: GalleryGroup | null
  items: GalleryItem[]
  busyId: number | null
  onRename: ((heading: string) => Promise<void>) | null
  onDelete: (() => void) | null
  onAddImage: () => void
  onEdit:   (item: GalleryItem) => void
  onToggle: (item: GalleryItem) => void
  onRemove: (item: GalleryItem) => void
}) {
  const [renaming, setRenaming]   = useState(false)
  const [heading, setHeading]     = useState(group?.heading ?? '')
  const [savingRename, setSaving] = useState(false)
  const isUngrouped = group === null
  const atCap = items.length >= GALLERY_MAX_ITEMS_PER_GROUP

  async function commitRename() {
    if (!onRename || !group) return
    const trimmed = heading.trim()
    if (!trimmed) { setHeading(group.heading); setRenaming(false); return }
    if (trimmed === group.heading) { setRenaming(false); return }
    setSaving(true)
    try {
      await onRename(trimmed)
      setRenaming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-hairline-soft p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isUngrouped ? (
            <h4 className="text-sm font-bold text-near-black">Ungrouped</h4>
          ) : renaming ? (
            <input
              autoFocus
              value={heading}
              onChange={e => setHeading(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
              disabled={savingRename}
              maxLength={80}
              className="text-sm font-bold bg-cream border border-hairline-strong px-2 py-1 text-near-black min-w-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setHeading(group!.heading); setRenaming(true) }}
              className="text-sm font-bold text-near-black hover:underline truncate text-left"
              title="Rename collection"
            >
              {group!.heading}
            </button>
          )}
          <span className="text-eyebrow font-bold tracking-[0.06em] uppercase text-muted-text">
            {items.length}/{GALLERY_MAX_ITEMS_PER_GROUP}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAddImage}
            disabled={atCap}
            className="inline-flex items-center gap-1 text-eyebrow font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-2 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={11} /> Add image
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
              title="Delete collection"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-2xs text-muted-text italic">No images in this collection yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map(item => {
            const busy = busyId === item.id
            return (
              <div
                key={item.id}
                className={cn(
                  'relative aspect-square bg-cream border overflow-hidden group',
                  item.is_active ? 'border-hairline-soft' : 'border-hairline-soft opacity-70',
                )}
              >
                {item.image_url
                  /* eslint-disable-next-line @next/next/no-img-element */
                  ? <img src={item.image_url} alt={item.alt_text ?? item.title ?? ''} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={18} /></div>
                }
                {!item.is_active && (
                  <span className="absolute top-1 left-1 text-eyebrow font-bold tracking-[0.06em] uppercase bg-black/55 text-white px-1.5 py-0.5">
                    Hidden
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center gap-1 p-1.5 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    disabled={busy}
                    className="w-7 h-7 inline-flex items-center justify-center bg-white text-near-black hover:bg-cream disabled:opacity-30"
                    title="Edit"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(item)}
                    disabled={busy}
                    className="w-7 h-7 inline-flex items-center justify-center bg-white text-near-black hover:bg-cream disabled:opacity-30"
                    title={item.is_active ? 'Hide' : 'Show'}
                  >
                    {item.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    disabled={busy}
                    className="w-7 h-7 inline-flex items-center justify-center bg-white text-near-black hover:bg-red-600 hover:text-white disabled:opacity-30"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GalleryGroupDialog({
  group, onClose, onSave,
}: {
  group: GalleryGroup | null
  onClose: () => void
  onSave: (heading: string) => Promise<void>
}) {
  const [heading, setHeading] = useState(group?.heading ?? '')
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = heading.trim()
    if (!trimmed) { setError('Heading is required.'); return }
    setSaving(true); setError(null)
    try {
      await onSave(trimmed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm border border-hairline-strong">
        <div className="flex items-center justify-between border-b border-hairline-soft px-4 py-3">
          <h3 className="text-sm font-bold text-near-black">{group ? 'Rename collection' : 'New collection'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <TextField
            label="Heading *"
            value={heading}
            onChange={setHeading}
            placeholder="Fresh Cuts, Lashes, Bridal…"
            maxLength={80}
          />
          {error && (
            <p className="text-xs text-danger flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline-soft">
            <button
              type="button" onClick={onClose}
              className="text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-60"
            >
              {saving
                ? <><Loader2 size={11} className="animate-spin" /> Saving</>
                : <><Check size={12} /> {group ? 'Save' : 'Create'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GalleryItemDialog({
  item, groups, defaultGroupId, onClose, onSave,
}: {
  item: GalleryItem | null
  groups: GalleryGroup[]
  defaultGroupId: number | null
  onClose: () => void
  onSave: (payload: GalleryItemPayload, existingId: number | null) => void | Promise<void>
}) {
  const [imageUrl,  setImageUrl]  = useState(item?.image_url ?? '')
  const [title,     setTitle]     = useState(item?.title     ?? '')
  const [caption,   setCaption]   = useState(item?.caption   ?? '')
  const [altText,   setAltText]   = useState(item?.alt_text  ?? '')
  const [category,  setCategory]  = useState(item?.category  ?? '')
  const [isActive,  setIsActive]  = useState(item?.is_active ?? true)
  const [groupId,   setGroupId]   = useState<number | null>(item ? (item.group_id ?? null) : defaultGroupId)
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
        group_id:  groupId,
      }, item?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg border border-hairline-strong max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-hairline-soft px-4 py-3 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-near-black">{item ? 'Edit image' : 'Add image'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <ImageUploadField
            label="Image *"
            value={imageUrl || null}
            onChange={v => setImageUrl(v ?? '')}
            kind="gallery"
            aspectClass="aspect-[4/3]"
          />

          {groups.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Collection</span>
              <select
                value={groupId ?? ''}
                onChange={e => setGroupId(e.target.value === '' ? null : Number(e.target.value))}
                className="bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
              >
                <option value="">Ungrouped</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.heading}</option>
                ))}
              </select>
            </label>
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
            placeholder="Optional category tag"
            maxLength={255}
            hint="Optional"
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
            <p className="text-xs text-danger flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline-soft">
            <button
              type="button" onClick={onClose}
              className="text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-60"
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

const BA_MAX_GROUPS         = 3
const BA_MAX_ITEMS_PER_GROUP = 6

// Layout picker — 'auto' maps to null in settings.results.layout (follow
// the template); '2x1' = before and after side by side, '1x2' = stacked.
type ResultsLayoutChoice = 'auto' | '2x1' | '1x2'

const RESULTS_LAYOUT_OPTIONS: SegmentedOption<ResultsLayoutChoice>[] = [
  { value: 'auto', label: 'Auto' },
  { value: '2x1',  label: 'Side by side' },
  { value: '1x2',  label: 'Stacked' },
]

function ResultsManagerPanel({ settings, onSaveSettings }: {
  settings: TemplateSettings
  onSaveSettings: (p: Partial<TemplateSettings>) => Promise<void>
}) {
  const [items, setItems]     = useState<ResultsItem[] | null>(null)
  const [groups, setGroups]   = useState<ResultsGroup[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [busyId, setBusyId]   = useState<number | null>(null)
  const [editing, setEditing] = useState<ResultsItem | null>(null)
  const confirm = useConfirm()
  const [addingForGroup, setAddingForGroup] = useState<number | null | 'none'>(null)
  const [addingGroup, setAddingGroup]       = useState(false)
  const headingForm = useSettingsForm<{ heading: string; layout: ResultsLayoutChoice }>(
    {
      heading: settings.results?.heading ?? '',
      layout:  settings.results?.layout ?? 'auto',
    },
    async (next) => {
      await onSaveSettings({ results: {
        heading: next.heading || null,
        layout:  next.layout === 'auto' ? null : next.layout,
      } })
    },
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([getEditorResults(), getEditorResultsGroups()])
      .then(([rows, gs]) => {
        if (cancelled) return
        setItems(rows)
        setGroups(gs)
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load before/after items') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const sortedItems = useMemo(
    () => (items ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items],
  )
  const sortedGroups = useMemo(
    () => (groups ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [groups],
  )

  function itemsForGroup(gid: number | null): ResultsItem[] {
    return sortedItems.filter(i => (i.group_id ?? null) === gid)
  }

  async function toggle(item: ResultsItem) {
    setBusyId(item.id); setError(null)
    try {
      const updated = await updateEditorResultsItem(item.id, { is_active: !item.is_active })
      setItems(prev => (prev ?? []).map(i => i.id === item.id ? updated : i))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(item: ResultsItem) {
    const ok = await confirm({ title: 'Delete this pair?', message: "This can't be undone.", confirmLabel: 'Delete', tone: 'danger' })
    if (! ok) return
    setBusyId(item.id); setError(null)
    try {
      await deleteEditorResultsItem(item.id)
      setItems(prev => (prev ?? []).filter(i => i.id !== item.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSave(payload: ResultsItemPayload, existingId: number | null) {
    setError(null)
    if (existingId) {
      const updated = await updateEditorResultsItem(existingId, payload)
      setItems(prev => (prev ?? []).map(i => i.id === existingId ? updated : i))
    } else {
      const created = await createEditorResultsItem(payload)
      setItems(prev => [...(prev ?? []), created])
    }
    setEditing(null)
    setAddingForGroup(null)
  }

  async function createGroup(heading: string) {
    setError(null)
    const created = await createEditorResultsGroup({ heading })
    setGroups(prev => [...(prev ?? []), created])
    setAddingGroup(false)
  }

  async function renameGroup(g: ResultsGroup, heading: string) {
    setError(null)
    const updated = await updateEditorResultsGroup(g.id, { heading })
    setGroups(prev => (prev ?? []).map(x => x.id === g.id ? updated : x))
  }

  async function removeGroup(g: ResultsGroup) {
    const inGroup = itemsForGroup(g.id).length
    const ok = await confirm({
      title: `Delete the "${g.heading}" collection?`,
      message: inGroup === 0
        ? 'The collection will be removed.'
        : `Its ${inGroup} pair${inGroup === 1 ? '' : 's'} will be kept but moved to "Ungrouped".`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (! ok) return
    setError(null)
    try {
      await deleteEditorResultsGroup(g.id)
      setGroups(prev => (prev ?? []).filter(x => x.id !== g.id))
      setItems(prev => (prev ?? []).map(i =>
        (i.group_id ?? null) === g.id ? { ...i, group_id: null } : i,
      ))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete collection')
    }
  }

  const totalPairs = sortedItems.length
  const ungrouped  = itemsForGroup(null)

  return (
    <CollapsibleSection
      title="Before & After"
      subtitle="Group your transformations into up to 3 collections. Each holds up to 6 pairs."
      icon={Sparkles}
      statusBadge={!loading && (
        <Chip>{totalPairs} pair{totalPairs === 1 ? '' : 's'}</Chip>
      )}
    >
      <TextField
        label="Section heading (the big title above your before & after photos)"
        value={headingForm.value.heading}
        onChange={v => headingForm.patch({ heading: v })}
        placeholder="Before & After"
        maxLength={80}
      />
      <div className="space-y-1.5">
        <FieldLabel>Layout</FieldLabel>
        <SegmentedControl
          options={RESULTS_LAYOUT_OPTIONS}
          value={headingForm.value.layout}
          onChange={v => headingForm.patch({ layout: v })}
          ariaLabel="Before and after layout"
          size="sm"
        />
        <p className="text-2xs text-muted-text">
          Auto follows the template design. Pick one to override how every pair is arranged.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-text">
          {loading
            ? 'Loading…'
            : `Up to ${BA_MAX_GROUPS} collections × ${BA_MAX_ITEMS_PER_GROUP} pairs each.`}
        </p>
        <button
          onClick={() => setAddingGroup(true)}
          disabled={(groups?.length ?? 0) >= BA_MAX_GROUPS}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={12} /> Add Collection
        </button>
      </div>

      {error && (
        <div className="bg-white border border-danger text-danger text-xs p-3 flex items-center gap-2">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {!loading && sortedGroups.length === 0 && ungrouped.length === 0 && (
        <div className="bg-cream border border-hairline-soft px-4 py-6 text-center">
          <Sparkles size={20} className="mx-auto mb-2 text-muted-text" strokeWidth={1.5} />
          <p className="text-sm text-near-black font-semibold">No before/after collections yet</p>
          <p className="text-xs text-muted-text mt-0.5">Add a collection and start uploading your transformations.</p>
        </div>
      )}

      {sortedGroups.map(g => (
        <ResultsGroupBlock
          key={g.id}
          group={g}
          items={itemsForGroup(g.id)}
          busyId={busyId}
          onRename={(h) => renameGroup(g, h)}
          onDelete={() => removeGroup(g)}
          onAddPair={() => setAddingForGroup(g.id)}
          onEdit={(it) => setEditing(it)}
          onToggle={toggle}
          onRemove={remove}
        />
      ))}

      {ungrouped.length > 0 && (
        <ResultsGroupBlock
          key="__ungrouped"
          group={null}
          items={ungrouped}
          busyId={busyId}
          onRename={null}
          onDelete={null}
          onAddPair={() => setAddingForGroup('none')}
          onEdit={(it) => setEditing(it)}
          onToggle={toggle}
          onRemove={remove}
        />
      )}

      {addingGroup && (
        <GalleryGroupDialog
          group={null}
          onClose={() => setAddingGroup(false)}
          onSave={async (heading) => { await createGroup(heading) }}
        />
      )}

      {(editing || addingForGroup !== null) && (
        <ResultsItemDialog
          item={editing}
          groups={sortedGroups}
          defaultGroupId={editing ? (editing.group_id ?? null) : (addingForGroup === 'none' ? null : (addingForGroup ?? null))}
          onClose={() => { setEditing(null); setAddingForGroup(null) }}
          onSave={handleSave}
        />
      )}

      <SaveBar dirty={headingForm.dirty} saving={headingForm.saving} saved={headingForm.saved} error={headingForm.error} onSave={headingForm.doSave} />
    </CollapsibleSection>
  )
}

function ResultsGroupBlock({
  group, items, busyId, onRename, onDelete, onAddPair, onEdit, onToggle, onRemove,
}: {
  group: ResultsGroup | null
  items: ResultsItem[]
  busyId: number | null
  onRename: ((heading: string) => Promise<void>) | null
  onDelete: (() => void) | null
  onAddPair: () => void
  onEdit:   (item: ResultsItem) => void
  onToggle: (item: ResultsItem) => void
  onRemove: (item: ResultsItem) => void
}) {
  const [renaming, setRenaming]   = useState(false)
  const [heading, setHeading]     = useState(group?.heading ?? '')
  const [savingRename, setSaving] = useState(false)
  const isUngrouped = group === null
  const atCap = items.length >= BA_MAX_ITEMS_PER_GROUP

  async function commitRename() {
    if (!onRename || !group) return
    const trimmed = heading.trim()
    if (!trimmed) { setHeading(group.heading); setRenaming(false); return }
    if (trimmed === group.heading) { setRenaming(false); return }
    setSaving(true)
    try {
      await onRename(trimmed)
      setRenaming(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-hairline-soft p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {isUngrouped ? (
            <h4 className="text-sm font-bold text-near-black">Ungrouped</h4>
          ) : renaming ? (
            <input
              autoFocus
              value={heading}
              onChange={e => setHeading(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename() }}
              disabled={savingRename}
              maxLength={80}
              className="text-sm font-bold bg-cream border border-hairline-strong px-2 py-1 text-near-black min-w-0"
            />
          ) : (
            <button
              type="button"
              onClick={() => { setHeading(group!.heading); setRenaming(true) }}
              className="text-sm font-bold text-near-black hover:underline truncate text-left"
              title="Rename collection"
            >
              {group!.heading}
            </button>
          )}
          <span className="text-eyebrow font-bold tracking-[0.06em] uppercase text-muted-text">
            {items.length}/{BA_MAX_ITEMS_PER_GROUP}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onAddPair}
            disabled={atCap}
            className="inline-flex items-center gap-1 text-eyebrow font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-2 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={11} /> Add pair
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
              title="Delete collection"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-2xs text-muted-text italic">No pairs in this collection yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map(item => {
            const busy = busyId === item.id
            return (
              <div
                key={item.id}
                className={cn(
                  'relative bg-cream border overflow-hidden group',
                  item.is_active ? 'border-hairline-soft' : 'border-hairline-soft opacity-70',
                )}
              >
                <div className="grid grid-cols-2">
                  <BAThumbLarge url={item.before_image_url} alt={item.before_alt_text} label="B" />
                  <BAThumbLarge url={item.after_image_url}  alt={item.after_alt_text}  label="A" />
                </div>
                {!item.is_active && (
                  <span className="absolute top-1 left-1 text-eyebrow font-bold tracking-[0.06em] uppercase bg-black/55 text-white px-1.5 py-0.5">
                    Hidden
                  </span>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-center gap-1 p-1.5 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    disabled={busy}
                    className="w-7 h-7 inline-flex items-center justify-center bg-white text-near-black hover:bg-cream disabled:opacity-30"
                    title="Edit"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(item)}
                    disabled={busy}
                    className="w-7 h-7 inline-flex items-center justify-center bg-white text-near-black hover:bg-cream disabled:opacity-30"
                    title={item.is_active ? 'Hide' : 'Show'}
                  >
                    {item.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    disabled={busy}
                    className="w-7 h-7 inline-flex items-center justify-center bg-white text-near-black hover:bg-red-600 hover:text-white disabled:opacity-30"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function BAThumbLarge({ url, alt, label }: { url: string; alt: string | null; label: string }) {
  return (
    <div className="relative aspect-square bg-cream overflow-hidden">
      {url
        /* eslint-disable-next-line @next/next/no-img-element */
        ? <img src={url} alt={alt ?? ''} className="w-full h-full object-cover" />
        : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={18} /></div>
      }
      <span className="absolute bottom-0 left-0 right-0 text-eyebrow font-bold tracking-[0.18em] uppercase text-white bg-black/55 text-center py-[1px]">
        {label}
      </span>
    </div>
  )
}

function ResultsItemDialog({
  item, groups, defaultGroupId, onClose, onSave,
}: {
  item: ResultsItem | null
  groups: ResultsGroup[]
  defaultGroupId: number | null
  onClose: () => void
  onSave: (payload: ResultsItemPayload, existingId: number | null) => void | Promise<void>
}) {
  const [beforeUrl, setBeforeUrl] = useState(item?.before_image_url ?? '')
  const [afterUrl,  setAfterUrl]  = useState(item?.after_image_url  ?? '')
  const [caption,   setCaption]   = useState(item?.caption          ?? '')
  const [beforeAlt, setBeforeAlt] = useState(item?.before_alt_text  ?? '')
  const [afterAlt,  setAfterAlt]  = useState(item?.after_alt_text   ?? '')
  const [isActive,  setIsActive]  = useState(item?.is_active        ?? true)
  const [groupId,   setGroupId]   = useState<number | null>(item ? (item.group_id ?? null) : defaultGroupId)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!beforeUrl.trim()) { setError('Before image is required.'); return }
    if (!afterUrl.trim())  { setError('After image is required.');  return }
    setSaving(true); setError(null)
    try {
      await onSave({
        before_image_url: beforeUrl.trim(),
        after_image_url:  afterUrl.trim(),
        // Per-pair title removed — the group heading is the title now.
        title:            null,
        caption:          caption.trim()   || null,
        before_alt_text:  beforeAlt.trim() || null,
        after_alt_text:   afterAlt.trim()  || null,
        // Category retired from the editor — kept nullable on the API.
        category:         null,
        is_active:        isActive,
        group_id:         groupId,
      }, item?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg border border-hairline-strong max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-hairline-soft px-4 py-3 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-near-black">{item ? 'Edit pair' : 'Add before/after pair'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ImageUploadField
              label="Before image *"
              value={beforeUrl || null}
              onChange={v => setBeforeUrl(v ?? '')}
              kind="results"
              aspectClass="aspect-square"
            />
            <ImageUploadField
              label="After image *"
              value={afterUrl || null}
              onChange={v => setAfterUrl(v ?? '')}
              kind="results"
              aspectClass="aspect-square"
            />
          </div>

          {groups.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">Collection</span>
              <select
                value={groupId ?? ''}
                onChange={e => setGroupId(e.target.value === '' ? null : Number(e.target.value))}
                className="bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
              >
                <option value="">Ungrouped</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.heading}</option>
                ))}
              </select>
            </label>
          )}

          <TextareaField
            label="Caption (optional)"
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
            <p className="text-xs text-danger flex items-center gap-1.5">
              <AlertCircle size={12} /> {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline-soft">
            <button
              type="button" onClick={onClose}
              className="text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-60"
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

// ── Policies normalization + custom groups editor ──────────────────────────

function normalizePoliciesShape(p: BusinessPolicy): BusinessPolicy {
  const rawGroups = Array.isArray(p.custom_groups) ? p.custom_groups : []
  return {
    id: p.id,
    cancellation_policy: p.cancellation_policy ?? '',
    late_policy:         p.late_policy         ?? '',
    no_show_policy:      p.no_show_policy      ?? '',
    deposit_policy:      p.deposit_policy      ?? '',
    reschedule_policy:   p.reschedule_policy   ?? '',
    extra_notes:         p.extra_notes         ?? '',
    custom_groups: rawGroups.map(g => ({
      heading: g?.heading ?? '',
      items: Array.isArray(g?.items) ? g.items.map(it => ({
        title:   it?.title   ?? '',
        content: it?.content ?? '',
      })) : [],
    })),
  }
}

// Owners can add at most 2 custom sections × 3 items.
const WEBSITE_POLICY_MAX_GROUPS         = 2
const WEBSITE_POLICY_MAX_ITEMS_PER_GROUP = 3

function WebsiteCustomPolicyGroupsEditor({
  groups, onChange,
}: {
  groups: PolicyCustomGroup[]
  onChange: (next: PolicyCustomGroup[]) => void
}) {
  function addGroup() {
    if (groups.length >= WEBSITE_POLICY_MAX_GROUPS) return
    onChange([...groups, { heading: '', items: [{ title: '', content: '' }] }])
  }
  function patchGroup(gi: number, p: Partial<PolicyCustomGroup>) {
    onChange(groups.map((g, idx) => idx === gi ? { ...g, ...p } : g))
  }
  function removeGroup(gi: number) {
    onChange(groups.filter((_, idx) => idx !== gi))
  }
  function addItem(gi: number) {
    const g = groups[gi]
    if (!g) return
    if (g.items.length >= WEBSITE_POLICY_MAX_ITEMS_PER_GROUP) return
    patchGroup(gi, { items: [...g.items, { title: '', content: '' }] })
  }
  function patchItem(gi: number, ii: number, p: Partial<{ title: string; content: string }>) {
    const g = groups[gi]
    if (!g) return
    patchGroup(gi, { items: g.items.map((it, idx) => idx === ii ? { ...it, ...p } : it) })
  }
  function removeItem(gi: number, ii: number) {
    const g = groups[gi]
    if (!g) return
    patchGroup(gi, { items: g.items.filter((_, idx) => idx !== ii) })
  }

  return (
    <div className="bg-cream border border-hairline-soft p-3 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-2xs font-bold tracking-[0.14em] uppercase text-near-black">Custom sections</p>
          <p className="text-eyebrow text-muted-text mt-0.5">
            Up to {WEBSITE_POLICY_MAX_GROUPS} sections × {WEBSITE_POLICY_MAX_ITEMS_PER_GROUP} items, shown below the named policies on your public site.
          </p>
        </div>
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-eyebrow font-bold tracking-[0.06em] uppercase text-muted-text">
            {groups.length}/{WEBSITE_POLICY_MAX_GROUPS}
          </span>
          <button
            type="button"
            onClick={addGroup}
            disabled={groups.length >= WEBSITE_POLICY_MAX_GROUPS}
            className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-2.5 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> Add section
          </button>
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} className="bg-white border border-hairline-soft p-3 space-y-2.5">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                label={`Section ${gi + 1} heading`}
                value={g.heading}
                onChange={v => patchGroup(gi, { heading: v })}
                placeholder="Aftercare, Parking, Add-Ons…"
                maxLength={120}
              />
            </div>
            <button
              type="button"
              onClick={() => removeGroup(gi)}
              className="w-9 h-9 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
              title="Delete section"
            >
              <Trash2 size={12} />
            </button>
          </div>

          <div className="space-y-2 pl-2 border-l-2 border-hairline-soft">
            {g.items.map((it, ii) => (
              <div key={ii} className="bg-cream border border-hairline-soft p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
                    Item {ii + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(gi, ii)}
                    className="w-6 h-6 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
                    title="Delete item"
                  >
                    <X size={11} />
                  </button>
                </div>
                <TextField
                  label="Title"
                  value={it.title}
                  onChange={v => patchItem(gi, ii, { title: v })}
                  placeholder="What customers see as the bullet heading"
                  maxLength={120}
                />
                <TextareaField
                  label="Content"
                  value={it.content ?? ''}
                  onChange={v => patchItem(gi, ii, { content: v })}
                  placeholder="The body text shown under the title."
                  rows={2}
                  maxLength={2000}
                />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <span className="text-eyebrow font-bold tracking-[0.06em] uppercase text-muted-text">
                {g.items.length}/{WEBSITE_POLICY_MAX_ITEMS_PER_GROUP}
              </span>
              <button
                type="button"
                onClick={() => addItem(gi)}
                disabled={g.items.length >= WEBSITE_POLICY_MAX_ITEMS_PER_GROUP}
                className="inline-flex items-center gap-1.5 text-eyebrow font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-2 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={11} /> Add item
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Phase 18 — Coming-soon teasers ──────────────────────────────────────────

/**
 * PatternPickerBlock — the editor's swap for the accent-color picker on
 * templates that ship a patterned background (currently only Bottega).
 * Renders each option as a square tile previewing the actual pattern
 * asset (so the owner sees what they're picking). Clicking writes the
 * key to settings.theme.pattern_motif.
 */
function PatternPickerBlock({
  options, current, onPick,
}: {
  options: PatternOption[]
  current: string | null
  onPick: (key: string) => Promise<void>
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)
  const defaultKey = options[0]?.key ?? null
  const activeKey  = current ?? defaultKey

  async function handlePick(key: string) {
    if (key === activeKey) return
    setBusyKey(key); setError(null)
    try {
      await onPick(key)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update pattern')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-hairline-soft">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
          Pattern
        </p>
        <p className="text-eyebrow text-muted-text">
          Backdrop behind every section
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {options.map(opt => {
          const isActive = opt.key === activeKey
          const isBusy   = busyKey === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => handlePick(opt.key)}
              disabled={!!busyKey}
              title={opt.label}
              aria-label={`Pattern: ${opt.label}`}
              aria-pressed={isActive}
              className={cn(
                'relative w-12 h-12 border bg-cover bg-center transition-shadow disabled:opacity-50 overflow-hidden',
                isActive
                  ? 'border-near-black ring-2 ring-offset-2 ring-near-black/20'
                  : 'border-hairline-strong hover:border-near-black',
              )}
              style={{ backgroundImage: `url('${opt.url}')`, backgroundSize: '120px auto' }}
            >
              {isBusy && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 size={14} className="animate-spin text-white" />
                </span>
              )}
              {isActive && !isBusy && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/15">
                  <Check size={16} className="text-white" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.6))' }} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      {error && (
        <p className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  )
}

/**
 * ChangeTemplateBlock — the editor's live template switcher. Replaces the
 * "coming soon" placeholder with a disclosure-style picker that lists every
 * registered template, lets the owner pick one, and on confirm calls
 * selectActiveTemplate() (PUT /editor/website/template/active). The backend
 * reseeds settings_json + the section skeleton from the new template's
 * defaults, so the page hard-reloads on success to pull the fresh markup
 * for the new template AND so any preview iframe re-renders.
 *
 * Warning copy is explicit: changing templates RESETS template-specific
 * settings (colors, tab labels, section order, etc.). Business data
 * (services, hours, gallery photos, customers, bookings) is preserved.
 */
function ChangeTemplateBlock({ currentSlug }: { currentSlug: string }) {
  const [open, setOpen]       = useState(false)
  const [picked, setPicked]   = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState<string | null>(null)

  // Resolve the current template's label for the disclosure summary.
  const currentChoice = SITE_TEMPLATES.find(t => t.slug === currentSlug)
  const currentLabel  = currentChoice?.label ?? currentSlug

  async function confirm(slug: string) {
    if (slug === currentSlug) { setError('This template is already active.'); return }
    setSaving(true); setError(null)
    try {
      await selectActiveTemplate(slug)
      // Hard reload so the new template's CSS/markup paints + the preview
      // iframe re-keys with the new section skeleton.
      if (typeof window !== 'undefined') window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change template')
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setPicked(null); setError(null) }}
        className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:bg-cream hover:border-near-black transition-colors"
      >
        Change Template
      </button>
    )
  }

  return (
    <div className="space-y-3 border border-hairline bg-white p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
            Change Template
          </p>
          <p className="text-2xs text-muted-text mt-0.5">
            Currently <span className="font-semibold text-near-black">{currentLabel}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen(false); setPicked(null); setError(null) }}
          disabled={saving}
          className="text-eyebrow font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <p className="text-2xs text-amber-800 bg-warning-bg border border-amber-200 px-2.5 py-1.5 leading-snug">
        Heads up: changing template <span className="font-semibold">resets template-specific settings</span> (colors, tab labels, section order, about/advice copy). Your business data (services, hours, gallery, customers, bookings) is preserved.
      </p>

      <div className="space-y-1.5">
        {SITE_TEMPLATES.map(t => {
          const isCurrent  = t.slug === currentSlug
          const isPicked   = t.slug === picked
          const isSaving   = saving && isPicked
          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => { if (!isCurrent && !saving) setPicked(t.slug) }}
              disabled={saving}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border transition-colors disabled:cursor-not-allowed ${
                isCurrent
                  ? 'border-hairline-soft bg-cream cursor-default'
                  : isPicked
                    ? 'border-near-black bg-white'
                    : 'border-hairline bg-white hover:bg-cream'
              }`}
            >
              <span
                className="w-6 h-6 flex-shrink-0 border border-hairline-soft"
                style={{ background: t.color }}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-near-black leading-tight">{t.label}</span>
                <span className="block text-2xs text-muted-text truncate">{t.desc}</span>
              </span>
              {isCurrent && (
                <span className="text-eyebrow font-bold tracking-[0.06em] uppercase bg-blush text-[rgba(18,18,18,0.7)] px-1.5 py-0.5 flex-shrink-0">
                  Active
                </span>
              )}
              {!isCurrent && isPicked && !isSaving && (
                <span className="text-eyebrow font-bold tracking-[0.06em] uppercase bg-near-black text-white px-1.5 py-0.5 flex-shrink-0">
                  Selected
                </span>
              )}
              {isSaving && (
                <Loader2 size={14} className="animate-spin text-muted-text flex-shrink-0" />
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <p className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => picked && confirm(picked)}
          disabled={!picked || saving}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-near-black bg-near-black text-white px-3.5 py-2 hover:bg-[#222] disabled:bg-cream disabled:text-muted-text disabled:border-hairline disabled:cursor-not-allowed"
        >
          {saving ? <><Loader2 size={12} className="animate-spin" /> Switching…</> : 'Switch to this template'}
        </button>
        <p className="text-eyebrow text-muted-text">
          {picked
            ? <>Switching to <span className="font-semibold text-near-black">{SITE_TEMPLATES.find(t => t.slug === picked)?.label}</span></>
            : 'Pick a template above'}
        </p>
      </div>
    </div>
  )
}

function SeasonalThemesTeaser() {
  // Compact horizontal preview row of seasonal theme presets. Pure display —
  // clicking does nothing yet. Each pill swaps the floating accent decoration
  // on the public site (hearts → snowflakes → confetti, etc).
  const themes = [
    { label: 'Default',    icon: HeartIcon,    color: '#FF3DBE', bg: '#FFE5F0' },
    { label: 'Valentines', icon: HeartIcon,    color: '#E11D48', bg: '#FFE4E6' },
    { label: 'Summer',     icon: Sun,          color: '#F59E0B', bg: '#FFF3C7' },
    { label: 'Sale',       icon: Gift,         color: '#7C3AED', bg: '#EDE9FE' },
    { label: 'Christmas',  icon: Gift,         color: '#16A34A', bg: '#DCFCE7' },
    { label: 'Winter',     icon: Snowflake,    color: '#0EA5E9', bg: '#E0F2FE' },
    { label: 'Confetti',   icon: PartyPopper,  color: '#EC4899', bg: '#FCE7F3' },
  ]
  return (
    <>
      <div className="flex items-baseline justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
          Seasonal themes
          <span className="text-eyebrow font-bold tracking-[0.14em] uppercase border border-[rgba(255,61,190,0.40)] bg-[rgba(255,61,190,0.10)] text-[#b8197f] px-1 py-px">
            Soon
          </span>
        </p>
        <p className="text-eyebrow text-muted-text">Swaps floating hearts for snowflakes, confetti, and more</p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {themes.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.label}
              type="button"
              disabled
              title={`${t.label} (coming soon)`}
              className="relative inline-flex items-center gap-1.5 border border-hairline bg-white px-2.5 py-1.5 text-2xs font-semibold text-near-black opacity-60 cursor-not-allowed"
            >
              <span
                className="w-4 h-4 inline-flex items-center justify-center"
                style={{ background: t.bg, color: t.color }}
              >
                <Icon size={10} strokeWidth={2} />
              </span>
              {t.label}
            </button>
          )
        })}
      </div>
      <p className="text-eyebrow text-muted-text italic">
        Activate a seasonal theme to instantly refresh the floating decorations on your public site for holidays + promos.
      </p>
    </>
  )
}

function AnnouncementsComingSoonPanel() {
  return (
    <ComingSoonHero
      eyebrow="Coming Soon"
      title="Announcements"
      intro="Reach customers without leaving BookReady. Announcement bars, pop-ups, and one-off email blasts, all branded to your site and managed from one tab."
      features={[
        {
          icon:        MegaphoneIcon,
          tone:        'accent',
          title:       'Announcement bar',
          description: 'A thin colored strip across the top of your public site for short alerts.',
          bullets: [
            'Run a flash promo: "20% off lash sets this week"',
            'Holiday-hours notice that auto-hides after the date',
            'Style it to your accent color, or use a seasonal theme',
          ],
        },
        {
          icon:        BellIcon,
          title:       'Pop-ups',
          description: 'A pop-up box that appears on the first visit or after a few seconds.',
          bullets: [
            'Capture emails for a waitlist or newsletter',
            'Push a high-margin add-on or service',
            'Show once per device, no annoyance',
          ],
        },
        {
          icon:        MailIcon,
          title:       'Email notifications',
          description: 'One-off email blasts to your whole customer list, sent through your verified BookReady domain.',
          bullets: [
            'Schedule for the best time of day',
            'Pick segments: VIPs, recent visitors, no-shows',
            'Track opens + clicks per send',
          ],
        },
      ]}
    />
  )
}

function IntroductionComingSoonPanel() {
  return (
    <ComingSoonHero
      eyebrow="Coming Soon"
      title="Introduction sections"
      intro="Personality blocks for the gap between your hero and the booking form. Tell customers what's special about your studio, and what's right around the corner."
      features={[
        {
          icon:        UserIcon,
          tone:        'accent',
          title:       'Tech introductions',
          description: 'A short bio + photo block for each artist on your team.',
          bullets: [
            'Headshot, name, specialty, years of experience',
            'Pull from the Staff list automatically',
            'Customers can pick a favorite before booking',
          ],
        },
        {
          icon:        Timer,
          title:       'Countdown',
          description: 'Show customers when your next available appointment is, live.',
          bullets: [
            '"Next opening: Thursday at 2pm" updates in real time',
            'Or count down to a launch / promo end date',
            'Auto-hides when the slot fills',
          ],
        },
        {
          icon:        Sparkles,
          title:       'Highlight reel',
          description: 'A scrolling band of your favorite recent work + reviews.',
          bullets: [
            'Pulls images from your Gallery groups',
            'Mixes in star reviews from the Reviews block',
            'Looks great on mobile in one tap',
          ],
        },
        {
          icon:        Gift,
          title:       'Welcome offer',
          description: 'A first-time customer banner with a single-use promo code.',
          bullets: [
            'Tracks redemptions per customer',
            'Hides automatically once a customer has booked once',
            'Optional countdown to expiry',
          ],
        },
      ]}
    />
  )
}


