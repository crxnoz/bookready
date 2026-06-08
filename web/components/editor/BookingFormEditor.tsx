'use client'

/**
 * Phase 16 — Booking Questions (form builder).
 *
 * CRUD UI for the custom questions that get rendered on the public
 * booking form below the customer-info step. Owners can add text,
 * textarea, checkbox, dropdown, and image-upload questions, mark them
 * required, and scope them to either every booking or a chosen subset
 * of services.
 *
 * Storage shape — see BookingQuestionsController (api/Editor).
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, AlertCircle, Plus, Trash2, Pencil, Check, X,
  Type, AlignLeft, CheckSquare, ChevronDown, Image as ImageIcon,
  Eye, EyeOff,
} from 'lucide-react'
import {
  getEditorBookingQuestions,
  createEditorBookingQuestion,
  updateEditorBookingQuestion,
  deleteEditorBookingQuestion,
  getEditorServices,
} from '@/lib/api'
import type {
  BookingQuestion,
  BookingQuestionPayload,
  BookingQuestionType,
  BookingQuestionScope,
  Service,
} from '@/lib/types'
import { cn } from '@/lib/cn'

const TYPE_META: Record<BookingQuestionType, { label: string; icon: React.ElementType; hint: string }> = {
  text:     { label: 'Short text',  icon: Type,        hint: 'A single-line response.' },
  textarea: { label: 'Long text',   icon: AlignLeft,   hint: 'A multi-line paragraph.' },
  checkbox: { label: 'Checkbox',    icon: CheckSquare, hint: 'Single agreement/opt-in toggle.' },
  dropdown: { label: 'Dropdown',    icon: ChevronDown, hint: 'Pick one from a list of options.' },
  image:    { label: 'Image upload', icon: ImageIcon,  hint: 'Lets a customer attach a reference photo.' },
}

const TYPE_ORDER: BookingQuestionType[] = ['text', 'textarea', 'checkbox', 'dropdown', 'image']

export default function BookingFormEditor() {
  const [questions, setQuestions] = useState<BookingQuestion[] | null>(null)
  const [services,  setServices]  = useState<Service[]>([])
  const [loading,   setLoading]   = useState(true)
  const [loadErr,   setLoadErr]   = useState<string | null>(null)

  const [editing,   setEditing]   = useState<BookingQuestion | 'new' | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      getEditorBookingQuestions(),
      getEditorServices().catch(() => []),
    ])
      .then(([qs, svs]) => {
        if (cancelled) return
        setQuestions(qs)
        setServices(svs)
      })
      .catch(e => { if (! cancelled) setLoadErr(e instanceof Error ? e.message : 'Failed to load') })
      .finally(() => { if (! cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function refresh() {
    const next = await getEditorBookingQuestions()
    setQuestions(next)
  }

  async function handleToggleActive(q: BookingQuestion) {
    await updateEditorBookingQuestion(q.id, { is_active: ! q.is_active })
    await refresh()
  }

  async function handleDelete(q: BookingQuestion) {
    if (! confirm(`Delete "${q.label}"? Past answers stay on existing appointments.`)) return
    await deleteEditorBookingQuestion(q.id)
    await refresh()
  }

  if (loading) {
    return (
      <div className="w-full p-3 sm:p-5 md:p-6">
        <div className="flex items-center gap-2 text-xs text-muted-text px-1 py-8">
          <Loader2 size={14} className="animate-spin" /> Loading booking form…
        </div>
      </div>
    )
  }
  if (loadErr) {
    return (
      <div className="w-full p-3 sm:p-5 md:p-6">
        <div className="bg-white border border-[rgba(180,40,40,0.20)] p-4 text-xs text-danger flex items-center gap-2">
          <AlertCircle size={14} /> {loadErr}
        </div>
      </div>
    )
  }

  const list = questions ?? []

  return (
    <div className="w-full p-3 sm:p-5 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs text-muted-text max-w-xl">
            Build the form that shows on your public booking page. Questions appear right under
            customer info, in the order below. You can limit a question to specific services so
            it only shows when those are booked.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black border border-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black whitespace-nowrap"
        >
          <Plus size={12} /> Add question
        </button>
      </div>

      {list.length === 0 && (
        <div className="bg-white border border-hairline-soft px-5 py-10 text-center">
          <p className="text-sm font-semibold text-near-black">No booking questions yet.</p>
          <p className="text-2xs text-muted-text mt-1.5 max-w-md mx-auto">
            Add a question to collect reference photos, allergy notes, parking preferences,
            or anything else you ask customers before the appointment.
          </p>
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="mt-4 inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase bg-near-black border border-near-black text-white px-3 py-2 hover:bg-white hover:text-near-black"
          >
            <Plus size={12} /> Add your first question
          </button>
        </div>
      )}

      <div className="space-y-2">
        {list.map(q => (
          <QuestionRow
            key={q.id}
            q={q}
            services={services}
            onEdit={() => setEditing(q)}
            onToggleActive={() => handleToggleActive(q)}
            onDelete={() => handleDelete(q)}
          />
        ))}
      </div>

      {editing !== null && (
        <QuestionDialog
          initial={editing === 'new' ? null : editing}
          services={services}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await refresh()
          }}
        />
      )}
    </div>
  )
}

// ── Row ─────────────────────────────────────────────────────────────────────

function QuestionRow({
  q, services, onEdit, onToggleActive, onDelete,
}: {
  q: BookingQuestion
  services: Service[]
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const meta = TYPE_META[q.type]
  const Icon = meta.icon

  const scopeLabel = q.scope === 'all'
    ? 'All services'
    : `${q.service_ids.length} service${q.service_ids.length === 1 ? '' : 's'}`

  const scopeTitle = q.scope === 'services'
    ? q.service_ids
        .map(id => services.find(s => s.id === id)?.name ?? `#${id}`)
        .join(', ')
    : undefined

  return (
    <div
      className={cn(
        'bg-white border p-3 flex items-center gap-3',
        q.is_active ? 'border-hairline-soft' : 'border-hairline-soft opacity-60',
      )}
    >
      <span className="w-8 h-8 flex items-center justify-center bg-cream border border-hairline-soft text-near-black flex-shrink-0">
        <Icon size={14} strokeWidth={1.8} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-near-black truncate">{q.label}</p>
          {q.required && (
            <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-[rgba(180,40,40,0.30)] bg-[rgba(180,40,40,0.06)] text-danger px-1.5 py-0.5">
              Required
            </span>
          )}
          <span className="text-eyebrow font-bold tracking-[0.06em] uppercase border border-hairline-strong bg-cream text-muted-text px-1.5 py-0.5">
            {meta.label}
          </span>
        </div>
        <p className="text-2xs text-muted-text mt-0.5" title={scopeTitle}>
          {scopeLabel}
          {q.help_text && <> · {q.help_text}</>}
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          type="button"
          onClick={onToggleActive}
          title={q.is_active ? 'Hide from booking form' : 'Show on booking form'}
          className="w-8 h-8 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-near-black"
        >
          {q.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          className="w-8 h-8 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-near-black"
        >
          <Pencil size={12} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Delete"
          className="w-8 h-8 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Dialog ──────────────────────────────────────────────────────────────────

function QuestionDialog({
  initial, services, onClose, onSaved,
}: {
  initial: BookingQuestion | null
  services: Service[]
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const isEdit = !! initial

  const [label,     setLabel]     = useState(initial?.label ?? '')
  const [type,      setType]      = useState<BookingQuestionType>(initial?.type ?? 'text')
  const [options,   setOptions]   = useState<string[]>(initial?.options ?? [])
  const [helpText,  setHelpText]  = useState(initial?.help_text ?? '')
  const [required,  setRequired]  = useState(initial?.required ?? false)
  const [scope,     setScope]     = useState<BookingQuestionScope>(initial?.scope ?? 'all')
  const [serviceIds,setServiceIds] = useState<number[]>(initial?.service_ids ?? [])

  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  // Esc to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = label.trim().length > 0
    && (type !== 'dropdown' || options.filter(o => o.trim().length > 0).length >= 2)
    && (scope !== 'services' || serviceIds.length > 0)

  async function save() {
    if (! canSave) return
    setSaving(true); setErr(null)
    try {
      const payload: BookingQuestionPayload = {
        label: label.trim(),
        type,
        options: type === 'dropdown'
          ? options.map(o => o.trim()).filter(o => o.length > 0)
          : null,
        help_text: helpText.trim() === '' ? null : helpText.trim(),
        required,
        scope,
        service_ids: scope === 'services' ? serviceIds : null,
      }
      if (isEdit && initial) {
        await updateEditorBookingQuestion(initial.id, payload)
      } else {
        await createEditorBookingQuestion(payload)
      }
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
        className="relative bg-cream w-full sm:max-w-lg max-h-[92vh] overflow-y-auto border border-hairline-soft shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-hairline-soft bg-white sticky top-0 z-10">
          <p className="text-sm font-bold text-near-black">{isEdit ? 'Edit question' : 'New question'}</p>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-near-black"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Label */}
          <div>
            <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
              Question
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Do you have any allergies?"
              autoFocus={! isEdit}
              className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
              Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {TYPE_ORDER.map(t => {
                const m = TYPE_META[t]
                const I = m.icon
                const active = type === t
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      'flex flex-col items-start gap-1 text-left p-2.5 border transition-colors',
                      active
                        ? 'border-near-black bg-near-black text-white'
                        : 'border-hairline-strong bg-white text-near-black hover:border-near-black',
                    )}
                  >
                    <I size={13} strokeWidth={1.8} />
                    <span className="text-2xs font-semibold">{m.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-2xs text-muted-text mt-1.5">{TYPE_META[type].hint}</p>
          </div>

          {/* Dropdown options */}
          {type === 'dropdown' && (
            <DropdownOptionsEditor options={options} onChange={setOptions} />
          )}

          {/* Help text */}
          <div>
            <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-1.5">
              Help text (optional)
            </label>
            <input
              type="text"
              value={helpText ?? ''}
              onChange={e => setHelpText(e.target.value)}
              placeholder="Shown under the question on the booking form"
              className="w-full bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black"
            />
          </div>

          {/* Required */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={required}
              onChange={e => setRequired(e.target.checked)}
              className="w-4 h-4 accent-near-black"
            />
            <span className="text-xs text-near-black">Required to book</span>
          </label>

          {/* Scope */}
          <div className="border-t border-hairline-soft pt-3">
            <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text mb-2">Show on</p>
            <div className="flex gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setScope('all')}
                className={cn(
                  'inline-flex items-center gap-1.5 text-2xs font-semibold px-3 py-1.5 border whitespace-nowrap',
                  scope === 'all'
                    ? 'bg-near-black border-near-black text-white'
                    : 'bg-white border-hairline-strong text-near-black hover:border-near-black',
                )}
              >
                All services
              </button>
              <button
                type="button"
                onClick={() => setScope('services')}
                className={cn(
                  'inline-flex items-center gap-1.5 text-2xs font-semibold px-3 py-1.5 border whitespace-nowrap',
                  scope === 'services'
                    ? 'bg-near-black border-near-black text-white'
                    : 'bg-white border-hairline-strong text-near-black hover:border-near-black',
                )}
              >
                Specific services
              </button>
            </div>
            {scope === 'services' && (
              <div className="bg-white border border-hairline-soft max-h-48 overflow-y-auto">
                {services.length === 0 && (
                  <p className="text-2xs text-muted-text p-3">No active services yet.</p>
                )}
                {services.map(s => {
                  const checked = serviceIds.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 border-b border-[rgba(18,18,18,0.04)] last:border-b-0 hover:bg-cream/60 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          setServiceIds(prev => e.target.checked
                            ? [...prev, s.id]
                            : prev.filter(x => x !== s.id))
                        }}
                        className="w-3.5 h-3.5 accent-near-black"
                      />
                      <span className="text-xs text-near-black">{s.name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {err && (
            <div className="bg-white border border-[rgba(180,40,40,0.20)] p-2.5 text-2xs text-danger flex items-center gap-2">
              <AlertCircle size={12} /> {err}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-hairline-soft px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-3 py-2 hover:border-near-black"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={! canSave || saving}
            className={cn(
              'inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase px-3 py-2 border',
              canSave && !saving
                ? 'bg-near-black border-near-black text-white hover:bg-white hover:text-near-black'
                : 'bg-cream border-hairline-soft text-muted-text cursor-not-allowed',
            )}
          >
            {saving
              ? <><Loader2 size={11} className="animate-spin" /> Saving</>
              : <><Check size={12} /> {isEdit ? 'Save changes' : 'Add question'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function DropdownOptionsEditor({
  options, onChange,
}: {
  options: string[]
  onChange: (next: string[]) => void
}) {
  // Always keep at least one editable row so the UI doesn't disappear.
  const rows = options.length > 0 ? options : ['']

  function patch(i: number, v: string) {
    const next = [...rows]
    next[i] = v
    onChange(next)
  }
  function add() {
    if (rows.length >= 20) return
    onChange([...rows, ''])
  }
  function remove(i: number) {
    const next = rows.filter((_, idx) => idx !== i)
    onChange(next.length > 0 ? next : [''])
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="block text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text">
          Options
        </label>
        <span className="text-eyebrow text-muted-text">{rows.length}/20 · need at least 2</span>
      </div>
      <div className="space-y-1.5">
        {rows.map((v, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={v}
              onChange={e => patch(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 bg-white border border-hairline-strong px-3 py-2 text-sm text-near-black placeholder:text-[#c4bcb6] focus:outline-none focus:border-near-black"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="w-9 h-9 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= 20}
          className="inline-flex items-center gap-1.5 text-2xs font-semibold tracking-[0.08em] uppercase border border-hairline-strong bg-white text-near-black px-2.5 py-1.5 hover:border-near-black disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={11} /> Add option
        </button>
      </div>
    </div>
  )
}
