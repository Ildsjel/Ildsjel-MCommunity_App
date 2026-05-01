'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

export interface GlobeMarker {
  id: string
  handle: string
  lat: number
  lon: number
  city: string
  country: string
}

interface Props {
  markers: GlobeMarker[]
  myLat?: number
  myLon?: number
  totalFriends?: number
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

// ── World land cache ──────────────────────────────────────────────────────────
// Each ring: [[lon, lat], ...]
type LandRing = [number, number][]
let _landCache: LandRing[] | null = null

async function loadLand(): Promise<LandRing[]> {
  if (_landCache) return _landCache
  try {
    const r = await fetch('/geo/land-110m.json')
    _landCache = await r.json()
  } catch {
    _landCache = []
  }
  return _landCache!
}

// ── Orthographic projection ──────────────────────────────────────────────────

function project(lat: number, lon: number, cLat: number, cLon: number) {
  const φ  = (lat  * Math.PI) / 180
  const λ  = ((lon - cLon) * Math.PI) / 180
  const φ0 = (cLat * Math.PI) / 180
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ)
  return {
    x: Math.cos(φ) * Math.sin(λ),
    y: -(Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ)),
    visible: cosC > 0,
  }
}

// Binary-search the t∈[0,1] where the edge crosses cosC=0.
function horizonT(
  lat0: number, lon0: number, lat1: number, lon1: number,
  cLat: number, cLon: number,
): number {
  let lo = 0, hi = 1
  for (let i = 0; i < 16; i++) {
    const t = (lo + hi) / 2
    if (project(lat0 + t * (lat1 - lat0), lon0 + t * (lon1 - lon0), cLat, cLon).visible) lo = t
    else hi = t
  }
  return (lo + hi) / 2
}

// SVG path for open lines (graticule) — visible segments only, no fill closure.
function buildLinePath(pts: [number, number][], cLat: number, cLon: number, R: number): string {
  const parts: string[] = []
  let penDown = false
  for (const [lat, lon] of pts) {
    const { x, y, visible } = project(lat, lon, cLat, cLon)
    if (visible) {
      const px = (x * R).toFixed(1), py = (y * R).toFixed(1)
      parts.push(penDown ? `L${px},${py}` : `M${px},${py}`)
      penDown = true
    } else {
      penDown = false
    }
  }
  return parts.join('')
}

// Returns sweep-flag (0=CCW, 1=CW) for the SHORTER arc from (x1,y1) to (x2,y2)
// on the globe circle. large-arc is always 0 (we always take the short arc).
// Short arc = correct closing arc for horizon-crossing land polygons.
function shortArcSweep(x1: number, y1: number, x2: number, y2: number): 0 | 1 {
  const cwSweep = (Math.atan2(y2, x2) - Math.atan2(y1, x1) + 2 * Math.PI) % (2 * Math.PI)
  return cwSweep < Math.PI ? 1 : 0  // CW if CW is shorter, CCW otherwise
}

