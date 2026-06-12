'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  UserPlus, Users, Edit2, Mail, Phone, CheckCircle, XCircle, X,
  ChevronDown, ChevronUp, Calendar, Clock, Plus, Trash2, AlertCircle, Loader2,
  Sparkles, KeyRound, Send,
} from 'lucide-react'
import { usePlan } from '@/components/editor/PlanContext'
import {
  createEditorStaff,
  getEditorStaff,
  updateEditorStaff,
  getEditorStaffHours,
  updateEditorStaffHours,
  getEditorStaffBlockedDates,
  createEditorStaffBlockedDate,
  deleteEditorStaffBlockedDate,
  inviteStaffMember,
  revokeStaffLogin,
  getCurrentUser,
} from '@/lib/api'
import type {
  ApiStaffMember,
  StaffMemberPayload,
  StaffHoursEntry,
  StaffBlockedDate,
} from '@/lib/types'
import { cn } from '@/lib/cn'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import StatusBadge from '@/components/ui/StatusBadge'
import ImageUploadField from '@/components/editor/ImageUploadField'
import { SectionHeader } from '@/components/editor/AvailabilitySections'

// ── Form state ────────────────────────────────────────────────────────────────

interface FormData {
  name: string
  role: string
  bio: string
  email: string
  phone: string
  photo_url: string
  is_active: boolean
  sort_order: string
}

function emptyForm(): FormData {
  return { name: '', role: '', bio: '', email: '', phone: '', photo_url: '', is_active: true, sort_order: '0' }
}

function memberToForm(m: ApiStaffMember): FormData {
  return {
    name:       m.name,
    role:       m.role       ?? '',
    bio:        m.bio        ?? '',
    email:      m.email      ?? '',
    phone:      m.phone      ?? '',
    photo_url:  m.photo_url  ?? '',
    is_active:  m.is_active,
    sort_order: String(m.sort_order),
  }
}

function sortFn(a: ApiStaffMember, b: ApiStaffMember): number {
  return a.sort_order - b.sort_order || a.id - b.id
}

