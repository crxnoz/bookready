'use client'

/**
 * #131 — Help Center shell.
 *
 * Top bar + sticky sidebar TOC (driven by HELP_ARTICLES) + content area
 * with scoped `.help-prose` styles. Mirrors LegalShell's editorial look
 * (cream, near-black, thin borders) so the docs feel native to BookReady.
 *
 * Public — no auth. Prospects can read it before signing up, and owners
 * reach it from the editor. "Back to dashboard" deep-links into /editor
 * (a no-op for logged-out readers, who'll just hit the login gate).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, LifeBuoy, Menu, X } from 'lucide-react'
import { HELP_ARTICLES } from '@/lib/helpNav'
import { cn } from '@/lib/cn'

export default function HelpShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-screen bg-cream text-near-black">
      {/* Top bar */}
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-cream sticky top-0 z-30">
        <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link href="/help" className="flex items-center gap-2.5 group min-w-0">
            <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
              <LifeBuoy size={15} className="text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-bold tracking-tight group-hover:opacity-75 transition-opacity truncate">
              BookReady Help
            </span>
          </Link>
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href="mailto:hello@mybookready.com"
              className="hidden sm:inline text-[11px] font-bold tracking-[0.12em] uppercase text-muted-text hover:text-near-black transition-colors"
            >
              Contact us
            </a>
            <Link
              href="/editor"
              className="text-[11px] font-bold tracking-[0.12em] uppercase text-near-black border border-[rgba(18,18,18,0.15)] px-3 py-1.5 hover:border-near-black transition-colors"
            >
              Dashboard
            </Link>
            {/* Mobile TOC toggle */}
            <button
              type="button"
              onClick={() => setNavOpen(o => !o)}
              className="md:hidden w-8 h-8 inline-flex items-center justify-center border border-[rgba(18,18,18,0.15)]"
              aria-label="Toggle help navigation"
            >
              {navOpen ? <X size={15} /> : <Menu size={15} />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 py-8 md:py-10 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-8 md:gap-10">
        {/* Sidebar TOC */}
        <aside className={cn(
          'md:block',
          navOpen ? 'block' : 'hidden',
        )}>
          <nav className="md:sticky md:top-[72px] space-y-0.5">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2.5 px-2">
              Help topics
            </p>
            {HELP_ARTICLES.map(a => {
              const href = `/help/${a.slug}`
              const active = pathname === href
              const Icon = a.icon
              return (
                <Link
                  key={a.slug}
                  href={href}
                  onClick={() => setNavOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-2 text-[13px] transition-colors',
                    active
                      ? 'bg-white border border-[rgba(18,18,18,0.12)] font-semibold text-near-black'
                      : 'text-muted-text hover:text-near-black border border-transparent',
                  )}
                >
                  <Icon size={14} strokeWidth={1.8} className="flex-shrink-0" />
                  <span className="truncate">{a.title}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          {children}

          {/* Footer */}
          <footer className="mt-14 pt-6 border-t border-[rgba(18,18,18,0.10)] text-xs text-muted-text flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span>Still stuck? Email{' '}
              <a href="mailto:hello@mybookready.com" className="text-near-black underline underline-offset-2 hover:opacity-75">
                hello@mybookready.com
              </a>{' '}— we usually reply within a day.
            </span>
            <div className="flex flex-wrap gap-4">
              <Link href="/help" className="hover:text-near-black">All topics</Link>
              <Link href="/terms" className="hover:text-near-black">Terms</Link>
              <Link href="/privacy" className="hover:text-near-black">Privacy</Link>
            </div>
          </footer>
        </main>
      </div>

      <style>{`
        .help-prose h2 {
          font-size: 19px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 36px 0 12px;
          color: #121212;
        }
        .help-prose h3 {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 26px 0 8px;
          color: #121212;
        }
        .help-prose p {
          font-size: 15px;
          line-height: 1.7;
          color: #2a2a2a;
          margin: 0 0 14px;
        }
        .help-prose ul, .help-prose ol {
          margin: 0 0 16px 20px;
          padding: 0;
        }
        .help-prose li {
          font-size: 15px;
          line-height: 1.7;
          color: #2a2a2a;
          margin-bottom: 7px;
        }
        .help-prose a {
          color: #121212;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .help-prose a:hover { opacity: 0.7; }
        .help-prose strong { color: #121212; font-weight: 600; }
        .help-prose code {
          background: rgba(18,18,18,0.06);
          padding: 1px 6px;
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        /* Callout box: <div class="help-note"> */
        .help-prose .help-note {
          background: #fff;
          border: 1px solid rgba(18,18,18,0.12);
          border-left: 3px solid #121212;
          padding: 12px 16px;
          margin: 0 0 18px;
        }
        .help-prose .help-note p { margin: 0; font-size: 13.5px; }
        .help-prose .help-note strong { display: block; margin-bottom: 3px; }
      `}</style>
    </div>
  )
}
