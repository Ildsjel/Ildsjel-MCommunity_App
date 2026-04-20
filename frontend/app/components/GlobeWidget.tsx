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

// ── Projection ──────────────────────────────────────────────────────────────

function project(lat: number, lon: number, cLat: number, cLon: number) {
  const φ = (lat * Math.PI) / 180
  const λ = ((lon - cLon) * Math.PI) / 180
  const φ0 = (cLat * Math.PI) / 180
  const cosC = Math.sin(φ0) * Math.sin(φ) + Math.cos(φ0) * Math.cos(φ) * Math.cos(λ)
  return {
    x: Math.cos(φ) * Math.sin(λ),
    y: -(Math.cos(φ0) * Math.sin(φ) - Math.sin(φ0) * Math.cos(φ) * Math.cos(λ)),
    visible: cosC > 0,
  }
}

function buildPath(points: Array<[number, number]>, cLat: number, cLon: number, R: number): string {
  const parts: string[] = []
  let down = false
  for (const [lat, lon] of points) {
    const { x, y, visible } = project(lat, lon, cLat, cLon)
    if (!visible) { down = false; continue }
    parts.push(down ? `L${(x * R).toFixed(1)},${(y * R).toFixed(1)}` : `M${(x * R).toFixed(1)},${(y * R).toFixed(1)}`)
    down = true
  }
  return parts.length > 1 ? parts.join('') : ''
}

function buildGraticule(cLat: number, cLon: number, R: number) {
  const regular: string[] = []
  for (const lat of [-60, -30, 30, 60]) {
    const pts: Array<[number, number]> = []
    for (let lon = -180; lon <= 180; lon += 2) pts.push([lat, lon])
    const d = buildPath(pts, cLat, cLon, R)
    if (d) regular.push(d)
  }
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: Array<[number, number]> = []
    for (let lat = -88; lat <= 88; lat += 2) pts.push([lat, lon])
    const d = buildPath(pts, cLat, cLon, R)
    if (d) regular.push(d)
  }
  const eqPts: Array<[number, number]> = []
  for (let lon = -180; lon <= 180; lon += 2) eqPts.push([0, lon])
  return { regular, equator: buildPath(eqPts, cLat, cLon, R) }
}

// ── Coordinate formatting ────────────────────────────────────────────────────

function formatDeg(deg: number, isLat: boolean): string {
  const abs = Math.abs(deg)
  const d = Math.floor(abs)
  const m = Math.floor((abs - d) * 60)
  const dir = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W')
  return `${d}°${String(m).padStart(2, '0')}′${dir}`
}

// ── Component ────────────────────────────────────────────────────────────────

const MIN_SCALE = 0.5
const MAX_SCALE = 2.5
const GLOBE_FRACTION = 0.38   // R = size * GLOBE_FRACTION * scale
const RING1 = 14              // first orbital ring offset from R
const RING2 = 26              // second orbital ring offset from R
const ARC_LIFT = 1.05         // control point lifts above midpoint by R * ARC_LIFT

