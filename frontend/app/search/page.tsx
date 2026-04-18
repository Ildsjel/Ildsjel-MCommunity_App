'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Box,
  TextField,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Stack,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Collapse,
  Divider,
  Container,
} from '@mui/material'
import {
  Search as SearchIcon,
  Clear,
  Person,
  MusicNote,
  Category,
  LocationOn,
  TrendingUp,
  Tune as TuneIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SharedArtist {
  artist_id: string; artist_name: string
  play_count_requester: number; play_count_target: number
}
interface ProfileSearchHit {
  user_id: string; handle: string; city_bucket?: string
  profile_image_url?: string; top_shared_artists: SharedArtist[]
  shared_genres: string[]; compatibility_score?: number
  search_score: number; badges: string[]; distance_km?: number; last_active?: string
}
interface SearchResponse {
  hits: ProfileSearchHit[]; total: number; next_cursor?: string; query_time_ms: number
}

export default function SearchPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [query,        setQuery]        = useState(searchParams?.get('q') || '')
  const [searchType,   setSearchType]   = useState<'mixed'|'name'|'artist'|'genre'>('mixed')
  const [results,      setResults]      = useState<ProfileSearchHit[]>([])
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [queryTime,    setQueryTime]    = useState(0)
  const [total,        setTotal]        = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [radiusKm,     setRadiusKm]     = useState(50)
  const [minArtists,   setMinArtists]   = useState<number|''>('')

  useEffect(() => {
    const q = searchParams?.get('q')
    if (q) { setQuery(q); performSearch(q) }
    else loadRandomUsers()
  }, [searchParams])

  const loadRandomUsers = async () => {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get<SearchResponse>(`${API_BASE}/api/v1/search/random?limit=20`,
        { headers: { Authorization: `Bearer ${token}` } })
      setResults(res.data.hits); setTotal(res.data.total); setQueryTime(res.data.query_time_ms)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load users')
    } finally { setLoading(false) }
  }

  const performSearch = async (q: string) => {
    if (q.length < 2) { setError('Enter at least 2 characters'); return }
    setLoading(true); setError('')
    try {
      const token  = localStorage.getItem('access_token')
      const params = new URLSearchParams({ q, type: searchType, radius_km: radiusKm.toString(), limit: '20' })
      if (minArtists) params.append('min_shared_artists', minArtists.toString())
      const res = await axios.get<SearchResponse>(`${API_BASE}/api/v1/search/profiles?${params}`,
        { headers: { Authorization: `Bearer ${token}` } })
      setResults(res.data.hits); setTotal(res.data.total); setQueryTime(res.data.query_time_ms)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Search failed')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Navigation />
      <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2.5, md: 4 }, maxWidth: 900, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ mb: { xs: 2.5, md: 4 } }}>
          <Typography variant="h3" sx={{ fontSize: { xs: '1.5rem', md: '2rem' }, mb: 0.5 }}>
            Find Metalheads
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search by name, artist, or genre
          </Typography>
        </Box>

        {/* ── Search form ───────────────────────────────────── */}
        <Card sx={{ mb: 2.5 }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Box component="form" onSubmit={(e) => { e.preventDefault(); performSearch(query) }}>

              {/* Search input — full width on mobile */}
              <TextField
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, artist or genre…"
                sx={{ mb: 1.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: query && (
                    <InputAdornment position="end">
                      <IconButton onClick={() => { setQuery(''); setResults([]); setTotal(0) }} size="small">
                        <Clear fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              {/* Type + Search button row */}
              <Box sx={{ display: 'flex', gap: 1.5, mb: 0.5 }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Type</InputLabel>
                  <Select value={searchType} label="Type"
                    onChange={(e) => setSearchType(e.target.value as any)}>
                    <MenuItem value="mixed"><Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}><TrendingUp fontSize="small"/>Mixed</Box></MenuItem>
                    <MenuItem value="name"><Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}><Person fontSize="small"/>Name</Box></MenuItem>
                    <MenuItem value="artist"><Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}><MusicNote fontSize="small"/>Artist</Box></MenuItem>
                    <MenuItem value="genre"><Box sx={{ display:'flex', alignItems:'center', gap:0.75 }}><Category fontSize="small"/>Genre</Box></MenuItem>
                  </Select>
                </FormControl>

                <Button
                  type="submit" variant="contained" size="medium"
                  disabled={loading || query.length < 2}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                  sx={{ flex: 1, maxWidth: { xs: 'none', sm: 140 } }}
                >
                  {loading ? 'Searching…' : 'Search'}
                </Button>
              </Box>

              {/* Advanced filters toggle */}
              <Button
                size="small" variant="text" color="inherit"
                startIcon={<TuneIcon fontSize="small" />}
                endIcon={showAdvanced ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                onClick={() => setShowAdvanced(!showAdvanced)}
                sx={{ color: 'text.secondary', fontSize: '0.75rem', px: 0, mt: 0.5, minHeight: 'auto' }}
              >
                Filters
              </Button>

              <Collapse in={showAdvanced}>
                <Box sx={{ mt: 1.5, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Radius</InputLabel>
                    <Select value={radiusKm} label="Radius" onChange={(e) => setRadiusKm(e.target.value as number)}>
                      {[10,25,50,100,200,500].map((km) => (
                        <MenuItem key={km} value={km}>{km} km</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField size="small" type="number" label="Min Shared Artists"
                    value={minArtists}
                    onChange={(e) => setMinArtists(e.target.value ? parseInt(e.target.value) : '')}
                    InputProps={{ inputProps: { min: 0, max: 50 } }}
                    sx={{ width: 170 }}
                  />
                </Box>
              </Collapse>
            </Box>
          </CardContent>
        </Card>

        {/* Error */}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Results header */}
        {results.length > 0 && (
          <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              {total} {total === 1 ? 'result' : 'results'}
            </Typography>
            <Typography variant="caption" color="text.secondary">{queryTime}ms</Typography>
          </Box>
        )}

        {/* Results — card list */}
        <Stack spacing={1.5}>
          {results.map((hit) => (
            <Card
              key={hit.user_id}
              onClick={() => router.push(`/profile/${hit.user_id}`)}
              sx={{
                cursor: 'pointer',
                '&:active': { transform: 'scale(0.99)' },
                '&:hover': {
                  borderColor: 'rgba(139,0,0,0.35)',
                  boxShadow: '0 0 16px rgba(139,0,0,0.08)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
                {/* Mobile: stacked layout */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Avatar
                    src={hit.profile_image_url ? `${API_BASE}${hit.profile_image_url}` : undefined}
                    sx={{ width: 52, height: 52, flexShrink: 0 }}
                  >
                    {hit.handle.charAt(0).toUpperCase()}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {/* Name + compatibility */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography variant="h6" noWrap sx={{ fontSize: '1rem', flex: 1 }}>
                        {hit.handle}
                      </Typography>
                      {hit.compatibility_score !== undefined && hit.compatibility_score > 0 && (
                        <Typography
                          sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontSize: '0.8rem',
                            color: 'primary.light',
                            flexShrink: 0,
                          }}
                        >
                          {Math.round(hit.compatibility_score)}%
                        </Typography>
                      )}
                    </Box>

                    {/* Location */}
                    {hit.city_bucket && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                        <LocationOn sx={{ fontSize: 13, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {hit.city_bucket}{hit.distance_km ? ` · ${Math.round(hit.distance_km)} km` : ''}
                        </Typography>
                      </Box>
                    )}

                    {/* Shared artists — chips, max 3 visible */}
                    {hit.top_shared_artists.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
                        {hit.top_shared_artists.slice(0, 3).map((a) => (
                          <Chip key={a.artist_id} label={a.artist_name} size="small"
                            icon={<MusicNote />} variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 24 }}
                          />
                        ))}
                      </Box>
                    )}

                    {/* Genres */}
                    {hit.shared_genres.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {hit.shared_genres.slice(0, 4).map((g) => (
                          <Chip key={g} label={g} size="small"
                            sx={{ fontSize: '0.65rem', height: 22 }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* Empty / no-results */}
        {!loading && results.length === 0 && query.length >= 2 && !error && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="text.secondary">No results for &ldquo;{query}&rdquo;</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Try a different term or adjust your filters
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>
    </>
  )
}
