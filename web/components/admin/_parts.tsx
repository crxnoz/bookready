'use client'

import { cn } from '@/lib/cn'

/**
 * Tiny shared primitives used across every admin route. Extracted from
 * the old single-page AdminPage so each split route doesn't redefine
 * the same Card/Th/Td/Field markup.
 */

export function Card({
  children, tone, className,
}: { children: React.ReactNode; tone?: 'warn'; className?: string }) {
  return (
    <section className={cn(
      'bg-white border p-5',
      tone === 'warn' ? 'border-[rgba(180,120,0,0.30)]' : 'border-[rgba(18,18,18,0.10)]',
      className,
    )}>
      {children}
    </section>
  )
}

export function Th({
  children, className, onClick, ariaSort,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  ariaSort?: 'ascending' | 'descending' | 'none'
}) {
  const sortable = !! onClick
  return (
    <th
      aria-sort={ariaSort}
      className={cn(
        'px-3 py-2 text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text',
        sortable && 'cursor-pointer select-none hover:text-near-black',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </th>
  )
}

export function Td({
  children, className,
}: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-3 py-2.5 align-top', className)}>{children}</td>
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-muted-text">{label}</span>
      {children}
    </label>
  )
}

/** Human-friendly "X ago" for snapshot / last-booking timestamps. */
export function relTime(iso: string | null | undefined): string {
  if (! iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d === 1) return 'yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

/** Format yyyy-mm-dd → "Jun 7" (for chart hover labels). */
export function shortDate(iso: string): string {
  // Note: we deliberately parse as UTC (snapshot dates are UTC dates).
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** "$1,234" — no decimals (we display rounded dollars across the admin). */
export function money(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString()
}
