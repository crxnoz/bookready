'use client'

import { Suspense, useMemo } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import { SITE_TEMPLATES } from '@/lib/templates'
import AuthShell from '@/components/auth/AuthShell'

/**
 * /templates — in-app template gallery.
 *
 * Two entry points:
 *   1. Marketing's "Signing up for" banner has a "change" link pointed
 *      here, so signups who picked the wrong template on marketing can
 *      switch without losing their plan/billing/sms choices.
 *   2. Direct navigation by someone exploring options.
 *
 * Marketing's own /templates page (over on mybookready.com) is the
 * primary discovery surface — this is the lightweight in-app switcher.
 *
 * Each card links to /register and forwards every URL param it received
 * (plan/billing/sms) verbatim so we don't lose the intent on a swap.
 */
export default function TemplatesPage() {
  return (
    <Suspense fallback={<AuthShell><p className="text-xs text-muted-text">Loading…</p></AuthShell>}>
      <TemplateGalleryInner />
    </Suspense>
  )
}

function TemplateGalleryInner() {
  const searchParams = useSearchParams()
  const currentTemplate = searchParams.get('template')

  // Carry every param except `template` forward so swapping templates
  // doesn't reset the user's plan / billing cycle / SMS multiplier.
  const forwardQs = useMemo(() => {
    const qs = new URLSearchParams()
    searchParams.forEach((v, k) => { if (k !== 'template') qs.set(k, v) })
    const s = qs.toString()
    return s ? '&' + s : ''
  }, [searchParams])

  return (
    <AuthShell>
      <div className="mb-6">
        <Link
          href={`/register?${forwardQs.replace(/^&/, '')}`}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase text-muted-text hover:text-near-black mb-3"
        >
          <ArrowLeft size={12} /> Back to sign up
        </Link>

        <p className="block text-[10px] font-bold tracking-[0.18em] uppercase text-muted-text mb-1.5">
          Pick a template
        </p>
        <h1 className="text-[28px] font-bold text-near-black tracking-tight leading-tight mb-1.5">
          Which look fits your brand?
        </h1>
        <p className="text-sm text-muted-text">
          You can change this anytime in the editor — but starting with the right one
          means less to tweak.
        </p>
      </div>

      <div className="space-y-2">
        {SITE_TEMPLATES.map(t => {
          const isCurrent = currentTemplate === t.slug
          return (
            <Link
              key={t.slug}
              href={`/register?template=${t.slug}${forwardQs}`}
              className={`group block px-4 py-3.5 border transition-colors ${
                isCurrent
                  ? 'border-near-black bg-white'
                  : 'border-[rgba(18,18,18,0.12)] bg-white hover:border-near-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-10 h-10 flex-shrink-0 border border-[rgba(18,18,18,0.10)]"
                  style={{ background: t.color }}
                  aria-hidden
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold text-near-black leading-tight">
                    {t.label}
                  </span>
                  <span className="block text-[11px] text-muted-text mt-0.5">
                    {t.desc}
                  </span>
                </span>
                {isCurrent ? (
                  <span className="text-[9px] font-bold tracking-[0.06em] uppercase bg-near-black text-white px-1.5 py-0.5 flex-shrink-0">
                    Selected
                  </span>
                ) : (
                  <ArrowRight
                    size={14}
                    className="text-muted-text group-hover:text-near-black flex-shrink-0"
                  />
                )}
              </div>
            </Link>
          )
        })}
      </div>

      <p className="text-[11px] text-muted-text mt-6 text-center">
        Want more detail on each look?{' '}
        <a
          href="https://mybookready.com/templates"
          target="_blank"
          rel="noopener noreferrer"
          className="text-near-black font-semibold underline underline-offset-2 hover:opacity-75"
        >
          See template showcase
        </a>
      </p>
    </AuthShell>
  )
}