// SVG path for closed polygon rings.
// Builds a single closed path per ring: visible edges joined at the horizon by
// the SHORTER arc along the globe boundary. No chord artifacts, correct fill.
function buildPolygonPath(pts: [number, number][], cLat: number, cLon: number, R: number): string {
  const n = pts.length
  if (n === 0) return ''

  const projs = pts.map(([lat, lon]) => project(lat, lon, cLat, cLon))
  if (!projs.some(p => p.visible)) return ''

  // All visible: simple closed polygon, no clipping needed.
  if (projs.every(p => p.visible)) {
    return projs.map(({ x, y }, i) =>
      (i === 0 ? 'M' : 'L') + (x * R).toFixed(1) + ',' + (y * R).toFixed(1)
    ).join('') + 'Z'
  }

  // Collect all horizon crossings on each edge.
  type Crossing = { type: 'entry' | 'exit'; fromIdx: number; x: number; y: number }
  const crossings: Crossing[] = []
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    if (projs[i].visible !== projs[j].visible) {
      const [lat0, lon0] = pts[i], [lat1, lon1] = pts[j]
      const t  = horizonT(lat0, lon0, lat1, lon1, cLat, cLon)
      const hp = project(lat0 + t * (lat1 - lat0), lon0 + t * (lon1 - lon0), cLat, cLon)
      crossings.push({ type: projs[i].visible ? 'exit' : 'entry', fromIdx: i, x: hp.x * R, y: hp.y * R })
    }
  }

  if (crossings.length === 0 || crossings.length % 2 !== 0) return ''

  // Reorder so we start with an ENTRY crossing.
  const fi = crossings.findIndex(c => c.type === 'entry')
  if (fi < 0) return ''
  const ord = [...crossings.slice(fi), ...crossings.slice(0, fi)]

  const Rs = R.toFixed(1)
  const parts: string[] = []
  const e0 = ord[0]

  parts.push(`M${e0.x.toFixed(1)},${e0.y.toFixed(1)}`)

  for (let ci = 0; ci < ord.length; ci += 2) {
    const entry = ord[ci], exit = ord[ci + 1]

    // Short arc from previous exit to this entry along the globe boundary.
    if (ci > 0) {
      const prevExit = ord[ci - 1]
      const sw = shortArcSweep(prevExit.x, prevExit.y, entry.x, entry.y)
      parts.push(`A${Rs},${Rs},0,0,${sw},${entry.x.toFixed(1)},${entry.y.toFixed(1)}`)
    }

    // Draw visible polygon vertices from entry+1 through exit.fromIdx inclusive.
    for (let k = (entry.fromIdx + 1) % n, iter = 0; iter < n; k = (k + 1) % n, iter++) {
      const { x, y } = projs[k]
      parts.push(`L${(x * R).toFixed(1)},${(y * R).toFixed(1)}`)
      if (k === exit.fromIdx) break
    }

    // Line to the exit horizon point.
    parts.push(`L${exit.x.toFixed(1)},${exit.y.toFixed(1)}`)
  }

  // Short arc from last exit back to first entry (M point), then close.
  const lastExit = ord[ord.length - 1]
  const sw0 = shortArcSweep(lastExit.x, lastExit.y, e0.x, e0.y)
  parts.push(`A${Rs},${Rs},0,0,${sw0},${e0.x.toFixed(1)},${e0.y.toFixed(1)}`)
  parts.push('Z')

  return parts.join('')
}

function buildGraticule(cLat: number, cLon: number, R: number) {
  const regular: string[] = []
  for (const lat of [-60, -30, 0, 30, 60]) {
    const pts: [number, number][] = []
    for (let lon = -180; lon <= 180; lon += 2) pts.push([lat, lon])
    const d = buildLinePath(pts, cLat, cLon, R)
    if (d) regular.push(d)
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: [number, number][] = []
    for (let lat = -88; lat <= 88; lat += 2) pts.push([lat, lon])
    const d = buildLinePath(pts, cLat, cLon, R)
    if (d) regular.push(d)
  }
  return regular
}

// ── Coordinate formatting ─────────────────────────────────────────────────────

