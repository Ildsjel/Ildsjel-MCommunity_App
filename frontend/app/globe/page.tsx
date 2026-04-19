'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

interface GlobeUser {
  lat: number
  lon: number
  handle: string
  city: string
  country: string
}

interface GlobeData {
  self: GlobeUser | null
  metalheads: GlobeUser[]
}

// Orthographic projection — returns unit-sphere coords relative to (0,0)
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

// Build a single SVG path string for a line on the globe, already scaled by R
function buildPath(
  points: Array<[number, number]>, // [lat, lon] pairs
  cLat: number,
  cLon: number,
  R: number,
): string {
  const parts: string[] = []
  let down = false
  for (const [lat, lon] of points) {
    const { x, y, visible } = project(lat, lon, cLat, cLon)
    if (!visible) { down = false; continue }
    const xs = (x * R).toFixed(1)
    const ys = (y * R).toFixed(1)
    parts.push(down ? `L${xs},${ys}` : `M${xs},${ys}`)
    down = true
  }
  return parts.length > 1 ? parts.join('') : ''
}

interface Graticule {
  regular: string[]
  equator: string
}

function buildGraticule(cLat: number, cLon: number, R: number): Graticule {
  const regular: string[] = []

  // Parallels at 30° (skip equator — rendered separately)
  for (const lat of [-60, -30, 30, 60]) {
    const pts: Array<[number, number]> = []
    for (let lon = -180; lon <= 180; lon += 2) pts.push([lat, lon])
    const d = buildPath(pts, cLat, cLon, R)
    if (d) regular.push(d)
  }

  // Meridians every 30°
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: Array<[number, number]> = []
    for (let lat = -88; lat <= 88; lat += 2) pts.push([lat, lon])
    const d = buildPath(pts, cLat, cLon, R)
    if (d) regular.push(d)
  }

  // Equator
  const eqPts: Array<[number, number]> = []
  for (let lon = -180; lon <= 180; lon += 2) eqPts.push([0, lon])
  const equator = buildPath(eqPts, cLat, cLon, R)

  return { regular, equator }
}

