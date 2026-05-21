'use client'

import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { getEditorBusiness, updateEditorBusiness } from '@/lib/api'
import { BusinessProfile } from '@/lib/types'

const EMPTY: BusinessProfile = {
  business_name: '',
  tagline: '',
  business_type: '',
  public_email: '',
  public_phone: '',
  address_line: '',
  city: '',
  state: '',
  zip: '',
  instagram_url: '',
  booking_enabled: true,
  site_status: 'active',
}

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export default function BusinessForm() {
  const [form, setForm] = useState<BusinessProfile>(EMPTY)
  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    getEditorBusiness()
      .then(data => {
        setForm({ ...EMPTY, ...data })
        setStatus('idle')
      })
      .catch(err => {
        setErrorMsg(err.message ?? 'Failed to load profile')
        setStatus('error')
      })
  }, [])

  function set(field: keyof BusinessProfile, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (status === 'saved' || status === 'error') setStatus('idle')
  }

  async function handleSave() {
    setStatus('saving')
    setErrorMsg(null)
    try {
      const updated = await updateEditorBusiness(form)
      setForm({ ...EMPTY, ...updated })
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Save failed')
      setStatus('error')
    }
  }

  if (status === 'loading') {
    return (
      <div className="p-6">
        <p className="text-xs text-muted-text">Loading…</p>
      </div>
    )
  }

  return (
    <div className="p-5 space-y-6">
      {/* Heading */}
      <div>
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1">Business Info</p>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Your business profile</h2>
        <p className="text-xs text-muted-text">This info appears throughout your public booking site.</p>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Basic info */}
      <div className="space-y-4">
        <Input
          label="Business Name"
          value={form.business_name ?? ''}
          onChange={e => set('business_name', e.target.value)}
        />
        <Input
          label="Tagline"
          value={form.tagline ?? ''}
          placeholder="One-liner that captures your brand"
          onChange={e => set('tagline', e.target.value)}
        />
        <Input
          label="Business Type"
          value={form.business_type ?? ''}
          placeholder="e.g. Barbershop, Nail Studio, Tattoo Parlor"
          onChange={e => set('business_type', e.target.value)}
        />
      </div>

      <hr className="border-[rgba(18,18,18,0.08)]" />

      {/* Contact */}
      <div className="space-y-4">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text">Contact</p>

        {/* Phone + Email — 1 col on mobile, 2 col on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone"
            type="tel"
            value={form.public_phone ?? ''}
            onChange={e => set('public_phone', e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={form.public_email ?? ''}
            onChange={e => set('public_email', e.target.value)}
          />
        </div>

        <Input
          label="Street Address"
          value={form.address_line ?? ''}
          onChange={e => set('address_line', e.target.value)}
        />

        {/* City — full width on mobile, City+State+ZIP on sm+ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Input
              label="City"
              value={form.city ?? ''}
              onChange={e => set('city', e.target.value)}
            />
          </div>
          <Input
            label="State"
            value={form.state ?? ''}
            onChange={e => set('state', e.target.value)}
          />
          <Input
            label="ZIP"
            value={form.zip ?? ''}
            onChange={e => set('zip', e.target.value)}
          />
        </div>

        <Input
          label="Instagram URL"
          placeholder="https://instagram.com/yourbusiness"
          value={form.instagram_url ?? ''}
          onChange={e => set('instagram_url', e.target.value)}
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-1 pb-2">
        <Button onClick={handleSave} size="md" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save Changes'}
        </Button>
        {status === 'saved' && (
          <span className="text-xs text-green-600 font-semibold">Saved ✓</span>
        )}
      </div>
    </div>
  )
}
