import { cn } from '@/lib/cn'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The ONE alert/banner. Four tones, sharp, token-driven. For STANDING
 * conditions (unverified email, Stripe not connected, day full). Transient
 * outcomes use Toast, not Banner.
 */

export type BannerTone = 'info' | 'success' | 'warning' | 'danger'

const TONE: Record<BannerTone, { box: string; icon: typeof Info }> = {
  info:    { box: 'bg-lavender border-hairline text-near-black',        icon: Info },
  success: { box: 'bg-success-bg border-hairline text-success',         icon: CheckCircle2 },
  warning: { box: 'bg-warning-bg border-hairline text-warning',         icon: AlertTriangle },
  danger:  { box: 'bg-danger-bg border-hairline text-danger',           icon: AlertCircle },
}

interface BannerProps {
  tone?:      BannerTone
  title?:     string
  children?:  ReactNode
  action?:    ReactNode
  onDismiss?: () => void
  className?: string
}

export default function Banner({ tone = 'info', title, children, action, onDismiss, className }: BannerProps) {
  const { box, icon: Icon } = TONE[tone]
  return (
    <div className={cn('flex items-start gap-3 border p-4 text-sm', box, className)} role="status">
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'text-current/90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
