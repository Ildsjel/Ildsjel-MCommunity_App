'use client'

import { useEffect, useState, useMemo } from 'react'

// ── Master coordinate system ──────────────────────────────────────────────────
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
// Rings at r = 70, 92, 115, 138, 155 — 1, 2, 3, 4, 4 slots each (total 14).
// Natural (genre-matched) artists fill from centre outward.
// Synthetic (unclustered) artists land in the outer rings, rendered dimmer.
const DOT_GRID = [
  [{ da: 0,     r: 70  }],
  [{ da: -0.26, r: 92  }, { da:  0.26, r: 92  }],
  [{ da: -0.40, r: 115 }, { da:  0,    r: 115 }, { da: 0.40, r: 115 }],
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
  // Overflow beyond slot 14
  const da = ((j - 14) % 5 - 2) * 0.12
  return { x: CX + Math.cos(centerAngle + da) * 163, y: CY + Math.sin(centerAngle + da) * 163 }
}

// ── Design palette ────────────────────────────────────────────────────────────
const BONE        = '#EDE4D3'
const BONE2       = '#C7BEA9'
const BONE3       = '#8B8298'
const BONE4       = '#5A5470'
const BLOOD2      = '#C75050'
const BLOOD_FAINT = 'rgba(168,58,58,0.10)'
const FRIEND_COL  = '#8BCAD4'   // icy steel-blue for friend nodes

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SigilSubgenre  { label: string; pct: number }
export interface SigilClusterArtist {
  name: string
  weight: number
  natural?: boolean   // false = synthetically distributed unclustered artist
}
export interface SigilCluster {
  label: string
  artist_count: number
  subgenres: SigilSubgenre[]
  artists: SigilClusterArtist[]
}
export interface SigilFriend {
  handle: string
  avatar_url?: string
  shared_artists: string[]
  primary_artist?: string
}

export type FocusedNode =
  | { type: 'artist'; name: string; ci: number }
  | { type: 'genre'; ci: number }
  | { type: 'friend'; handle: string }
  | null

export interface SigilExplorerProps {
  size: number
  genres: string[]
  artists: string[]        // top 7 — L1 inner-ring labels
  handle: string
  est?: string
  clusters: SigilCluster[]
  friends?: SigilFriend[]
  layer: 1 | 2 | 3
  focusedNode?: FocusedNode
  onNodeClick?: (node: FocusedNode) => void  // null = deselect
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
  friends = [],
  layer,
  focusedNode,
  onNodeClick,
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

  // Per-layer viewBox
  const VB = layer === 2
    ? '158 158 684 684'   // zoom out to reveal satellites (max r ≈ 279)
    : layer === 3
    ? '218 218 564 564'   // tighter — emphasises inner artist space
    : '215 215 570 570'   // L1 default

