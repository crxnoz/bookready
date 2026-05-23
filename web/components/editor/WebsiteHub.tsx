'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LayoutTemplate, FileText, Image as ImageIcon, Info, ListChecks,
  Eye, Lock, Plus, ArrowUp, ArrowDown, Trash2, Smartphone, Monitor,
  ExternalLink, Copy, Check, Loader2, X, Heart, Phone, Mail,
  Instagram, MapPin, Sparkles, Clock,
} from 'lucide-react'
import {
  getCurrentUser,
  getEditorTemplateSettings,
  updateEditorTemplateSettings,
  getEditorWebsiteSections,
  createEditorWebsiteSection,
  updateEditorWebsiteSection,
  deleteEditorWebsiteSection,
} from '@/lib/api'
import type {
  TemplateSettings,
  WebsiteSection,
  WebsiteSectionCreatePayload,
} from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Constants ────────────────────────────────────────────────────────────────

type SubTab = 'template' | 'header' | 'sections' | 'preview'

const SUB_TABS: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: 'template', label: 'Template', icon: LayoutTemplate },
  { id: 'header',   label: 'Header',   icon: Sparkles },
  { id: 'sections', label: 'Sections', icon: ListChecks },
  { id: 'preview',  label: 'Preview',  icon: Eye },
]

const SECTION_ICONS: Record<string, React.ElementType> = {
  header:        Sparkles,
  booking:       Heart,
  gallery:       ImageIcon,
  policy:        FileText,
  about:         Info,
  before_after:  Sparkles,
  instructions:  ListChecks,
  staff:         Info,
  hours:         Clock,
  contact:       Phone,
  footer:        Lock,
  text_block:    FileText,
  announcement:  Sparkles,
}

const CUSTOM_TYPE_OPTIONS: { value: 'text_block' | 'instructions' | 'announcement'; label: string; description: string }[] = [
  { value: 'text_block',   label: 'Text Block',   description: 'A short editorial paragraph.' },
  { value: 'instructions', label: 'Instructions', description: 'A numbered list of titled steps.' },
  { value: 'announcement', label: 'Announcement', description: 'A short highlighted note.' },
]

// ── Main ─────────────────────────────────────────────────────────────────────

export default function WebsiteHub() {
  const [tab, setTab] = useState<SubTab>('template')

  const [slug, setSlug] = useState<string | null>(null)
  const [settings, setSettings]       = useState<TemplateSettings | null>(null)
  const [templateSlug, setTplSlug]    = useState<string>('thefaderoom')
  const [sections, setSections]       = useState<WebsiteSection[]>([])
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-cream">
        <Loader2 size={20} className="animate-spin text-muted-text" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-6 bg-cream min-h-full">
        <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5 text-sm text-red-700">
          {loadError}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full bg-cream">

      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          Website
        </p>
        {slug && (
          <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Page head */}
        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight">Website</h1>
          <p className="text-sm text-muted-text mt-0.5">
            Manage your public website content, template, and sections.
          </p>
          {slug && (
            <p className="text-xs text-muted-text mt-1.5 font-mono">{slug}.{baseDomain}</p>
          )}
        </div>

        {/* Subnav */}
        <div className="flex gap-1 border-b border-[rgba(18,18,18,0.10)] overflow-x-auto">
          {SUB_TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold tracking-[0.06em] uppercase transition-colors flex-shrink-0',
                  active
                    ? 'text-near-black border-b-2 border-near-black -mb-px'
                    : 'text-muted-text hover:text-near-black',
                )}
              >
                <Icon size={13} strokeWidth={1.8} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Panels */}
        {tab === 'template' && (
          <TemplatePanel templateSlug={templateSlug} />
        )}

        {tab === 'header' && settings && (
          <HeaderPanel
            settings={settings}
            onSaved={setSettings}
          />
        )}

        {tab === 'sections' && (
          <SectionsPanel
            sections={sections}
            onChange={setSections}
          />
        )}

        {tab === 'preview' && (
          <PreviewPanel url={publicUrl} />
        )}

      </div>
    </div>
  )
}

// ── Copy link ────────────────────────────────────────────────────────────────

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

// ── Template panel ───────────────────────────────────────────────────────────

