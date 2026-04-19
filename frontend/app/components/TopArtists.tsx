'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TopArtist {
  name: string
  spotify_id: string
  genres: string[]
  image_url: string | null
  rank: number
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
          `${API_BASE}/api/v1/spotify/top/artists?limit=5`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        setArtists(response.data.artists ?? [])
      } catch (err: any) {
        setError('Failed to load top artists')
      } finally {
        setLoading(false)
      }
    }
    fetchTopArtists()
  }, [userId, isOwnProfile])

  const totalArtists = artists.length

  return (
    <Box sx={{
      border: '1.5px solid rgba(216,207,184,0.15)',
      borderRadius: '3px',
      backgroundColor: '#120e18',
      p: '14px 16px',
    }}>
      {/* Header */}
      <span style={{
        ...mono,
        fontSize: '0.5625rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--muted, #7A756D)',
        display: 'block',
        marginBottom: 12,
      }}>
        ◉ Top Artists
      </span>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={16} sx={{ color: 'var(--accent, #c43a2a)' }} />
        </Box>
      )}

      {!loading && error && (
        <Typography sx={{ ...mono, fontSize: '0.5rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          {error}
        </Typography>
      )}

      {!loading && !error && artists.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {isOwnProfile
            ? 'No top artists yet — connect Spotify to sync.'
            : 'No top artists yet.'}
        </Typography>
      )}

      {!loading && !error && artists.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {artists.map((artist, index) => (
            <Box
              key={artist.spotify_id}
              sx={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 1.25,
                py: '7px',
                borderBottom: index < artists.length - 1 ? '1px solid rgba(216,207,184,0.07)' : 'none',
              }}
            >
              {/* Rank */}
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

              {/* Artist name */}
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
            </Box>
          ))}

          {/* Footer */}
          <span style={{
            ...mono,
            fontSize: '0.4rem',
            letterSpacing: '0.1em',
            color: 'rgba(122,117,109,0.6)',
            textTransform: 'uppercase',
            display: 'block',
            marginTop: 10,
          }}>
            via Spotify · 6 months
          </span>
        </Box>
      )}
    </Box>
  )
}
