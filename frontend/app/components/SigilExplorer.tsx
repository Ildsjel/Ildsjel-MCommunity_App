'use client'

import { useEffect, useState } from 'react'

// ── Master coordinate system (matches Sigil.tsx exactly) ─────────────────────
const CX = 500, CY = 500
const R_OUTER = 175
const R_INNER = 100

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

// ── Deterministic artist-dot grid within a genre sector ──────────────────────
// Grid: rings at r=70, 92, 115, 138, 155 with 1, 2, 3, 4, 4 positions each.
// Sorted by weight desc → brightest closest to sector centre.
const DOT_GRID = [
  [{ da: 0, r: 70 }],
  [{ da: -0.26, r: 92 }, { da: 0.26, r: 92 }],
  [{ da: -0.40, r: 115 }, { da: 0, r: 115 }, { da: 0.40, r: 115 }],
  [{ da: -0.50, r: 138 }, { da: -0.17, r: 138 }, { da: 0.17, r: 138 }, { da: 0.50, r: 138 }],
  [{ da: -0.50, r: 155 }, { da: -0.17, r: 155 }, { da: 0.17, r: 155 }, { da: 0.50, r: 155 }],
]

function artistPos(j: number, centerAngle: number): { x: number; y: number } {
  let idx = j
  for (const ring of DOT_GRID) {
    if (idx < ring.length) {
      const { r, da } = ring[idx]
      const a = centerAngle + da
      return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r }
    }
    idx -= ring.length
  }
  // Overflow beyond 14 — spread at r=165
  const da = ((j - 14) % 5 - 2) * 0.12
  return { x: CX + Math.cos(centerAngle + da) * 165, y: CY + Math.sin(centerAngle + da) * 165 }
}

// ── Design palette ────────────────────────────────────────────────────────────
const BONE        = '#EDE4D3'
const BONE2       = '#C7BEA9'
const BONE3       = '#8B8298'
const BONE4       = '#5A5470'
const BLOOD2      = '#C75050'
const BLOOD_FAINT = 'rgba(168,58,58,0.10)'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SigilSubgenre  { label: string; pct: number }
export interface SigilClusterArtist { name: string; weight: number }
export interface SigilCluster {
  label: string
  artist_count: number
  subgenres: SigilSubgenre[]
  artists: SigilClusterArtist[]
}

