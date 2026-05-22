'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Users, Edit2, Mail, Phone, CheckCircle, XCircle, X } from 'lucide-react'
import {
  createEditorStaff,
  getEditorStaff,
  updateEditorStaff,
} from '@/lib/api'
import type { ApiStaffMember, StaffMemberPayload } from '@/lib/types'
import { cn } from '@/lib/cn'

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  role: string
  bio: string
  email: string
  phone: string
  is_active: boolean
  sort_order: string
}

function emptyForm(): FormData {
  return { name: '', role: '', bio: '', email: '', phone: '', is_active: true, sort_order: '0' }
}

function memberToForm(m: ApiStaffMember): FormData {
  return {
    name:       m.name,
    role:       m.role       ?? '',
    bio:        m.bio        ?? '',
    email:      m.email      ?? '',
    phone:      m.phone      ?? '',
    is_active:  m.is_active,
    sort_order: String(m.sort_order),
  }
}

function sortFn(a: ApiStaffMember, b: ApiStaffMember): number {
  return a.sort_order - b.sort_order || a.id - b.id
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffEditor() {
  const [staff,         setStaff]         = useState<ApiStaffMember[]>([])
  const [loading,       setLoading]       = useState(true)
  const [loadError,     setLoadError]     = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  const [showForm,   setShowForm]   = useState(false)
  const [formMode,   setFormMode]   = useState<'create' | 'edit'>('create')
  const [editTarget, setEditTarget] = useState<ApiStaffMember | null>(null)
  const [formData,   setFormData]   = useState<FormData>(emptyForm())
  const [formSaving, setFormSaving] = useState(false)
  const [formError,  setFormError]  = useState<string | null>(null)

  useEffect(() => {
    getEditorStaff()
      .then(data => setStaff([...data].sort(sortFn)))
      .catch(err => setLoadError(err instanceof Error ? err.message : 'Failed to load staff'))
      .finally(() => setLoading(false))
  }, [])

  function openCreate() {
    setFormData(emptyForm())
    setEditTarget(null)
    setFormMode('create')
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(member: ApiStaffMember) {
    setFormData(memberToForm(member))
    setEditTarget(member)
    setFormMode('edit')
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setFormError(null)
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim()) { setFormError('Name is required.'); return }
    setFormSaving(true)
    setFormError(null)

    const payload: StaffMemberPayload = {
      name:       formData.name.trim(),
      role:       formData.role.trim()  || null,
      bio:        formData.bio.trim()   || null,
      email:      formData.email.trim() || null,
      phone:      formData.phone.trim() || null,
      is_active:  formData.is_active,
      sort_order: parseInt(formData.sort_order, 10) || 0,
    }

    try {
      if (formMode === 'create') {
        const created = await createEditorStaff(payload)
        setStaff(prev => [...prev, created].sort(sortFn))
        closeForm()
      } else if (editTarget) {
        const updated = await updateEditorStaff(editTarget.id, payload)
        setStaff(prev => prev.map(s => s.id === editTarget.id ? updated : s).sort(sortFn))
        closeForm()
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setFormSaving(false)
    }
  }

  async function handleToggleActive(member: ApiStaffMember) {
    setActionLoading(member.id)
    try {
      const updated = await updateEditorStaff(member.id, { is_active: !member.is_active })
      setStaff(prev => prev.map(s => s.id === member.id ? updated : s))
    } catch {
      // non-fatal — UI stays as-is
    } finally {
      setActionLoading(null)
    }
  }

  const active   = staff.filter(s =>  s.is_active)
  const inactive = staff.filter(s => !s.is_active)

  return (
    <div className="flex flex-col min-h-full bg-cream">

      {/* Topbar */}
      <div className="border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">
          Bookings / Staff
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-[11px] font-bold tracking-[0.06em] uppercase hover:bg-[#2a2a2a] transition-colors"
        >
          <UserPlus size={12} /> Add Staff Member
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">

        {/* Page head */}
        <div>
          <h1 className="text-2xl font-bold text-near-black tracking-tight">Staff</h1>
          <p className="text-sm text-muted-text mt-0.5">
            Manage the team members clients may see on your booking site.
          </p>
        </div>

        {/* Inline form panel */}
        {showForm && (
          <form
            onSubmit={handleFormSubmit}
            className="bg-white border border-[rgba(18,18,18,0.12)] p-4 space-y-3"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-near-black uppercase tracking-[0.12em]">
                {formMode === 'create' ? 'Add Staff Member' : 'Edit Staff Member'}
              </p>
              <button
                type="button"
                onClick={closeForm}
                className="text-muted-text hover:text-near-black transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {formError && (
              <p className="bg-blush border border-[rgba(18,18,18,0.10)] px-3 py-2 text-xs text-near-black">
                {formError}
              </p>
            )}

            {/* Name */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                Name <span className="text-near-black">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                placeholder="Full name"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                Role
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                placeholder="e.g. Barber, Stylist, Nail Tech"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
                placeholder="Short bio or specialties description"
              />
            </div>

            {/* Email + Phone — stacked on mobile, 2-col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-[rgba(18,18,18,0.15)] bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  placeholder="555-555-5555"
                />
              </div>
            </div>

            {/* Active toggle + Sort order */}
            <div className="flex items-center gap-5 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-near-black"
                />
                <span className="text-xs font-medium text-near-black">Active (visible on site)</span>
              </label>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-text whitespace-nowrap">
                  Sort order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData(p => ({ ...p, sort_order: e.target.value }))}
                  className="w-16 border border-[rgba(18,18,18,0.15)] bg-white px-2 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                />
              </div>
            </div>

            {/* Photo placeholder */}
            <p className="text-[11px] text-muted-text italic">Photo upload coming soon.</p>

            {/* Submit row */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-xs font-semibold text-muted-text border border-[rgba(18,18,18,0.12)] hover:text-near-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-4 py-2 text-xs font-bold bg-near-black text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
              >
                {formSaving ? 'Saving…' : formMode === 'create' ? 'Add Staff Member' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-10 text-center text-sm text-muted-text">
            Loading…
          </div>
        )}

        {/* Load error */}
        {!loading && loadError && (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-6 text-center text-sm text-near-black">
            {loadError}
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && staff.length === 0 && (
          <div className="bg-white border border-[rgba(18,18,18,0.10)] px-4 py-12 text-center">
            <Users size={24} className="text-muted-text mx-auto mb-3" />
            <p className="text-sm font-semibold text-near-black mb-1">No staff members yet</p>
            <p className="text-xs text-muted-text mb-5">
              Add your team to display them on your booking site.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:bg-[#2a2a2a] transition-colors"
            >
              <UserPlus size={12} /> Add Staff Member
            </button>
          </div>
        )}

        {/* Active staff */}
        {!loading && !loadError && active.length > 0 && (
          <section>
            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">
              Active · {active.length}
            </p>
            <div className="space-y-2">
              {active.map(member => (
                <StaffCard
                  key={member.id}
                  member={member}
                  actionLoading={actionLoading === member.id}
                  onEdit={() => openEdit(member)}
                  onToggleActive={() => handleToggleActive(member)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Inactive staff */}
        {!loading && !loadError && inactive.length > 0 && (
          <section>
            <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-muted-text mb-2">
              Inactive · {inactive.length}
            </p>
            <div className="space-y-2">
              {inactive.map(member => (
                <StaffCard
                  key={member.id}
                  member={member}
                  actionLoading={actionLoading === member.id}
                  onEdit={() => openEdit(member)}
                  onToggleActive={() => handleToggleActive(member)}
                />
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

// ── Staff card ─────────────────────────────────────────────────────────────────

function StaffCard({
  member,
  actionLoading,
  onEdit,
  onToggleActive,
}: {
  member: ApiStaffMember
  actionLoading: boolean
  onEdit: () => void
  onToggleActive: () => void
}) {
  return (
    <div className={cn(
      'bg-white border p-4 transition-opacity',
      member.is_active
        ? 'border-[rgba(18,18,18,0.10)]'
        : 'border-[rgba(18,18,18,0.06)] opacity-60',
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-near-black">{member.name}</p>
            <span className={cn(
              'text-[9px] font-bold tracking-[0.06em] uppercase px-2 py-0.5 flex-shrink-0',
              member.is_active
                ? 'bg-lavender text-near-black'
                : 'border border-[rgba(18,18,18,0.12)] text-muted-text',
            )}>
              {member.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          {member.role && (
            <p className="text-xs text-muted-text mt-0.5">{member.role}</p>
          )}
        </div>
        <p className="text-[10px] text-[rgba(18,18,18,0.3)] flex-shrink-0 mt-0.5">
          {member.sort_order}
        </p>
      </div>

      {/* Bio */}
      {member.bio && (
        <p className="text-xs text-muted-text mt-2 line-clamp-2 leading-relaxed">
          {member.bio}
        </p>
      )}

      {/* Contact info */}
      {(member.email || member.phone) && (
        <div className="flex flex-wrap gap-3 mt-2">
          {member.email && (
            <span className="flex items-center gap-1 text-[11px] text-muted-text">
              <Mail size={10} className="flex-shrink-0" />
              <span className="truncate">{member.email}</span>
            </span>
          )}
          {member.phone && (
            <span className="flex items-center gap-1 text-[11px] text-muted-text">
              <Phone size={10} className="flex-shrink-0" />
              {member.phone}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[rgba(18,18,18,0.06)]">
        <button
          onClick={onEdit}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-near-black border border-[rgba(18,18,18,0.15)] px-3 py-1.5 hover:border-near-black transition-colors"
        >
          <Edit2 size={11} /> Edit
        </button>
        <button
          onClick={onToggleActive}
          disabled={actionLoading}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-text border border-[rgba(18,18,18,0.10)] px-3 py-1.5 hover:text-near-black hover:border-[rgba(18,18,18,0.25)] transition-colors disabled:opacity-40"
        >
          {member.is_active
            ? <><XCircle size={11} /> Deactivate</>
            : <><CheckCircle size={11} /> Activate</>
          }
        </button>
      </div>
    </div>
  )
}
