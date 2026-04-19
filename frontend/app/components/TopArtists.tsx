'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TopArtist {
  name: string
  spotify_id: string | null
  mbid: string | null
  image_url: string | null
  rank: number
  play_count: number
  sources: string[]
}

interface TopArtistsProps {
  userId?: string
  isOwnProfile: boolean
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

export default function TopArtists({ userId, isOwnProfile }: TopArtistsProps) {
  const [artists, setArtists] = useState<TopArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTopArtists = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const response = await axios.get(
          `${API_BASE}/api/v1/lastfm/top/artists?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setArtists(response.data.artists ?? [])
      } catch {
        setError('Failed to load top artists')
      } finally {
        setLoading(false)
      }
    }
    fetchTopArtists()
  }, [userId, isOwnProfile])

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
      <CircularProgress size={16} sx={{ color: 'var(--accent, #c43a2a)' }} />
    </Box>
  )

  if (error) return (
    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
      {error}
    </Typography>
  )

  if (artists.length === 0) return (
    <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
      {isOwnProfile
        ? 'No top artists yet — connect Spotify or Last.fm to sync.'
        : 'No top artists yet.'}
    </Typography>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {artists.map((artist, index) => (
        <Box
          key={artist.spotify_id ?? artist.name}
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 1.25,
            py: '7px',
            borderBottom: index < artists.length - 1 ? '1px solid rgba(216,207,184,0.07)' : 'none',
          }}
        >
          <span style={{
            ...mono,
            fontSize: '0.5rem',
            letterSpacing: '0.08em',
            color: artist.rank === 1 ? 'var(--ink, #ece5d3)' : 'var(--muted, #7A756D)',
            minWidth: 14,
            textAlign: 'right',
            flexShrink: 0,
          }}>
            {artist.rank}
          </span>

          <Typography sx={{
            fontFamily: 'var(--font-serif)',
            fontStyle: artist.rank === 1 ? 'italic' : 'normal',
            fontSize: '0.8125rem',
            color: artist.rank === 1 ? 'var(--ink, #ece5d3)' : 'rgba(236,229,211,0.75)',
            flexGrow: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {artist.name}
          </Typography>

          {artist.play_count > 0 && (
            <span style={{
              ...mono,
              fontSize: '0.4375rem',
              letterSpacing: '0.08em',
              color: 'var(--muted, #7A756D)',
              flexShrink: 0,
            }}>
              {artist.play_count.toLocaleString()}×
            </span>
          )}
        </Box>
      ))}

      <span style={{
        ...mono,
        fontSize: '0.4rem',
        letterSpacing: '0.1em',
        color: 'rgba(122,117,109,0.6)',
        textTransform: 'uppercase',
        display: 'block',
        marginTop: 10,
      }}>
        via Spotify & Last.fm
      </span>
    </Box>
  )
}
