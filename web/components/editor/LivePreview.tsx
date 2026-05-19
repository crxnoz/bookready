'use client'

import { useRef, useEffect, useState } from 'react'
import { useEditor } from '@/lib/editorContext'
import FadeRoomTemplate from '@/components/public-site/FadeRoomTemplate'
import { Monitor, Smartphone } from 'lucide-react'

type DeviceMode = 'desktop' | 'mobile'

export default function LivePreview() {
  const { data } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.55)
  const [mode, setMode] = useState<DeviceMode>('desktop')

  const PREVIEW_WIDTH = mode === 'desktop' ? 1280 : 390

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return
      const available = containerRef.current.clientWidth - 40
      setScale(Math.min(available / PREVIEW_WIDTH, 0.95))
    }
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [PREVIEW_WIDTH])

  return (
    <div className="flex flex-col h-full bg-[#E8E6E0]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-[rgba(18,18,18,0.10)] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#E8C7DA]" />
          <div className="w-3 h-3 rounded-full bg-[#E8E4FF]" />
          <div className="w-3 h-3 rounded-full bg-[rgba(18,18,18,0.08)]" />
        </div>
        <p className="text-[11px] text-muted-text font-medium tracking-wide">
          {data.subdomain}.bookready.app
        </p>
        <div className="flex items-center gap-1">
          {(['desktop', 'mobile'] as DeviceMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`p-1.5 rounded transition-colors ${
                mode === m
                  ? 'bg-cream text-near-black'
                  : 'text-muted-text hover:text-near-black'
              }`}
            >
              {m === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Preview canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto preview-scroll flex justify-center py-5 px-5"
      >
        <div
          style={{
            width: PREVIEW_WIDTH,
            transformOrigin: 'top center',
            transform: `scale(${scale})`,
            // keeps natural document height visible through the scroll area
            marginBottom: `-${PREVIEW_WIDTH * (1 - scale)}px`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            flexShrink: 0,
          }}
        >
          <FadeRoomTemplate data={data} isPreview />
        </div>
      </div>
    </div>
  )
}
