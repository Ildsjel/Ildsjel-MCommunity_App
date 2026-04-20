'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material'
import Navigation from '@/app/components/Navigation'
import axios from 'axios'
import { getErrorMessage } from '@/lib/types/apiError'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SharedArtist { artist_id: string; artist_name: string; play_count_requester: number; play_count_target: number }
interface ProfileSearchHit {
  user_id: string; handle: string; city_bucket?: string; profile_image_url?: string
  top_shared_artists: SharedArtist[]; shared_genres: string[]
  compatibility_score?: number; search_score: number; badges: string[]
  distance_km?: number; last_active?: string
}
interface SearchResponse { hits: ProfileSearchHit[]; total: number; next_cursor?: string; query_time_ms: number }

type SearchType = 'mixed' | 'name' | 'artist' | 'genre'

const CHIPS: { label: string; value: SearchType | 'all' }[] = [
  { label: 'ALL', value: 'all' },
  { label: 'PEOPLE', value: 'name' },
  { label: 'BANDS', value: 'artist' },
  { label: 'GENRES', value: 'genre' },
]

const TRENDING = [
  { badge: 'BAND · +142%', name: 'Chat Pile' },
  { badge: 'GENRE · +67%', name: 'Dungeon Synth' },
  { badge: 'REVIEW · 98↑', name: 'Mirror Reaper' },
  { badge: 'USER · NEW', name: 'BRÁGI' },
]

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [activeChip, setActiveChip] = useState<SearchType | 'all'>('all')
  const [results, setResults] = useState<ProfileSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [hasSearched, setHasSearched] = useState(false)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    const q = searchParams?.get('q')
    if (q) { setQuery(q); performSearch(q, activeChip) }
    else loadRandomUsers()
    const stored = localStorage.getItem('grimr_recent_searches')
    if (stored) setRecent(JSON.parse(stored).slice(0, 5))
  }, [])

  const saveRecent = (q: string) => {
    const updated = [q, ...recent.filter((r) => r !== q)].slice(0, 5)
    setRecent(updated)
    localStorage.setItem('grimr_recent_searches', JSON.stringify(updated))
  }

  const loadRandomUsers = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get<SearchResponse>(`${API_BASE}/api/v1/search/random?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResults(res.data.hits); setTotal(res.data.total)
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Failed to load users'))
    } finally { setLoading(false) }
  }

  const performSearch = async (q: string, type: SearchType | 'all') => {
    if (q.length < 2) { setError('Enter at least 2 characters'); return }
    setLoading(true); setError(''); setHasSearched(true)
    saveRecent(q)
    try {
      const token = localStorage.getItem('access_token')
      const searchType = type === 'all' ? 'mixed' : type
      const params = new URLSearchParams({ q, type: searchType, limit: '20' })
      const res = await axios.get<SearchResponse>(`${API_BASE}/api/v1/search/profiles?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResults(res.data.hits); setTotal(res.data.total)
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Search failed'))
    } finally { setLoading(false) }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) performSearch(query.trim(), activeChip)
  }

  const handleRecentClick = (q: string) => {
    setQuery(q)
    performSearch(q, activeChip)
  }

  const handleChipClick = (chip: SearchType | 'all') => {
    setActiveChip(chip)
    if (query.trim().length >= 2) performSearch(query.trim(), chip)
  }

  const showIdle = !hasSearched && results.length === 0 && !loading

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 4 }}>

        {/* Search box */}
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            border: '1.5px solid rgba(216,207,184,0.2)',
            borderRadius: '3px',
            backgroundColor: '#120e18',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.25,
            py: 1,
            mb: 1.25,
          }}
        >
          <span style={{ fontSize: '1rem', lineHeight: 1, color: 'var(--muted)' }}>⌕</span>
          <Box
            component="input"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, bands, genres…"
            sx={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: 'var(--font-serif, "EB Garamond", serif)',
              fontStyle: 'italic',
              fontSize: '0.9375rem',
              color: 'var(--ink)',
              '&::placeholder': { color: 'var(--muted)' },
            }}
          />
          {query && (
            <span
              style={{ ...lbl, cursor: 'pointer', color: 'var(--muted)' }}
              onClick={() => { setQuery(''); setResults([]); setHasSearched(false); loadRandomUsers() }}
            >
              ✕
            </span>
          )}
        </Box>

        {/* Type chips */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
          {CHIPS.map((chip) => {
            const active = activeChip === chip.value
            return (
              <Box
                key={chip.value}
                onClick={() => handleChipClick(chip.value)}
                sx={{
                  border: '1.5px solid rgba(216,207,184,0.2)',
                  borderRadius: '3px',
                  px: 0.75,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  backgroundColor: active ? '#ece5d3' : 'transparent',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: active ? '#120e18' : 'var(--ink)',
                  transition: 'background 0.1s',
                }}
              >
                {chip.label}
              </Box>
            )
          })}
        </Box>

        {/* Error */}
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}

        {/* Loading */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: 'var(--accent)' }} size={24} />
          </Box>
        )}

        {/* Idle state: recent + trending */}
        {!loading && showIdle && (
          <>
            {recent.length > 0 && (
              <>
                <span style={{ ...lbl, display: 'block', marginBottom: 6 }}>◉ RECENT</span>
                {recent.map((r) => (
                  <Box
                    key={r}
                    onClick={() => handleRecentClick(r)}
                    sx={{
                      border: '1.5px solid rgba(216,207,184,0.2)',
                      borderRadius: '3px',
                      px: 1.25,
                      py: 0.75,
                      mb: 0.75,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      cursor: 'pointer',
                      backgroundColor: '#120e18',
                      '&:hover': { backgroundColor: '#1a1424' },
                    }}
                  >
                    <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>⌕</span>
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem' }}>
                      {r}
                    </Typography>
                  </Box>
                ))}
              </>
            )}

            <span style={{ ...lbl, display: 'block', marginBottom: 8, marginTop: recent.length > 0 ? 16 : 0 }}>
              ◉ TRENDING
            </span>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              {TRENDING.map((item) => (
                <Box key={item.name} sx={{
                  border: '1.5px solid rgba(216,207,184,0.2)',
                  borderRadius: '3px',
                  p: 1,
                  backgroundColor: '#120e18',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#1a1424' },
                }}>
                  <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 2 }}>
                    {item.badge}
                  </span>
                  <Typography sx={{
                    fontFamily: 'var(--font-serif, "EB Garamond", serif)',
                    fontSize: '0.875rem',
                  }}>
                    {item.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <>
            {hasSearched && (
              <span style={{ ...lbl, display: 'block', marginBottom: 10 }}>
                {total} {total === 1 ? 'RESULT' : 'RESULTS'}
              </span>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {results.map((hit) => (
                <Box
                  key={hit.user_id}
                  onClick={() => router.push(`/profile/${hit.user_id}`)}
                  sx={{
                    border: '1.5px solid rgba(216,207,184,0.2)',
                    borderRadius: '3px',
                    backgroundColor: '#120e18',
                    px: 1.25,
                    py: 1,
                    display: 'flex',
                    gap: 1.25,
                    alignItems: 'center',
                    cursor: 'pointer',
                    boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.08)',
                    '&:hover': { boxShadow: '3px 3px 0 rgba(216,207,184,.1)' },
                    '&:active': { transform: 'translate(1px, 1px)', boxShadow: 'none' },
                  }}
                >
                  <Avatar
                    src={hit.profile_image_url ? `${API_BASE}${hit.profile_image_url}` : undefined}
                    sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: 'var(--ink)', fontSize: 14 }}
                  >
                    {hit.handle.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontSize: '0.6875rem', mb: 0.25 }} noWrap>
                      {hit.handle}
                    </Typography>
                    {hit.city_bucket && (
                      <span style={lbl}>
                        {hit.city_bucket}{hit.distance_km ? ` · ${Math.round(hit.distance_km)}km` : ''}
                      </span>
                    )}
                    {hit.top_shared_artists.length > 0 && (
                      <Typography sx={{
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                        fontSize: '0.75rem', color: 'var(--muted)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        mt: 0.25,
                      }}>
                        {hit.top_shared_artists.slice(0, 3).map((a) => a.artist_name).join(', ')}
                      </Typography>
                    )}
                  </Box>
                  {hit.compatibility_score !== undefined && hit.compatibility_score > 0 && (
                    <Typography sx={{
                      fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                      fontSize: '1.125rem',
                      color: 'var(--accent)',
                      flexShrink: 0,
                    }}>
                      {Math.round(hit.compatibility_score)}%
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          </>
        )}

        {/* No results */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <Box sx={{
            border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
            p: 3, textAlign: 'center', backgroundColor: '#120e18',
          }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--muted)' }}>
              No results for "{query}"
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}
