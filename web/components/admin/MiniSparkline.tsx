'use client'

/**
 * Tiny inline-SVG sparkline for KPI cards. Pure value series — no
 * per-point status concept (that belongs to the System Health
 * <Sparkline>). Same 130×26 footprint so a column of KPI cards stays
 * visually aligned.
 *
 * Renders a small placeholder when fewer than 2 valued points exist.
 */

export function MiniSparkline({
  values, color, placeholder,
}: {
  /** Series ordered oldest → newest. `null` = no data for that bucket. */
  values:      (number | null)[]
  /** Line + fill tint. */
  color:       string
  /** Shown when there aren't ≥2 numeric points yet (snapshot history filling in). */
  placeholder?: string
}) {
  const valued = values
    .map((v, i) => ({ v, i }))
    .filter((p): p is { v: number; i: number } => p.v !== null && isFinite(p.v))

  if (valued.length < 2) {
    return (
      <div className="h-[24px] flex items-center text-[10px] text-muted-text/70 italic">
        {placeholder ?? 'Building history…'}
      </div>
    )
  }

  const W = 130, H = 24
  const padding = { top: 2, right: 2, bottom: 2, left: 2 }
  const innerW = W - padding.left - padding.right
  const innerH = H - padding.top - padding.bottom

  const vs = valued.map(p => p.v)
  const min = Math.min(...vs)
  const max = Math.max(...vs)
  // Dead-flat lines (typical for "0 bookings every day" baselines) need
  // a synthetic range so they draw in the middle, not at the edge.
  const range = max === min ? 1 : max - min

  // x maps to the original series index (so gaps in `values` still
  // produce a continuous sparkline across the time window).
  const n = values.length
  const x = (i: number) => padding.left + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  const y = (v: number) => padding.top + innerH * (1 - (v - min) / range)

  const path = valued
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`)
    .join(' ')
  const baseY = padding.top + innerH
  const last = valued[valued.length - 1]
  const first = valued[0]
  const area = `${path} L${x(last.i).toFixed(1)},${baseY.toFixed(1)} L${x(first.i).toFixed(1)},${baseY.toFixed(1)} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[24px]" preserveAspectRatio="none">
      <path d={area} fill={color} fillOpacity="0.10" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
      {/* Latest-point dot so the eye lands on "now". */}
      <circle cx={x(last.i)} cy={y(last.v)} r="1.8" fill={color} />
    </svg>
  )
}