export default function GlobeWidget({ markers, myLat, myLon, totalFriends }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(300)
  const [scale, setScale] = useState(1.0)
  const [cLat, setCLat] = useState(20)
  const [cLon, setCLon] = useState(10)
  const [selected, setSelected] = useState<GlobeMarker | null>(null)

  const cLatRef = useRef(20)
  const cLonRef = useRef(10)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const autoRotate = useRef(true)
  const rafRef = useRef<number>(0)
  const autoResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Pinch state
  const pinchDist = useRef<number | null>(null)
  const scaleRef = useRef(1.0)

  // Responsive size via ResizeObserver
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0].contentRect.width
      if (w > 0) setSize(w)
    })
    ro.observe(el)
    setSize(el.offsetWidth || 300)
    return () => ro.disconnect()
  }, [])

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

  // Drag / rotate
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    autoRotate.current = false
    if (autoResumeRef.current) clearTimeout(autoResumeRef.current)
    lastPos.current = { x: e.clientX, y: e.clientY }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    cLonRef.current = (cLonRef.current + dx * 0.35) % 360
    cLatRef.current = Math.max(-80, Math.min(80, cLatRef.current - dy * 0.35))
    setCLon(cLonRef.current)
    setCLat(cLatRef.current)
  }, [])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
    autoResumeRef.current = setTimeout(() => { autoRotate.current = true }, 3000)
  }, [])

  // Scroll-to-zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.15 : 0.15
    setScale(s => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta))
      scaleRef.current = next
      return next
    })
  }, [])

  // Touch pinch-to-zoom
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return
    const dx = e.touches[0].clientX - e.touches[1].clientX
    const dy = e.touches[0].clientY - e.touches[1].clientY
    const dist = Math.hypot(dx, dy)
    if (pinchDist.current !== null) {
      const ratio = dist / pinchDist.current
      setScale(s => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleRef.current * ratio))
        scaleRef.current = next
        return next
      })
    }
    pinchDist.current = dist
  }, [])

  const handleTouchEnd = useCallback(() => { pinchDist.current = null }, [])

  // ── Derived values ────────────────────────────────────────────────────────
  const R = size * GLOBE_FRACTION * scale
  const CX = size / 2
  const CY = size / 2

  const { regular, equator } = buildGraticule(cLat, cLon, R)

  const projected = markers.map(m => {
    const { x, y, visible } = project(m.lat, m.lon, cLat, cLon)
    return { ...m, px: x * R, py: y * R, visible }
  })

  const myProj = (myLat !== undefined && myLon !== undefined)
    ? project(myLat, myLon, cLat, cLon)
    : null

  const hemisphere = cLat >= 0 ? 'NORTHERN HEMISPHERE' : 'SOUTHERN HEMISPHERE'
  const cities = new Set(markers.map(m => m.city).filter(Boolean)).size
  const countries = new Set(markers.map(m => m.country).filter(Boolean)).size
  const devotees = totalFriends ?? markers.length

  const gradId = `gw-atm-${size}`  // stable enough for SSR

  return (
    <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', overflow: 'hidden', backgroundColor: '#0d0a14' }}>

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1.25, pb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ border: '1px solid rgba(216,207,184,0.25)', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '0.5rem', color: 'var(--muted)', cursor: 'default' }}>
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

      {/* ── Globe area ──────────────────────────────────────────────────── */}
      <Box
        ref={containerRef}
        sx={{ position: 'relative', width: '100%', touchAction: 'none', userSelect: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* HUD — top-left */}
        <Box sx={{ position: 'absolute', top: 8, left: 10, zIndex: 3, pointerEvents: 'none', lineHeight: 1.3 }}>
          <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(216,207,184,0.4)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ color: 'var(--accent)', fontSize: '0.5rem' }}>◉</span>
            {hemisphere}
          </Box>
          <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.0rem', color: 'var(--ink)', mt: 0.25 }}>
            {formatDeg(cLat, true)}
          </Box>
        </Box>

        {/* HUD — top-right */}
        <Box sx={{ position: 'absolute', top: 8, right: 10, zIndex: 3, pointerEvents: 'none', textAlign: 'right', lineHeight: 1.3 }}>
          <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(216,207,184,0.4)', textTransform: 'uppercase' }}>
            LONG · TILT
          </Box>
          <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.0rem', color: 'var(--ink)', mt: 0.25 }}>
            {formatDeg(cLon, false)}
          </Box>
        </Box>

        {/* Zoom controls — right rail */}
        <Box sx={{ position: 'absolute', right: 10, top: '38%', zIndex: 3, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Box
            component="button"
            onClick={() => setScale(s => { const n = Math.min(MAX_SCALE, s + 0.25); scaleRef.current = n; return n })}
            sx={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(216,207,184,0.25)', background: 'rgba(13,10,20,0.8)', color: 'var(--ink)', ...mono, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, '&:hover': { borderColor: 'rgba(216,207,184,0.5)' } }}
          >
            +
          </Box>
          <Box
            component="button"
            onClick={() => setScale(s => { const n = Math.max(MIN_SCALE, s - 0.25); scaleRef.current = n; return n })}
            sx={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid rgba(216,207,184,0.25)', background: 'rgba(13,10,20,0.8)', color: 'var(--ink)', ...mono, fontSize: '0.875rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, '&:hover': { borderColor: 'rgba(216,207,184,0.5)' } }}
          >
            −
          </Box>
        </Box>

        {/* SVG globe */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block', cursor: 'grab' }}
        >
          <defs>
            <radialGradient id={`${gradId}-glow`} cx="45%" cy="38%" r="60%">
              <stop offset="0%" stopColor="#6b2810" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#3a1508" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#08060a" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${gradId}-ring`} cx="50%" cy="50%" r="50%">
              <stop offset="70%" stopColor="rgba(90,40,20,0)" />
              <stop offset="100%" stopColor="rgba(90,40,20,0.15)" />
            </radialGradient>
            <clipPath id={`${gradId}-clip`}>
              <circle cx={CX} cy={CY} r={R} />
            </clipPath>
          </defs>

          {/* Orbital ring 2 — outer dashed */}
          <circle
            cx={CX} cy={CY} r={R + RING2}
            fill="none"
            stroke="rgba(100,45,20,0.3)"
            strokeWidth="1.5"
            strokeDasharray="3 10"
          />
          {/* Orbital ring 1 — inner thick gradient-like */}
          <circle
            cx={CX} cy={CY} r={R + RING1}
            fill="none"
            stroke="rgba(110,48,22,0.55)"
            strokeWidth="10"
            strokeOpacity="0.6"
          />
          {/* Inner edge of ring 1 — darker */}
          <circle
            cx={CX} cy={CY} r={R + RING1 - 5}
            fill="none"
            stroke="rgba(60,20,8,0.5)"
            strokeWidth="4"
          />

          {/* Atmosphere glow */}
          <circle cx={CX} cy={CY} r={R + 12} fill={`url(#${gradId}-glow)`} />

          {/* Globe fill */}
          <circle cx={CX} cy={CY} r={R} fill="#0e0b18" />

          {/* Graticule — clipped to globe */}
          <g transform={`translate(${CX},${CY})`} clipPath={`url(#${gradId}-clip)`}>
            {regular.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="rgba(216,207,184,0.055)" strokeWidth="0.5" />
            ))}
            {equator && (
              <path d={equator} fill="none" stroke="rgba(216,207,184,0.14)" strokeWidth="0.7" />
            )}
          </g>

          {/* Arc lines from my location to each friend — NOT clipped */}
          {myProj && myProj.visible && (
            <g transform={`translate(${CX},${CY})`}>
              {projected.filter(m => m.visible).map(m => {
                const x0 = myProj.x * R
                const y0 = myProj.y * R
                const x1 = m.px
                const y1 = m.py
                // Control point: midpoint lifted upward
                const mx = (x0 + x1) / 2
                const my = (y0 + y1) / 2
                const lift = R * ARC_LIFT
                const ctrlX = mx
                const ctrlY = my - lift
                return (
                  <path
                    key={m.id}
                    d={`M${x0.toFixed(1)},${y0.toFixed(1)} Q${ctrlX.toFixed(1)},${ctrlY.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`}
                    fill="none"
                    stroke="rgba(196,58,42,0.45)"
                    strokeWidth="1"
                  />
                )
              })}
            </g>
          )}

          {/* Friend dots — clipped */}
          <g transform={`translate(${CX},${CY})`} clipPath={`url(#${gradId}-clip)`}>
            {projected.filter(m => m.visible).map(m => {
              const isSel = selected?.id === m.id
              return (
                <g
                  key={m.id}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : m) }}
                >
                  {isSel && (
                    <circle cx={m.px} cy={m.py} r={8} fill="rgba(154,26,26,0.12)" stroke="rgba(196,58,42,0.4)" strokeWidth="0.75" />
                  )}
                  <circle
                    cx={m.px} cy={m.py}
                    r={isSel ? 3.5 : 2.8}
                    fill={isSel ? 'var(--accent, #c43a2a)' : 'rgba(196,80,58,0.9)'}
                  />
                </g>
              )
            })}

            {/* My location — covenant marker */}
            {myProj && myProj.visible && (
              <>
                <circle
                  cx={myProj.x * R} cy={myProj.y * R}
                  r={5} fill="none"
                  stroke="rgba(196,58,42,0.55)" strokeWidth="1"
                />
                <circle
                  cx={myProj.x * R} cy={myProj.y * R}
                  r={2.5} fill="var(--accent, #c43a2a)"
                />
                <text
                  x={myProj.x * R + 8} y={myProj.y * R - 3}
                  fontFamily="Georgia, 'Times New Roman', serif"
                  fontStyle="italic"
                  fontSize={Math.max(7, R * 0.055)}
                  fill="rgba(196,58,42,0.65)"
                >
                  my covenant
                </text>
              </>
            )}
          </g>

          {/* Globe outline */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(216,207,184,0.1)" strokeWidth="1" />
        </svg>

        {/* Footer bar */}
        <Box sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          px: 1.5, py: 1,
          backgroundColor: 'rgba(8,6,10,0.7)',
          backdropFilter: 'blur(6px)',
          borderTop: '1px solid rgba(216,207,184,0.08)',
        }}>
          <Box>
            <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'rgba(216,207,184,0.3)', textTransform: 'uppercase' }}>
              MMXXVI · LVL 7
            </Box>
            <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'rgba(216,207,184,0.45)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <span style={{ color: 'var(--accent)' }}>◉</span>
              {devotees} DEVOTEES BOUND
            </Box>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Box sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'rgba(216,207,184,0.45)', textTransform: 'uppercase' }}>
              ZOOM {scale.toFixed(2)}×
            </Box>
            <Box sx={{ ...mono, fontSize: '0.375rem', letterSpacing: '0.1em', color: 'rgba(216,207,184,0.25)', textTransform: 'uppercase', mt: 0.25 }}>
              DRAG · PINCH · SCROLL
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', borderTop: '1px solid rgba(216,207,184,0.08)' }}>
        {[
          { value: devotees, label: 'DEVOTEES' },
          { value: cities, label: 'CITIES' },
          { value: countries, label: 'COUNTRIES' },
        ].map(({ value, label }, i, arr) => (
          <Box
            key={label}
            sx={{
              flex: 1,
              textAlign: 'center',
              py: 1.25,
              borderRight: i < arr.length - 1 ? '1px solid rgba(216,207,184,0.08)' : 'none',
            }}
          >
            <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.35rem', color: 'var(--accent)', lineHeight: 1 }}>
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
            <span
              style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: 3, cursor: 'pointer' }}
              onClick={() => router.push(`/profile/${selected.id}`)}
            >
              {selected.handle} →
            </span>
            <Box sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              {[selected.city, selected.country].filter(Boolean).join(', ')}
            </Box>
          </Box>
          <span
            style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase' }}
            onClick={() => setSelected(null)}
          >
            ✕
          </span>
        </Box>
      )}
    </Box>
  )
}
