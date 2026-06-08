import { cn } from '@/lib/cn'
import { statusDef, type StatusDomain, type StatusTone } from '@/lib/status'

/**
 * The ONE status chip. Sharp, token-driven, label + tone from the status
 * registry (lib/status.ts). Replaces every hand-rolled status/payment pill.
 *
 *   <StatusBadge domain="appointment" status={appt.status} />
 *   <StatusBadge domain="payment"     status={appt.payment_status} />
 */

const TONE: Record<StatusTone, string> = {
  neutral: 'bg-cream text-muted-text border-hairline',
  info:    'bg-lavender text-near-black border-hairline',
  accent:  'bg-blush text-near-black border-hairline',
  success: 'bg-success-bg text-success border-hairline',
  warning: 'bg-warning-bg text-warning border-hairline',
  danger:  'bg-danger-bg text-danger border-hairline',
}

interface StatusBadgeProps {
  domain:    StatusDomain
  status:    string | null | undefined
  className?: string
}

export default function StatusBadge({ domain, status, className }: StatusBadgeProps) {
  const def = statusDef(domain, status)
  return (
    <span
      className={cn(
        'inline-flex items-center border px-2 py-0.5 text-2xs font-semibold whitespace-nowrap',
        TONE[def.tone],
        className,
      )}
    >
      {def.label}
    </span>
  )
}
