'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle, Loader2, Megaphone, Plus, Pencil, Eye, EyeOff, Check, X,
  Trash2, Sparkles,
} from 'lucide-react'
import {
  getAdminAnnouncements, createAdminAnnouncement,
  updateAdminAnnouncement, deleteAdminAnnouncement,
} from '@/lib/api'
import type { PlatformAnnouncement, PlatformAnnouncementPayload } from '@/lib/types'
import { Card, Field } from './_parts'
import { cn } from '@/lib/cn'

/**
 * Platform-wide announcement editor. Extracted from the old single-page
 * AdminPage so it can be the first card on /admin (Overview) — the
 * operator's primary control surface for broadcasting to tenants.
 *
 * Self-contained fetch (separate from the dashboard data refresh) because
 * the user almost always edits an announcement → save → see it appear,
 * which would be jarring if it depended on the global refresh button.
 */
export function AnnouncementsAdminSection() {
  const [items,   setItems]   = useState<PlatformAnnouncement[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlatformAnnouncement | 'new' | null>(null)

  async function refresh() {
    try {
      setItems(await getAdminAnnouncements())
      setLoadErr(null)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load')
    }
  }

  useEffect(() => { void refresh() }, [])

  async function toggleActive(a: PlatformAnnouncement) {
    await updateAdminAnnouncement(a.id, { is_active: ! a.is_active })
    await refresh()
  }

  async function remove(a: PlatformAnnouncement) {
    if (! confirm(`Delete "${a.title}"? Tenants will no longer see it.`)) return
    await deleteAdminAnnouncement(a.id)
    await refresh()
  }

  const list = items ?? []

  return (
    <section className="mb-6">
      <header className="flex items-end justify-between gap-3 mb-3">
        <div>
          <h2 className="text-xl font-bold text-near-black tracking-tight inline-flex items-center gap-2">
            <Megaphone size={16} /> Announcements
          </h2>
          <p className="text-xs text-muted-text mt-0.5">
            Shown on every tenant&apos;s dashboard. Active items appear newest first by publish date.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase bg-near-black border border-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black whitespace-nowrap"
        >
          <Plus size={12} /> New announcement
        </button>
      </header>

      {loadErr && (
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-3 text-xs text-[#b42828] flex items-center gap-2 mb-3">
          <AlertCircle size={14} /> {loadErr}
        </div>
      )}

      {items === null ? (
        <Card>
          <p className="text-[12px] text-muted-text inline-flex items-center gap-2">
            <Loader2 size={12} className="animate-spin" /> Loading…
          </p>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <p className="text-[12px] text-muted-text">
            No announcements yet. Post one to surface platform news on every tenant&apos;s dashboard.
          </p>
        </Card>
      ) : (
        <div className="bg-white border border-[rgba(18,18,18,0.10)] divide-y divide-[rgba(18,18,18,0.06)]">
          {list.map(a => (
            <AnnouncementRow
              key={a.id}
              a={a}
              onEdit={() => setEditing(a)}
              onToggleActive={() => toggleActive(a)}
              onDelete={() => remove(a)}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <AnnouncementDialog
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await refresh() }}
        />
      )}
    </section>
  )
}

function AnnouncementRow({
  a, onEdit, onToggleActive, onDelete,
}: {
  a: PlatformAnnouncement
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const when = a.published_at ?? a.created_at ?? ''
  return (
    <div className={cn(
      'flex items-center gap-3 px-3.5 py-3',
      ! a.is_active && 'opacity-60',
    )}>
      <Sparkles size={14} className="text-near-black flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-bold text-near-black truncate">{a.title}</p>
          {! a.is_active && (
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.15)] bg-cream text-muted-text px-1.5 py-0.5">
              Hidden
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-text truncate mt-0.5">{a.body}</p>
        <p className="text-[10px] text-muted-text/80 mt-0.5">
          {when ? new Date(when).toLocaleString() : '—'}
          {a.cta_label && a.cta_href && <> · CTA: {a.cta_label} → {a.cta_href}</>}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onToggleActive}
          title={a.is_active ? 'Hide from dashboards' : 'Show on dashboards'}
          className="w-8 h-8 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black"
        >
          {a.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="w-8 h-8 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="w-8 h-8 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

function AnnouncementDialog({
  initial, onClose, onSaved,
}: {
  initial: PlatformAnnouncement | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const isEdit = !! initial
  const [title,    setTitle]    = useState(initial?.title    ?? '')
  const [body,     setBody]     = useState(initial?.body     ?? '')
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label ?? '')
  const [ctaHref,  setCtaHref]  = useState(initial?.cta_href  ?? '')
  const [active,   setActive]   = useState(initial?.is_active ?? true)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = title.trim().length > 0 && body.trim().length > 0

  async function save() {
    if (! canSave) return
    setSaving(true); setErr(null)
    try {
      const payload: PlatformAnnouncementPayload = {
        title:     title.trim(),
        body:      body.trim(),
        cta_label: ctaLabel.trim() === '' ? null : ctaLabel.trim(),
        cta_href:  ctaHref.trim()  === '' ? null : ctaHref.trim(),
        is_active: active,
      }
      if (isEdit && initial) await updateAdminAnnouncement(initial.id, payload)
      else                   await createAdminAnnouncement(payload)
      await onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-cream w-full sm:max-w-lg max-h-[92vh] overflow-y-auto border border-[rgba(18,18,18,0.10)] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(18,18,18,0.10)] bg-white sticky top-0 z-10">
          <p className="text-sm font-bold text-near-black">{isEdit ? 'Edit announcement' : 'New announcement'}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Booking form builder is live"
              autoFocus={! isEdit}
              className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black"
            />
          </Field>
          <Field label="Body">
            <textarea
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="What's new? Keep it 1-3 sentences."
              className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black resize-y leading-relaxed"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="CTA label (optional)">
              <input
                type="text"
                value={ctaLabel ?? ''}
                onChange={e => setCtaLabel(e.target.value)}
                placeholder="Open the form builder"
                className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black"
              />
            </Field>
            <Field label="CTA link (optional)">
              <input
                type="text"
                value={ctaHref ?? ''}
                onChange={e => setCtaHref(e.target.value)}
                placeholder="/editor/booking-form or https://…"
                className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black"
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-[12px] text-near-black">Active (show on dashboards)</span>
          </label>

          {err && (
            <div className="bg-white border border-[rgba(180,40,40,0.20)] p-2.5 text-[11px] text-[#b42828] flex items-center gap-2">
              <AlertCircle size={12} /> {err}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[rgba(18,18,18,0.10)] px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-3 py-2 hover:border-near-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={! canSave || saving}
            className={cn(
              'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase px-3 py-2 border',
              canSave && ! saving
                ? 'bg-near-black border-near-black text-white hover:bg-white hover:text-near-black'
                : 'bg-cream border-[rgba(18,18,18,0.10)] text-muted-text cursor-not-allowed',
            )}
          >
            {saving
              ? <><Loader2 size={11} className="animate-spin" /> Saving</>
              : <><Check size={12} /> {isEdit ? 'Save changes' : 'Post announcement'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
