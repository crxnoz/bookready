'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import AppSidebar from './AppSidebar'
import EmailVerifyBanner from './EmailVerifyBanner'

interface AppShellProps {
  children: React.ReactNode
  slug:     string
}

export default function AppShell({ children, slug }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const path = usePathname()

  // Close the drawer whenever the route changes — covers nav-link taps.
  useEffect(() => { setDrawerOpen(false) }, [path])

  // Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Prevent body scroll while drawer is open (mobile only).
  useEffect(() => {
    if (drawerOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [drawerOpen])

  return (
    <div className="flex flex-col md:flex-row bg-cream" style={{ minHeight: '100dvh' }}>
      <AppSidebar slug={slug} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col md:h-screen md:overflow-hidden">
        {/* Phase S6 part 2 — verify-email nag (renders nothing for
            already-verified accounts and during the /auth/me roundtrip) */}
        <EmailVerifyBanner />

        {/* Mobile-only hamburger row — desktop uses the sidebar instead */}
        <div className="md:hidden flex items-center gap-2 border-b border-[rgba(18,18,18,0.10)] bg-white px-3 py-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            className="w-9 h-9 flex items-center justify-center text-near-black border border-[rgba(18,18,18,0.10)] hover:border-near-black"
          >
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 bg-near-black flex items-center justify-center flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="" className="w-3 h-3 invert" />
            </div>
            <p className="text-[12px] font-bold text-near-black tracking-tight truncate">BookReady</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
