'use client'

import { useEffect, useState } from 'react'
import { BusinessPolicy } from '@/lib/types'
import { getEditorPolicies, updateEditorPolicies } from '@/lib/api'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const FIELDS: { key: keyof Omit<BusinessPolicy, 'id'>; label: string; placeholder: string }[] = [
  {
    key: 'cancellation_policy',
    label: 'Cancellation Policy',
    placeholder: 'e.g. Cancellations made less than 24 hours before the appointment will be charged 50% of the service fee.',
  },
  {
    key: 'late_policy',
    label: 'Late Arrival Policy',
    placeholder: 'e.g. Clients arriving more than 15 minutes late may need to be rescheduled.',
  },
  {
    key: 'no_show_policy',
    label: 'No-Show Policy',
    placeholder: 'e.g. No-shows will be charged 100% of the service fee and may be required to prepay for future appointments.',
  },
  {
    key: 'deposit_policy',
    label: 'Deposit Policy',
    placeholder: 'e.g. A 25% non-refundable deposit is required to secure your booking.',
  },
  {
    key: 'reschedule_policy',
    label: 'Reschedule Policy',
    placeholder: 'e.g. Appointments can be rescheduled up to 24 hours in advance at no charge.',
  },
  {
    key: 'extra_notes',
    label: 'Additional Notes',
    placeholder: 'Any other information clients should know before booking...',
  },
]

const EMPTY: Omit<BusinessPolicy, 'id'> = {
  cancellation_policy: null,
  late_policy: null,
  no_show_policy: null,
  deposit_policy: null,
  reschedule_policy: null,
  extra_notes: null,
}

export default function PoliciesEditor() {
  const [form, setForm] = useState<Omit<BusinessPolicy, 'id'>>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getEditorPolicies()
      .then(data => {
        setForm({
          cancellation_policy: data.cancellation_policy,
          late_policy: data.late_policy,
          no_show_policy: data.no_show_policy,
          deposit_policy: data.deposit_policy,
          reschedule_policy: data.reschedule_policy,
          extra_notes: data.extra_notes,
        })
      })
      .catch(() => setError('Failed to load policies.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaveState('saving')
    setError(null)
    try {
      const updated = await updateEditorPolicies(form)
      setForm({
        cancellation_policy: updated.cancellation_policy,
        late_policy: updated.late_policy,
        no_show_policy: updated.no_show_policy,
        deposit_policy: updated.deposit_policy,
        reschedule_policy: updated.reschedule_policy,
        extra_notes: updated.extra_notes,
      })
      setSaveState('saved')
      setTimeout(() => setSaveState('idle'), 2500)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save.')
      setSaveState('error')
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-text">Loading policies…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Policies</h2>
        <p className="text-xs text-muted-text">
          These policies will appear on your public booking site. Leave a field blank to hide it.
        </p>
      </div>

      <div className="space-y-5">
        {FIELDS.map(({ key, label, placeholder }) => (
          <Textarea
            key={key}
            label={label}
            value={form[key] ?? ''}
            placeholder={placeholder}
            rows={3}
            onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value || null }))}
          />
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saveState === 'saving'}
        >
          {saveState === 'saving' ? 'Saving…' : 'Save Policies'}
        </Button>
        {saveState === 'saved' && (
          <span className="text-xs text-green-600 font-medium">Saved</span>
        )}
      </div>
    </div>
  )
}