function formatDeg(deg: number, isLat: boolean): string {
  const abs = Math.abs(deg)
  const d   = Math.floor(abs)
  const m   = Math.floor((abs - d) * 60)
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
  return `${d}°${String(m).padStart(2, '0')}′${dir}`
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.5, MAX_SCALE = 2.5
const GLOBE_FRAC = 0.38   // R = size * GLOBE_FRAC * scale
const RING1 = 14, RING2 = 26

// ── Component ─────────────────────────────────────────────────────────────────

export default function GlobeWidget({ markers, myLat, myLon, totalFriends }: Props) {
  const router       = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size,    setSize]    = useState(300)
  const [scale,   setScale]   = useState(1.0)
  const [cLat,    setCLat]    = useState(20)
  const [cLon,    setCLon]    = useState(10)
  const [hovered, setHovered] = useState<GlobeMarker & { px: number; py: number } | null>(null)
  const [selected,setSelected]= useState<GlobeMarker | null>(null)
  const [land,    setLand]    = useState<LandRing[]>([])

  const cLatRef    = useRef(20)
  const cLonRef    = useRef(10)
  const scaleRef   = useRef(1.0)
  const dragging   = useRef(false)
  const lastPos    = useRef({ x: 0, y: 0 })
  const autoRotate = useRef(true)
  const rafRef     = useRef<number>(0)
  const resumeRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pinchDist  = useRef<number | null>(null)

  // Responsive size
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(e => {
      const w = e[0].contentRect.width
      if (w > 0) setSize(w)
    })
    ro.observe(el)
    setSize(el.offsetWidth || 300)
    return () => ro.disconnect()
  }, [])

  // Load world land polygons once
  useEffect(() => { loadLand().then(setLand) }, [])

  // Auto-rotation
  useEffect(() => {
    const tick = () => {
      if (autoRotate.current && !dragging.current) {
        cLonRef.current = (cLonRef.current + 0.05) % 360
        setCLon(cLonRef.current)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Pointer drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    autoRotate.current = false
    if (resumeRef.current) clearTimeout(resumeRef.current)
    lastPos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    cLonRef.current = (cLonRef.current + dx * 0.35) % 360
    cLatRef.current = Math.max(-80, Math.min(80, cLatRef.current - dy * 0.35))
    setCLon(cLonRef.current)
    setCLat(cLatRef.current)
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
    resumeRef.current = setTimeout(() => { autoRotate.current = true }, 3000)
  }, [])

  // Scroll zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => {
      const n = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + (e.deltaY > 0 ? -0.12 : 0.12)))
      scaleRef.current = n; return n
    })
  }, [])

  // Touch pinch
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    const d = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
    if (pinchDist.current !== null) {
      const ratio = d / pinchDist.current
      setScale(s => {
        const n = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * ratio))
        scaleRef.current = n; return n
      })
    }
    pinchDist.current = d
  }, [])
  const onTouchEnd = useCallback(() => { pinchDist.current = null }, [])

  // ── Derived ──────────────────────────────────────────────────────────────────

  const R  = size * GLOBE_FRAC * scale
  const CX = size / 2
  // Push globe center down so there's vertical room above for arcs
  const CY = size * 0.54

  const graticule = buildGraticule(cLat, cLon, R)

  // Land paths — data is [lon, lat], buildPolygonPath wants [lat, lon]
  const landPaths: string[] = land.map(ring =>
    buildPolygonPath(ring.map(([lon, lat]) => [lat, lon] as [number, number]), cLat, cLon, R)
  ).filter(Boolean)

  const projected = markers.map(m => {
    const { x, y, visible } = project(m.lat, m.lon, cLat, cLon)
    return { ...m, px: x * R, py: y * R, visible }
  })

  const myProj = myLat !== undefined && myLon !== undefined
    ? project(myLat, myLon, cLat, cLon)
    : null

  const hemisphere = cLat >= 0 ? 'NORTHERN HEMISPHERE' : 'SOUTHERN HEMISPHERE'
  const cities     = new Set(markers.map(m => m.city).filter(Boolean)).size
  const countries  = new Set(markers.map(m => m.country).filter(Boolean)).size
  const devotees   = totalFriends ?? markers.length

  const gid = `gw-${Math.round(size)}` // gradient id namespace

  // Arc control point — capped so arcs stay inside SVG viewport
  function arcPath(x0: number, y0: number, x1: number, y1: number): string {
    const mx   = (x0 + x1) / 2
    const my   = (y0 + y1) / 2
    // Natural lift: distance between points drives the height
    const dist = Math.hypot(x1 - x0, y1 - y0)
    const lift = Math.max(dist * 0.8, R * 0.45)
    // Cap so control point never goes above -R*0.82 (leaves ~18%*R from SVG top)
    const ctrlY = Math.max(my - lift, -R * 0.82)
    return `M${x0.toFixed(1)},${y0.toFixed(1)} Q${mx.toFixed(1)},${ctrlY.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }

  // SVG height = size (globe at CY = 54% down, arcs have 46% above)
  const SVG_H = size

  return (
    <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#0d0a14' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1.25, pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ border: '1px solid rgba(216,207,184,0.25)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '0.5rem', color: 'var(--muted)' }}>
            ←
          </Box>
          <span style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.16em', color: 'var(--muted)', textTransform: 'uppercase' }}>
            ATLAS
          </span>
        </Box>
        <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.1rem', color: 'var(--ink)', lineHeight: 1 }}>
          Of the Devoted
        </Box>
      </Box>

      {/* ── Globe container ─────────────────────────────────────────────── */}
      <Box
        ref={containerRef}
        sx={{ position: 'relative', width: '100%', touchAction: 'none', userSelect: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* HUD left */}
        <Box sx={{ position: 'absolute', top: 8, left: 10, zIndex: 3, pointerEvents: 'none', lineHeight: 1.3 }}>
          <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(216,207,184,0.4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.5rem' }}>◉</span>
            {hemisphere}
          </Box>
          <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.0rem', color: 'var(--ink)', mt: 0.25 }}>
            {formatDeg(cLat, true)}
          </Box>
        </Box>

        {/* HUD right */}
        <Box sx={{ position: 'absolute', top: 8, right: 10, zIndex: 3, pointerEvents: 'none', textAlign: 'right', lineHeight: 1.3 }}>
          <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(216,207,184,0.4)', textTransform: 'uppercase' }}>LONG · TILT</Box>
          <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.0rem', color: 'var(--ink)', mt: 0.25 }}>
            {formatDeg(cLon, false)}
          </Box>
        </Box>

        {/* Zoom controls */}
        <Box sx={{ position: 'absolute', right: 10, top: '42%', zIndex: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {['+', '−'].map((lbl, i) => (
            <Box
              key={lbl}
              component="button"
              onClick={() => setScale(s => {
                const n = i === 0
                  ? Math.min(MAX_SCALE, s + 0.25)
                  : Math.max(MIN_SCALE, s - 0.25)
                scaleRef.current = n; return n
              })}
              sx={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(216,207,184,0.25)', background: 'rgba(13,10,20,0.85)', color: 'var(--ink)', ...mono, fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, '&:hover': { borderColor: 'rgba(216,207,184,0.5)' } }}
            >
              {lbl}
            </Box>
          ))}
        </Box>

        {/* ── SVG ─────────────────────────────────────────────────────── */}
        <svg
          width={size}
          height={SVG_H}
          viewBox={`0 0 ${size} ${SVG_H}`}
          style={{ display: 'block', cursor: 'grab' }}
        >
          <defs>
            <radialGradient id={`${gid}-atm`} cx="45%" cy="38%" r="60%">
              <stop offset="0%"   stopColor="#6b2810" stopOpacity="0.5" />
              <stop offset="60%"  stopColor="#3a1508" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#08060a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${gid}-arc`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%"   stopColor="rgba(196,58,42,0.6)" />
              <stop offset="100%" stopColor="rgba(196,58,42,0.15)" />
            </linearGradient>
            <clipPath id={`${gid}-clip`}>
              <circle cx={0} cy={0} r={R} />
            </clipPath>
          </defs>

          {/* Orbital rings */}
          <circle cx={CX} cy={CY} r={R + RING2} fill="none" stroke="rgba(100,45,20,0.28)" strokeWidth="1.5" strokeDasharray="3 10" />
          <circle cx={CX} cy={CY} r={R + RING1} fill="none" stroke="rgba(110,48,22,0.55)" strokeWidth="10" />
          <circle cx={CX} cy={CY} r={R + RING1 - 5} fill="none" stroke="rgba(60,20,8,0.5)" strokeWidth="4" />

          {/* Atmosphere glow */}
          <circle cx={CX} cy={CY} r={R + 12} fill={`url(#${gid}-atm)`} />

          {/* Globe fill */}
          <circle cx={CX} cy={CY} r={R} fill="#0a0813" />

          {/* ── Clipped globe content ─────────────────────────────────── */}
          <g transform={`translate(${CX},${CY})`} clipPath={`url(#${gid}-clip)`}>

            {/* Land polygons */}
            {landPaths.map((d, i) => (
              <path key={i} d={d} fill="rgba(42,35,70,1)" stroke="rgba(120,108,168,0.28)" strokeWidth="0.7" />
            ))}

            {/* Graticule */}
            {graticule.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(216,207,184,0.07)" strokeWidth="0.5" />
            ))}

            {/* Small grey dots for all markers */}
            {projected.filter(m => m.visible).map(m => (
              <circle key={`dot-${m.id}`} cx={m.px} cy={m.py} r={1.5} fill="rgba(216,207,184,0.25)" />
            ))}
          </g>

          {/* ── Arc lines — NOT clipped, go above globe ───────────────── */}
          {myProj && myProj.visible && (
            <g transform={`translate(${CX},${CY})`}>
              {projected.filter(m => m.visible).map(m => (
                <path
                  key={`arc-${m.id}`}
                  d={arcPath(myProj.x * R, myProj.y * R, m.px, m.py)}
                  fill="none"
                  stroke={`url(#${gid}-arc)`}
                  strokeWidth="1.25"
                  strokeLinecap="round"
                />
              ))}
            </g>
          )}

          {/* ── Clipped: friend dots + user marker ───────────────────── */}
          <g transform={`translate(${CX},${CY})`} clipPath={`url(#${gid}-clip)`}>

            {/* Friend dots with hover hit area */}
            {projected.filter(m => m.visible).map(m => {
              const isSel = selected?.id === m.id
              return (
                <g
                  key={`mk-${m.id}`}
                  style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setSelected(isSel ? null : m) }}
                  onMouseEnter={() => setHovered({ ...m })}
                  onMouseLeave={() => setHovered(h => h?.id === m.id ? null : h)}
                >
                  {/* invisible hit area */}
                  <circle cx={m.px} cy={m.py} r={10} fill="transparent" />
                  {isSel && (
                    <circle cx={m.px} cy={m.py} r={8} fill="rgba(154,26,26,0.12)" stroke="rgba(196,58,42,0.35)" strokeWidth="0.75" />
                  )}
                  <circle
                    cx={m.px} cy={m.py}
                    r={isSel ? 4 : 3}
                    fill={isSel ? 'var(--accent,#c43a2a)' : 'rgba(196,80,58,0.9)'}
                  />
                </g>
              )
            })}

            {/* My location */}
            {myProj && myProj.visible && (
              <>
                <circle cx={myProj.x * R} cy={myProj.y * R} r={5} fill="none" stroke="rgba(196,58,42,0.5)" strokeWidth="1" />
                <circle cx={myProj.x * R} cy={myProj.y * R} r={2.5} fill="var(--accent,#c43a2a)" />
                <text
                  x={myProj.x * R + 8} y={myProj.y * R - 3}
                  fontFamily="Georgia,'Times New Roman',serif"
                  fontStyle="italic"
                  fontSize={Math.max(7, R * 0.055)}
                  fill="rgba(196,58,42,0.6)"
                >
                  my covenant
                </text>
              </>
            )}
          </g>

          {/* Globe outline */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(216,207,184,0.1)" strokeWidth="1" />
        </svg>

        {/* ── Hover tooltip (HTML overlay) ─────────────────────────────── */}
        {hovered && (() => {
          const tx = CX + hovered.px
          const ty = CY + hovered.py
          const onRight = tx < size * 0.65
          return (
            <Box
              sx={{
                position: 'absolute',
                left: onRight ? tx + 14 : 'auto',
                right: onRight ? 'auto' : size - tx + 14,
                top: Math.max(4, ty - 28),
                zIndex: 10,
                pointerEvents: 'none',
                backgroundColor: 'rgba(13,10,20,0.92)',
                border: '1px solid rgba(196,58,42,0.4)',
                borderRadius: '3px',
                px: 1.25,
                py: 0.75,
                minWidth: 90,
                backdropFilter: 'blur(6px)',
              }}
            >
              <Box
                sx={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', cursor: 'pointer', pointerEvents: 'auto', mb: 0.25 }}
                onClick={() => router.push(`/profile/${hovered.id}`)}
              >
                {hovered.handle} →
              </Box>
              {hovered.city && (
                <Box sx={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(216,207,184,0.55)' }}>
                  {[hovered.city, hovered.country].filter(Boolean).join(', ')}
                </Box>
              )}
            </Box>
          )
        })()}

        {/* Footer bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', px: 1.5, py: 1, backgroundColor: 'rgba(8,6,10,0.72)', backdropFilter: 'blur(6px)', borderTop: '1px solid rgba(216,207,184,0.08)' }}>
          <Box>
            <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(216,207,184,0.3)', textTransform: 'uppercase' }}>MMXXVI · LVL 7</Box>
            <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'rgba(216,207,184,0.45)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <span style={{ color: 'var(--accent)' }}>◉</span>
              {devotees} DEVOTEES BOUND
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'rgba(216,207,184,0.45)', textTransform: 'uppercase' }}>ZOOM {scale.toFixed(2)}×</Box>
            <Box sx={{ ...mono, fontSize: '0.375rem', letterSpacing: '0.1em', color: 'rgba(216,207,184,0.25)', textTransform: 'uppercase', mt: 0.25 }}>DRAG · PINCH · SCROLL</Box>
          </Box>
        </Box>
      </Box>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', borderTop: '1px solid rgba(216,207,184,0.08)' }}>
        {[
          { value: devotees, label: 'DEVOTEES' },
          { value: cities,   label: 'CITIES'   },
          { value: countries,label: 'COUNTRIES' },
        ].map(({ value, label }, i, arr) => (
          <Box key={label} sx={{ flex: 1, textAlign: 'center', py: 1.25, borderRight: i < arr.length - 1 ? '1px solid rgba(216,207,184,0.08)' : 'none' }}>
            <Box sx={{ fontFamily: 'var(--font-medieval,"UnifrakturCook",serif)', fontSize: '1.35rem', color: 'var(--accent)', lineHeight: 1 }}>
              {value}
            </Box>
            <Box sx={{ ...mono, fontSize: '0.375rem', letterSpacing: '0.14em', color: 'rgba(216,207,184,0.35)', textTransform: 'uppercase', mt: 0.5 }}>
              {label}
            </Box>
          </Box>
        ))}
      </Box>

      {/* ── Selected card ───────────────────────────────────────────────── */}
      {selected && (
        <Box sx={{ borderTop: '1px solid rgba(216,207,184,0.12)', px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#120e18' }}>
          <Box>
            <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: 3, cursor: 'pointer' }} onClick={() => router.push(`/profile/${selected.id}`)}>
              {selected.handle} →
            </span>
            <Box sx={{ fontFamily: 'Georgia,serif', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              {[selected.city, selected.country].filter(Boolean).join(', ')}
            </Box>
          </Box>
          <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase' }} onClick={() => setSelected(null)}>✕</span>
        </Box>
      )}
    </Box>
  )
}
