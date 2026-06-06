'use client'

import { useEffect, useMemo, useState } from 'react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import ImageUploadField from '@/components/editor/ImageUploadField'
import { Service, ServiceCategory, ServiceAddon, ServiceAddonLink, ApiStaffMember } from '@/lib/types'
import {
  getEditorServices,
  createEditorService,
  updateEditorService,
  deleteEditorService,
  getEditorServiceCategories,
  createEditorServiceCategory,
  updateEditorServiceCategory,
  deleteEditorServiceCategory,
  getEditorServiceAddons,
  createEditorServiceAddon,
  updateEditorServiceAddon,
  deleteEditorServiceAddon,
  getEditorStaff,
} from '@/lib/api'
import {
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown, Tag, X, Edit2, Image as ImageIcon, AlertCircle,
  Settings as SettingsIcon, ChevronRight, Users, Sparkles, Package,
} from 'lucide-react'
import { ComingSoonCard } from '@/components/editor/ComingSoonPanel'

// ── Types ─────────────────────────────────────────────────────────────────────

type Draft = {
  name: string
  description: string
  price: string
  duration_minutes: string
  category_id: string                            // "" = uncategorized; numeric string otherwise
  image_url: string
  is_active: boolean
  // Phase 4 — Advanced
  buffer_before_override_minutes: string         // "" = inherit; "0" = explicit zero
  buffer_after_override_minutes:  string
  available_days: number[]                       // [] = inherit; otherwise dows
  assigned_staff_ids: number[]
  // Phase 5 — selected add-on links + per-link required flag.
  linked_addons: ServiceAddonLink[]
}

function toDraft(s: Service): Draft {
  return {
    name:             s.name,
    description:      s.description ?? '',
    price:            String(s.price),
    duration_minutes: String(s.duration_minutes),
    category_id:      s.category_id != null ? String(s.category_id) : '',
    image_url:        s.image_url ?? '',
    is_active:        s.is_active,
    buffer_before_override_minutes:
      s.buffer_before_override_minutes == null ? '' : String(s.buffer_before_override_minutes),
    buffer_after_override_minutes:
      s.buffer_after_override_minutes  == null ? '' : String(s.buffer_after_override_minutes),
    available_days:    Array.isArray(s.available_days) ? [...s.available_days] : [],
    assigned_staff_ids: Array.isArray(s.assigned_staff_ids) ? [...s.assigned_staff_ids] : [],
    linked_addons:     Array.isArray(s.linked_addons)
      ? s.linked_addons.map(l => ({ addon_id: l.addon_id, is_required: !!l.is_required }))
      : [],
  }
}