// Detect the backfill placeholder so we can warn owners on legacy rows
// that they still need to enter a real email address. Format defined in
// the staff.email NOT-NULL migration: staff-{id}@placeholder.local
function isPlaceholderEmail(email: string | null): boolean {
  return !!email && /^staff-\d+@placeholder\.local$/.test(email)
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StaffEditor() {
  const plan = usePlan()
  const toast = useToast()
  // Wave D refinement: master switch defaults ON for new tenants and is
  // backfilled ON for existing ones (see migration
  // 2026_06_11_000002_backfill_staff_login_enabled_default_on). The
  // per-staff "Send login invite" button IS the consent — we no longer
  // gate it behind a frontend toggle. The plan.staffLoginEnabled()
  // predicate stays for the future "emergency revoke all" surface.
  // Owner-self detection lets us hide the invite affordance on the
  // owner's own staff card — they already have a login via the central
  // users row, and a second credential under the same email would just
  // shadow it.
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
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

  // Which staff member has the Schedule panel expanded right now (max 1
  // at a time so the page doesn't sprawl into a 7-day chart per row).
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    // Fire-and-forget. If the user fetch fails we just lose the
    // owner-self detection on the staff cards — the worst case is the
    // owner sees an invite button on their own row, which they
    // shouldn't be able to act on anyway (the backend refuses to
    // invite an email that already belongs to a central user).
    getCurrentUser()
      .then(u => setCurrentUserEmail(u?.email?.toLowerCase().trim() ?? null))
      .catch(() => {})
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
    // Clear placeholder email on edit so the owner is forced to type a real
    // value instead of silently saving the staff-{id}@placeholder.local string.
    const form = memberToForm(member)
    if (isPlaceholderEmail(member.email)) form.email = ''
    setFormData(form)
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
    if (!formData.name.trim())  { setFormError('Name is required.');  return }
    if (!formData.email.trim()) { setFormError('Email is required.'); return }
    setFormSaving(true)
    setFormError(null)

    const payload: StaffMemberPayload = {
      name:       formData.name.trim(),
      role:       formData.role.trim()  || null,
      bio:        formData.bio.trim()   || null,
      email:      formData.email.trim(),
      phone:      formData.phone.trim() || null,
      photo_url:  formData.photo_url.trim() || null,
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

  // Wave D — patch a single field (e.g. login_status) on one staff row in
  // place. Used by the login affordances so the pill flips without a refetch.
  function patchMember(id: number, patch: Partial<ApiStaffMember>) {
    setStaff(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  const active   = staff.filter(s =>  s.is_active)
  const inactive = staff.filter(s => !s.is_active)
  // Count of legacy rows still on the placeholder email so we can surface
  // a banner — these need real email addresses for booking emails to land.
  const placeholderCount = staff.filter(s => isPlaceholderEmail(s.email)).length

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-5">

        {/* Section anchor — icon box + live count + primary action */}
        <SectionHeader
          icon={Users}
          title="Team members"
          subtitle={
            loading
              ? 'Loading your team…'
              : staff.length === 0
              ? 'No one added yet — add your first team member.'
              : `${active.length} active${inactive.length ? ` · ${inactive.length} inactive` : ''} · set schedules and block dates from each card.`
          }
          action={
            // Phase 2 plan gate: when the tenant is at their staff seats
            // cap, swap the add button for an upgrade CTA. Reads from
            // PlanContext so the cap value tracks whatever plan the
            // tenant is on (Solo=1, Studio=5, Salon=25).
            active.length >= plan.staffSeatsLimit() ? (
              <Link
                href="/editor/billing?from=staff_limit"
                className="flex items-center gap-1.5 bg-blush text-near-black border border-near-black px-3 py-1.5 text-2xs font-bold tracking-[0.06em] uppercase hover:opacity-90 transition-colors"
              >
                <Sparkles size={12} /> Upgrade to add more staff
              </Link>
            ) : (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 bg-near-black text-white px-3 py-1.5 text-2xs font-bold tracking-[0.06em] uppercase hover:opacity-90 transition-colors"
              >
                <UserPlus size={12} /> Add Staff Member
              </button>
            )
          }
        />

        {/* Placeholder-email banner — only shown when older staff rows
            still have the backfill `staff-{id}@placeholder.local` value. */}
        {placeholderCount > 0 && (
          <div className="bg-blush border border-hairline-soft px-4 py-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-near-black flex-shrink-0 mt-0.5" />
            <div className="text-xs text-near-black">
              <strong>{placeholderCount}</strong> staff member{placeholderCount === 1 ? '' : 's'} need a real email address.
              Open each card and add a working address so they can receive booking notifications.
            </div>
          </div>
        )}

        {/* Inline form panel */}
        {showForm && (
          <form
            onSubmit={handleFormSubmit}
            className="bg-white border border-hairline p-4 space-y-3"
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
              <p className="bg-blush border border-hairline-soft px-3 py-2 text-xs text-near-black">
                {formError}
              </p>
            )}

            {/* Photo — constrained to a thumbnail-sized square so the
                upload box doesn't dominate a form that's mostly text. */}
            <div className="w-32">
              <ImageUploadField
                label="Photo"
                value={formData.photo_url || null}
                onChange={v => setFormData(p => ({ ...p, photo_url: v ?? '' }))}
                kind="staff"
                aspectClass="aspect-square"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                Name <span className="text-near-black">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                placeholder="Full name"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                Role
              </label>
              <input
                type="text"
                value={formData.role}
                onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}
                className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                placeholder="e.g. Barber, Stylist, Nail Tech"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={e => setFormData(p => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
                placeholder="Short bio or specialties description"
              />
            </div>

            {/* Email + Phone — stacked on mobile, 2-col on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                  Email <span className="text-near-black">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
                  placeholder="staff@example.com"
                />
                <p className="text-eyebrow text-muted-text mt-1">
                  Used for booking notifications.
                </p>
              </div>
              <div>
                <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
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
                <label className="text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text whitespace-nowrap">
                  Sort order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData(p => ({ ...p, sort_order: e.target.value }))}
                  className="w-16 border border-hairline-strong bg-white px-2 py-2 text-sm text-near-black focus:outline-none focus:border-near-black"
                />
              </div>
            </div>

            {/* Submit row */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 text-xs font-semibold text-muted-text border border-hairline hover:text-near-black transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="px-4 py-2 text-xs font-bold bg-near-black text-white hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {formSaving ? 'Saving…' : formMode === 'create' ? 'Add Staff Member' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-hairline-soft px-4 py-10 text-center text-sm text-muted-text">
            Loading…
          </div>
        )}

        {/* Load error */}
        {!loading && loadError && (
          <div className="bg-white border border-hairline-soft px-4 py-6 text-center text-sm text-near-black">
            {loadError}
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && staff.length === 0 && (
          <div className="bg-white border border-hairline-soft px-4 py-12 text-center">
            <Users size={24} className="text-muted-text mx-auto mb-3" />
            <p className="text-sm font-semibold text-near-black mb-1">No staff members yet</p>
            <p className="text-xs text-muted-text mb-5">
              Add your team to display them on your booking site.
            </p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-near-black text-white px-4 py-2.5 text-xs font-bold tracking-[0.08em] uppercase hover:opacity-90 transition-colors"
            >
              <UserPlus size={12} /> Add Staff Member
            </button>
          </div>
        )}

        {/* Active staff */}
        {!loading && !loadError && active.length > 0 && (
          <section>
            <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text mb-2">
              Active · {active.length}
            </p>
            <div className="space-y-2">
              {active.map(member => (
                <StaffCard
                  key={member.id}
                  member={member}
                  actionLoading={actionLoading === member.id}
                  expanded={expandedId === member.id}
                  isOwnerSelf={
                    !! currentUserEmail
                    && !! member.email
                    && member.email.toLowerCase().trim() === currentUserEmail
                  }
                  toast={toast}
                  onLoginChanged={patch => patchMember(member.id, patch)}
                  onToggleExpand={() => setExpandedId(id => id === member.id ? null : member.id)}
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
            <p className="text-eyebrow font-bold tracking-[0.16em] uppercase text-muted-text mb-2">
              Inactive · {inactive.length}
            </p>
            <div className="space-y-2">
              {inactive.map(member => (
                <StaffCard
                  key={member.id}
                  member={member}
                  actionLoading={actionLoading === member.id}
                  expanded={expandedId === member.id}
                  isOwnerSelf={
                    !! currentUserEmail
                    && !! member.email
                    && member.email.toLowerCase().trim() === currentUserEmail
                  }
                  toast={toast}
                  onLoginChanged={patch => patchMember(member.id, patch)}
                  onToggleExpand={() => setExpandedId(id => id === member.id ? null : member.id)}
                  onEdit={() => openEdit(member)}
                  onToggleActive={() => handleToggleActive(member)}
                />
              ))}
            </div>
          </section>
        )}

    </div>
  )
}

// ── Staff card ─────────────────────────────────────────────────────────────────

function StaffCard({
  member,
  actionLoading,
  expanded,
  isOwnerSelf,
  toast,
  onLoginChanged,
  onToggleExpand,
  onEdit,
  onToggleActive,
}: {
  member: ApiStaffMember
  actionLoading: boolean
  expanded: boolean
  isOwnerSelf: boolean
  toast: ReturnType<typeof useToast>
  onLoginChanged: (patch: Partial<ApiStaffMember>) => void
  onToggleExpand: () => void
  onEdit: () => void
  onToggleActive: () => void
}) {
  const placeholder = isPlaceholderEmail(member.email)
  const loginStatus = member.login_status ?? 'none'
  return (
    <div className={cn(
      'bg-white border transition-opacity',
      member.is_active
        ? 'border-hairline-soft'
        : 'border-hairline-soft opacity-60',
    )}>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-cream border border-hairline-soft flex-shrink-0 overflow-hidden">
            {member.photo_url
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-text"><Users size={16} /></div>
            }
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-near-black">{member.name}</p>
              <span className={cn(
                'text-eyebrow font-bold tracking-[0.06em] uppercase px-2 py-0.5 flex-shrink-0',
                member.is_active
                  ? 'bg-lavender text-near-black'
                  : 'border border-hairline text-muted-text',
              )}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
              {placeholder && (
                <span className="text-eyebrow font-bold tracking-[0.06em] uppercase px-2 py-0.5 flex-shrink-0 bg-blush text-near-black">
                  Email needed
                </span>
              )}
            </div>
            {member.role && (
              <p className="text-xs text-muted-text mt-0.5">{member.role}</p>
            )}
          </div>
          <p className="text-eyebrow text-[rgba(18,18,18,0.3)] flex-shrink-0 mt-0.5">
            #{member.sort_order}
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
            {member.email && !placeholder && (
              <span className="flex items-center gap-1 text-2xs text-muted-text">
                <Mail size={10} className="flex-shrink-0" />
                <span className="truncate">{member.email}</span>
              </span>
            )}
            {member.phone && (
              <span className="flex items-center gap-1 text-2xs text-muted-text">
                <Phone size={10} className="flex-shrink-0" />
                {member.phone}
              </span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hairline-soft flex-wrap">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 text-2xs font-semibold text-near-black border border-hairline-strong px-3 py-1.5 hover:border-near-black transition-colors"
          >
            <Edit2 size={11} /> Edit
          </button>
          <button
            onClick={onToggleExpand}
            className={cn(
              'flex items-center gap-1.5 text-2xs font-semibold border px-3 py-1.5 transition-colors',
              expanded
                ? 'bg-near-black text-white border-near-black'
                : 'text-near-black border-hairline-strong hover:border-near-black',
            )}
          >
            <Calendar size={11} /> Schedule
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
          <button
            onClick={onToggleActive}
            disabled={actionLoading}
            className="flex items-center gap-1.5 text-2xs font-semibold text-muted-text border border-hairline-soft px-3 py-1.5 hover:text-near-black hover:border-hairline-strong transition-colors disabled:opacity-40"
          >
            {member.is_active
              ? <><XCircle size={11} /> Deactivate</>
              : <><CheckCircle size={11} /> Activate</>
            }
          </button>
        </div>

        {/* Staff login affordance (Wave D refinement). The owner's own
            staff row gets a small "your owner login" note instead of an
            invite button — they already have a central User credential
            and a second one under the same email would shadow it. */}
        {isOwnerSelf ? (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hairline-soft">
            <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-muted-text">
              <KeyRound size={11} /> Login
            </span>
            <p className="text-2xs text-muted-text">
              This is your owner login.
            </p>
          </div>
        ) : (
          <StaffLoginRow
            member={member}
            loginStatus={loginStatus}
            placeholder={placeholder}
            toast={toast}
            onLoginChanged={onLoginChanged}
          />
        )}
      </div>

      {/* Schedule panel */}
      {expanded && (
        <div className="border-t border-hairline-soft bg-cream/40 p-4 space-y-5">
          <StaffHoursPanel staffId={member.id} />
          <StaffBlockedDatesPanel staffId={member.id} />
        </div>
      )}
    </div>
  )
}

// ── Staff login row (Wave D) ─────────────────────────────────────────────────
//
// Renders the login-status pill + the relevant action. The whole row is
// already gated by the tenant's staff_login_enabled flag at the StaffCard
// level, so here we only branch on the per-staff status. Invite/resend are
// disabled (with an explanatory hint) when the staff row has no real email.

function StaffLoginRow({
  member,
  loginStatus,
  placeholder,
  toast,
  onLoginChanged,
}: {
  member: ApiStaffMember
  loginStatus: 'none' | 'invited' | 'active'
  placeholder: boolean
  toast: ReturnType<typeof useToast>
  onLoginChanged: (patch: Partial<ApiStaffMember>) => void
}) {
  const confirm = useConfirm()
  const [busy, setBusy] = useState(false)

  // An invite needs a real, non-placeholder email to send to.
  const emailMissing = placeholder || !member.email || !member.email.trim()

  async function handleInvite() {
    setBusy(true)
    try {
      await inviteStaffMember(member.id)
      onLoginChanged({ login_status: 'invited' })
      toast.success(loginStatus === 'invited' ? 'Invite resent.' : 'Login invite sent.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send the invite.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRevoke() {
    const ok = await confirm({
      title:        'Revoke this login?',
      message:      `${member.name} will lose access to the editor. You can invite them again later.`,
      confirmLabel: 'Revoke login',
      tone:         'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      const updated = await revokeStaffLogin(member.id)
      onLoginChanged({ login_status: updated.login_status ?? 'none' })
      toast.success('Login revoked.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not revoke the login.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-hairline-soft flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-muted-text">
        <KeyRound size={11} /> Login
      </span>
      <StatusBadge domain="staff_login" status={loginStatus} />

      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {loginStatus === 'active' ? (
          <button
            type="button"
            onClick={handleRevoke}
            disabled={busy}
            className="flex items-center gap-1.5 text-2xs font-semibold text-muted-text border border-hairline-soft px-3 py-1.5 hover:text-danger hover:border-danger transition-colors disabled:opacity-40"
          >
            {busy ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />} Revoke login
          </button>
        ) : (
          <button
            type="button"
            onClick={handleInvite}
            disabled={busy || emailMissing}
            title={emailMissing ? 'Add a real email address first.' : undefined}
            className="flex items-center gap-1.5 text-2xs font-semibold text-near-black border border-hairline-strong px-3 py-1.5 hover:border-near-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy
              ? <Loader2 size={11} className="animate-spin" />
              : loginStatus === 'invited' ? <Send size={11} /> : <UserPlus size={11} />
            }
            {loginStatus === 'invited' ? 'Resend' : 'Send login invite'}
          </button>
        )}
      </div>

      {emailMissing && loginStatus !== 'active' && (
        <p className="w-full text-eyebrow text-muted-text mt-1">
          Add a real email address before sending a login invite.
        </p>
      )}
    </div>
  )
}

// ── Staff hours panel ────────────────────────────────────────────────────────

function StaffHoursPanel({ staffId }: { staffId: number }) {
  const [hours,   setHours]   = useState<StaffHoursEntry[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [dirty,   setDirty]   = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getEditorStaffHours(staffId)
      .then(rows => { if (!cancelled) { setHours(rows); setDirty(false) } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load hours') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [staffId])

  function patchDay(dow: number, p: Partial<StaffHoursEntry>) {
    setHours(prev => (prev ?? []).map(h => h.day_of_week === dow ? { ...h, ...p } : h))
    setDirty(true)
    if (saved) setSaved(false)
  }

  async function save() {
    if (!hours) return
    setSaving(true); setError(null); setSaved(false)
    try {
      const next = await updateEditorStaffHours(staffId, hours)
      setHours(next)
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save hours')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1.5">
          <Clock size={11} /> Working hours
        </p>
        {hours && (
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving
              ? <><Loader2 size={10} className="animate-spin" /> Saving</>
              : saved
              ? <><CheckCircle size={11} /> Saved</>
              : 'Save'
            }
          </button>
        )}
      </div>

      {loading && (
        <p className="text-2xs text-muted-text">Loading hours…</p>
      )}
      {error && (
        <p className="text-2xs text-danger flex items-center gap-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {hours && (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {hours.map(day => (
            <div key={day.day_of_week} className="flex items-center gap-2 px-3 py-2 flex-wrap">
              <div className="flex items-center gap-2 w-24 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={e => patchDay(day.day_of_week, { is_open: e.target.checked })}
                  className="w-4 h-4 accent-near-black"
                />
                <span className="text-2xs font-semibold text-near-black">{day.day_name.slice(0, 3)}</span>
              </div>
              {day.is_open ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="time"
                    value={day.open_time ?? ''}
                    onChange={e => patchDay(day.day_of_week, { open_time: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                  <span className="text-muted-text text-eyebrow">to</span>
                  <input
                    type="time"
                    value={day.close_time ?? ''}
                    onChange={e => patchDay(day.day_of_week, { close_time: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                  <span className="text-muted-text text-eyebrow ml-1">break</span>
                  <input
                    type="time"
                    value={day.break_start ?? ''}
                    onChange={e => patchDay(day.day_of_week, { break_start: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                  <span className="text-muted-text text-eyebrow">to</span>
                  <input
                    type="time"
                    value={day.break_end ?? ''}
                    onChange={e => patchDay(day.day_of_week, { break_end: e.target.value || null })}
                    className="border border-hairline-strong bg-white px-2 py-1 text-2xs text-near-black focus:outline-none focus:border-near-black"
                  />
                </div>
              ) : (
                <span className="text-2xs text-muted-text italic">Off</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Staff blocked dates panel ────────────────────────────────────────────────

function StaffBlockedDatesPanel({ staffId }: { staffId: number }) {
  const [rows,    setRows]    = useState<StaffBlockedDate[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  // Add form (inline)
  const [start,  setStart]  = useState('')
  const [end,    setEnd]    = useState('')
  const [reason, setReason] = useState('')
  const [adding, setAdding] = useState(false)
  const confirm = useConfirm()

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    getEditorStaffBlockedDates(staffId)
      .then(r => { if (!cancelled) setRows(r) })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load blocked dates') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [staffId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!start) return
    setAdding(true); setError(null)
    try {
      const created = await createEditorStaffBlockedDate(staffId, {
        start_date: start,
        end_date:   end || null,
        reason:     reason.trim() || null,
      })
      setRows(prev => [...(prev ?? []), created].sort((a, b) => a.start_date.localeCompare(b.start_date)))
      setStart(''); setEnd(''); setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add blocked date')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({ title: 'Remove this blocked date?', message: 'This date will become bookable again.', confirmLabel: 'Remove', tone: 'danger' })
    if (! ok) return
    try {
      await deleteEditorStaffBlockedDate(staffId, id)
      setRows(prev => (prev ?? []).filter(r => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove')
    }
  }

  function rangeLabel(r: StaffBlockedDate): string {
    return r.end_date && r.end_date !== r.start_date
      ? `${r.start_date} → ${r.end_date}`
      : r.start_date
  }

  return (
    <div>
      <p className="text-eyebrow font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1.5 mb-2">
        <Calendar size={11} /> Blocked dates
      </p>

      {/* Add row */}
      <form onSubmit={handleAdd} className="flex items-end gap-2 flex-wrap mb-2">
        <div>
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">From</label>
          <input
            type="date" required
            value={start}
            onChange={e => setStart(e.target.value)}
            className="border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <div>
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">To (optional)</label>
          <input
            type="date"
            value={end}
            min={start || undefined}
            onChange={e => setEnd(e.target.value)}
            className="border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-eyebrow font-bold tracking-[0.10em] uppercase text-muted-text mb-0.5">Reason</label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            maxLength={200}
            placeholder="Vacation, sick, personal…"
            className="w-full border border-hairline-strong bg-white px-2 py-1.5 text-2xs text-near-black focus:outline-none focus:border-near-black"
          />
        </div>
        <button
          type="submit"
          disabled={!start || adding}
          className="inline-flex items-center gap-1.5 text-eyebrow font-bold tracking-[0.08em] uppercase bg-near-black text-white px-2.5 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {adding ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Block
        </button>
      </form>

      {error && (
        <p className="text-2xs text-danger flex items-center gap-1.5 mb-2">
          <AlertCircle size={11} /> {error}
        </p>
      )}

      {loading && <p className="text-2xs text-muted-text">Loading…</p>}

      {rows && rows.length === 0 && !loading && (
        <p className="text-2xs text-muted-text italic">No blocked dates yet.</p>
      )}

      {rows && rows.length > 0 && (
        <div className="bg-white border border-hairline-soft divide-y divide-[rgba(18,18,18,0.06)]">
          {rows.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="text-2xs font-semibold text-near-black">{rangeLabel(r)}</p>
                {r.reason && (
                  <p className="text-eyebrow text-muted-text truncate">{r.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                className="w-7 h-7 inline-flex items-center justify-center border border-hairline-soft bg-white text-near-black hover:border-danger hover:text-danger flex-shrink-0"
                title="Remove"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
