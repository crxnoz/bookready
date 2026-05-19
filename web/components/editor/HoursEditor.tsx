'use client'

import { useEditor } from '@/lib/editorContext'
import { HoursEntry } from '@/lib/types'

export default function HoursEditor() {
  const { data, updateHours } = useEditor()

  function updateDay(day: string, updates: Partial<HoursEntry>) {
    updateHours(data.hours.map(h => (h.day === day ? { ...h, ...updates } : h)))
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-bold text-near-black tracking-tight mb-0.5">Hours</h2>
        <p className="text-xs text-muted-text">Set your regular weekly hours.</p>
      </div>

      <div className="space-y-2">
        {data.hours.map(h => (
          <div
            key={h.day}
            className="flex items-center gap-3 px-4 py-3 bg-white border border-[rgba(18,18,18,0.10)]"
          >
            {/* Day label */}
            <span className="w-24 text-sm font-semibold text-near-black flex-shrink-0">
              {h.day}
            </span>

            {/* Closed toggle */}
            <button
              onClick={() => updateDay(h.day, { closed: !h.closed })}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer transition-colors duration-200 focus:outline-none ${
                h.closed ? 'bg-[rgba(18,18,18,0.12)]' : 'bg-near-black'
              }`}
              style={{ borderRadius: 0 }}
              role="switch"
              aria-checked={!h.closed}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 bg-white shadow transform transition-transform duration-200 m-0.5 ${
                  h.closed ? 'translate-x-0' : 'translate-x-4'
                }`}
              />
            </button>

            {h.closed ? (
              <span className="text-sm text-muted-text italic">Closed</span>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={h.open}
                  onChange={e => updateDay(h.day, { open: e.target.value })}
                  className="flex-1 text-sm bg-cream border border-[rgba(18,18,18,0.12)] px-2 py-1.5 text-near-black focus:outline-none focus:border-near-black/30"
                />
                <span className="text-muted-text text-xs">to</span>
                <input
                  type="time"
                  value={h.close}
                  onChange={e => updateDay(h.day, { close: e.target.value })}
                  className="flex-1 text-sm bg-cream border border-[rgba(18,18,18,0.12)] px-2 py-1.5 text-near-black focus:outline-none focus:border-near-black/30"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