// Map override draft fields to API payload values. Empty string → null
// (inherit). Anything else parsed to integer with a floor of 0.
function parseOverrideMinutes(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// ── ServiceRow ────────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: Service
  categories: ServiceCategory[]
  staff: ApiStaffMember[]
  addons: ServiceAddon[]
  index: number
  total: number
  isDragging: boolean
  isDragOver: boolean
  onSaved: (updated: Service) => void
  onDeleted: (id: number) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

function ServiceRow({
  service,
  categories,
  staff,
  addons,
  index,
  total,
  isDragging,
  isDragOver,
  onSaved,
  onDeleted,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ServiceRowProps) {
  const [open, setOpen]         = useState(false)
  const [draft, setDraft]       = useState<Draft>(toDraft(service))
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const updated = await updateEditorService(service.id, {
        name:             draft.name,
        description:      draft.description || null,
        price:            parseFloat(draft.price) || 0,
        duration_minutes: parseInt(draft.duration_minutes, 10) || 30,
        // Phase 3: category_id is the source of truth. Mirror to the legacy
        // free-text column so old payload consumers (public site groupBy on
        // the string) keep working until Phase 8 drops the column.
        category_id:      draft.category_id ? Number(draft.category_id) : null,
        category:         draft.category_id
          ? (categories.find(c => c.id === Number(draft.category_id))?.name ?? null)
          : null,
        image_url:        draft.image_url || null,
        is_active:        draft.is_active,
        // Phase 4 overrides — null = inherit; empty array = inherit.
        buffer_before_override_minutes: parseOverrideMinutes(draft.buffer_before_override_minutes),
        buffer_after_override_minutes:  parseOverrideMinutes(draft.buffer_after_override_minutes),
        available_days:    draft.available_days.length ? draft.available_days : null,
        assigned_staff_ids: draft.assigned_staff_ids,
        linked_addons:     draft.linked_addons,
      })
      onSaved(updated)
      setOpen(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteEditorService(service.id)
      onDeleted(service.id)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed')
      setDeleting(false)
    }
  }

  const categoryName = service.category_id != null
    ? (categories.find(c => c.id === service.category_id)?.name ?? null)
    : (service.category ?? null)

  return (
    <div
      className={`border bg-white transition-colors ${
        isDragOver ? 'border-near-black' : 'border-[rgba(18,18,18,0.10)]'
      } ${isDragging ? 'opacity-40' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-3 select-none">
        {/* Drag handle — desktop hint */}
        <GripVertical
          size={14}
          className="text-[rgba(18,18,18,0.25)] flex-shrink-0 cursor-grab hidden sm:block"
        />

        {/* Move up/down — mobile primary controls */}
        <div className="flex flex-col gap-0.5 sm:hidden flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 text-muted-text hover:text-near-black disabled:opacity-20 transition-colors"
            aria-label="Move up"
          >
            <ChevronUp size={13} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 text-muted-text hover:text-near-black disabled:opacity-20 transition-colors"
            aria-label="Move down"
          >
            <ChevronDown size={13} />
          </button>
        </div>

        {/* Thumbnail — small square so the row stays compact */}
        <div className="w-10 h-10 bg-cream border border-[rgba(18,18,18,0.08)] flex-shrink-0 overflow-hidden">
          {service.image_url
            /* eslint-disable-next-line @next/next/no-img-element */
            ? <img src={service.image_url} alt={service.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={14} /></div>
          }
        </div>

        {/* Info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-near-black truncate">
              {service.name || 'Untitled Service'}
            </p>
            {categoryName && (
              <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.12)] bg-cream text-near-black px-1.5 py-0.5 flex-shrink-0">
                {categoryName}
              </span>
            )}
            {!service.is_active && (
              <span className="text-[10px] font-bold tracking-wide uppercase text-amber-600">
                Inactive
              </span>
            )}
          </div>
          <p className="text-xs text-muted-text">
            {service.duration_minutes} min · ${Number(service.price).toFixed(2)}
          </p>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="text-muted-text text-lg leading-none w-7 h-7 flex items-center justify-center flex-shrink-0 hover:text-near-black transition-colors"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? '−' : '+'}
        </button>
      </div>

      {/* Edit form */}
      {open && (
        <div className="px-4 pb-4 border-t border-[rgba(18,18,18,0.08)] pt-4 space-y-3">
          {/* Photo (thumbnail-size) */}
          <div className="w-32">
            <ImageUploadField
              label="Image"
              value={draft.image_url || null}
              onChange={v => set('image_url', v ?? '')}
              kind="service"
              aspectClass="aspect-square"
            />
          </div>

          <Input
            label="Service Name"
            value={draft.name}
            onChange={e => set('name', e.target.value)}
          />
          <Textarea
            label="Description"
            value={draft.description}
            rows={2}
            onChange={e => set('description', e.target.value)}
          />

          {/* Price + Duration — 2 col on mobile, full-width labels */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (min)"
              type="number"
              value={draft.duration_minutes}
              onChange={e => set('duration_minutes', e.target.value)}
            />
            <Input
              label="Price ($)"
              type="number"
              value={draft.price}
              onChange={e => set('price', e.target.value)}
            />
          </div>

          {/* Category — dropdown of existing categories */}
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Category</span>
            <select
              value={draft.category_id}
              onChange={e => set('category_id', e.target.value)}
              className="w-full mt-1.5 bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
            >
              <option value="">Uncategorized</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-xs font-semibold text-near-black">Active (visible on site)</span>
          </label>

          <AdvancedSection
            draft={draft}
            staff={staff}
            addons={addons}
            onChange={(next) => setDraft(prev => ({ ...prev, ...next }))}
          />

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <Button size="sm" onClick={handleSave} disabled={saving || deleting}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors disabled:opacity-50"
            >
              <Trash2 size={12} />
              {deleting ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AddServiceForm ────────────────────────────────────────────────────────────

const BLANK_DRAFT: Draft = {
  name:             '',
  description:      '',
  price:            '',
  duration_minutes: '30',
  category_id:      '',
  image_url:        '',
  is_active:        true,
  buffer_before_override_minutes: '',
  buffer_after_override_minutes:  '',
  available_days:    [],
  assigned_staff_ids: [],
  linked_addons:     [],
}

function AddServiceForm({
  onCreated,
  onCancel,
  nextSortOrder,
  categories,
  staff,
  addons,
}: {
  onCreated: (service: Service) => void
  onCancel: () => void
  nextSortOrder: number
  categories: ServiceCategory[]
  staff: ApiStaffMember[]
  addons: ServiceAddon[]
}) {
  const [draft, setDraft]   = useState<Draft>(BLANK_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleCreate() {
    if (!draft.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const created = await createEditorService({
        name:             draft.name,
        description:      draft.description || null,
        price:            parseFloat(draft.price) || 0,
        duration_minutes: parseInt(draft.duration_minutes, 10) || 30,
        category_id:      draft.category_id ? Number(draft.category_id) : null,
        category:         draft.category_id
          ? (categories.find(c => c.id === Number(draft.category_id))?.name ?? null)
          : null,
        image_url:        draft.image_url || null,
        is_active:        draft.is_active,
        sort_order:       nextSortOrder,
        buffer_before_override_minutes: parseOverrideMinutes(draft.buffer_before_override_minutes),
        buffer_after_override_minutes:  parseOverrideMinutes(draft.buffer_after_override_minutes),
        available_days:    draft.available_days.length ? draft.available_days : null,
        assigned_staff_ids: draft.assigned_staff_ids,
        linked_addons:     draft.linked_addons,
      })
      onCreated(created)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
      setSaving(false)
    }
  }

  return (
    <div className="border border-[rgba(18,18,18,0.15)] bg-cream p-4 space-y-3">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">New Service</p>

      <div className="w-32">
        <ImageUploadField
          label="Image"
          value={draft.image_url || null}
          onChange={v => set('image_url', v ?? '')}
          kind="service"
          aspectClass="aspect-square"
        />
      </div>

      <Input label="Service Name" value={draft.name} onChange={e => set('name', e.target.value)} autoFocus />
      <Textarea label="Description" value={draft.description} rows={2} onChange={e => set('description', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Duration (min)" type="number" value={draft.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
        <Input label="Price ($)" type="number" value={draft.price} onChange={e => set('price', e.target.value)} />
      </div>

      <label className="block">
        <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">Category</span>
        <select
          value={draft.category_id}
          onChange={e => set('category_id', e.target.value)}
          className="w-full mt-1.5 bg-white border border-[rgba(18,18,18,0.15)] px-3 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
        >
          <option value="">Uncategorized</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <AdvancedSection
        draft={draft}
        staff={staff}
        addons={addons}
        onChange={(next) => setDraft(prev => ({ ...prev, ...next }))}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" onClick={handleCreate} disabled={saving}>
          {saving ? 'Adding…' : 'Add Service'}
        </Button>
        <button onClick={onCancel} className="text-xs text-muted-text hover:text-near-black transition-colors">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── ServicesEditor ────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'idle' | 'error'

export default function ServicesEditor() {
  const [services, setServices]       = useState<Service[]>([])
  const [categories, setCategories]   = useState<ServiceCategory[]>([])
  const [addons, setAddons]           = useState<ServiceAddon[]>([])
  const [staff, setStaff]             = useState<ApiStaffMember[]>([])
  const [status, setStatus]           = useState<PageStatus>('loading')
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)
  const [adding, setAdding]           = useState(false)
  const [dragIndex, setDragIndex]     = useState<number | null>(null)
  const [dragOver, setDragOver]       = useState<number | null>(null)
  const [catsOpen, setCatsOpen]       = useState(false)
  const [addonsOpen, setAddonsOpen]   = useState(false)

  useEffect(() => {
    Promise.all([
      getEditorServices(),
      getEditorServiceCategories().catch(() => [] as ServiceCategory[]),
      // Staff + add-ons are optional in this view — failures just mean
      // the editor renders without the corresponding pickers.
      getEditorStaff({ active: true }).catch(() => [] as ApiStaffMember[]),
      getEditorServiceAddons().catch(() => [] as ServiceAddon[]),
    ])
      .then(([svcs, cats, st, ads]) => {
        setServices([...svcs].sort((a, b) => a.sort_order - b.sort_order))
        setCategories([...cats].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
        setStaff([...st].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
        setAddons([...ads].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id))
        setStatus('idle')
      })
      .catch(err => {
        setErrorMsg(err.message ?? 'Failed to load services')
        setStatus('error')
      })
  }, [])

  function reorder(from: number, to: number) {
    if (from === to) return
    const next = [...services]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    const updated = next.map((s, i) => ({ ...s, sort_order: i }))
    setServices(updated)
    // Persist sort_order (fire-and-forget — no spinner, optimistic update)
    // TODO: replace with a single batch PATCH /editor/services/reorder endpoint for efficiency
    updated.forEach(s => {
      updateEditorService(s.id, { sort_order: s.sort_order }).catch(() => {})
    })
  }

  function handleSaved(updated: Service) {
    setServices(prev => prev.map(s => (s.id === updated.id ? updated : s)))
  }

  function handleDeleted(id: number) {
    setServices(prev => prev.filter(s => s.id !== id))
  }

  function handleCreated(service: Service) {
    setServices(prev => [...prev, service])
    setAdding(false)
  }

  // Category mutations propagate into the service-row badges immediately
  // so the owner sees their renames + new entries in dropdowns without
  // a page refresh.
  function handleCategoryCreated(c: ServiceCategory)  { setCategories(prev => [...prev, c]) }
  function handleCategoryUpdated(c: ServiceCategory)  { setCategories(prev => prev.map(x => x.id === c.id ? c : x)) }
  function handleCategoryDeleted(id: number)          {
    setCategories(prev => prev.filter(c => c.id !== id))
    // Local services that pointed at this category now show Uncategorized.
    setServices(prev => prev.map(s => s.category_id === id ? { ...s, category_id: null, category: null } : s))
  }

  function handleAddonCreated(a: ServiceAddon)  { setAddons(prev => [...prev, a]) }
  function handleAddonUpdated(a: ServiceAddon)  { setAddons(prev => prev.map(x => x.id === a.id ? a : x)) }
  function handleAddonDeleted(id: number)        {
    setAddons(prev => prev.filter(a => a.id !== id))
    // Drop any local service link that referenced the removed add-on.
    setServices(prev => prev.map(s => ({
      ...s,
      linked_addons: (s.linked_addons ?? []).filter(l => l.addon_id !== id),
    })))
  }

  if (status === 'loading') {
    return <div className="p-6"><p className="text-xs text-muted-text">Loading…</p></div>
  }

  return (
    <div className="p-5 space-y-5">
      {/* Heading — section + page titles live in EditorShell */}
      <div>
        <p className="text-xs text-muted-text">
          {services.length} service{services.length !== 1 ? 's' : ''} · {categories.length} categor{categories.length === 1 ? 'y' : 'ies'} · Drag or use arrows to reorder.
        </p>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Categories panel */}
      <CategoriesPanel
        open={catsOpen}
        onToggle={() => setCatsOpen(o => !o)}
        categories={categories}
        onCreated={handleCategoryCreated}
        onUpdated={handleCategoryUpdated}
        onDeleted={handleCategoryDeleted}
      />

      {/* Add-ons panel */}
      <AddonsPanel
        open={addonsOpen}
        onToggle={() => setAddonsOpen(o => !o)}
        addons={addons}
        onCreated={handleAddonCreated}
        onUpdated={handleAddonUpdated}
        onDeleted={handleAddonDeleted}
      />

      {/* Phase 18 — Packages teaser */}
      <ComingSoonCard
        icon={Package}
        tone="accent"
        title="Packages"
        description="Bundle two or more services into a single bookable item with its own price + duration."
        bullets={[
          'Sell a "Spa Day" combo at a discount vs. individual services',
          'Auto-block the right amount of time on the calendar',
          'Track which packages sell best in Payments → Transactions',
        ]}
      />

      {/* Service rows */}
      <div className="space-y-2">
        {services.map((s, i) => (
          <ServiceRow
            key={s.id}
            service={s}
            categories={categories}
            staff={staff}
            addons={addons}
            index={i}
            total={services.length}
            isDragging={dragIndex === i}
            isDragOver={dragOver === i && dragIndex !== i}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onMoveUp={() => reorder(i, i - 1)}
            onMoveDown={() => reorder(i, i + 1)}
            onDragStart={() => setDragIndex(i)}
            onDragOver={e => { e.preventDefault(); setDragOver(i) }}
            onDrop={() => { reorder(dragIndex ?? i, i); setDragIndex(null); setDragOver(null) }}
            onDragEnd={() => { setDragIndex(null); setDragOver(null) }}
          />
        ))}
      </div>

      {/* Add form or button */}
      {adding ? (
        <AddServiceForm
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
          nextSortOrder={services.length}
          categories={categories}
          staff={staff}
          addons={addons}
        />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          <Plus size={14} className="mr-1.5" />
          Add Service
        </Button>
      )}
    </div>
  )
}

// ── Categories panel ─────────────────────────────────────────────────────────

const CATEGORIES_MAX = 8

function CategoriesPanel({
  open, onToggle, categories, onCreated, onUpdated, onDeleted,
}: {
  open: boolean
  onToggle: () => void
  categories: ServiceCategory[]
  onCreated: (c: ServiceCategory) => void
  onUpdated: (c: ServiceCategory) => void
  onDeleted: (id: number) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ServiceCategory | null>(null)

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Tag size={14} className="text-near-black flex-shrink-0" />
          <p className="text-sm font-bold text-near-black">Categories</p>
          <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-muted-text">
            {categories.length}/{CATEGORIES_MAX}
          </span>
        </div>
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-[rgba(18,18,18,0.08)] p-4 space-y-3">
          {categories.length === 0 && !adding && (
            <p className="text-[11px] text-muted-text italic">
              No categories yet. Add a few to group services on your booking page.
            </p>
          )}

          {categories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map(c => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  onEdit={() => setEditing(c)}
                  onDeleted={onDeleted}
                />
              ))}
            </div>
          )}

          {!adding && categories.length < CATEGORIES_MAX && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-2.5 py-1.5 hover:border-near-black"
            >
              <Plus size={12} /> Add Category
            </button>
          )}

          {adding && (
            <CategoryDialog
              category={null}
              onClose={() => setAdding(false)}
              onSaved={(c) => { onCreated(c); setAdding(false) }}
            />
          )}
          {editing && (
            <CategoryDialog
              category={editing}
              onClose={() => setEditing(null)}
              onSaved={(c) => { onUpdated(c); setEditing(null) }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function CategoryRow({
  category, onEdit, onDeleted,
}: {
  category: ServiceCategory
  onEdit: () => void
  onDeleted: (id: number) => void
}) {
  const [busy, setBusy] = useState(false)
  async function handleDelete() {
    if (!confirm(`Delete "${category.name}"? Services in this category will be moved to "Uncategorized".`)) return
    setBusy(true)
    try {
      await deleteEditorServiceCategory(category.id)
      onDeleted(category.id)
    } catch {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.08)] bg-cream/50 p-2">
      <div className="w-10 h-10 bg-white border border-[rgba(18,18,18,0.08)] flex-shrink-0 overflow-hidden">
        {category.image_url
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-muted-text"><ImageIcon size={13} /></div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-near-black truncate">{category.name}</p>
        {category.description && (
          <p className="text-[10px] text-muted-text truncate">{category.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black flex-shrink-0"
        title="Edit"
      >
        <Edit2 size={11} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 flex-shrink-0"
        title="Delete"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

function CategoryDialog({
  category, onClose, onSaved,
}: {
  category: ServiceCategory | null
  onClose: () => void
  onSaved: (c: ServiceCategory) => void
}) {
  const [name,        setName]        = useState(category?.name        ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [imageUrl,    setImageUrl]    = useState(category?.image_url   ?? '')
  const [isActive,    setIsActive]    = useState(category?.is_active   ?? true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name: n,
        description: description.trim() || null,
        image_url:   imageUrl.trim()    || null,
        is_active:   isActive,
      }
      const result = category
        ? await updateEditorServiceCategory(category.id, payload)
        : await createEditorServiceCategory(payload)
      onSaved(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm border border-[rgba(18,18,18,0.15)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[rgba(18,18,18,0.10)] px-4 py-3">
          <h3 className="text-sm font-bold text-near-black">{category ? 'Edit category' : 'New category'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="w-32">
            <ImageUploadField
              label="Image"
              value={imageUrl || null}
              onChange={v => setImageUrl(v ?? '')}
              kind="category"
              aspectClass="aspect-square"
            />
          </div>
          <Input
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Haircuts, Lashes, Nails…"
          />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-xs font-semibold text-near-black">Active</span>
          </label>
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
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving…' : category ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Advanced section ─────────────────────────────────────────────────────────
//
// Collapsible "Advanced" block on each service form. Holds the Phase 4
// override fields: per-service buffers, per-service available days, and
// the assigned-staff multi-select. Empty values throughout = "inherit
// from the global Booking Settings + business hours".

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function AdvancedSection({
  draft, staff, addons, onChange,
}: {
  draft: Draft
  staff: ApiStaffMember[]
  addons: ServiceAddon[]
  onChange: (patch: Partial<Draft>) => void
}) {
  const [open, setOpen] = useState(false)

  function toggleDay(dow: number) {
    const next = new Set(draft.available_days)
    next.has(dow) ? next.delete(dow) : next.add(dow)
    onChange({ available_days: Array.from(next).sort((a, b) => a - b) })
  }

  function toggleStaff(id: number) {
    const next = new Set(draft.assigned_staff_ids)
    next.has(id) ? next.delete(id) : next.add(id)
    onChange({ assigned_staff_ids: Array.from(next).sort((a, b) => a - b) })
  }

  // Add-on link helpers — toggle membership, flip per-link required flag.
  function toggleAddon(id: number) {
    const exists = draft.linked_addons.find(l => l.addon_id === id)
    const next = exists
      ? draft.linked_addons.filter(l => l.addon_id !== id)
      : [...draft.linked_addons, { addon_id: id, is_required: false }]
    onChange({ linked_addons: next })
  }
  function toggleAddonRequired(id: number) {
    onChange({
      linked_addons: draft.linked_addons.map(l =>
        l.addon_id === id ? { ...l, is_required: ! l.is_required } : l,
      ),
    })
  }

  const overridesActive =
       draft.buffer_before_override_minutes !== ''
    || draft.buffer_after_override_minutes  !== ''
    || draft.available_days.length > 0
    || draft.assigned_staff_ids.length > 0
    || draft.linked_addons.length > 0

  return (
    <div className="border border-[rgba(18,18,18,0.10)] bg-cream/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <SettingsIcon size={13} className="text-near-black flex-shrink-0" />
          <span className="text-xs font-bold text-near-black">Advanced</span>
          {overridesActive && (
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-lavender text-near-black px-1.5 py-0.5">
              Custom settings
            </span>
          )}
        </div>
        {open
          ? <ChevronDown size={13} className="text-muted-text" />
          : <ChevronRight size={13} className="text-muted-text" />
        }
      </button>

      {open && (
        <div className="border-t border-[rgba(18,18,18,0.08)] p-3 space-y-3.5">
          {/* Buffers */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
              Custom gaps
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Before (min)"
                type="number"
                value={draft.buffer_before_override_minutes}
                placeholder="Use default"
                onChange={e => onChange({ buffer_before_override_minutes: e.target.value })}
              />
              <Input
                label="After (min)"
                type="number"
                value={draft.buffer_after_override_minutes}
                placeholder="Use default"
                onChange={e => onChange({ buffer_after_override_minutes: e.target.value })}
              />
            </div>
            <p className="text-[10px] text-muted-text mt-1.5">
              Leave blank to use the default from Booking Settings. Enter 0 to
              turn off the gap for this service only.
            </p>
          </div>

          {/* Available days */}
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
              Available days
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DAY_LABELS.map((label, dow) => {
                const active = draft.available_days.includes(dow)
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleDay(dow)}
                    className={
                      'text-[10px] font-bold tracking-[0.08em] uppercase border px-2 py-1.5 transition-colors '
                      + (active
                        ? 'bg-near-black text-white border-near-black'
                        : 'bg-white text-muted-text border-[rgba(18,18,18,0.15)] hover:text-near-black')
                    }
                  >
                    {label}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-text mt-1.5">
              {draft.available_days.length === 0
                ? 'No restriction. Uses the business hours.'
                : 'Service is only offered on the selected days.'}
            </p>
          </div>

          {/* Assigned staff */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1.5">
                <Users size={11} /> Assigned staff
              </p>
              <span className="text-[10px] text-muted-text">
                {draft.assigned_staff_ids.length}/{staff.length}
              </span>
            </div>
            {staff.length === 0 ? (
              <p className="text-[11px] text-muted-text italic">
                No active staff to assign yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {staff.map(s => {
                  const active = draft.assigned_staff_ids.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleStaff(s.id)}
                      className={
                        'inline-flex items-center gap-1.5 text-[11px] font-semibold border px-2 py-1.5 transition-colors '
                        + (active
                          ? 'bg-near-black text-white border-near-black'
                          : 'bg-white text-near-black border-[rgba(18,18,18,0.15)] hover:border-near-black')
                      }
                    >
                      {s.photo_url
                        /* eslint-disable-next-line @next/next/no-img-element */
                        ? <img src={s.photo_url} alt={s.name} className="w-4 h-4 object-cover border border-white/40" />
                        : <Users size={11} />
                      }
                      {s.name}
                    </button>
                  )
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-text mt-1.5">
              {draft.assigned_staff_ids.length === 0
                ? 'No staff assigned. Any staff can perform this service.'
                : 'Only the selected staff will be offered for this service.'}
            </p>
          </div>

          {/* Linked add-ons — pick from the global catalog + per-link required flag. */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1.5">
                <Sparkles size={11} /> Add-ons
              </p>
              <span className="text-[10px] text-muted-text">
                {draft.linked_addons.length}/{addons.length}
              </span>
            </div>
            {addons.length === 0 ? (
              <p className="text-[11px] text-muted-text italic">
                No add-ons in the catalog yet. Add some in the Add-ons panel above.
              </p>
            ) : (
              <div className="space-y-1.5">
                {addons.map(a => {
                  const link   = draft.linked_addons.find(l => l.addon_id === a.id)
                  const active = !! link
                  const required = !! link?.is_required
                  return (
                    <div
                      key={a.id}
                      className={
                        'flex items-center gap-2 border p-2 transition-colors '
                        + (active
                          ? 'bg-white border-near-black'
                          : 'bg-white border-[rgba(18,18,18,0.10)] hover:border-near-black')
                      }
                    >
                      <button
                        type="button"
                        onClick={() => toggleAddon(a.id)}
                        className="w-4 h-4 border border-near-black flex items-center justify-center flex-shrink-0"
                        aria-pressed={active}
                        aria-label={active ? `Remove ${a.name}` : `Add ${a.name}`}
                      >
                        {active && <span className="block w-2 h-2 bg-near-black" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-near-black truncate">{a.name}</p>
                        <p className="text-[10px] text-muted-text">
                          +${a.extra_price.toFixed(2)} · +{a.extra_duration_minutes} min
                        </p>
                      </div>
                      {active && (
                        <button
                          type="button"
                          onClick={() => toggleAddonRequired(a.id)}
                          className={
                            'text-[9px] font-bold tracking-[0.08em] uppercase border px-2 py-1 transition-colors flex-shrink-0 '
                            + (required
                              ? 'bg-near-black text-white border-near-black'
                              : 'bg-white text-muted-text border-[rgba(18,18,18,0.15)] hover:text-near-black')
                          }
                          title={required ? 'Required for this service' : 'Optional for this service'}
                        >
                          {required ? 'Required' : 'Optional'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <p className="text-[10px] text-muted-text mt-1.5">
              Required add-ons are pre-checked on the booking form and can't be removed by the customer.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add-ons panel ────────────────────────────────────────────────────────────

const ADDONS_MAX = 20

function AddonsPanel({
  open, onToggle, addons, onCreated, onUpdated, onDeleted,
}: {
  open: boolean
  onToggle: () => void
  addons: ServiceAddon[]
  onCreated: (a: ServiceAddon) => void
  onUpdated: (a: ServiceAddon) => void
  onDeleted: (id: number) => void
}) {
  const [adding, setAdding]   = useState(false)
  const [editing, setEditing] = useState<ServiceAddon | null>(null)

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-cream transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles size={14} className="text-near-black flex-shrink-0" />
          <p className="text-sm font-bold text-near-black">Add-ons</p>
          <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-muted-text">
            {addons.length}/{ADDONS_MAX}
          </span>
        </div>
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-[rgba(18,18,18,0.08)] p-4 space-y-3">
          {addons.length === 0 && !adding && (
            <p className="text-[11px] text-muted-text italic">
              No add-ons yet. Add a few so services can offer extras at booking time.
            </p>
          )}

          {addons.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {addons.map(a => (
                <AddonRow
                  key={a.id}
                  addon={a}
                  onEdit={() => setEditing(a)}
                  onDeleted={onDeleted}
                />
              ))}
            </div>
          )}

          {!adding && addons.length < ADDONS_MAX && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[rgba(18,18,18,0.15)] bg-white text-near-black px-2.5 py-1.5 hover:border-near-black"
            >
              <Plus size={12} /> Add Add-on
            </button>
          )}

          {adding && (
            <AddonDialog
              addon={null}
              onClose={() => setAdding(false)}
              onSaved={(a) => { onCreated(a); setAdding(false) }}
            />
          )}
          {editing && (
            <AddonDialog
              addon={editing}
              onClose={() => setEditing(null)}
              onSaved={(a) => { onUpdated(a); setEditing(null) }}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AddonRow({
  addon, onEdit, onDeleted,
}: {
  addon: ServiceAddon
  onEdit: () => void
  onDeleted: (id: number) => void
}) {
  const [busy, setBusy] = useState(false)
  async function handleDelete() {
    if (!confirm(`Delete "${addon.name}"? Services linked to this add-on will lose the link. Past appointments keep their original details.`)) return
    setBusy(true)
    try {
      await deleteEditorServiceAddon(addon.id)
      onDeleted(addon.id)
    } catch {
      setBusy(false)
    }
  }
  return (
    <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.08)] bg-cream/50 p-2">
      <div className="w-10 h-10 bg-white border border-[rgba(18,18,18,0.08)] flex-shrink-0 overflow-hidden">
        {addon.image_url
          /* eslint-disable-next-line @next/next/no-img-element */
          ? <img src={addon.image_url} alt={addon.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-muted-text"><Sparkles size={13} /></div>
        }
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[12px] font-semibold text-near-black truncate">{addon.name}</p>
          {!addon.is_active && (
            <span className="text-[9px] font-bold tracking-[0.06em] uppercase border border-[rgba(18,18,18,0.12)] text-muted-text px-1 py-0.5">
              Inactive
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-text">
          +${addon.extra_price.toFixed(2)} · +{addon.extra_duration_minutes} min
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        disabled={busy}
        className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-near-black flex-shrink-0"
        title="Edit"
      >
        <Edit2 size={11} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="w-7 h-7 inline-flex items-center justify-center border border-[rgba(18,18,18,0.10)] bg-white text-near-black hover:border-red-600 hover:text-red-600 flex-shrink-0"
        title="Delete"
      >
        <Trash2 size={11} />
      </button>
    </div>
  )
}

function AddonDialog({
  addon, onClose, onSaved,
}: {
  addon: ServiceAddon | null
  onClose: () => void
  onSaved: (a: ServiceAddon) => void
}) {
  const [name,        setName]        = useState(addon?.name        ?? '')
  const [description, setDescription] = useState(addon?.description ?? '')
  const [imageUrl,    setImageUrl]    = useState(addon?.image_url   ?? '')
  const [price,       setPrice]       = useState(addon ? String(addon.extra_price)            : '0')
  const [duration,    setDuration]    = useState(addon ? String(addon.extra_duration_minutes) : '0')
  const [isActive,    setIsActive]    = useState(addon?.is_active   ?? true)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) { setError('Name is required'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name: n,
        description: description.trim() || null,
        image_url:   imageUrl.trim()    || null,
        extra_price: parseFloat(price) || 0,
        extra_duration_minutes: parseInt(duration, 10) || 0,
        is_active:   isActive,
      }
      const result = addon
        ? await updateEditorServiceAddon(addon.id, payload)
        : await createEditorServiceAddon(payload)
      onSaved(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm border border-[rgba(18,18,18,0.15)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[rgba(18,18,18,0.10)] px-4 py-3">
          <h3 className="text-sm font-bold text-near-black">{addon ? 'Edit add-on' : 'New add-on'}</h3>
          <button onClick={onClose} className="text-muted-text hover:text-near-black"><X size={16} /></button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="w-32">
            <ImageUploadField
              label="Image"
              value={imageUrl || null}
              onChange={v => setImageUrl(v ?? '')}
              kind="addon"
              aspectClass="aspect-square"
            />
          </div>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} placeholder="Add-on name" />
          <Textarea label="Description (optional)" value={description} rows={2} onChange={e => setDescription(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Extra price ($)" type="number" value={price}    onChange={e => setPrice(e.target.value)} />
            <Input label="Extra time (min)" type="number" value={duration} onChange={e => setDuration(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-xs font-semibold text-near-black">Active</span>
          </label>
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
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? 'Saving…' : addon ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
