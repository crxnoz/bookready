'use client'

import { useRef, useState } from 'react'
import { shortDate } from './_parts'

/**
 * Generic chart hover overlay. Renders an invisible mouse-tracking rect
 * inside the SVG, finds the nearest x-axis point, and draws a crosshair
 * line + dot + tooltip box.
 *
 * Caller supplies the series (date + tooltip rows) plus the same x/y
 * scaling functions the chart used to draw, so the crosshair lines up
 * exactly with the chart geometry.
 *
 * Touch-friendly: pointer events fire on tap too, so on mobile a tap
 * shows the nearest point and the next tap moves it.
 */

export interface HoverRow {
  /** Color swatch beside the value (matches the chart band). */
  color?: string
  /** "Solo", "Total", "Signups", etc. */
  label: string
  /** Pre-formatted value, e.g. "$1,240" or "12". */
  value: string
}

export interface HoverPoint {
  /** ISO date (yyyy-mm-dd) — used for the tooltip title. */
  date: string
  /** Y position to anchor the dot (chart units). */
  y: number
  rows: HoverRow[]
}

export function ChartHover({
  width, height, padding, points, primaryColor,
}: {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
  points: HoverPoint[]
  /** Color of the crosshair dot. */
  primaryColor?: string
}) {
  const [idx, setIdx] = useState<number | null>(null)
  const rectRef = useRef<SVGRectElement>(null)
  const innerW = width - padding.left - padding.right
  const n = points.length

  if (n === 0) return null

  function xFor(i: number) {
    return padding.left + (n <= 1 ? innerW / 2 : innerW * (i / (n - 1)))
  }

  function handle(e: React.PointerEvent<SVGRectElement>) {
    if (! rectRef.current) return
    const r = rectRef.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * width
    const ratio = (px - padding.left) / Math.max(1, innerW)
    const raw = Math.round(ratio * (n - 1))
    const clamped = Math.max(0, Math.min(n - 1, raw))
    setIdx(clamped)
  }

  const dotR = 3.5
  const dotColor = primaryColor ?? '#121212'

  // Tooltip sizing (in SVG units).
  const padY = 6, padX = 8, lineH = 11, titleH = 12, swatch = 7
  const hovered = idx !== null ? points[idx] : null
  const ttRows = hovered?.rows ?? []
  // Width = max(title, longest row "label  value")
  const labelMax = Math.max(0, ...ttRows.map(r => r.label.length + r.value.length + 3))
  const titleText = hovered ? shortDate(hovered.date) : ''
  const ttW = Math.max(titleText.length * 5.5 + padX * 2, labelMax * 5.5 + swatch + padX * 2)
  const ttH = padY + titleH + (ttRows.length > 0 ? 4 + ttRows.length * lineH : 0) + padY

  // Position the tooltip near the dot but keep it inside the chart frame.
  let ttX = 0, ttY = 0
  if (hovered) {
    const dx = xFor(idx!)
    ttX = dx + 10
    if (ttX + ttW > width - padding.right) ttX = dx - 10 - ttW
    ttY = Math.max(padding.top, Math.min(height - padding.bottom - ttH, hovered.y - ttH / 2))
  }

  return (
    <g>
      <rect
        ref={rectRef}
        x={padding.left}
        y={padding.top}
        width={innerW}
        height={height - padding.top - padding.bottom}
        fill="transparent"
        style={{ cursor: 'crosshair' }}
        onPointerMove={handle}
        onPointerDown={handle}
        onPointerLeave={() => setIdx(null)}
      />
      {hovered && (
        <>
          <line
            x1={xFor(idx!)} x2={xFor(idx!)}
            y1={padding.top} y2={height - padding.bottom}
            stroke="rgba(18,18,18,0.35)" strokeWidth="1" strokeDasharray="3 3"
          />
          <circle cx={xFor(idx!)} cy={hovered.y} r={dotR + 2} fill="#ffffff" />
          <circle cx={xFor(idx!)} cy={hovered.y} r={dotR} fill={dotColor} />
          {/* Tooltip */}
          <g transform={`translate(${ttX.toFixed(1)},${ttY.toFixed(1)})`}>
            <rect
              width={ttW} height={ttH} rx="3"
              fill="#121212" fillOpacity="0.95"
              stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"
            />
            <text
              x={padX} y={padY + 9}
              fontSize="10" fontWeight="700"
              fill="#F0EFF5"
              style={{ letterSpacing: '0.04em' }}
            >
              {titleText.toUpperCase()}
            </text>
            {ttRows.map((row, i) => {
              const ty = padY + titleH + 4 + lineH * i + 8
              return (
                <g key={i}>
                  {row.color && (
                    <rect
                      x={padX} y={ty - 7}
                      width={swatch} height={swatch} rx="1"
                      fill={row.color}
                    />
                  )}
                  <text
                    x={padX + (row.color ? swatch + 4 : 0)} y={ty}
                    fontSize="10" fill="#D9D8DE"
                  >
                    {row.label}
                  </text>
                  <text
                    x={ttW - padX} y={ty}
                    fontSize="10" fontWeight="600" fill="#FFFFFF"
                    textAnchor="end"
                  >
                    {row.value}
                  </text>
                </g>
              )
            })}
          </g>
        </>
      )}
    </g>
  )
}
