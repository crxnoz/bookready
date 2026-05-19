'use client'

import { useState } from 'react'
import { useEditor } from '@/lib/editorContext'
import { Service } from '@/lib/types'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Button from '@/components/ui/Button'
import { Plus, Trash2, GripVertical } from 'lucide-react'

function ServiceRow({
  service,
  onChange,
  onDelete,
}: {
  service: Service
  onChange: (updates: Partial<Service>) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-[rgba(18,18,18,0.10)] bg-white">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-cream transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <GripVertical size={14} className="text-muted-text flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-near-black truncate">
            {service.name || 'Untitled Service'}
          </p>
          <p className="text-xs text-muted-text">
            {service.duration} min · ${service.price}
          </p>
        </div>
        <span className="text-muted-text text-lg leading-none">{open ? '−' : '+'}</span>
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[rgba(18,18,18,0.08)]">
          <div className="pt-3 space-y-3">
            <Input
              label="Service Name"
              value={service.name}
              onChange={e => onChange({ name: e.target.value })}
            />
            <Textarea
              label="Description"
              value={service.description}
              onChange={e => onChange({ description: e.target.value })}
            />
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Duration (min)"
                type="number"
                value={service.duration}
                onChange={e => onChange({ duration: Number(e.target.value) })}
              />
              <Input
                label="Price ($)"
                type="number"
                value={service.price}
                onChange={e => onChange({ price: Number(e.target.value) })}
              />
              <Input
                label="Category"
                value={service.category}
                onChange={e => onChange({ category: e.target.value })}
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

export default function ServicesEditor() {
  const { data, updateServices } = useEditor()

  function addService() {
    updateServices([
      ...data.services,
      {
        id: Date.now().toString(),
        name: '',
        description: '',
        duration: 30,
        price: 0,
        category: 'Cuts',
      },
    ])
  }

  function updateOne(id: string, updates: Partial<Service>) {
    updateServices(data.services.map(s => (s.id === id ? { ...s, ...updates } : s)))
  }

  function deleteOne(id: string) {
    updateServices(data.services.filter(s => s.id !== id))
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Services</h2>
        <p className="text-xs text-muted-text">
          {data.services.length} service{data.services.length !== 1 ? 's' : ''} listed on your site.
        </p>
      </div>

      <div className="space-y-2">
        {data.services.map(s => (
          <ServiceRow
            key={s.id}
            service={s}
            onChange={updates => updateOne(s.id, updates)}
            onDelete={() => deleteOne(s.id)}
          />
        ))}
      </div>

      <Button variant="secondary" size="sm" onClick={addService}>
        <Plus size={14} className="mr-1.5" />
        Add Service
      </Button>
    </div>
  )
}