  const fade = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transition: 'opacity 0.45s ease',
    pointerEvents: visible ? 'auto' : 'none',
  })

  const showL1 = layer === 1
  const showL2 = layer === 2
  const showL3 = layer === 3

  // ── Build artist position lookup (used for connection lines) ──────────────
  const artistPosLookup = useMemo<Record<string, {x:number;y:number;ci:number}>>(() => {
    const map: Record<string, {x:number;y:number;ci:number}> = {}
    clusters.forEach((cl, ci) => {
      const ca = outerPts[ci]?.a ?? (-Math.PI / 2 + (ci / 7) * Math.PI * 2)
      cl.artists.forEach((a, j) => {
        map[a.name] = { ...artistPos(j, ca), ci }
      })
    })
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusters])

  // ── Group friends by their primary cluster ───────────────────────────────
  const friendsByCluster = useMemo<Record<number, {friend:SigilFriend; connPts:{x:number;y:number}[]}[]>>(() => {
    const out: Record<number, {friend:SigilFriend; connPts:{x:number;y:number}[]}[]> = {}
    friends.forEach(f => {
      let primaryCi = -1
      for (const name of f.shared_artists) {
        if (artistPosLookup[name] !== undefined) {
          primaryCi = artistPosLookup[name].ci
          break
        }
      }
      if (primaryCi < 0) return
      const connPts = f.shared_artists
        .filter(n => artistPosLookup[n])
        .map(n => artistPosLookup[n])
        .slice(0, 4)
      if (!out[primaryCi]) out[primaryCi] = []
      out[primaryCi].push({ friend: f, connPts })
    })
    return out
  }, [friends, artistPosLookup])

  // ── Friend position lookup ─────────────────────────────────────────────────
  const friendPosLookup = useMemo<Record<string, {x:number;y:number}>>(() => {
    const map: Record<string, {x:number;y:number}> = {}
    Object.entries(friendsByCluster).forEach(([ciStr, friendList]) => {
      const ci = parseInt(ciStr)
      const ca = outerPts[ci]?.a ?? (-Math.PI / 2 + (ci / 7) * Math.PI * 2)
      const count = friendList.length
      friendList.forEach(({ friend }, j) => {
        const spread = count === 1 ? 0 : (j - (count - 1) / 2) * 0.22
        const angle = ca + spread
        map[friend.handle] = {
          x: CX + Math.cos(angle) * 165,
          y: CY + Math.sin(angle) * 165,
        }
      })
    })
    return map
  }, [friendsByCluster, outerPts])

  // ── Compute connected nodes for focus mode ────────────────────────────────
  const connected = useMemo<{
    genreCis: Set<number>
    artists: Set<string>
    friends: Set<string>
  } | null>(() => {
    if (!focusedNode) return null

    const genreCis = new Set<number>()
    const artistSet = new Set<string>()
    const friendSet = new Set<string>()

    if (focusedNode.type === 'artist') {
      const { name, ci } = focusedNode
      genreCis.add(ci)
      // same-cluster artists
      const cl = clusters[ci]
      if (cl) {
        cl.artists.forEach(a => artistSet.add(a.name))
      }
      // friends sharing this artist
      friends.forEach(f => {
        if (f.shared_artists.includes(name)) friendSet.add(f.handle)
      })
    } else if (focusedNode.type === 'genre') {
      const { ci } = focusedNode
      genreCis.add(ci)
      const cl = clusters[ci]
      if (cl) {
        cl.artists.forEach(a => {
          artistSet.add(a.name)
          // friends who share any of these artists
          friends.forEach(f => {
            if (f.shared_artists.includes(a.name)) friendSet.add(f.handle)
          })
        })
      }
    } else if (focusedNode.type === 'friend') {
      const { handle } = focusedNode
      friendSet.add(handle)
      const f = friends.find(fr => fr.handle === handle)
      if (f) {
        f.shared_artists.forEach(name => {
          artistSet.add(name)
          const pos = artistPosLookup[name]
          if (pos) genreCis.add(pos.ci)
        })
      }
    }

    return { genreCis, artists: artistSet, friends: friendSet }
  }, [focusedNode, clusters, friends, artistPosLookup])

  // ── Helper: get artist opacity in focus mode ───────────────────────────────
  const getArtistOpacity = (name: string, isNatural: boolean, isDim: boolean): number => {
    if (connected === null) return isNatural ? (isDim ? 0.55 : 0.85) : 0.3
    if (connected.artists.has(name)) return 0.9
    return 0.08
  }

  // ── Helper: get genre tick opacity ────────────────────────────────────────
  const getGenreOpacity = (ci: number): number => {
    if (connected === null) return 1
    return connected.genreCis.has(ci) ? 1 : 0.1
  }

  // ── Helper: get friend opacity ────────────────────────────────────────────
  const getFriendOpacity = (handle: string): number => {
    if (connected === null) return 1
    return connected.friends.has(handle) ? 1 : 0.08
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={VB}
      style={{ display: 'block', ...style }}
      className={className}
      aria-label={`Metal-ID Sigil — Layer ${layer}`}
    >
      {/* Pulse animation keyframes */}
      <defs>
        <style>{`
          @keyframes sigilNodePulse {
            0%,100% { opacity: 0.6 }
            50% { opacity: 0.15 }
          }
          @keyframes sigilFriendPulse {
            0%,100% { opacity: 0.5 }
            50% { opacity: 0.15 }
          }
        `}</style>
      </defs>

      {/* Background deselect — invisible rect behind everything */}
      <rect
        x={0} y={0} width={1000} height={1000}
        fill="transparent"
        onClick={() => onNodeClick?.(null)}
      />

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

      {/* ── ALWAYS: outer-point tick + dot + per-layer label / L2 satellites ─ */}
      {outerPts.map((p, i) => {
        const labelDist = 22
        const lx     = p.x + Math.cos(p.a) * labelDist
        const ly     = p.y + Math.sin(p.a) * labelDist + 3
        const anchor = Math.cos(p.a) > 0.3 ? 'start' : Math.cos(p.a) < -0.3 ? 'end' : 'middle'
        const cluster = clusters[i]
        const gOpacity = getGenreOpacity(i)
        const isFocusedGenre = focusedNode?.type === 'genre' && focusedNode.ci === i

        return (
          <g
            key={i}
            onClick={(e) => {
              e.stopPropagation()
              onNodeClick?.({ type: 'genre', ci: i })
            }}
            style={{ cursor: onNodeClick ? 'pointer' : 'default', opacity: gOpacity, transition: 'opacity 0.3s ease' }}
          >
            {/* Larger transparent hit target */}
            <circle cx={p.x} cy={p.y} r={14} fill="transparent" />

            {/* tick */}
            <line
              x1={p.x - Math.cos(p.a) * 3} y1={p.y - Math.sin(p.a) * 3}
              x2={p.x + Math.cos(p.a) * 7} y2={p.y + Math.sin(p.a) * 7}
              stroke={BONE2} strokeWidth={1} vectorEffect="non-scaling-stroke"
            />
            {/* dot */}
            <circle cx={p.x} cy={p.y} r={2.2} fill={BONE} />

            {/* Focused genre highlight ring */}
            {isFocusedGenre && (
              <circle
                cx={p.x} cy={p.y} r={5}
                fill="none" stroke={BLOOD2} strokeWidth={1.2}
                vectorEffect="non-scaling-stroke"
              />
            )}

            {/* Genre label — full in L1, faded in L3, hidden in L2 */}
            {genres[i] && (
              <text
                x={lx} y={ly} textAnchor={anchor}
                style={{
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: 10, letterSpacing: 1.2,
                  fill: showL3 ? BONE4 : BONE,
                  opacity: showL2 ? 0 : 1,
                  transition: 'opacity 0.4s ease, fill 0.4s ease',
                }}
              >
                {genres[i]}
              </text>
            )}

            {/* L2: subgenre satellites */}
            {cluster?.subgenres.map((sg, si) => {
              const satR = R_OUTER + 28 + si * 19
              const sx   = CX + Math.cos(p.a) * satR
              const sy   = CY + Math.sin(p.a) * satR + 3
              return (
                <g key={si} style={fade(showL2)}>
                  <circle
                    cx={CX + Math.cos(p.a) * (R_OUTER + 10 + si * 19)}
                    cy={CY + Math.sin(p.a) * (R_OUTER + 10 + si * 19)}
                    r={1.0} fill={BONE4} opacity={0.5}
                  />
                  <text
                    x={sx} y={sy} textAnchor={anchor}
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

            {/* L2: artist-count badge */}
            {cluster && (
              <g style={fade(showL2)}>
                <text
                  x={CX + Math.cos(p.a) * (R_OUTER - 18)}
                  y={CY + Math.sin(p.a) * (R_OUTER - 18) + 3}
                  textAnchor="middle"
                  style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 7, fill: BONE4, letterSpacing: 0.5 }}
                >
                  {cluster.artist_count}
                </text>
              </g>
            )}
          </g>
        )
      })}

      {/* ══════════════════════════════════════════════════════════════════════
          L1 — SEAL
          ══════════════════════════════════════════════════════════════════════ */}
      <g style={fade(showL1)}>
        {/* inner ring */}
        <circle
          cx={CX} cy={CY} r={R_INNER}
          fill="none" stroke={BONE3} strokeWidth={0.7} opacity={0.9}
          pathLength={1} strokeDasharray={1} strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 0.7s ease' }}
          vectorEffect="non-scaling-stroke"
        />
        {/* heptagram */}
        <path
          d={heptD} fill="none" stroke={BONE2} strokeWidth={0.6}
          strokeLinejoin="miter" opacity={0.9}
          pathLength={1} strokeDasharray={1} strokeDashoffset={drawn ? 0 : 1}
          style={{ transition: 'stroke-dashoffset 1s ease 0.15s' }}
          vectorEffect="non-scaling-stroke"
        />
        {/* inner-ring artist dots + labels */}
        {innerPts.map((p, i) => {
          const lx     = p.x + Math.cos(p.a) * 16
          const ly     = p.y + Math.sin(p.a) * 16 + 3
          const anchor = Math.cos(p.a) > 0.3 ? 'start' : Math.cos(p.a) < -0.3 ? 'end' : 'middle'
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={3} fill={BONE} />
              <circle cx={p.x} cy={p.y} r={5} fill="none" stroke={BONE3} strokeWidth={0.4} opacity={0.6} vectorEffect="non-scaling-stroke" />
              {artists[i] && (
                <text x={lx} y={ly} textAnchor={anchor}
                  style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 10, fill: BONE2 }}>
                  {artists[i]}
                </text>
              )}
            </g>
          )
        })}
        {/* center */}
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
          L2 — SCENE: center label
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
          L3 — ARTISTS: all artist dots + friend nodes
          ══════════════════════════════════════════════════════════════════════ */}
      <g style={fade(showL3)}>
        {/* blood halo + center label */}
        <circle cx={CX} cy={CY} r={52} fill={BLOOD_FAINT} opacity={0.7} />
        <text x={CX} y={CY - 8} textAnchor="middle"
          style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: 9, fill: BONE3 }}>
          artists
        </text>
        <text x={CX} y={CY + 7} textAnchor="middle"
          style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 10, letterSpacing: 2, fill: BONE4 }}>
          L · III
        </text>

        {/* ── Connection lines (drawn BEFORE nodes) ─────────────────────────── */}
        {focusedNode?.type === 'artist' && (() => {
          const { name, ci } = focusedNode
          const focusedPos = artistPosLookup[name]
          if (!focusedPos) return null
          const outerPt = outerPts[ci]
          const lines: React.ReactNode[] = []
          // Line to genre outer point
          if (outerPt) {
            lines.push(
              <line key="genre-line"
                x1={focusedPos.x} y1={focusedPos.y}
                x2={outerPt.x} y2={outerPt.y}
                stroke={BLOOD2} strokeWidth={1} opacity={0.6}
                vectorEffect="non-scaling-stroke"
              />
            )
          }
          // Lines to connected friends
          if (connected) {
            connected.friends.forEach(handle => {
              const fPos = friendPosLookup[handle]
              if (fPos) {
                lines.push(
                  <line key={`friend-${handle}`}
                    x1={focusedPos.x} y1={focusedPos.y}
                    x2={fPos.x} y2={fPos.y}
                    stroke={FRIEND_COL} strokeWidth={0.7} opacity={0.45}
                    vectorEffect="non-scaling-stroke"
                  />
                )
              }
            })
          }
          return lines
        })()}

        {focusedNode?.type === 'genre' && connected && (() => {
          const { ci } = focusedNode
          const outerPt = outerPts[ci]
          if (!outerPt) return null
          const lines: React.ReactNode[] = []
          connected.artists.forEach(name => {
            const aPos = artistPosLookup[name]
            if (aPos) {
              lines.push(
                <line key={`genre-artist-${name}`}
                  x1={outerPt.x} y1={outerPt.y}
                  x2={aPos.x} y2={aPos.y}
                  stroke={BLOOD2} strokeWidth={0.6} opacity={0.3}
                  vectorEffect="non-scaling-stroke"
                />
              )
            }
          })
          return lines
        })()}

        {focusedNode?.type === 'friend' && connected && (() => {
          const { handle } = focusedNode
          const fPos = friendPosLookup[handle]
          if (!fPos) return null
          const lines: React.ReactNode[] = []
          connected.artists.forEach(name => {
            const aPos = artistPosLookup[name]
            if (aPos) {
              lines.push(
                <line key={`friend-artist-${name}`}
                  x1={fPos.x} y1={fPos.y}
                  x2={aPos.x} y2={aPos.y}
                  stroke={FRIEND_COL} strokeWidth={0.7} opacity={0.45}
                  vectorEffect="non-scaling-stroke"
                />
              )
            }
          })
          return lines
        })()}

        {/* ── Artist dots ─────────────────────────────────────────────────── */}
        {clusters.map((cluster, ci) => {
          const ca = outerPts[ci]?.a ?? (-Math.PI / 2 + (ci / 7) * Math.PI * 2)
          return cluster.artists.map((a, j) => {
            const pos      = artistPos(j, ca)
            const isNatural = a.natural !== false
            const dotR     = isNatural
              ? 2.2 + (a.weight / 100) * 6.5    // natural: 2.2–8.7
              : 1.8 + (a.weight / 100) * 3.0     // synthetic: 1.8–4.8 (smaller)
            const isTop    = j === 0
            const isDim    = a.weight < 30
            const isFocused = focusedNode?.type === 'artist' && focusedNode.name === a.name
            const opacity  = isFocused ? 1.0 : getArtistOpacity(a.name, isNatural, isDim)

            return (
              <g
                key={`${ci}-${j}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeClick?.({ type: 'artist', name: a.name, ci })
                }}
                style={{ cursor: onNodeClick ? 'pointer' : 'default', opacity, transition: 'opacity 0.3s ease' }}
              >
                {/* Focused artist pulse ring */}
                {isFocused && (
                  <circle
                    cx={pos.x} cy={pos.y} r={dotR + 8}
                    fill="none" stroke={BLOOD2} strokeWidth={0.8}
                    style={{ animation: 'sigilNodePulse 1.5s ease-in-out infinite' }}
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {/* glow ring for #1 natural artist per cluster */}
                {isTop && isNatural && (
                  <circle
                    cx={pos.x} cy={pos.y} r={dotR + 4.5}
                    fill="none" stroke={BLOOD2} strokeWidth={0.6}
                    opacity={isFocused ? 0.8 : 0.45} vectorEffect="non-scaling-stroke"
                  />
                )}
                <circle
                  cx={pos.x} cy={pos.y} r={dotR}
                  fill={isNatural
                    ? (isTop ? BONE : isDim ? BONE4 : BONE2)
                    : BONE4}
                  opacity={isNatural ? (isDim ? 0.55 : 0.85) : 0.3}
                />
                {/* invisible hit target — easier to tap small dots */}
                <circle cx={pos.x} cy={pos.y} r={Math.max(dotR + 2, 9)} fill="transparent" />
              </g>
            )
          })
        })}

        {/* ── Friend nodes: existing connection lines (drawn under nodes) ───── */}
        {!focusedNode && Object.entries(friendsByCluster).map(([ciStr, friendList]) => {
          const ci = parseInt(ciStr)
          const ca = outerPts[ci]?.a ?? (-Math.PI / 2 + (ci / 7) * Math.PI * 2)
          const count = friendList.length
          return friendList.map(({ friend, connPts }, j) => {
            const spread = count === 1 ? 0 : (j - (count - 1) / 2) * 0.22
            const angle  = ca + spread
            const fx     = CX + Math.cos(angle) * 165
            const fy     = CY + Math.sin(angle) * 165
            return connPts.map((pt, si) => (
              <line
                key={`${friend.handle}-conn-${si}`}
                x1={fx} y1={fy} x2={pt.x} y2={pt.y}
                stroke={FRIEND_COL} strokeWidth={0.55}
                opacity={si === 0 ? 0.5 : 0.2}
                strokeDasharray={si === 0 ? 'none' : '2 2'}
                vectorEffect="non-scaling-stroke"
              />
            ))
          })
        })}

        {/* ── Friend nodes: circles + handle labels ─────────────────────────── */}
        {Object.entries(friendsByCluster).map(([ciStr, friendList]) => {
          const ci = parseInt(ciStr)
          const ca = outerPts[ci]?.a ?? (-Math.PI / 2 + (ci / 7) * Math.PI * 2)
          const count = friendList.length
          return friendList.map(({ friend }, j) => {
            const spread  = count === 1 ? 0 : (j - (count - 1) / 2) * 0.22
            const angle   = ca + spread
            const fx      = CX + Math.cos(angle) * 165
            const fy      = CY + Math.sin(angle) * 165
            const initials = friend.handle.slice(0, 3).toUpperCase()
            const isFocusedFriend = focusedNode?.type === 'friend' && focusedNode.handle === friend.handle
            const fOpacity = getFriendOpacity(friend.handle)
            return (
              <g
                key={friend.handle}
                onClick={(e) => {
                  e.stopPropagation()
                  onNodeClick?.({ type: 'friend', handle: friend.handle })
                }}
                style={{ cursor: onNodeClick ? 'pointer' : 'default', opacity: fOpacity, transition: 'opacity 0.3s ease' }}
              >
                {/* Focused friend pulse ring */}
                {isFocusedFriend && (
                  <circle cx={fx} cy={fy} r={13}
                    fill="none" stroke={FRIEND_COL} strokeWidth={1.2}
                    style={{ animation: 'sigilFriendPulse 1.5s ease-in-out infinite' }}
                    vectorEffect="non-scaling-stroke" />
                )}
                {/* outer glow */}
                <circle cx={fx} cy={fy} r={11}
                  fill="none" stroke={FRIEND_COL} strokeWidth={0.4}
                  opacity={0.25} vectorEffect="non-scaling-stroke" />
                {/* node circle */}
                <circle cx={fx} cy={fy} r={8}
                  fill="rgba(139,202,212,0.15)"
                  stroke={FRIEND_COL} strokeWidth={0.8}
                  vectorEffect="non-scaling-stroke" />
                {/* handle initials */}
                <text x={fx} y={fy + 2.5} textAnchor="middle"
                  style={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 5.5,
                    fill: FRIEND_COL,
                    letterSpacing: 0.3,
                  }}>
                  {initials}
                </text>
                {/* hit area */}
                <circle cx={fx} cy={fy} r={14} fill="transparent" />
              </g>
            )
          })
        })}
      </g>
    </svg>
  )
}
