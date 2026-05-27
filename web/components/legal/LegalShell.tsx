import Link from 'next/link'

interface LegalShellProps {
  eyebrow: string
  title: string
  effectiveDate: string
  children: React.ReactNode
}

/**
 * Plain-text legal page shell — Privacy Policy / Terms of Service.
 * Centered narrow column on cream, editorial typography, minimal chrome.
 * Self-contained: no auth, no nav. Footer cross-links the sibling page.
 */
export default function LegalShell({ eyebrow, title, effectiveDate, children }: LegalShellProps) {
  return (
    <div className="min-h-screen bg-cream text-near-black">
      {/* Top bar */}
      <header className="border-b border-[rgba(18,18,18,0.10)] bg-cream">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 py-5 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-near-black flex items-center justify-center flex-shrink-0">
              <img src="/logo.svg" alt="" className="w-4 h-4 invert" />
            </div>
            <span className="text-sm font-bold tracking-tight group-hover:opacity-75 transition-opacity">
              BookReady
            </span>
          </Link>
          <Link
            href="/login"
            className="text-[11px] font-bold tracking-[0.14em] uppercase text-muted-text hover:text-near-black transition-colors"
          >
            Back to app
          </Link>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-[760px] mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-3">
          {eyebrow}
        </p>
        <h1 className="text-[36px] sm:text-[44px] font-bold tracking-tight leading-[1.05] mb-3">
          {title}
        </h1>
        <p className="text-xs tracking-wide text-muted-text mb-12">
          Effective {effectiveDate}
        </p>

        <article className="legal-prose">
          {children}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-[rgba(18,18,18,0.10)]">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-text">
          <span>&copy; {new Date().getFullYear()} BookReady</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-near-black transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-near-black transition-colors">Terms</Link>
            <a href="mailto:hello@mybookready.com" className="hover:text-near-black transition-colors">
              hello@mybookready.com
            </a>
          </div>
        </div>
      </footer>

      {/* Scoped prose styles — keep editor pages unaffected. */}
      <style>{`
        .legal-prose h2 {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 40px 0 14px;
          color: #121212;
        }
        .legal-prose h3 {
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin: 28px 0 10px;
          color: #121212;
        }
        .legal-prose p {
          font-size: 15px;
          line-height: 1.7;
          color: #2a2a2a;
          margin: 0 0 14px;
        }
        .legal-prose ul {
          margin: 0 0 14px 18px;
          padding: 0;
        }
        .legal-prose li {
          font-size: 15px;
          line-height: 1.7;
          color: #2a2a2a;
          margin-bottom: 6px;
        }
        .legal-prose a {
          color: #121212;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .legal-prose a:hover { opacity: 0.7; }
        .legal-prose strong { color: #121212; font-weight: 600; }
        .legal-prose code {
          background: rgba(18,18,18,0.06);
          padding: 1px 6px;
          font-size: 13px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .legal-prose ol {
          margin: 0 0 14px 22px;
          padding: 0;
        }
        .legal-prose ol li {
          font-size: 15px;
          line-height: 1.7;
          color: #2a2a2a;
          margin-bottom: 6px;
        }
        .legal-prose .legal-table {
          width: 100%;
          border-collapse: collapse;
          margin: 14px 0 20px;
          font-size: 13.5px;
        }
        .legal-prose .legal-table th,
        .legal-prose .legal-table td {
          border: 1px solid rgba(18,18,18,0.15);
          padding: 8px 10px;
          vertical-align: top;
          text-align: left;
          color: #2a2a2a;
        }
        .legal-prose .legal-table th {
          background: rgba(18,18,18,0.04);
          font-weight: 700;
          color: #121212;
        }
        .legal-prose .legal-table td:last-child {
          text-align: center;
          font-weight: 700;
          color: #121212;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
