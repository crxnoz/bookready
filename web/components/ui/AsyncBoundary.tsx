import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import Banner from './Banner'
import Button from './Button'

/**
 * The ONE loading/error/empty wrapper. Kills the divergent "Loading…" /
 * literal "None" / bespoke error boxes across the editor. Wrap any async
 * region:
 *
 *   <AsyncBoundary loading={loading} error={err} isEmpty={!rows.length}
 *     empty={<EmptyState .../>} onRetry={load}>
 *     <DataList ... />
 *   </AsyncBoundary>
 */

interface AsyncBoundaryProps {
  loading:    boolean
  error?:     string | null
  isEmpty?:   boolean
  empty?:     ReactNode
  onRetry?:   () => void
  skeleton?:  ReactNode
  loadingLabel?: string
  children:   ReactNode
}

export default function AsyncBoundary({
  loading, error, isEmpty, empty, onRetry, skeleton, loadingLabel = 'Loading…', children,
}: AsyncBoundaryProps) {
  if (loading) {
    return (
      skeleton ?? (
        <div className="bg-white border border-hairline p-8 flex items-center justify-center gap-2 text-sm text-muted-text">
          <Loader2 size={16} className="animate-spin" /> {loadingLabel}
        </div>
      )
    ) as JSX.Element
  }
  if (error) {
    return (
      <Banner tone="danger" title="Something went wrong">
        <div className="flex items-center justify-between gap-3">
          <span>{error}</span>
          {onRetry && (
            <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>
          )}
        </div>
      </Banner>
    )
  }
  if (isEmpty && empty) return <>{empty}</>
  return <>{children}</>
}
