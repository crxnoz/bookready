'use client'

import { useEffect, useState } from 'react'
import { EditorProvider, useEditor } from '@/lib/editorContext'
import EditorSidebar from './EditorSidebar'
import LivePreview from './LivePreview'
import FadeRoomTemplate from '@/components/public-site/FadeRoomTemplate'
import { getTenantId } from '@/lib/auth'
import { ExternalLink, Copy, ChevronDown, ChevronUp, Smartphone, Monitor } from 'lucide-react'

// ── Mobile preview panel (shown below form on < xl) ──────────────────────────

type DeviceMode = 'mobile' | 'desktop'

function MobilePreviewPanel() {
  const { data } = useEditor()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<DeviceMode>('mobile')

  const MOBILE_W = 390
  const DESKTOP_W = 1280
  // Both previews fit inside a 340px wide area (phone screen minus padding)
  const mobileScale = 320 / MOBILE_W
  const desktopScale = 320 / DESKTOP_W

  return (
    <div className="xl:hidden border-t border-[rgba(18,18,18,0.10)] bg-cream flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text hover:text-near-black transition-colors"
      >
        <span>Preview Site</span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="px-4 pb-5">
          {/* Mode toggle */}
          <div className="flex gap-1.5 mb-4">
            {(['mobile', 'desktop'] as DeviceMode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] uppercase border transition-colors ${
                  mode === m
                    ? 'bg-near-black text-white border-near-black'
                    : 'bg-white text-muted-text border-[rgba(18,18,18,0.12)] hover:text-near-black'
                }`}
              >
                {m === 'mobile' ? <Smartphone size={11} /> : <Monitor size={11} />}
                {m === 'mobile' ? 'Mobile' : 'Desktop'}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="overflow-x-auto">
            {mode === 'mobile' ? (
              // Phone frame
              <div
                style={{
                  display: 'inline-block',
                  border: '8px solid #121212',
                  borderRadius: 24,
                  overflow: 'hidden',
                  width: MOBILE_W * mobileScale + 16,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: MOBILE_W,
                    transformOrigin: 'top left',
                    transform: `scale(${mobileScale})`,
                    marginBottom: `${-MOBILE_W * (1 - mobileScale)}px`,
                  }}
                >
                  <FadeRoomTemplate data={data} isPreview />
                </div>
              </div>
            ) : (
              // Desktop (browser frame, scrollable)
              <div
                style={{
                  display: 'inline-block',
                  border: '1px solid rgba(18,18,18,0.12)',
                  overflow: 'hidden',
                  width: DESKTOP_W * desktopScale,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: DESKTOP_W,
                    transformOrigin: 'top left',
                    transform: `scale(${desktopScale})`,
                    marginBottom: `${-DESKTOP_W * (1 - desktopScale)}px`,
                  }}
                >
                  <FadeRoomTemplate data={data} isPreview />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export default function EditorShell({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState('')

  useEffect(() => {
    const id = getTenantId()
    if (id) setSlug(id)
  }, [])

  function handleCopy() {
    navigator.clipboard?.writeText(`http://${slug}.bkrdy.me`).catch(() => {})
  }

  return (
    <EditorProvider>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(18,18,18,0.10)] bg-white px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text hidden sm:block">
            Website
          </p>
          <span className="text-[rgba(18,18,18,0.25)] hidden sm:block">/</span>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-near-black">
            Editor
          </p>
        </div>

        {slug && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href={`http://${slug}.bkrdy.me`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-text hover:text-near-black font-medium transition-colors"
            >
              <ExternalLink size={11} />
              {slug}.bkrdy.me
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 border border-[rgba(18,18,18,0.12)] px-2.5 py-1.5 text-[10px] font-bold tracking-[0.10em] uppercase text-near-black hover:bg-cream transition-colors"
            >
              <Copy size={11} />
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Main — stacked on mobile, 3-col on xl */}
      <div className="flex flex-col xl:flex-row flex-1 min-h-0">

        {/* Section nav — horizontal strip on mobile, vertical sidebar on xl */}
        <EditorSidebar slug={slug} />

        {/* Form column — full-width on mobile, 420px fixed on xl */}
        <div className="flex-1 xl:flex-none xl:w-[420px] flex flex-col overflow-hidden bg-white xl:border-r xl:border-[rgba(18,18,18,0.10)]">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
          {/* Mobile-only collapsible preview */}
          <MobilePreviewPanel />
        </div>

        {/* Live preview — xl only */}
        <div className="hidden xl:flex flex-1 min-w-0 overflow-hidden">
          <LivePreview />
        </div>
      </div>
    </EditorProvider>
  )
}