function TemplatePanel({ templateSlug }: { templateSlug: string }) {
  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5 space-y-4 max-w-2xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center border border-[rgba(18,18,18,0.12)] bg-cream flex-shrink-0">
          <LayoutTemplate size={18} className="text-near-black" strokeWidth={1.6} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-near-black">
              {templateSlug === 'thefaderoom' ? 'The Fade Room' : templateSlug}
            </h2>
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-transparent bg-blush text-[rgba(18,18,18,0.7)] px-1.5 py-0.5">
              Active
            </span>
          </div>
          <p className="text-xs text-muted-text mt-1 font-mono">{templateSlug}</p>
        </div>
      </div>

      <div className="border-t border-[rgba(18,18,18,0.08)] pt-4">
        <p className="text-xs text-muted-text leading-relaxed">
          Changing templates keeps your business info, services, bookings, staff,
          customers, availability, and policies. Template-specific settings (such as
          header tagline, section content, and decorative copy) may reset.
        </p>
      </div>

      <button
        disabled
        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-muted-text px-3 py-2 cursor-not-allowed"
      >
        Change Template — coming soon
      </button>
    </div>
  )
}

// ── Header panel ─────────────────────────────────────────────────────────────

type HeaderToggleKey =
  | 'show_book_button'
  | 'show_call_button'
  | 'show_email_button'
  | 'show_instagram_button'
  | 'show_directions_button'

const HEADER_TOGGLES: { key: HeaderToggleKey; label: string; icon: React.ElementType }[] = [
  { key: 'show_book_button',       label: 'Show Book button',       icon: Heart },
  { key: 'show_call_button',       label: 'Show Call button',       icon: Phone },
  { key: 'show_email_button',      label: 'Show Email button',      icon: Mail },
  { key: 'show_instagram_button',  label: 'Show Instagram button',  icon: Instagram },
  { key: 'show_directions_button', label: 'Show Directions button', icon: MapPin },
]

function HeaderPanel({
  settings,
  onSaved,
}: {
  settings: TemplateSettings
  onSaved: (s: TemplateSettings) => void
}) {
  const [tagline, setTagline] = useState(settings.header.tagline)
  const [toggles, setToggles] = useState({
    show_book_button:       settings.header.show_book_button,
    show_call_button:       settings.header.show_call_button,
    show_email_button:      settings.header.show_email_button,
    show_instagram_button:  settings.header.show_instagram_button,
    show_directions_button: settings.header.show_directions_button,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const dirty = useMemo(() => {
    if (tagline !== settings.header.tagline) return true
    for (const k of Object.keys(toggles) as (keyof typeof toggles)[]) {
      if (toggles[k] !== settings.header[k]) return true
    }
    return false
  }, [tagline, toggles, settings])

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await updateEditorTemplateSettings({
        header: { ...settings.header, ...toggles, tagline },
      })
      onSaved(res.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)] p-5 space-y-5 max-w-2xl">
      <div>
        <h2 className="text-base font-bold text-near-black">Header</h2>
        <p className="text-xs text-muted-text mt-0.5">
          Edit the tagline and which contact buttons appear in the hero.
        </p>
      </div>

      {/* Tagline */}
      <label className="block">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
          Tagline / subtext
        </span>
        <input
          type="text"
          value={tagline}
          onChange={e => setTagline(e.target.value)}
          maxLength={120}
          className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
          placeholder="Sharp cuts. Smooth booking."
        />
        <p className="text-[10px] text-muted-text mt-1">{tagline.length}/120</p>
      </label>

      {/* Toggles */}
      <div className="space-y-2">
        {HEADER_TOGGLES.map(({ key, label, icon: Icon }) => {
          const on = toggles[key]
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 border border-[rgba(18,18,18,0.08)] px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-near-black" strokeWidth={1.8} />
                <span className="text-sm text-near-black">{label}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                onClick={() => setToggles(t => ({ ...t, [key]: !t[key] }))}
                className={cn(
                  'relative inline-flex items-center w-10 h-5 transition-colors border',
                  on
                    ? 'bg-near-black border-near-black'
                    : 'bg-white border-[rgba(18,18,18,0.25)]',
                )}
              >
                <span className={cn(
                  'absolute top-0.5 w-3.5 h-3.5 bg-white border border-[rgba(18,18,18,0.15)] transition-all',
                  on ? 'left-[22px]' : 'left-0.5',
                )} />
              </button>
            </div>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={!dirty || saving}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2',
            dirty && !saving
              ? 'bg-near-black text-white'
              : 'bg-cream text-muted-text border border-[rgba(18,18,18,0.12)] cursor-not-allowed',
          )}
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : null}
          {saving ? 'Saving' : saved ? 'Saved' : 'Save changes'}
        </button>
        {saved && !saving && <Check size={14} className="text-green-700" />}
      </div>
    </div>
  )
}

