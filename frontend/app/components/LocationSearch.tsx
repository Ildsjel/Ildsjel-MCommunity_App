'use client'

/**
 * LocationSearch
 *
 * Typeahead component backed by the Nominatim OpenStreetMap geocoding API
 * (free, no key required, 1 req/s rate limit — we debounce at 400 ms).
 *
 * On selection it calls onSelect with all location fields derived from the
 * Nominatim result so the parent can display + save them in one shot.
 */

import { useEffect, useRef, useState } from 'react'
import { Box, Typography } from '@mui/material'

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
}

export interface LocationResult {
  city: string
  region: string
  country: string
  country_code: string
  latitude: number
  longitude: number
  display: string   // human-readable one-liner
}

interface NominatimHit {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    city?: string
    town?: string
    village?: string
    municipality?: string
    county?: string
    state?: string
    region?: string
    country?: string
    country_code?: string
    postcode?: string
  }
}

function parseHit(hit: NominatimHit): LocationResult {
  const a = hit.address
  const city =
    a.city || a.town || a.village || a.municipality || a.county || ''
  const region = a.state || a.region || a.county || ''
  const country = a.country || ''
  const country_code = (a.country_code || '').toUpperCase()

  const parts = [city, region, country].filter(Boolean)
  const display = parts.join(', ')

  return {
    city,
    region,
    country,
    country_code,
    latitude: parseFloat(hit.lat),
    longitude: parseFloat(hit.lon),
    display,
  }
}

interface Props {
  initialValue?: string
  onSelect: (result: LocationResult) => void
  placeholder?: string
}

export default function LocationSearch({
  initialValue = '',
  onSelect,
  placeholder = 'Search city or region…',
}: Props) {
  const [query, setQuery] = useState(initialValue)
  const [results, setResults] = useState<LocationResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setOpen(false); return }
    setLoading(true)
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.searchParams.set('q', q)
      url.searchParams.set('format', 'json')
      url.searchParams.set('addressdetails', '1')
      url.searchParams.set('limit', '6')
      url.searchParams.set('featuretype', 'city')   // prefer city-level results
      const res = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'Grimr/1.0' },
      })
      const hits: NominatimHit[] = await res.json()
      const parsed = hits.map(parseHit).filter((r) => r.city || r.region)
      // Deduplicate by display string
      const seen = new Set<string>()
      const unique = parsed.filter((r) => {
        if (seen.has(r.display)) return false
        seen.add(r.display)
        return true
      })
      setResults(unique)
      setOpen(unique.length > 0)
      setActiveIdx(-1)
    } catch {
      // silent — user can still type manually
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (r: LocationResult) => {
    setQuery(r.display)
    setOpen(false)
    setResults([])
    onSelect(r)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      handleSelect(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <Box ref={containerRef} sx={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <Box sx={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: '#120e18',
            border: '1px solid rgba(216,207,184,0.2)',
            borderRadius: '3px',
            padding: '8px 32px 8px 10px',
            fontFamily: 'var(--font-serif)',
            fontSize: '0.875rem',
            color: 'var(--ink)',
            outline: 'none',
          }}
          onFocusCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = 'rgba(216,207,184,0.5)'
          }}
          onBlurCapture={(e) => {
            (e.target as HTMLInputElement).style.borderColor = 'rgba(216,207,184,0.2)'
          }}
        />
        {/* Spinner / search icon */}
        <Box sx={{
          position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
          fontSize: '0.625rem', color: 'var(--muted)', pointerEvents: 'none',
        }}>
          {loading ? '…' : '⌕'}
        </Box>
      </Box>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <Box sx={{
          position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0,
          zIndex: 100,
          border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
          backgroundColor: '#120e18',
          boxShadow: '2px 4px 12px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {results.map((r, i) => (
            <Box
              key={`${r.display}-${i}`}
              onMouseDown={() => handleSelect(r)}  // mousedown fires before blur
              sx={{
                px: 1.25, py: 0.875,
                cursor: 'pointer',
                backgroundColor: i === activeIdx ? 'rgba(216,207,184,0.06)' : 'transparent',
                borderBottom: i < results.length - 1 ? '1px solid rgba(216,207,184,0.06)' : 'none',
                '&:hover': { backgroundColor: 'rgba(216,207,184,0.06)' },
              }}
            >
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: '0.8125rem', color: 'var(--ink)', lineHeight: 1.3 }}>
                {r.city || r.region}
              </Typography>
              {(r.region || r.country) && (
                <span style={{ ...mono, fontSize: '0.4rem', color: 'var(--muted)', display: 'block' }}>
                  {[r.region, r.country_code].filter(Boolean).join(' · ')}
                </span>
              )}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
