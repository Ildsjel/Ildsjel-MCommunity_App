'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Box, Typography } from '@mui/material'
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
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

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

function buildPath(points: Array<[number, number]>, cLat: number, cLon: number, R: number) {
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

const R = 130
const SIZE = 300
const CX = SIZE / 2
const CY = SIZE / 2

export default function GlobeWidget({ markers }: Props) {
  const router = useRouter()
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

  useEffect(() => {
    const tick = () => {
      if (autoRotate.current && !dragging.current) {
        cLonRef.current = (cLonRef.current + 0.06) % 360
        setCLon(cLonRef.current)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

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

  const { regular, equator } = buildGraticule(cLat, cLon, R)

  const projected = markers
    .map(m => {
      const { x, y, visible } = project(m.lat, m.lon, cLat, cLon)
      return { ...m, px: x * R, py: y * R, visible }
    })
    .filter(m => m.visible)

  return (
    <Box>
      {/* Globe */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.5 }}>
        <Box
          sx={{ width: SIZE, height: SIZE, cursor: 'grab', touchAction: 'none', userSelect: 'none', '&:active': { cursor: 'grabbing' } }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: 'block' }}>
            <defs>
              <radialGradient id="fw-globe-atm" cx="42%" cy="38%" r="58%">
                <stop offset="0%" stopColor="#4a1800" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#08060a" stopOpacity="0" />
              </radialGradient>
              <clipPath id="fw-globe-clip">
                <circle cx={CX} cy={CY} r={R} />
              </clipPath>
            </defs>

            <circle cx={CX} cy={CY} r={R + 8} fill="url(#fw-globe-atm)" />
            <circle cx={CX} cy={CY} r={R} fill="#0b0810" />

            <g transform={`translate(${CX},${CY})`} clipPath="url(#fw-globe-clip)">
              {regular.map((d, i) => (
                <path key={i} d={d} fill="none" stroke="rgba(216,207,184,0.06)" strokeWidth="0.5" />
              ))}
              {equator && (
                <path d={equator} fill="none" stroke="rgba(216,207,184,0.16)" strokeWidth="0.75" />
              )}
              {projected.map((m) => {
                const isSel = selected?.id === m.id
                return (
                  <g
                    key={m.id}
                    style={{ cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : m) }}
                  >
                    {isSel && (
                      <circle cx={m.px} cy={m.py} r={7} fill="rgba(154,26,26,0.15)" stroke="rgba(154,26,26,0.5)" strokeWidth="0.75" />
                    )}
                    <circle
                      cx={m.px} cy={m.py} r={isSel ? 3.5 : 2.5}
                      fill={isSel ? 'var(--accent, #c4443a)' : 'rgba(196,100,80,0.75)'}
                    />
                  </g>
                )
              })}
            </g>

            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(216,207,184,0.12)" strokeWidth="1" />
          </svg>
        </Box>
      </Box>

      {/* Hint */}
      <Typography sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', color: 'rgba(216,207,184,0.22)', mb: 1.5 }}>
        Drag to rotate · tap a dot to inspect
      </Typography>

      {/* Selected card */}
      {selected && (
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: '10px 14px', mb: 1.5, backgroundColor: '#120e18', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <span
              style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: 3, cursor: 'pointer' }}
              onClick={() => router.push(`/profile/${selected.id}`)}
            >
              {selected.handle} →
            </span>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              {[selected.city, selected.country].filter(Boolean).join(', ')}
            </Typography>
          </Box>
          <span
            style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--muted)', cursor: 'pointer', textTransform: 'uppercase' }}
            onClick={() => setSelected(null)}
          >
            ✕
          </span>
        </Box>
      )}

      {/* Empty state */}
      {markers.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center' }}>
          No comrades have a known location yet.
        </Typography>
      )}
    </Box>
  )
}