// ── Sections panel ───────────────────────────────────────────────────────────

function SectionsPanel({
  sections,
  onChange,
}: {
  sections: WebsiteSection[]
  onChange: (s: WebsiteSection[]) => void
}) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(
    () => [...sections].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [sections],
  )

  async function patch(id: number, payload: Parameters<typeof updateEditorWebsiteSection>[1]) {
    setBusyId(id); setError(null)
    try {
      const updated = await updateEditorWebsiteSection(id, payload)
      onChange(sections.map(s => s.id === id ? updated : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update section')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(id: number) {
    if (!confirm('Remove this section?')) return
    setBusyId(id); setError(null)
    try {
      const res = await deleteEditorWebsiteSection(id)
      if ('deleted' in res && res.deleted) {
        onChange(sections.filter(s => s.id !== id))
      } else if ('id' in res) {
        onChange(sections.map(s => s.id === id ? res : s))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove section')
    } finally {
      setBusyId(null)
    }
  }

  async function move(id: number, dir: 'up' | 'down') {
    const i = sorted.findIndex(s => s.id === id)
    if (i < 0) return
    const j = dir === 'up' ? i - 1 : i + 1
    if (j < 0 || j >= sorted.length) return
    const a = sorted[i], b = sorted[j]
    if (a.is_locked || b.is_locked) return
    // Swap sort_order
    setBusyId(id); setError(null)
    try {
      const [updA, updB] = await Promise.all([
        updateEditorWebsiteSection(a.id, { sort_order: b.sort_order }),
        updateEditorWebsiteSection(b.id, { sort_order: a.sort_order }),
      ])
      onChange(sections.map(s => s.id === updA.id ? updA : s.id === updB.id ? updB : s))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reorder')
    } finally {
      setBusyId(null)
    }
  }

  async function addCustom(payload: WebsiteSectionCreatePayload) {
    setError(null)
    try {
      const created = await createEditorWebsiteSection(payload)
      onChange([...sections, created])
      setShowAdd(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add section')
    }
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-text">
          Sections appear in this order on your public site. Locked sections stay visible.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 flex-shrink-0"
        >
          <Plus size={12} /> Add Section
        </button>
      </div>

      {error && (
        <div className="bg-white border border-red-200 text-red-700 text-xs p-3">{error}</div>
      )}

      <div className="space-y-2">
        {sorted.map((s, i) => {
          const Icon  = SECTION_ICONS[s.section_type] ?? FileText
          const isFirst = i === 0 || sorted[i - 1].is_locked
          const isLast  = i === sorted.length - 1 || sorted[i + 1].is_locked
          const busy = busyId === s.id

          return (
            <div
              key={s.id}
              className={cn(
                'bg-white border p-3.5 flex items-center gap-3',
                s.is_enabled ? 'border-[rgba(18,18,18,0.10)]' : 'border-[rgba(18,18,18,0.06)] opacity-70',
              )}
            >
              <div className="w-9 h-9 flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-cream flex-shrink-0">
                <Icon size={14} className="text-near-black" strokeWidth={1.7} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-near-black truncate">
                    {s.title ?? s.section_key}
                  </span>
                  {s.is_locked && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-[rgba(18,18,18,0.7)] px-1.5 py-0.5">
                      <Lock size={9} /> Locked
                    </span>
                  )}
                  {!s.is_enabled && (
                    <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-transparent bg-lavender text-[rgba(18,18,18,0.6)] px-1.5 py-0.5">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-text mt-0.5 font-mono">{s.section_type}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {!s.is_locked && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(s.id, 'up')}
                      disabled={busy || isFirst}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black disabled:opacity-30 hover:border-near-black"
                      title="Move up"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(s.id, 'down')}
                      disabled={busy || isLast}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black disabled:opacity-30 hover:border-near-black"
                      title="Move down"
                    >
                      <ArrowDown size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => patch(s.id, { is_enabled: !s.is_enabled })}
                      disabled={busy}
                      className={cn(
                        'h-7 px-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] uppercase border',
                        s.is_enabled
                          ? 'border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black'
                          : 'border-near-black bg-near-black text-white',
                      )}
                      title={s.is_enabled ? 'Hide section' : 'Show section'}
                    >
                      <Eye size={11} /> {s.is_enabled ? 'Hide' : 'Show'}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      disabled={busy}
                      className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 disabled:opacity-30"
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showAdd && (
        <AddSectionDialog
          onClose={() => setShowAdd(false)}
          onSubmit={addCustom}
        />
      )}
    </div>
  )
}

// ── Add custom section dialog ────────────────────────────────────────────────

function AddSectionDialog({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (p: WebsiteSectionCreatePayload) => void | Promise<void>
}) {
  const [type, setType]       = useState<'text_block' | 'instructions' | 'announcement'>('text_block')
  const [title, setTitle]     = useState('')
  const [subtitle, setSub]    = useState('')
  const [body, setBody]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)
    let content_json: Record<string, unknown> | null = null
    if (type === 'text_block' || type === 'announcement') {
      content_json = { body: body.trim() }
    } else {
      // Single-item starter; user can edit later (later iteration)
      content_json = { items: body.trim() ? [{ title: title.trim() || 'Step', body: body.trim() }] : [] }
    }
    try {
      await onSubmit({
        section_type: type,
        title:        title.trim() || null,
        subtitle:     subtitle.trim() || null,
        content_json,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md border border-[rgba(18,18,18,0.15)]">
        <div className="flex items-center justify-between border-b border-[rgba(18,18,18,0.10)] px-4 py-3">
          <h3 className="text-sm font-bold text-near-black">Add Section</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <div>
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
              Section type
            </span>
            <div className="mt-1.5 space-y-1.5">
              {CUSTOM_TYPE_OPTIONS.map(opt => (
                <label key={opt.value} className={cn(
                  'flex items-start gap-2 border p-2.5 cursor-pointer',
                  type === opt.value
                    ? 'border-near-black bg-cream'
                    : 'border-[rgba(18,18,18,0.10)]',
                )}>
                  <input
                    type="radio"
                    checked={type === opt.value}
                    onChange={() => setType(opt.value)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-near-black">{opt.label}</span>
                    <p className="text-[11px] text-muted-text">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Title</span>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              maxLength={120}
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Subtitle (optional)</span>
            <input
              type="text" value={subtitle} onChange={e => setSub(e.target.value)}
              maxLength={200}
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">
              {type === 'instructions' ? 'First step body' : 'Body'}
            </span>
            <textarea
              value={body} onChange={e => setBody(e.target.value)}
              rows={4}
              className="mt-1.5 w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black resize-y"
            />
          </label>

          {error && <p className="text-xs text-red-700">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button" onClick={onClose}
              className="text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2"
            >Cancel</button>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black text-white px-3 py-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={12} />}
              Add Section
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Preview ──────────────────────────────────────────────────────────────────

function PreviewPanel({ url }: { url: string }) {
  const [mode, setMode] = useState<'mobile' | 'desktop'>('mobile')
  if (!url) {
    return <p className="text-sm text-muted-text">Sign in to preview your site.</p>
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setMode('mobile')}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1.5 border',
            mode === 'mobile'
              ? 'bg-near-black text-white border-near-black'
              : 'bg-white text-near-black border-[rgba(18,18,18,0.15)]',
          )}
        >
          <Smartphone size={12} /> Mobile
        </button>
        <button
          onClick={() => setMode('desktop')}
          className={cn(
            'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-2.5 py-1.5 border',
            mode === 'desktop'
              ? 'bg-near-black text-white border-near-black'
              : 'bg-white text-near-black border-[rgba(18,18,18,0.15)]',
          )}
        >
          <Monitor size={12} /> Desktop
        </button>
      </div>

      <div className="bg-white border border-[rgba(18,18,18,0.10)] p-4 flex justify-center">
        <iframe
          src={url}
          title="Public site preview"
          className={cn(
            'bg-white border border-[rgba(18,18,18,0.10)]',
            mode === 'mobile' ? 'w-[390px] h-[720px]' : 'w-full max-w-[1180px] h-[720px]',
          )}
        />
      </div>
    </div>
  )
}
