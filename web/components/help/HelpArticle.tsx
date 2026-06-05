import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { HELP_ARTICLES, helpArticleBySlug } from '@/lib/helpNav'

/**
 * #131 — Per-article content frame. Renders the title, intro, the article
 * body (passed as children, styled by `.help-prose` from HelpShell), and
 * a prev/next footer computed from the HELP_ARTICLES order.
 */
export default function HelpArticle({
  slug, intro, children,
}: {
  slug:     string
  intro:    string
  children: React.ReactNode
}) {
  const idx  = HELP_ARTICLES.findIndex(a => a.slug === slug)
  const meta = HELP_ARTICLES[idx]
  const prev = idx > 0 ? HELP_ARTICLES[idx - 1] : null
  const next = idx >= 0 && idx < HELP_ARTICLES.length - 1 ? HELP_ARTICLES[idx + 1] : null

  return (
    <article>
      <Link
        href="/help"
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-tight text-muted-text hover:text-near-black mb-4"
      >
        <ArrowLeft size={12} /> All topics
      </Link>

      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
        Help
      </p>
      <h1 className="text-[30px] sm:text-[36px] font-bold tracking-tight leading-[1.08] mb-3">
        {meta?.title ?? 'Help'}
      </h1>
      <p className="text-[16px] text-muted-text leading-relaxed mb-8 max-w-2xl">
        {intro}
      </p>

      <div className="help-prose">
        {children}
      </div>

      {/* Prev / next */}
      {(prev || next) && (
        <div className="mt-12 pt-6 border-t border-[rgba(18,18,18,0.10)] grid grid-cols-2 gap-3">
          {prev ? (
            <Link
              href={`/help/${prev.slug}`}
              className="group flex flex-col gap-1 p-3.5 bg-white border border-[rgba(18,18,18,0.12)] hover:border-near-black transition-colors"
            >
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1">
                <ArrowLeft size={11} /> Previous
              </span>
              <span className="text-[13px] font-semibold text-near-black">{prev.title}</span>
            </Link>
          ) : <span />}
          {next ? (
            <Link
              href={`/help/${next.slug}`}
              className="group flex flex-col gap-1 p-3.5 bg-white border border-[rgba(18,18,18,0.12)] hover:border-near-black transition-colors text-right items-end"
            >
              <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text inline-flex items-center gap-1">
                Next <ArrowRight size={11} />
              </span>
              <span className="text-[13px] font-semibold text-near-black">{next.title}</span>
            </Link>
          ) : <span />}
        </div>
      )}
    </article>
  )
}
