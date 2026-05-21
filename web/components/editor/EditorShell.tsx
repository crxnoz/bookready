'use client'

import { useEffect, useState } from 'react'
import { EditorProvider } from '@/lib/editorContext'
import EditorSidebar from './EditorSidebar'
import LivePreview from './LivePreview'
import { getTenantId } from '@/lib/auth'

interface Props {
  children: React.ReactNode
}

export default function EditorShell({ children }: Props) {
  const [slug, setSlug] = useState('')

  useEffect(() => {
    const id = getTenantId()
    if (id) setSlug(id)
  }, [])

  return (
    <EditorProvider>
      {/* Topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-[rgba(18,18,18,0.10)] bg-white px-5 py-3.5 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text hidden sm:block">
            Website
          </p>
          <span className="text-[rgba(18,18,18,0.25)] hidden sm:block">/</span>
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-near-black">Editor</p>
        </div>
        {slug && (
          <div className="flex items-center gap-2 border border-[rgba(18,18,18,0.10)] px-2.5 py-1.5 text-[11px] font-medium text-near-black bg-white flex-shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-near-black" />
            {slug}.bkrdy.me
          </div>
        )}
      </div>

      {/* 3-column editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Section nav */}
        <EditorSidebar slug={slug} />

        {/* Form panel */}
        <div className="flex-1 md:flex-none md:w-[420px] flex-shrink-0 flex flex-col h-full border-r border-[rgba(18,18,18,0.10)] overflow-hidden bg-white">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </div>

        {/* Live preview — desktop only */}
        <div className="hidden xl:flex flex-1 min-w-0 h-full overflow-hidden">
          <LivePreview />
        </div>
      </div>
    </EditorProvider>
  )
}
