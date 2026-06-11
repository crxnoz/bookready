'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, AlertCircle, UserCircle } from 'lucide-react'
import EditorShell from '@/components/editor/EditorShell'
import { useRole } from '@/components/app/RoleContext'
import { getEditorStaffMember, updateEditorStaff } from '@/lib/api'
import type { ApiStaffMember } from '@/lib/types'
import ImageUploadField from '@/components/editor/ImageUploadField'
import { useToast } from '@/components/ui/Toast'

/**
 * Wave D — the staff member's own profile. They can edit bio / phone /
 * photo; name / role / email stay owner-controlled (the backend drops any
 * other field for role==='staff'). Owners never land here (the sidebar
 * routes them through /editor/staff), but the page degrades gracefully if
 * one does — it just edits whatever staff row their staff_id points at,
 * and there is none for an owner, so we show an empty state.
 */
export default function MyProfilePage() {
  return (
    <EditorShell title="My profile" subtitle="Update your bio, phone, and photo.">
      <MyProfileInner />
    </EditorShell>
  )
}

function MyProfileInner() {
  const { staffId } = useRole()
  const toast = useToast()

  const [member,  setMember]  = useState<ApiStaffMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const [bio,    setBio]    = useState('')
  const [phone,  setPhone]  = useState('')
  const [photo,  setPhoto]  = useState('')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    if (staffId == null) { setLoading(false); return }
    let cancelled = false
    getEditorStaffMember(staffId)
      .then(m => {
        if (cancelled) return
        setMember(m)
        setBio(m.bio ?? '')
        setPhone(m.phone ?? '')
        setPhoto(m.photo_url ?? '')
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your profile.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [staffId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (staffId == null) return
    setSaving(true); setSaved(false)
    try {
      const updated = await updateEditorStaff(staffId, {
        bio:       bio.trim() || null,
        phone:     phone.trim() || null,
        photo_url: photo.trim() || null,
      })
      setMember(updated)
      setSaved(true)
      toast.success('Profile saved.')
      setTimeout(() => setSaved(false), 1800)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-text">Loading your profile…</div>
    )
  }

  if (staffId == null || !member) {
    return (
      <div className="p-6">
        <div className="bg-white border border-hairline-soft px-4 py-12 text-center">
          <UserCircle size={24} className="text-muted-text mx-auto mb-3" />
          <p className="text-sm font-semibold text-near-black mb-1">No profile to show</p>
          <p className="text-xs text-muted-text">
            {error ?? 'Your profile is not available right now.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-xl">
      <form onSubmit={handleSave} className="bg-white border border-hairline p-4 space-y-4">
        {/* Owner-controlled identity — read-only here. */}
        <div className="flex items-center gap-3 pb-3 border-b border-hairline-soft">
          <div className="w-12 h-12 bg-cream border border-hairline-soft flex-shrink-0 overflow-hidden">
            {photo
              /* eslint-disable-next-line @next/next/no-img-element */
              ? <img src={photo} alt={member.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-muted-text"><UserCircle size={18} /></div>
            }
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-near-black">{member.name}</p>
            {member.role && <p className="text-xs text-muted-text">{member.role}</p>}
            {member.email && <p className="text-2xs text-muted-text truncate">{member.email}</p>}
          </div>
        </div>

        <p className="text-eyebrow text-muted-text">
          Your name, role, and email are managed by the business owner. You can
          update your bio, phone, and photo below.
        </p>

        {/* Photo */}
        <div className="w-32">
          <ImageUploadField
            label="Photo"
            value={photo || null}
            onChange={v => setPhoto(v ?? '')}
            kind="staff"
            aspectClass="aspect-square"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            maxLength={5000}
            className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black resize-none"
            placeholder="A short bio or your specialties."
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-eyebrow font-bold uppercase tracking-[0.1em] text-muted-text mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            maxLength={50}
            className="w-full border border-hairline-strong bg-white px-3 py-2 text-sm text-near-black placeholder:text-muted-text focus:outline-none focus:border-near-black"
            placeholder="555-555-5555"
          />
        </div>

        {error && (
          <p className="text-2xs text-danger flex items-center gap-1.5">
            <AlertCircle size={11} /> {error}
          </p>
        )}

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-near-black text-white hover:opacity-90 transition-colors disabled:opacity-50"
          >
            {saving
              ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
              : saved
              ? <><CheckCircle size={12} /> Saved</>
              : 'Save changes'
            }
          </button>
        </div>
      </form>
    </div>
  )
}
