import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { HELP_ARTICLES } from '@/lib/helpNav'

/**
 * #131 — Help Center index. Hero + a card grid of every article
 * (driven by HELP_ARTICLES). The sidebar TOC lives in HelpShell.
 */
export default function HelpIndexPage() {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-2">
        Help Center
      </p>
      <h1 className="text-[32px] sm:text-[40px] font-bold tracking-tight leading-[1.06] mb-3">
        How can we <span className="italic">help?</span>
      </h1>
      <p className="text-[16px] text-muted-text leading-relaxed mb-9 max-w-2xl">
        Everything you need to run your booking business on BookReady, from
        your first setup to taking payments. Pick a topic below, or email{' '}
        <a href="mailto:hello@mybookready.com" className="text-near-black underline underline-offset-2 hover:opacity-75">
          hello@mybookready.com
        </a>{' '}
        if you&rsquo;re stuck.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HELP_ARTICLES.map(a => {
          const Icon = a.icon
          return (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="group bg-white border border-[rgba(18,18,18,0.10)] p-4 hover:border-near-black transition-colors flex items-start gap-3.5"
            >
              <div className="w-9 h-9 bg-cream border border-[rgba(18,18,18,0.10)] flex items-center justify-center flex-shrink-0">
                <Icon size={16} strokeWidth={1.6} className="text-near-black" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-near-black leading-tight mb-0.5 flex items-center gap-1">
                  {a.title}
                  <ArrowRight size={13} className="text-muted-text group-hover:translate-x-0.5 transition-transform" />
                </p>
                <p className="text-[12px] text-muted-text leading-snug">{a.blurb}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
