'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import axios from 'axios'
import { requestBandReview } from '@/lib/bandsApi'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface FavArtist {
  name: string
  name_norm: string
  image_url: string | null
  auto: boolean
  band_slug?: string | null
}

interface FavAlbum {
  id: string
  name: string
  artist_name: string
  image_url: string | null
  play_count: number
  auto: boolean
}

interface FavBand {
  id: string
  slug: string
  name: string
  genres: { id: string; slug: string; name: string }[]
  grimr: boolean
}

interface FavouritesProps {
  isOwnProfile: boolean
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

export default function Favourites({ isOwnProfile }: FavouritesProps) {
  const router = useRouter()
  const [artists, setArtists] = useState<FavArtist[]>([])
  const [albums, setAlbums] = useState<FavAlbum[]>([])
  const [bands, setBands] = useState<FavBand[]>([])
  const [loading, setLoading] = useState(true)
  // Tracks names that have been requested this session for visual feedback
  const [requestedNames, setRequestedNames] = useState<Set<string>>(new Set())

  const fetchFavourites = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE}/api/v1/favourites`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setArtists(res.data.artists ?? [])
      setAlbums(res.data.albums ?? [])
      setBands(res.data.bands ?? [])
    } catch {
      // silent — empty state is shown
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchFavourites() }, [fetchFavourites])

  const removeArtist = async (nameNorm: string) => {
    const token = localStorage.getItem('access_token')
    await axios.delete(`${API_BASE}/api/v1/favourites/artist/${encodeURIComponent(nameNorm)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchFavourites()
  }

  const removeAlbum = async (albumId: string) => {
    const token = localStorage.getItem('access_token')
    await axios.delete(`${API_BASE}/api/v1/favourites/album/${encodeURIComponent(albumId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    await fetchFavourites()
  }

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
      <CircularProgress size={16} sx={{ color: 'var(--accent, #c43a2a)' }} />
    </Box>
  )

  if (artists.length === 0 && albums.length === 0 && bands.length === 0) return (
    <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
      {isOwnProfile
        ? 'No favourites yet. Your top 10 scrobbled artists and albums appear here automatically.'
        : 'No favourites yet.'}
    </Typography>
  )

  return (
    <Box>
      {(artists.length > 0 || bands.length > 0) && (
        <Box sx={{ mb: albums.length > 0 ? 2 : 0 }}>
          <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
            Artists
          </span>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {artists.map((a) => {
              const alreadyRequested = requestedNames.has(a.name)
              const handleClick = async () => {
                if (a.band_slug) {
                  router.push(`/bands/${a.band_slug}`)
                  return
                }
                if (alreadyRequested) return
                try {
                  const result = await requestBandReview(a.name)
                  if (result.status === 'exists' && result.band_slug) {
                    router.push(`/bands/${result.band_slug}`)
                  } else {
                    setRequestedNames((prev) => new Set(Array.from(prev).concat(a.name)))
                  }
                } catch { /* silent */ }
              }
              return (
                <Box
                  key={a.name_norm}
                  onClick={handleClick}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                    px: 1, py: 0.5, cursor: 'pointer',
                    '&:hover': { borderColor: 'rgba(216,207,184,0.45)' },
                    '&:hover .remove-btn': { opacity: 1 },
                    transition: 'border-color 0.15s',
                  }}
                >
                  <Typography sx={{
                    fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                    fontSize: '0.75rem', color: 'var(--ink)', lineHeight: 1,
                  }}>
                    {a.name}
                  </Typography>
                  {a.auto && (
                    <span style={{ ...mono, fontSize: '0.35rem', color: 'rgba(122,117,109,0.6)', letterSpacing: '0.08em' }}>
                      auto
                    </span>
                  )}
                  {alreadyRequested && (
                    <span style={{ ...mono, fontSize: '0.35rem', color: 'rgba(106,154,122,0.8)', letterSpacing: '0.08em' }}>
                      requested
                    </span>
                  )}
                  {isOwnProfile && (
                    <span
                      className="remove-btn"
                      style={{ ...mono, fontSize: '0.4rem', color: 'rgba(196,58,42,0.7)', marginLeft: 2, opacity: 0, transition: 'opacity 0.15s' }}
                      onClick={(e) => { e.stopPropagation(); removeArtist(a.name_norm) }}
                    >
                      ✕
                    </span>
                  )}
                </Box>
              )
            })}

            {/* Grimr-platform likes — red border to distinguish from streaming artists */}
            {bands.map((b) => (
              <Box
                key={b.id}
                onClick={() => router.push(`/bands/${b.slug}`)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  border: '1px solid rgba(196,58,42,0.45)', borderRadius: '3px',
                  px: 1, py: 0.5, cursor: 'pointer',
                  '&:hover': { borderColor: 'rgba(196,58,42,0.75)' },
                  transition: 'border-color 0.15s',
                }}
              >
                <Typography sx={{
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                  fontSize: '0.75rem', color: 'var(--ink)', lineHeight: 1,
                }}>
                  {b.name}
                </Typography>
                {b.genres[0] && (
                  <span style={{ ...mono, fontSize: '0.35rem', color: 'rgba(122,117,109,0.6)', letterSpacing: '0.08em' }}>
                    {b.genres[0].name}
                  </span>
                )}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {albums.length > 0 && (
        <Box sx={{ mb: 0 }}>
          <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
            Albums
          </span>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {albums.map((a) => (
              <Box
                key={a.id}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  border: '1px solid rgba(216,207,184,0.15)', borderRadius: '3px',
                  px: 1, py: '6px',
                  transition: 'border-color 0.15s',
                  '&:hover .remove-btn': { opacity: 1 },
                }}
              >
                {a.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.image_url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />
                )}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography sx={{
                    fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                    fontSize: '0.8125rem', color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2,
                  }}>
                    {a.name}
                  </Typography>
                  <span style={{ ...mono, fontSize: '0.4375rem', color: 'var(--muted)', letterSpacing: '0.06em' }}>
                    {a.artist_name}
                  </span>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                  {a.auto && (
                    <span style={{ ...mono, fontSize: '0.35rem', color: 'rgba(122,117,109,0.6)', letterSpacing: '0.08em' }}>
                      auto
                    </span>
                  )}
                  {isOwnProfile && (
                    <span
                      className="remove-btn"
                      style={{ ...mono, fontSize: '0.4rem', color: 'rgba(196,58,42,0.7)', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s' }}
                      onClick={(e) => { e.stopPropagation(); removeAlbum(a.id) }}
                    >
                      ✕
                    </span>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

    </Box>
  )
}
