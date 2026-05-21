'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { HoursEntry } from '@/lib/types'
import { getEditorHours, updateEditorHours } from '@/lib/api'

type PageStatus = 'loading' | 'idle' | 'saving' | 'saved' | 'error'

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer transition-colors duration-150 focus:outline-none ${
        on ? 'bg-near-black' : 'bg-[rgba(18,18,18,0.12)]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 bg-white shadow transform transition-transform duration-150 m-0.5 ${
          on ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function TimeInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | null
  onChange: (v: string | null) => void
  placeholder?: string
}) {
  return (
    <input
      type="time"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value || null)}
      className="text-sm bg-cream border border-[rgba(18,18,18,0.12)] px-2 py-1.5 text-near-black focus:outline-none focus:border-near-black/30 w-28"
    />
  )
}

function DayRow({
  entry,
  onChange,
}: {
  entry: HoursEntry
  onChange: (updated: HoursEntry) => void
}) {
  const [showBreak, setShowBreak] = useState(
    !!(entry.break_start || entry.break_end)
  )

  function set(field: keyof HoursEntry, value: unknown) {
    onChange({ ...entry, [field]: value })
  }

  return (
    <div className="bg-white border border-[rgba(18,18,18,0.10)]">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="w-24 text-sm font-semibold text-near-black flex-shrink-0">
          {entry.day_name}
        </span>

        <Toggle on={entry.is_open} onChange={v => set('is_open', v)} />

        {entry.is_open ? (
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <TimeInput value={entry.open_time} onChange={v => set('open_time', v)} />
            <span className="text-xs text-muted-text">to</span>
            <TimeInput value={entry.close_time} onChange={v => set('close_time', v)} />

            <button
              type="button"
              onClick={() => {
                if (showBreak) {
                  onChange({ ...entry, break_start: null, break_end: null })
                }
                setShowBreak(b => !b)
              }}
              className="ml-1 text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text hover:text-near-black transition-colors"
            >
              {showBreak ? '− Break' : '+ Break'}
            </button>
          </div>
        ) : (
          <span className="text-sm text-muted-text italic">Closed</span>
        )}
      </div>

      {/* Break row */}
      {entry.is_open && showBreak && (
        <div className="flex items-center gap-2 px-4 pb-3 pl-[7.5rem]">
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase text-muted-text w-14">
            Break
          </span>
          <TimeInput
            value={entry.break_start}
            onChange={v => set('break_start', v)}
            placeholder="Start"
          />
          <span className="text-xs text-muted-text">to</span>
          <TimeInput
            value={entry.break_end}
            onChange={v => set('break_end', v)}
            placeholder="End"
          />
        </div>
      )}
    </div>
  )
}

export default function HoursEditor() {
  const [hours, setHours]     = useState<HoursEntry[]>([])
  const [status, setStatus]   = useState<PageStatus>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    getEditorHours()
      .then(data => {
        setHours(data)
        setStatus('idle')
      })
      .catch(err => {
        setErrorMsg(err.message ?? 'Failed to load hours')
        setStatus('error')
      })
  }, [])

  function updateDay(updated: HoursEntry) {
    setHours(prev => prev.map(h => h.day_of_week === updated.day_of_week ? updated : h))
    if (status === 'saved') setStatus('idle')
  }

  async function handleSave() {
    setStatus('saving')
    setErrorMsg(null)
    try {
      const updated = await updateEditorHours(hours)
      setHours(updated)
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

  // Put Monday first for display
  const ordered = [
    ...hours.filter(h => h.day_of_week !== 0),
    ...hours.filter(h => h.day_of_week === 0),
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Hours</h2>
        <p className="text-xs text-muted-text">Set your regular weekly availability.</p>
      </div>

      {status === 'error' && errorMsg && (
        <div className="bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="space-y-1.5">
        {ordered.map(entry => (
          <DayRow key={entry.day_of_week} entry={entry} onChange={updateDay} />
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} size="md" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save Hours'}
        </Button>
        {status === 'saved' && (
          <span className="text-xs text-green-600 font-semibold">Saved ✓</span>
        )}
      </div>
    </div>
  )
}
