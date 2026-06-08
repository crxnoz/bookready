'use client'

import { useEffect, useMemo, useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { getEditorBusiness, updateEditorBusiness } from '@/lib/api'
import { BusinessProfile } from '@/lib/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

export default function BusinessForm({ onAfterSave }: { onAfterSave?: () => void } = {}) {
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

  // Track which fields the user has interacted with — so we don't shout
  // "required" before they've even touched the form.
  const [touched, setTouched] = useState<{ business_name?: boolean; public_email?: boolean }>({})

  function set(field: keyof BusinessProfile, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (status === 'saved' || status === 'error') setStatus('idle')
  }

  // Required-field validation. Business name + public email are mandatory
  // because they're used in client confirmation emails and on the public
  // booking site — leaving them blank produces broken-looking output.
  const validation = useMemo(() => {
    const nameTrim  = (form.business_name ?? '').trim()
    const emailTrim = (form.public_email ?? '').trim()
    return {
      business_name: nameTrim.length === 0 ? 'Business name is required.' : null,
      public_email:  emailTrim.length === 0
                       ? 'A public email is required.'
                       : (! EMAIL_RE.test(emailTrim) ? 'Enter a valid email address.' : null),
    }
  }, [form.business_name, form.public_email])

  const hasErrors = !! (validation.business_name || validation.public_email)

  async function handleSave() {
    // Belt-and-suspenders: button is disabled too, but if a keyboard user
    // gets here we still want to surface the errors instead of POSTing.
    if (hasErrors) {
      setTouched({ business_name: true, public_email: true })
      return
    }
    setStatus('saving')
    setErrorMsg(null)
    try {
      const updated = await updateEditorBusiness(form)
      setForm({ ...EMPTY, ...updated })
      setStatus('saved')
      onAfterSave?.()
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
        <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text mb-1">Business Info</p>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Your business profile</h2>
        <p className="text-xs text-muted-text">This info appears throughout your public booking site.</p>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-danger-bg border border-danger px-4 py-3 text-xs text-danger">
          {errorMsg}
        </div>
      )}

      {/* Basic info */}
      <div className="space-y-4">
        <div>
          <Input
            label="Business Name *"
            value={form.business_name ?? ''}
            onChange={e => set('business_name', e.target.value)}
            onBlur={() => setTouched(t => ({ ...t, business_name: true }))}
          />
          {touched.business_name && validation.business_name && (
            <p className="text-2xs text-danger mt-1">{validation.business_name}</p>
          )}
        </div>
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

      <hr className="border-hairline-soft" />

      {/* Contact */}
      <div className="space-y-4">
        <p className="text-eyebrow font-bold tracking-[0.18em] uppercase text-muted-text">Contact</p>

        {/* Phone + Email — 1 col on mobile, 2 col on sm+ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Phone"
            type="tel"
            value={form.public_phone ?? ''}
            onChange={e => set('public_phone', e.target.value)}
          />
          <div>
            <Input
              label="Email *"
              type="email"
              value={form.public_email ?? ''}
              onChange={e => set('public_email', e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, public_email: true }))}
            />
            {touched.public_email && validation.public_email && (
              <p className="text-2xs text-danger mt-1">{validation.public_email}</p>
            )}
          </div>
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
        <Button
          onClick={handleSave}
          size="md"
          disabled={status === 'saving' || hasErrors}
        >
          {status === 'saving' ? 'Saving…' : 'Save Changes'}
        </Button>
        {status === 'saved' && (
          <span className="text-xs text-success font-semibold">Saved ✓</span>
        )}
        {hasErrors && (
          <span className="text-xs text-muted-text">Fix required fields to save.</span>
        )}
      </div>
    </div>
  )
}
