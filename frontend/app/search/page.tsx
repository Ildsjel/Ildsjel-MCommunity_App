'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Container,
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
  Grid,
  Divider,
  Collapse,
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
  artist_id: string
  artist_name: string
  play_count_requester: number
  play_count_target: number
}

interface ProfileSearchHit {
  user_id: string
  handle: string
  city_bucket?: string
  profile_image_url?: string
  top_shared_artists: SharedArtist[]
  shared_genres: string[]
  compatibility_score?: number
  search_score: number
  badges: string[]
  distance_km?: number
  last_active?: string
}

interface SearchResponse {
  hits: ProfileSearchHit[]
  total: number
  next_cursor?: string
  query_time_ms: number
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams?.get('q') || '')
  const [searchType, setSearchType] = useState<'mixed' | 'name' | 'artist' | 'genre'>('mixed')
  const [results, setResults] = useState<ProfileSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [queryTime, setQueryTime] = useState(0)
  const [total, setTotal] = useState(0)

  // Advanced filters — collapsed by default (Hick's Law)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [radiusKm, setRadiusKm] = useState(50)
  const [minSharedArtists, setMinSharedArtists] = useState<number | ''>('')

  useEffect(() => {
    const q = searchParams?.get('q')
    if (q) {
      setQuery(q)
      performSearch(q)
    } else {
      loadRandomUsers()
    }
  }, [searchParams])

  const loadRandomUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get<SearchResponse>(
        `${API_BASE}/api/v1/search/random?limit=20`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setResults(response.data.hits)
      setTotal(response.data.total)
      setQueryTime(response.data.query_time_ms)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setError('Please enter at least 2 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        radius_km: radiusKm.toString(),
        limit: '20',
      })
      if (minSharedArtists) {
        params.append('min_shared_artists', minSharedArtists.toString())
      }
      const response = await axios.get<SearchResponse>(
        `${API_BASE}/api/v1/search/profiles?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setResults(response.data.hits)
      setTotal(response.data.total)
      setQueryTime(response.data.query_time_ms)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const handleClear = () => {
    setQuery('')
    setResults([])
    setTotal(0)
    setError('')
  }

  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Find Metalheads
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Search by name, artist, or genre to find like-minded fans
          </Typography>
        </Box>

        {/* ── Search form ─────────────────────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Box component="form" onSubmit={handleSearch}>
              {/* Primary row: input + type selector + button */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
                <TextField
                  fullWidth
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, artist or genre…"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'text.disabled' }} />
                      </InputAdornment>
                    ),
                    endAdornment: query && (
                      <InputAdornment position="end">
                        <IconButton onClick={handleClear} size="small" aria-label="Clear search">
                          <Clear fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Search type — compact select */}
                <FormControl sx={{ minWidth: 130 }} size="medium">
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={searchType}
                    label="Type"
                    onChange={(e) => setSearchType(e.target.value as any)}
                  >
                    <MenuItem value="mixed">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp fontSize="small" /> Mixed
                      </Box>
                    </MenuItem>
                    <MenuItem value="name">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Person fontSize="small" /> Name
                      </Box>
                    </MenuItem>
                    <MenuItem value="artist">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <MusicNote fontSize="small" /> Artist
                      </Box>
                    </MenuItem>
                    <MenuItem value="genre">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Category fontSize="small" /> Genre
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading || query.length < 2}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SearchIcon />}
                  sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
                >
                  {loading ? 'Searching…' : 'Search'}
                </Button>
              </Box>

              {/* Advanced filters toggle */}
              <Box sx={{ mt: 1.5 }}>
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  startIcon={<TuneIcon fontSize="small" />}
                  endIcon={showAdvanced ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  sx={{ color: 'text.secondary', fontSize: '0.8rem', px: 0 }}
                >
                  Advanced Filters
                </Button>

                <Collapse in={showAdvanced}>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <InputLabel>Radius</InputLabel>
                      <Select
                        value={radiusKm}
                        label="Radius"
                        onChange={(e) => setRadiusKm(e.target.value as number)}
                      >
                        {[10, 25, 50, 100, 200, 500].map((km) => (
                          <MenuItem key={km} value={km}>{km} km</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      size="small"
                      type="number"
                      label="Min Shared Artists"
                      value={minSharedArtists}
                      onChange={(e) =>
                        setMinSharedArtists(e.target.value ? parseInt(e.target.value) : '')
                      }
                      InputProps={{ inputProps: { min: 0, max: 50 } }}
                      sx={{ minWidth: 180 }}
                    />
                  </Box>
                </Collapse>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Results header */}
        {results.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontSize: '1rem' }}>
              {total} {total === 1 ? 'result' : 'results'} found
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {queryTime}ms
            </Typography>
          </Box>
        )}

        {/* Results */}
        <Stack spacing={2}>
          {results.map((hit) => (
            <Card
              key={hit.user_id}
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  borderColor: 'rgba(139,0,0,0.35)',
                  boxShadow: '0 0 16px rgba(139,0,0,0.1)',
                },
              }}
              onClick={() => router.push(`/profile/${hit.user_id}`)}
            >
              <CardContent>
                <Grid container spacing={2} alignItems="flex-start">
                  {/* Avatar & basic info */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar
                        src={hit.profile_image_url ? `${API_BASE}${hit.profile_image_url}` : undefined}
                        sx={{ width: 60, height: 60, flexShrink: 0 }}
                      >
                        {hit.handle.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" noWrap>
                          {hit.handle}
                        </Typography>
                        {hit.city_bucket && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <LocationOn sx={{ fontSize: 14, color: 'text.disabled' }} />
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {hit.city_bucket}
                              {hit.distance_km ? ` · ${Math.round(hit.distance_km)} km` : ''}
                            </Typography>
                          </Box>
                        )}
                        {hit.last_active && (
                          <Typography variant="caption" color="text.secondary">
                            Active {hit.last_active}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Grid>

                  {/* Shared artists */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                      Shared Artists
                    </Typography>
                    {hit.top_shared_artists.length > 0 ? (
                      <Stack spacing={0.5}>
                        {hit.top_shared_artists.map((artist) => (
                          <Chip
                            key={artist.artist_id}
                            label={artist.artist_name}
                            size="small"
                            icon={<MusicNote />}
                            variant="outlined"
                          />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No shared artists
                      </Typography>
                    )}
                  </Grid>

                  {/* Compatibility & genres */}
                  <Grid item xs={12} md={4}>
                    {hit.compatibility_score !== undefined && hit.compatibility_score > 0 && (
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Compatibility
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {Math.round(hit.compatibility_score)}%
                        </Typography>
                      </Box>
                    )}
                    {hit.shared_genres.length > 0 && (
                      <Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                          Shared Genres
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {hit.shared_genres.map((genre) => (
                            <Chip key={genre} label={genre} size="small" />
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Stack>

        {/* No results */}
        {!loading && results.length === 0 && query.length >= 2 && !error && (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 5 }}>
              <Typography variant="body1" color="text.secondary">
                No results for &ldquo;{query}&rdquo;
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try a different search term or adjust your filters
              </Typography>
            </CardContent>
          </Card>
        )}
      </Container>
    </>
  )
}
