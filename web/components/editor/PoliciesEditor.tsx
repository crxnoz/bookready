'use client'

import { useState } from 'react'
import { useEditor } from '@/lib/editorContext'
import { Policy, FAQ } from '@/lib/types'
import Textarea from '@/components/ui/Textarea'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { Plus, Trash2 } from 'lucide-react'

function PolicyRow({
  policy,
  onChange,
  onDelete,
}: {
  policy: Policy
  onChange: (updates: Partial<Policy>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[rgba(18,18,18,0.10)] bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cream transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-near-black truncate">
            {policy.title || 'Untitled Policy'}
          </p>
        </div>
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[rgba(18,18,18,0.08)]">
          <div className="pt-3 space-y-3">
            <Input
              label="Policy Title"
              value={policy.title}
              placeholder="e.g. Cancellation Policy"
              onChange={e => onChange({ title: e.target.value })}
            />
            <Textarea
              label="Policy Body"
              value={policy.body}
              rows={4}
              placeholder="Describe this policy in plain language..."
              onChange={e => onChange({ body: e.target.value })}
            />
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

function FaqRow({
  faq,
  onChange,
  onDelete,
}: {
  faq: FAQ
  onChange: (updates: Partial<FAQ>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[rgba(18,18,18,0.10)] bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cream transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-near-black truncate">
            {faq.question || 'Untitled Question'}
          </p>
        </div>
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[rgba(18,18,18,0.08)]">
          <div className="pt-3 space-y-3">
            <Input
              label="Question"
              value={faq.question}
              placeholder="e.g. Do you accept walk-ins?"
              onChange={e => onChange({ question: e.target.value })}
            />
            <Textarea
              label="Answer"
              value={faq.answer}
              rows={3}
              onChange={e => onChange({ answer: e.target.value })}
            />
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

export default function PoliciesEditor() {
  const { data, updatePolicies, updateFaqs } = useEditor()

  function addPolicy() {
    updatePolicies([
      ...data.policies,
      { id: Date.now().toString(), title: '', body: '' },
    ])
  }

  function updatePolicy(id: string, updates: Partial<Policy>) {
    updatePolicies(data.policies.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  function deletePolicy(id: string) {
    updatePolicies(data.policies.filter(p => p.id !== id))
  }

  function addFaq() {
    updateFaqs([
      ...data.faqs,
      { id: Date.now().toString(), question: '', answer: '' },
    ])
  }

  function updateFaq(id: string, updates: Partial<FAQ>) {
    updateFaqs(data.faqs.map(f => (f.id === id ? { ...f, ...updates } : f)))
  }

  function deleteFaq(id: string) {
    updateFaqs(data.faqs.filter(f => f.id !== id))
  }

  return (
    <div className="p-6 space-y-8">
      {/* Policies */}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Policies</h2>
          <p className="text-xs text-muted-text">
            {data.policies.length} polic{data.policies.length !== 1 ? 'ies' : 'y'} on your site.
          </p>
        </div>

        <div className="space-y-2">
          {data.policies.map(p => (
            <PolicyRow
              key={p.id}
              policy={p}
              onChange={updates => updatePolicy(p.id, updates)}
              onDelete={() => deletePolicy(p.id)}
            />
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={addPolicy}>
          <Plus size={14} className="mr-1.5" />
          Add Policy
        </Button>
      </div>

      <hr className="border-[rgba(18,18,18,0.08)]" />

      {/* FAQs */}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">FAQs</h2>
          <p className="text-xs text-muted-text">
            {data.faqs.length} question{data.faqs.length !== 1 ? 's' : ''} on your site.
          </p>
        </div>

        <div className="space-y-2">
          {data.faqs.map(f => (
            <FaqRow
              key={f.id}
              faq={f}
              onChange={updates => updateFaq(f.id, updates)}
              onDelete={() => deleteFaq(f.id)}
            />
          ))}
        </div>

        <Button variant="secondary" size="sm" onClick={addFaq}>
          <Plus size={14} className="mr-1.5" />
          Add FAQ
        </Button>
      </div>
    </div>
  )
}
