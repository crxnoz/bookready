'use client'

import { useState } from 'react'
import { useEditor } from '@/lib/editorContext'
import { StaffMember } from '@/lib/types'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { Plus, Trash2 } from 'lucide-react'

function MemberRow({
  member,
  onChange,
  onDelete,
}: {
  member: StaffMember
  onChange: (updates: Partial<StaffMember>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[rgba(18,18,18,0.10)] bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cream transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div
          className="w-8 h-8 rounded-full bg-blush flex items-center justify-center text-xs font-bold text-near-black flex-shrink-0"
        >
          {member.name
            ? member.name.split(' ').map(n => n[0]).join('').slice(0, 2)
            : '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-near-black truncate">
            {member.name || 'New Team Member'}
          </p>
          <p className="text-xs text-muted-text truncate">{member.title}</p>
        </div>
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[rgba(18,18,18,0.08)]">
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Full Name"
                value={member.name}
                onChange={e => onChange({ name: e.target.value })}
              />
              <Input
                label="Title / Role"
                value={member.title}
                placeholder="e.g. Senior Barber"
                onChange={e => onChange({ title: e.target.value })}
              />
            </div>
            <Textarea
              label="Bio"
              value={member.bio}
              rows={2}
              onChange={e => onChange({ bio: e.target.value })}
            />
            <div>
              <label className="text-xs font-semibold text-near-black tracking-wide uppercase block mb-1.5">
                Specialties
              </label>
              <input
                className="w-full bg-white border border-[rgba(18,18,18,0.15)] px-4 py-2.5 text-sm text-near-black placeholder:text-[#b0a99f] focus:outline-none focus:ring-2 focus:ring-near-black/10"
                placeholder="Fades, Beard Sculpting, Designs (comma separated)"
                value={member.specialties.join(', ')}
                onChange={e =>
                  onChange({
                    specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                  })
                }
              />
            </div>
          </div>
          <button
            onClick={onDelete}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
          >
            <Trash2 size={12} /> Remove
          </button>
        </div>
      )}
    </div>
  )
}

export default function StaffEditor() {
  const { data, updateStaff } = useEditor()

  function addMember() {
    updateStaff([
      ...data.staff,
      { id: Date.now().toString(), name: '', title: '', bio: '', specialties: [] },
    ])
  }

  function updateOne(id: string, updates: Partial<StaffMember>) {
    updateStaff(data.staff.map(m => (m.id === id ? { ...m, ...updates } : m)))
  }

  function deleteOne(id: string) {
    updateStaff(data.staff.filter(m => m.id !== id))
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Team</h2>
        <p className="text-xs text-muted-text">
          {data.staff.length} team member{data.staff.length !== 1 ? 's' : ''} on your site.
        </p>
      </div>

      <div className="space-y-2">
        {data.staff.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            onChange={updates => updateOne(m.id, updates)}
            onDelete={() => deleteOne(m.id)}
          />
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addMember}>
        <Plus size={14} className="mr-1.5" />
        Add Team Member
      </Button>
    </div>
  )
}
