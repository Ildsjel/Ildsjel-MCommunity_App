'use client'

import { useEffect, useState } from 'react'

// ── Master coordinate system (1000×1000) — matches seal.jsx exactly ──────────
const CX = 500, CY = 500
const R_OUTER = 175   // outer ring: genre tick marks + labels just outside
const R_INNER = 100   // inner ring: heptagram vertices + artist markers

// 7/3 heptagram: connect each vertex to the one 3 positions ahead (star polygon {7/3})
function heptagramPath(cx: number, cy: number, r: number): string {
  const pts: [number, number][] = []
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 7) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  const order = [0, 3, 6, 2, 5, 1, 4, 0]
  return order.map((idx, i) => (i === 0 ? 'M' : 'L') + pts[idx].join(',')).join(' ')
}

function ringPoints(r: number, n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2
    return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, a }
  })
}

// ── Design palette (Sigil dark mode — always on dark bg) ─────────────────────
const BONE   = '#EDE4D3'
const BONE2  = '#C7BEA9'
const BONE3  = '#8B8298'
const BONE4  = '#5A5470'
const BLOOD_FAINT = 'rgba(168,58,58,0.10)'

// ── Props ─────────────────────────────────────────────────────────────────────
export interface SigilProps {
  /** Rendered pixel size (width = height). Default 260. */
  size?: number
  /** Up to 7 genre labels for the outer ring. */
  genres?: string[]
  /** Up to 7 artist names for the inner ring. */
  artists?: string[]
  /** Handle shown in the centre. */
  handle?: string
  /** Small est line below handle. E.g. "Est. 2026 · Grimr" */
  est?: string
  /** Shows dashed/empty state — use when data is not yet loaded. */
  loading?: boolean
  /** Compact mode: omit italic decor + est line, smaller handle text. */
  compact?: boolean
  className?: string
  style?: React.CSSProperties
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Sigil({
  size = 260,
  genres = [],
  artists = [],
  handle = '',
  est = '',
  loading = false,
  compact = false,
  className,
  style,
}: SigilProps) {
  // Trigger the 400ms draw-in animation after mount
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const tid = setTimeout(() => setDrawn(true), 60)
    return () => clearTimeout(tid)
  }, [])

  const empty = loading || (genres.length === 0 && artists.length === 0)

  const outerPts = ringPoints(R_OUTER)
  const innerPts = ringPoints(R_INNER)
  const heptD   = heptagramPath(CX, CY, R_INNER)
  const midR    = (R_OUTER + R_INNER) / 2

  // ── viewBox crops the 1000×1000 master space to just the seal area ──────────
  // Outer ring at R_OUTER=175, labels 22 units beyond → 197 from centre.
  // At angle ~167° ("end" anchor), a 9-char label extends ~82 units left of x=308 → x=226.
  // Use 215..785 (285 margin each side of 500) so no label clips.
  const VB = '215 215 570 570'

  return (
    <svg
      width={size}
      height={size}
      viewBox={VB}
      style={{ display: 'block', ...style }}
      className={className}
      aria-label={`Metal-ID Sigil${handle ? ` — ${handle}` : ''}`}
    >
      {empty ? (
        // ── Cold / loading state: faint dashed rings + question mark ──────────
        <g>
          <circle cx={CX} cy={CY} r={R_OUTER}
            fill="none" stroke={BONE4} strokeWidth={0.7}
            strokeDasharray="2 4" opacity={0.5}
            vectorEffect="non-scaling-stroke" />
          <circle cx={CX} cy={CY} r={R_INNER}
            fill="none" stroke={BONE4} strokeWidth={0.5}
            strokeDasharray="2 4" opacity={0.4}
            vectorEffect="non-scaling-stroke" />
          <text x={CX} y={CY + 11} textAnchor="middle"
            style={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: 32,
              fill: '#C75050',
              opacity: 0.5,
            }}>?</text>
        </g>
      ) : (
        <g>
          {/* ── OUTER LAYER: dashed ring + tick marks + dots + genre labels ── */}
          <circle cx={CX} cy={CY} r={R_OUTER}
            fill="none" stroke={BONE3} strokeWidth={0.7}
            strokeDasharray="2.5 3.5" opacity={0.85}
            vectorEffect="non-scaling-stroke" />

          {outerPts.map((p, i) => {
            const labelDist = 22
            const lx     = p.x + Math.cos(p.a) * labelDist
            const ly     = p.y + Math.sin(p.a) * labelDist + 3
            const anchor = Math.cos(p.a) > 0.3 ? 'start'
                         : Math.cos(p.a) < -0.3 ? 'end'
                         : 'middle'
            return (
              <g key={i}>
                {/* tick */}
                <line
                  x1={p.x - Math.cos(p.a) * 3} y1={p.y - Math.sin(p.a) * 3}
                  x2={p.x + Math.cos(p.a) * 7} y2={p.y + Math.sin(p.a) * 7}
                  stroke={BONE2} strokeWidth={1}
                  vectorEffect="non-scaling-stroke" />
                {/* dot */}
                <circle cx={p.x} cy={p.y} r={2.2} fill={BONE} />
                {/* label */}
                {genres[i] && (
                  <text x={lx} y={ly} textAnchor={anchor}
                    style={{
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: 10,
                      letterSpacing: 1.2,
                      fill: BONE,
                    }}>
                    {genres[i]}
                  </text>
                )}
              </g>
            )
          })}

          {/* ── INNER LAYER: solid ring + mid ring + heptagram + artist dots ─ */}

          {/* Inner solid ring — draw-in animation */}
          <circle cx={CX} cy={CY} r={R_INNER}
            fill="none" stroke={BONE3} strokeWidth={0.7}
            opacity={0.9}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{ transition: 'stroke-dashoffset 0.7s ease' }}
            vectorEffect="non-scaling-stroke" />

          {/* Faint mid decorative ring */}
          <circle cx={CX} cy={CY} r={midR}
            fill="none" stroke={BONE4} strokeWidth={0.35}
            opacity={0.3}
            vectorEffect="non-scaling-stroke" />

          {/* Heptagram {7/3} — draw-in animation (slight delay after ring) */}
          <path d={heptD}
            fill="none" stroke={BONE2} strokeWidth={0.6}
            strokeLinejoin="miter" opacity={0.9}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{ transition: 'stroke-dashoffset 1s ease 0.15s' }}
            vectorEffect="non-scaling-stroke" />

          {/* Inner ring: artist dots + labels */}
          {innerPts.map((p, i) => {
            const labelDist = 16
            const lx     = p.x + Math.cos(p.a) * labelDist
            const ly     = p.y + Math.sin(p.a) * labelDist + 3
            const anchor = Math.cos(p.a) > 0.3 ? 'start'
                         : Math.cos(p.a) < -0.3 ? 'end'
                         : 'middle'
            return (
              <g key={i}>
                {/* dot */}
                <circle cx={p.x} cy={p.y} r={3} fill={BONE} />
                {/* outer dot ring */}
                <circle cx={p.x} cy={p.y} r={5}
                  fill="none" stroke={BONE3} strokeWidth={0.4}
                  opacity={0.6} vectorEffect="non-scaling-stroke" />
                {/* artist label */}
                {artists[i] && (
                  <text x={lx} y={ly} textAnchor={anchor}
                    style={{
                      fontFamily: '"EB Garamond", serif',
                      fontStyle: 'italic',
                      fontSize: 10,
                      fill: BONE2,
                    }}>
                    {artists[i]}
                  </text>
                )}
              </g>
            )
          })}

          {/* ── CENTER LAYER: halo + decor + handle + est ───────────────────── */}
          <circle cx={CX} cy={CY} r={55} fill={BLOOD_FAINT} />

          {!compact && (
            <text x={CX} y={CY - 18} textAnchor="middle"
              style={{
                fontFamily: '"EB Garamond", serif',
                fontStyle: 'italic',
                fontSize: 10,
                fill: BONE3,
              }}>
              — the reading of —
            </text>
          )}

          <text x={CX} y={CY + (compact ? 6 : 4)} textAnchor="middle"
            style={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: compact ? 16 : 22,
              letterSpacing: 2,
              fill: BONE,
              textTransform: 'uppercase',
            }}>
            {handle.toUpperCase()}
          </text>

          {!compact && est && (
            <text x={CX} y={CY + 20} textAnchor="middle"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 7.5,
                letterSpacing: 1.6,
                fill: BONE4,
                textTransform: 'uppercase',
              }}>
              {est}
            </text>
          )}
        </g>
      )}
    </svg>
  )
}
