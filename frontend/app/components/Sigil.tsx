'use client'

import { useEffect, useRef } from 'react'

interface SigilProps {
  size?: number
  genres?: string[]
  artists?: string[]
  centerTop?: string
  centerBottom?: string
  loading?: boolean
  dark?: boolean
  className?: string
  style?: React.CSSProperties
}

// Radial Metal-ID sigil — ported from wireframes screens-bundle.js
// Geometry: 4 concentric circles at 0.46 / 0.36 / 0.22 / 0.08 × size
// Outer ring: genre labels · Middle ring: artist markers · Inner: heptagram
export default function Sigil({
  size = 260,
  genres = ['BLACK', 'DOOM', 'SLUDGE', 'POST', 'FUNEREAL'],
  artists = ['Mgła', 'Bell Witch', 'Panopticon', 'Sunn O)))', 'Krallice', 'Ulcerate'],
  centerTop = '—',
  centerBottom = '',
  loading = false,
  dark = false,
  className,
  style,
}: SigilProps) {
  const cx = size / 2
  const cy = size / 2
  const rOuter = size * 0.46
  const rMid   = size * 0.36
  const rInner = size * 0.22
  const rCore  = size * 0.08

  const color   = dark ? '#F1ECE0' : '#141414'
  const opacity = loading ? 0.5 : 1

  // Genre labels on outer ring
  const n = loading ? 5 : genres.length
  const genreLabels = (loading ? ['—', '—', '—', '—', '—'] : genres).map((g, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(a) * (rOuter + 8)
    const y = cy + Math.sin(a) * (rOuter + 8)
    return (
      <text
        key={i}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.027}
        fill={color}
        letterSpacing="1.2"
        fontFamily='"JetBrains Mono", monospace'
        style={{ textTransform: 'uppercase' }}
      >
        {g}
      </text>
    )
  })

  // Artist markers inside (between rMid and rInner)
  const am = loading ? 6 : artists.length
  const artistMarkers = (loading ? Array(6).fill('') : artists).map((a, i) => {
    const ang  = (i / am) * Math.PI * 2 + 0.3
    const x    = cx + Math.cos(ang) * rMid
    const y    = cy + Math.sin(ang) * rMid
    const x2   = cx + Math.cos(ang) * rInner
    const y2   = cy + Math.sin(ang) * rInner
    const txtX = cx + Math.cos(ang) * (rMid + size * 0.04)
    const txtY = cy + Math.sin(ang) * (rMid + size * 0.04)
    return (
      <g key={i} opacity={loading ? 0 : 0.8}>
        <line x1={x2} y1={y2} x2={x} y2={y} stroke={color} strokeWidth="0.6" />
        <circle cx={x} cy={y} r="2" fill={color} />
        <text
          x={txtX}
          y={txtY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.021}
          fill={color}
          fontFamily='"EB Garamond", serif'
          opacity="0.85"
        >
          {a}
        </text>
      </g>
    )
  })

  // Heptagram (star connecting every 3rd of 7 vertices)
  const points7 = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 - Math.PI / 2
    return [cx + Math.cos(a) * rInner, cy + Math.sin(a) * rInner] as [number, number]
  })
  const starLines = points7.map((_, i) => {
    const [x1, y1] = points7[i]
    const [x2, y2] = points7[(i + 3) % 7]
    return (
      <line
        key={i}
        x1={x1} y1={y1}
        x2={x2} y2={y2}
        stroke={color}
        strokeWidth="0.5"
        opacity="0.5"
      />
    )
  })

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: '100%', height: '100%', opacity, ...style }}
      className={className}
      aria-label="Metal-ID Sigil"
    >
      {/* Outer circles */}
      <circle cx={cx} cy={cy} r={rOuter}     fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={rOuter - 3} fill="none" stroke={color} strokeWidth="0.3" strokeDasharray="1 2" />
      <circle cx={cx} cy={cy} r={rMid}       fill="none" stroke={color} strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rInner}     fill="none" stroke={color} strokeWidth="0.5" />
      <circle cx={cx} cy={cy} r={rCore}      fill={color} opacity="0.08" />

      {/* Heptagram */}
      {starLines}

      {/* Artist markers */}
      {artistMarkers}

      {/* Genre labels */}
      {genreLabels}

      {/* Center text */}
      <text
        x={cx} y={cy - 3}
        textAnchor="middle"
        fontSize={size * 0.035}
        fontWeight="700"
        fill={color}
        letterSpacing="1.4"
        fontFamily='"Archivo Black", sans-serif'
      >
        {centerTop}
      </text>
      {centerBottom && (
        <text
          x={cx} y={cy + size * 0.038}
          textAnchor="middle"
          fontSize={size * 0.019}
          fill={color}
          letterSpacing="0.8"
          opacity="0.65"
          fontFamily='"JetBrains Mono", monospace'
        >
          {centerBottom}
        </text>
      )}
    </svg>
  )
}