export interface SigilExplorerProps {
  size: number
  genres: string[]
  artists: string[]      // top 7 — used for L1 inner-ring labels
  handle: string
  est?: string
  clusters: SigilCluster[]
  layer: 1 | 2 | 3
  onArtistTap?: (name: string, clusterLabel: string) => void
  style?: React.CSSProperties
  className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SigilExplorer({
  size,
  genres,
  artists,
  handle,
  est,
  clusters,
  layer,
  onArtistTap,
  style,
  className,
}: SigilExplorerProps) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 60)
    return () => clearTimeout(t)
  }, [])

  const outerPts = ringPoints(R_OUTER)
  const innerPts = ringPoints(R_INNER)
  const heptD    = heptagramPath(CX, CY, R_INNER)
  const midR     = (R_OUTER + R_INNER) / 2

  // Per-layer viewBox — L2 zooms out to reveal satellites outside the outer ring
  const VB = layer === 2
    ? '158 158 684 684'   // satellite max-r ≈ 175+28+4*19=279; 500-279=221 > 158 ✓
    : layer === 3
    ? '220 220 560 560'   // same as L1 but tighter — emphasises inner dots
    : '215 215 570 570'   // L1 default

  // CSS opacity per layer (smooth 450ms cross-fade)
  const fade = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.45s ease',
    pointerEvents: visible ? 'auto' : 'none',
  })

  const showL1 = layer === 1
  const showL2 = layer === 2
  const showL3 = layer === 3

  return (
    <svg
      width={size}
      height={size}
      viewBox={VB}
      style={{ display: 'block', ...style }}
      className={className}
      aria-label={`Metal-ID Sigil — Layer ${layer}`}
    >
      {/* ── ALWAYS: outer dashed ring ──────────────────────────────────────── */}
      <circle
        cx={CX} cy={CY} r={R_OUTER}
        fill="none" stroke={BONE3} strokeWidth={0.7}
        strokeDasharray="2.5 3.5" opacity={0.85}
        vectorEffect="non-scaling-stroke"
      />

      {/* ── ALWAYS: mid decorative ring ────────────────────────────────────── */}
      <circle
        cx={CX} cy={CY} r={midR}
        fill="none" stroke={BONE4} strokeWidth={0.35}
        opacity={0.3} vectorEffect="non-scaling-stroke"
      />

      {/* ── ALWAYS: outer-point tick marks + dots + per-layer label/satellite ─ */}
      {outerPts.map((p, i) => {
        const labelDist = 22
        const lx      = p.x + Math.cos(p.a) * labelDist
        const ly      = p.y + Math.sin(p.a) * labelDist + 3
        const anchor  = Math.cos(p.a) > 0.3 ? 'start'
                      : Math.cos(p.a) < -0.3 ? 'end'
                      : 'middle'
        const cluster = clusters[i]

        return (
          <g key={i}>
            {/* tick */}
            <line
              x1={p.x - Math.cos(p.a) * 3} y1={p.y - Math.sin(p.a) * 3}
              x2={p.x + Math.cos(p.a) * 7} y2={p.y + Math.sin(p.a) * 7}
              stroke={BONE2} strokeWidth={1} vectorEffect="non-scaling-stroke"
            />
            {/* dot */}
            <circle cx={p.x} cy={p.y} r={2.2} fill={BONE} />

            {/* genre label — visible in L1 (full), L3 (faded), hidden in L2 */}
            {genres[i] && (
              <text
                x={lx} y={ly}
                textAnchor={anchor}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10,
                  letterSpacing: 1.2,
                  fill: showL3 ? BONE4 : BONE,
                  opacity: showL2 ? 0 : 1,
                  transition: 'opacity 0.4s ease, fill 0.4s ease',
                }}
              >
                {genres[i]}
              </text>
            )}

            {/* L2: subgenre satellites radiating outward from each outer point */}
            {cluster?.subgenres.map((sg, si) => {
              const satR = R_OUTER + 28 + si * 19   // 203, 222, 241, 260, 279
              const sx   = CX + Math.cos(p.a) * satR
              const sy   = CY + Math.sin(p.a) * satR + 3
              return (
                <g key={si} style={fade(showL2)}>
                  {/* connector dot chain */}
                  <circle
                    cx={CX + Math.cos(p.a) * (R_OUTER + 10 + si * 19)}
                    cy={CY + Math.sin(p.a) * (R_OUTER + 10 + si * 19)}
                    r={1.0} fill={BONE4} opacity={0.5}
                  />
                  <text
                    x={sx} y={sy}
                    textAnchor={anchor}
                    style={{
                      fontFamily: '"EB Garamond", serif',
                      fontStyle: 'italic',
                      fontSize: si === 0 ? 10 : 8.5,
                      fill: si === 0 ? BONE2 : BONE3,
                    }}
                  >
                    {sg.label}{sg.pct > 0 ? ` · ${sg.pct}%` : ''}
                  </text>
                </g>
              )
            })}

            {/* L2: cluster artist count badge at inner edge of each genre point */}
            {cluster && (
              <g style={fade(showL2)}>
                <text
                  x={CX + Math.cos(p.a) * (R_OUTER - 18)}
                  y={CY + Math.sin(p.a) * (R_OUTER - 18) + 3}
                  textAnchor="middle"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 7,
                    fill: BONE4,
                    letterSpacing: 0.5,
                  }}
                >
                  {cluster.artist_count}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* ══════════════════════════════════════════════════════════════════════
          L1 — SEAL: inner ring + heptagram + artist labels + center text
          ══════════════════════════════════════════════════════════════════════ */}
      <g style={fade(showL1)}>
        {/* inner solid ring — draw-in animation */}
        <circle
          cx={CX} cy={CY} r={R_INNER}
          fill="none" stroke={BONE3} strokeWidth={0.7}
          opacity={0.9} pathLength={1}
          strokeDasharray={1} strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
          vectorEffect="non-scaling-stroke"
        />

        {/* heptagram {7/3} — draw-in animation, slight delay */}
        <path
          d={heptD}
          fill="none" stroke={BONE2} strokeWidth={0.6}
          strokeLinejoin="miter" opacity={0.9}
          pathLength={1} strokeDasharray={1} strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 1s ease 0.15s' }}
          vectorEffect="non-scaling-stroke"
        />

        {/* inner ring: artist dots + labels */}
        {innerPts.map((p, i) => {
          const lx     = p.x + Math.cos(p.a) * 16
          const ly     = p.y + Math.sin(p.a) * 16 + 3
          const anchor = Math.cos(p.a) > 0.3 ? 'start'
                       : Math.cos(p.a) < -0.3 ? 'end'
                       : 'middle'
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={BONE} />
              <circle
                cx={p.x} cy={p.y} r={5}
                fill="none" stroke={BONE3} strokeWidth={0.4}
                opacity={0.6} vectorEffect="non-scaling-stroke"
              />
              {artists[i] && (
                <text
                  x={lx} y={ly} textAnchor={anchor}
                  style={{
                    fontFamily: '"EB Garamond", serif',
                    fontStyle: 'italic',
                    fontSize: 10,
                    fill: BONE2,
                  }}
                >
                  {artists[i]}
                </text>
              )}
            </g>
          )
        })}

        {/* center halo */}
        <circle cx={CX} cy={CY} r={55} fill={BLOOD_FAINT} />

        <text x={CX} y={CY - 18} textAnchor="middle"
          style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 10, fill: BONE3 }}>
          — the reading of —
        </text>
        <text x={CX} y={CY + 4} textAnchor="middle"
          style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, letterSpacing: 2, fill: BONE }}>
          {handle.toUpperCase()}
        </text>
        {est && (
          <text x={CX} y={CY + 20} textAnchor="middle"
            style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 7.5, letterSpacing: 1.6, fill: BONE4 }}>
            {est.toUpperCase()}
          </text>
        )}
      </g>

      {/* ══════════════════════════════════════════════════════════════════════
          L2 — SCENE: center label showing genre name
          ══════════════════════════════════════════════════════════════════════ */}
      <g style={fade(showL2)}>
        <circle cx={CX} cy={CY} r={48} fill={BLOOD_FAINT} />
        <text x={CX} y={CY - 8} textAnchor="middle"
          style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 9, fill: BONE3 }}>
          subgenres
        </text>
        <text x={CX} y={CY + 7} textAnchor="middle"
          style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 10, letterSpacing: 2, fill: BONE4 }}>
          L · II
        </text>
      </g>

      {/* ══════════════════════════════════════════════════════════════════════
          L3 — ARTISTS: dots in genre sectors, sized by listening weight
          ══════════════════════════════════════════════════════════════════════ */}
      <g style={fade(showL3)}>
        {/* blood halo */}
        <circle cx={CX} cy={CY} r={52} fill={BLOOD_FAINT} opacity={0.7} />
        <text x={CX} y={CY - 8} textAnchor="middle"
          style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 9, fill: BONE3 }}>
          artists
        </text>
        <text x={CX} y={CY + 7} textAnchor="middle"
          style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 10, letterSpacing: 2, fill: BONE4 }}>
          L · III
        </text>

        {/* Artist dots per cluster */}
        {clusters.map((cluster, ci) => {
          const centerAngle = outerPts[ci]?.a ?? (-Math.PI / 2 + (ci / 7) * Math.PI * 2)
          return cluster.artists.map((a, j) => {
            const pos    = artistPos(j, centerAngle)
            const dotR   = 2.2 + (a.weight / 100) * 6.5   // 2.2 → 8.7 px
            const isTop  = j === 0
            const isDim  = a.weight < 30
            return (
              <g
                key={`${ci}-${j}`}
                onClick={() => onArtistTap?.(a.name, cluster.label)}
                style={{ cursor: onArtistTap ? 'pointer' : 'default' }}
              >
                {/* outer glow ring for top artist in each cluster */}
                {isTop && (
                  <circle
                    cx={pos.x} cy={pos.y} r={dotR + 4.5}
                    fill="none" stroke={BLOOD2} strokeWidth={0.6}
                    opacity={0.45} vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* main dot */}
                <circle
                  cx={pos.x} cy={pos.y} r={dotR}
                  fill={isTop ? BONE : isDim ? BONE4 : BONE2}
                  opacity={isDim ? 0.55 : 0.85}
                />
                {/* hit-area for tap */}
                {onArtistTap && (
                  <circle cx={pos.x} cy={pos.y} r={Math.max(dotR, 8)} fill="transparent" />
                )}
              </g>
            )
          })
        })}
      </g>
    </svg>
  )
}
