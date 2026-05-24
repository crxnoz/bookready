'use client'

import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { Service } from '@/lib/types'
import {
  getEditorServices,
  createEditorService,
  updateEditorService,
  deleteEditorService,
} from '@/lib/api'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Draft = {
  name: string
  description: string
  price: string
  duration_minutes: string
  category: string
  is_active: boolean
}

function toDraft(s: Service): Draft {
  return {
    name:             s.name,
    description:      s.description ?? '',
    price:            String(s.price),
    duration_minutes: String(s.duration_minutes),
    category:         s.category ?? '',
    is_active:        s.is_active,
  }
}

// ── ServiceRow ────────────────────────────────────────────────────────────────

interface ServiceRowProps {
  service: Service
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

  function set(field: keyof Draft, value: string | boolean) {
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
        category:         draft.category || null,
        is_active:        draft.is_active,
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

        {/* Info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => setOpen(o => !o)}
        >
          <p className="text-sm font-semibold text-near-black truncate">
            {service.name || 'Untitled Service'}
          </p>
          <p className="text-xs text-muted-text">
            {service.duration_minutes} min · ${Number(service.price).toFixed(2)}
            {!service.is_active && (
              <span className="ml-2 text-[10px] font-bold tracking-wide uppercase text-amber-600">
                Inactive
              </span>
            )}
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

          {/* Category — full width */}
          <Input
            label="Category"
            value={draft.category}
            placeholder="e.g. Haircuts"
            onChange={e => set('category', e.target.value)}
          />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-xs font-semibold text-near-black">Active (visible on site)</span>
          </label>

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
  category:         '',
  is_active:        true,
}

function AddServiceForm({
  onCreated,
  onCancel,
  nextSortOrder,
}: {
  onCreated: (service: Service) => void
  onCancel: () => void
  nextSortOrder: number
}) {
  const [draft, setDraft]   = useState<Draft>(BLANK_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set(field: keyof Draft, value: string | boolean) {
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
        category:         draft.category || null,
        is_active:        draft.is_active,
        sort_order:       nextSortOrder,
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

      <Input label="Service Name" value={draft.name} onChange={e => set('name', e.target.value)} autoFocus />
      <Textarea label="Description" value={draft.description} rows={2} onChange={e => set('description', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Duration (min)" type="number" value={draft.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} />
        <Input label="Price ($)" type="number" value={draft.price} onChange={e => set('price', e.target.value)} />
      </div>

      <Input label="Category" value={draft.category} placeholder="e.g. Haircuts" onChange={e => set('category', e.target.value)} />

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
  const [services, setServices]   = useState<Service[]>([])
  const [status, setStatus]       = useState<PageStatus>('loading')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [adding, setAdding]       = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOver, setDragOver]   = useState<number | null>(null)

  useEffect(() => {
    getEditorServices()
      .then(data => {
        // Sort by sort_order ascending on load
        setServices([...data].sort((a, b) => a.sort_order - b.sort_order))
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

  if (status === 'loading') {
    return <div className="p-6"><p className="text-xs text-muted-text">Loading…</p></div>
  }

  return (
    <div className="p-5 space-y-5">
      {/* Heading — section + page titles live in EditorShell */}
      <div>
        <p className="text-xs text-muted-text">
          {services.length} service{services.length !== 1 ? 's' : ''} · Drag or use arrows to reorder.
        </p>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Service rows */}
      <div className="space-y-2">
        {services.map((s, i) => (
          <ServiceRow
            key={s.id}
            service={s}
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