export default function GlobePage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  const [data, setData] = useState<GlobeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [cLat, setCLat] = useState(20)
  const [cLon, setCLon] = useState(10)
  const [selected, setSelected] = useState<GlobeUser | null>(null)

  const cLatRef = useRef(20)
  const cLonRef = useRef(10)
  const dragging = useRef(false)
  const lastPos = useRef({ x: 0, y: 0 })
  const autoRotate = useRef(true)
  const rafRef = useRef<number>(0)
  const autoResumeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/auth/login'); return }
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth/login'); return }

    axios
      .get(`${API_BASE}/api/v1/globe/data`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err.response?.status === 401) router.push('/auth/login')
        else setData({ self: null, metalheads: [] })
      })
      .finally(() => setLoading(false))
  }, [user, userLoading, router])

  // Auto-rotation loop
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

  if (userLoading || loading) return (
    <>
      <Navigation />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
      </Box>
    </>
  )

  const hasLocation = !!data?.self
  const allUsers = [
    ...(data?.metalheads ?? []).map(u => ({ ...u, isSelf: false })),
    ...(data?.self ? [{ ...data.self, isSelf: true }] : []),
  ]

  const R = 130
  const SIZE = 300
  const CX = SIZE / 2
  const CY = SIZE / 2

  const { regular, equator } = buildGraticule(cLat, cLon, R)

  const projected = allUsers
    .map(u => {
      const { x, y, visible } = project(u.lat, u.lon, cLat, cLon)
      return { ...u, px: x * R, py: y * R, visible }
    })
    .filter(u => u.visible)
    // render self last so it's on top
    .sort((a, b) => (a.isSelf ? 1 : 0) - (b.isSelf ? 1 : 0))

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 12 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Metal Match · Atlas
          </span>
          <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            {allUsers.length} {allUsers.length === 1 ? 'devotee' : 'devotees'}
          </span>
        </Box>

        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center', mb: 0.5 }}>
          — Atlas of the Devoted —
        </Typography>
        <Typography variant="h4" sx={{ textAlign: 'center', mb: 2.5, fontSize: '1.35rem', letterSpacing: '0.04em' }}>
          {user?.handle}
        </Typography>

        {/* Globe */}
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            sx={{
              width: SIZE, height: SIZE,
              cursor: 'grab', touchAction: 'none', userSelect: 'none',
              '&:active': { cursor: 'grabbing' },
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              style={{ display: 'block' }}
            >
              <defs>
                <radialGradient id="globe-atm" cx="42%" cy="38%" r="58%">
                  <stop offset="0%" stopColor="#4a1800" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#08060a" stopOpacity="0" />
                </radialGradient>
                <clipPath id="globe-clip">
                  <circle cx={CX} cy={CY} r={R} />
                </clipPath>
              </defs>

              {/* Atmosphere */}
              <circle cx={CX} cy={CY} r={R + 8} fill="url(#globe-atm)" />

              {/* Sphere fill */}
              <circle cx={CX} cy={CY} r={R} fill="#0b0810" />

              {/* All globe content clipped inside sphere */}
              <g transform={`translate(${CX},${CY})`} clipPath="url(#globe-clip)">
                {/* Regular graticule */}
                {regular.map((d, i) => (
                  <path key={i} d={d} fill="none" stroke="rgba(216,207,184,0.06)" strokeWidth="0.5" />
                ))}

                {/* Equator */}
                {equator && (
                  <path d={equator} fill="none" stroke="rgba(216,207,184,0.16)" strokeWidth="0.75" />
                )}

                {/* Metalhead dots */}
                {projected.filter(u => !u.isSelf).map((u, i) => {
                  const isSel = selected?.handle === u.handle
                  return (
                    <g
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); setSelected(isSel ? null : u) }}
                    >
                      {isSel && <circle cx={u.px} cy={u.py} r={6} fill="rgba(216,207,184,0.1)" stroke="rgba(216,207,184,0.3)" strokeWidth="0.75" />}
                      <circle cx={u.px} cy={u.py} r={2.5} fill={isSel ? 'rgba(216,207,184,0.95)' : 'rgba(180,162,122,0.65)'} />
                    </g>
                  )
                })}

                {/* Self dot */}
                {projected.filter(u => u.isSelf).map((u, i) => (
                  <g key={i}>
                    <circle cx={u.px} cy={u.py} r={10} fill="rgba(180,100,40,0.08)" />
                    <circle cx={u.px} cy={u.py} r={5.5} fill="none" stroke="rgba(216,207,184,0.22)" strokeWidth="1" />
                    <circle cx={u.px} cy={u.py} r={3.5} fill="var(--accent, #b5905a)" />
                  </g>
                ))}
              </g>

              {/* Sphere rim */}
              <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(216,207,184,0.12)" strokeWidth="1" />
            </svg>
          </Box>
        </Box>

        {/* Drag hint */}
        <Typography sx={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', color: 'rgba(216,207,184,0.22)', mb: 2 }}>
          Drag to rotate · tap a dot to inspect
        </Typography>

        {/* Selected user card */}
        {selected && (
          <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: '10px 14px', mb: 2, backgroundColor: '#120e18', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>
                {selected.handle}
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

        {/* No location callout */}
        {!hasLocation && (
          <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', p: '14px 16px', mb: 2, backgroundColor: '#120e18' }}>
            <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
              Location · Uncharted
            </span>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)', lineHeight: 1.5 }}>
              Your mark is not yet on the Atlas. Add a city to your profile to join the devoted on the map.
            </Typography>
          </Box>
        )}

        {/* Legend */}
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', backgroundColor: '#120e18' }}>
          <Box sx={{ p: '10px 14px' }}>
            <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 10 }}>
              Reading the Atlas
            </span>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <svg width={14} height={14} style={{ flexShrink: 0 }}>
                  <circle cx={7} cy={7} r={3.5} fill="var(--accent, #b5905a)" />
                </svg>
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  Your location
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <svg width={14} height={14} style={{ flexShrink: 0 }}>
                  <circle cx={7} cy={7} r={2.5} fill="rgba(180,162,122,0.65)" />
                </svg>
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                  Fellow metalhead · tap to inspect
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

      </Box>
    </>
  )
}
