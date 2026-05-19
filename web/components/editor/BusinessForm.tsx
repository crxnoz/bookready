'use client'

import { useState } from 'react'
import { useEditor } from '@/lib/editorContext'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { saveBusiness } from '@/lib/api'

export default function BusinessForm() {
  const { data, updateBusiness, setIsSaving } = useEditor()
  const [saved, setSaved] = useState(false)
  const b = data.business

  async function handleSave() {
    setIsSaving(true)
    try {
      await saveBusiness('mock-token', b)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Business</h2>
        <p className="text-xs text-muted-text">This info appears throughout your public site.</p>
      </div>

      <div className="space-y-4">
        <Input
          label="Business Name"
          value={b.name}
          onChange={e => updateBusiness({ name: e.target.value })}
        />
        <Input
          label="Tagline"
          value={b.tagline}
          placeholder="One-liner that captures your brand"
          onChange={e => updateBusiness({ tagline: e.target.value })}
        />
        <Textarea
          label="Description"
          value={b.description}
          rows={3}
          onChange={e => updateBusiness({ description: e.target.value })}
        />
      </div>

      <hr className="border-[rgba(18,18,18,0.08)]" />

      <div className="space-y-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">Contact</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Phone"
            type="tel"
            value={b.phone}
            onChange={e => updateBusiness({ phone: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={b.email}
            onChange={e => updateBusiness({ email: e.target.value })}
          />
        </div>
        <Input
          label="Street Address"
          value={b.address}
          onChange={e => updateBusiness({ address: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <Input
              label="City"
              value={b.city}
              onChange={e => updateBusiness({ city: e.target.value })}
            />
          </div>
          <Input
            label="State"
            value={b.state}
            onChange={e => updateBusiness({ state: e.target.value })}
          />
          <Input
            label="ZIP"
            value={b.zip}
            onChange={e => updateBusiness({ zip: e.target.value })}
          />
        </div>
        <Input
          label="Instagram Handle"
          placeholder="@yourbusiness"
          value={b.instagram ?? ''}
          onChange={e => updateBusiness({ instagram: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} size="md">
          Save Changes
        </Button>
        {saved && (
          <span className="text-xs text-green-600 font-semibold">Saved ✓</span>
        )}
      </div>
    </div>
  )
}
