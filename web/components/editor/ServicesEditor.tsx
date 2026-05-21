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
import { Plus, Trash2, GripVertical } from 'lucide-react'

// ── Per-service row ───────────────────────────────────────────────────────────

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

function ServiceRow({
  service,
  onSaved,
  onDeleted,
}: {
  service: Service
  onSaved: (updated: Service) => void
  onDeleted: (id: number) => void
}) {
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
    <div className="border border-[rgba(18,18,18,0.10)] bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cream transition-colors select-none"
        onClick={() => setOpen(o => !o)}
      >
        <GripVertical size={14} className="text-muted-text flex-shrink-0" />
        <div className="flex-1 min-w-0">
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
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </div>

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
          <div className="grid grid-cols-3 gap-3">
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
            <Input
              label="Category"
              value={draft.category}
              placeholder="e.g. Haircuts"
              onChange={e => set('category', e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={e => set('is_active', e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-xs font-semibold text-near-black">Active (visible on site)</span>
          </label>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

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

// ── Add service form ──────────────────────────────────────────────────────────

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
}: {
  onCreated: (service: Service) => void
  onCancel: () => void
}) {
  const [draft, setDraft]   = useState<Draft>(BLANK_DRAFT)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function set(field: keyof Draft, value: string | boolean) {
    setDraft(prev => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleCreate() {
    if (!draft.name.trim()) {
      setError('Name is required')
      return
    }
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
        sort_order:       0,
      })
      onCreated(created)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed')
      setSaving(false)
    }
  }

  return (
    <div className="border border-[rgba(18,18,18,0.15)] bg-cream p-4 space-y-3">
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
        New Service
      </p>
      <Input
        label="Service Name"
        value={draft.name}
        onChange={e => set('name', e.target.value)}
        autoFocus
      />
      <Textarea
        label="Description"
        value={draft.description}
        rows={2}
        onChange={e => set('description', e.target.value)}
      />
      <div className="grid grid-cols-3 gap-3">
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
        <Input
          label="Category"
          value={draft.category}
          placeholder="e.g. Haircuts"
          onChange={e => set('category', e.target.value)}
        />
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={handleCreate} disabled={saving}>
          {saving ? 'Adding…' : 'Add Service'}
        </Button>
        <button
          onClick={onCancel}
          className="text-xs text-muted-text hover:text-near-black transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

type PageStatus = 'loading' | 'idle' | 'error'

export default function ServicesEditor() {
  const [services, setServices]   = useState<Service[]>([])
  const [status, setStatus]       = useState<PageStatus>('loading')
  const [errorMsg, setErrorMsg]   = useState<string | null>(null)
  const [adding, setAdding]       = useState(false)

  useEffect(() => {
    getEditorServices()
      .then(data => {
        setServices(data)
        setStatus('idle')
      })
      .catch(err => {
        setErrorMsg(err.message ?? 'Failed to load services')
        setStatus('error')
      })
  }, [])

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
    return (
      <div className="p-6">
        <p className="text-xs text-muted-text">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Services</h2>
        <p className="text-xs text-muted-text">
          {services.length} service{services.length !== 1 ? 's' : ''} on your site.
        </p>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="space-y-2">
        {services.map(s => (
          <ServiceRow
            key={s.id}
            service={s}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        ))}
      </div>

      {adding ? (
        <AddServiceForm
          onCreated={handleCreated}
          onCancel={() => setAdding(false)}
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
