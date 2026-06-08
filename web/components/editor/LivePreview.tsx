'use client'

import { useRef, useEffect, useState } from 'react'
import { useEditor } from '@/lib/editorContext'
import FadeRoomTemplate from '@/components/public-site/FadeRoomTemplate'
import { Monitor, Smartphone } from 'lucide-react'

type DeviceMode = 'mobile' | 'desktop'

export default function LivePreview() {
  const { data } = useEditor()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.55)
  const [mode, setMode] = useState<DeviceMode>('mobile')

  const PREVIEW_WIDTH = mode === 'desktop' ? 1280 : 390

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return
      const available = containerRef.current.clientWidth - 48
      setScale(Math.min(available / PREVIEW_WIDTH, mode === 'mobile' ? 0.92 : 0.95))
    }
    updateScale()
    const ro = new ResizeObserver(updateScale)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [PREVIEW_WIDTH, mode])

  const slug = data.subdomain ?? data.slug ?? ''

  return (
    <div className="flex flex-col h-full bg-[#ECEAE4] w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-hairline-soft flex-shrink-0">
        {/* Browser chrome dots */}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5  bg-[rgba(18,18,18,0.12)]" />
          <div className="w-2.5 h-2.5  bg-[rgba(18,18,18,0.12)]" />
          <div className="w-2.5 h-2.5  bg-[rgba(18,18,18,0.12)]" />
        </div>

        {/* URL display */}
        <p className="text-2xs text-muted-text font-medium tracking-wide truncate max-w-[180px]">
          {slug ? `${slug}.bkrdy.me` : 'your-site.bkrdy.me'}
        </p>

        {/* Device toggle */}
        <div className="flex items-center gap-0.5">
          {(['mobile', 'desktop'] as DeviceMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={m === 'mobile' ? 'Mobile preview' : 'Desktop preview'}
              className={`p-1.5 transition-colors ${
                mode === m
                  ? 'bg-cream text-near-black'
                  : 'text-muted-text hover:text-near-black'
              }`}
            >
              {m === 'mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Preview canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto preview-scroll flex justify-center py-6 px-5"
      >
        {mode === 'mobile' ? (
          // Phone frame
          <div
            style={{
              flexShrink: 0,
              border: '10px solid #121212',
              borderRadius: 32,
              overflow: 'hidden',
              width: PREVIEW_WIDTH * scale + 20,
              boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
            }}
          >
            <div
              style={{
                width: PREVIEW_WIDTH,
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
                marginBottom: `${-PREVIEW_WIDTH * (1 - scale)}px`,
              }}
            >
              <FadeRoomTemplate data={data} isPreview />
            </div>
          </div>
        ) : (
          // Desktop browser frame
          <div
            style={{
              flexShrink: 0,
              width: PREVIEW_WIDTH * scale,
              transformOrigin: 'top center',
              boxShadow: '0 8px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div
              style={{
                width: PREVIEW_WIDTH,
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
                marginBottom: `${-PREVIEW_WIDTH * (1 - scale)}px`,
              }}
            >
              <FadeRoomTemplate data={data} isPreview />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
