'use client'

import type { HealthStatus, SparklinePoint } from '@/lib/api'

/**
 * 24-hour mini-chart for a single probe. Inline SVG, no chart deps.
 *
 * Color of the line + fill comes from the LATEST point's status (or the
 * caller-provided override) — so a card that's now red shows a red
 * sparkline even if most of its 24h was green, drawing the eye to "this
 * is what's happening now". The dots along the line are tinted by each
 * individual sample's status, so a recovered probe still shows where it
 * spiked.
 *
 * Intentionally tiny (130×26 viewBox). Renders nothing when there are
 * fewer than 2 points — sparkline of one dot is just noise.
 */

const TONE: Record<HealthStatus, string> = {
  ok:      '#0f6f3d',
  warn:    '#C9A876',
  bad:     '#b42828',
  unknown: 'rgba(18,18,18,0.40)',
}

export function Sparkline({
  points, statusOverride,
}: {
  points: SparklinePoint[]
  /** Override line color (defaults to latest point's status). */
  statusOverride?: HealthStatus
}) {
  const valuedPoints = points.filter(p => p.value !== null) as (SparklinePoint & { value: number })[]

  if (valuedPoints.length < 2) {
    return (
      <div className="h-[26px] flex items-center text-[10px] text-muted-text/70 italic">
        Building 24h history{points.length > 0 ? ` (${points.length} pt${points.length === 1 ? '' : 's'})` : '…'}
      </div>
    )
  }

  const W = 130, H = 26
  const padding = { top: 3, right: 3, bottom: 3, left: 3 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom

  const values = valuedPoints.map(p => p.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  // Special case: when the line is dead-flat (typical for "healthy" probes
  // that always return the same value), draw it in the middle rather than
  // either edge — a 0-height line is invisible.
  const range = max === min ? 1 : max - min

  const n = valuedPoints.length
  const x = (i: number) => padding.left + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padding.top + innerH * (1 - (v - min) / range)

  const path = valuedPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(' ')
  const baseY = padding.top + innerH
  const area = `${path} L${x(n - 1).toFixed(1)},${baseY.toFixed(1)} L${x(0).toFixed(1)},${baseY.toFixed(1)} Z`

  const lineStatus = statusOverride ?? valuedPoints[valuedPoints.length - 1].status
  const tone = TONE[lineStatus]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[26px]" preserveAspectRatio="none">
      <path d={area}  fill={tone} fillOpacity="0.10" />
      <path d={path}  fill="none" stroke={tone} strokeWidth="1.2" strokeLinejoin="round" />
      {/* Per-point dots only for non-OK samples — keeps a clean line on
          healthy probes, surfaces the actual incidents on noisy ones. */}
      {valuedPoints.map((p, i) => p.status !== 'ok' && (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="1.5" fill={TONE[p.status]} />
      ))}
    </svg>
  )
}
