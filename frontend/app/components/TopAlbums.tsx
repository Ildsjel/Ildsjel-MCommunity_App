'use client'

import { useEffect, useState } from 'react'
import { Box, Typography, CircularProgress } from '@mui/material'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TopAlbum {
  id: string
  name: string
  artist_name: string
  image_url: string | null
  rank: number
  play_count: number
  sources: string[]
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

export default function TopAlbums() {
  const [albums, setAlbums] = useState<TopAlbum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        const token = localStorage.getItem('access_token')
        const res = await axios.get(`${API_BASE}/api/v1/lastfm/top/albums?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setAlbums(res.data.albums ?? [])
      } catch {
        setError('Failed to load top albums')
      } finally {
        setLoading(false)
      }
    }
    fetchAlbums()
  }, [])

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

  if (albums.length === 0) return (
    <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
      No top albums yet — syncing in background, check back shortly.
    </Typography>
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {albums.map((album, index) => (
        <Box
          key={album.id}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.25,
            py: '7px',
            borderBottom: index < albums.length - 1 ? '1px solid rgba(216,207,184,0.07)' : 'none',
          }}
        >
          <span style={{
            ...mono,
            fontSize: '0.5rem',
            letterSpacing: '0.08em',
            color: album.rank === 1 ? 'var(--ink, #ece5d3)' : 'var(--muted, #7A756D)',
            minWidth: 14,
            textAlign: 'right',
            flexShrink: 0,
          }}>
            {album.rank}
          </span>

          {album.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.image_url}
              alt=""
              style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }}
            />
          )}

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{
              fontFamily: 'var(--font-serif)',
              fontStyle: album.rank === 1 ? 'italic' : 'normal',
              fontSize: '0.8125rem',
              color: album.rank === 1 ? 'var(--ink, #ece5d3)' : 'rgba(236,229,211,0.75)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}>
              {album.name}
            </Typography>
            <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              {album.artist_name}
            </span>
          </Box>

          {album.play_count > 0 && (
            <span style={{
              ...mono,
              fontSize: '0.4375rem',
              letterSpacing: '0.08em',
              color: 'var(--muted, #7A756D)',
              flexShrink: 0,
            }}>
              {album.play_count.toLocaleString()}×
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
        {(() => {
          const allSources = new Set(albums.flatMap(a => a.sources))
          const parts: string[] = []
          if (allSources.has('lastfm')) parts.push('Last.fm')
          if (allSources.has('spotify')) parts.push('Spotify')
          return `via ${parts.join(' & ') || '—'}`
        })()}
      </span>
    </Box>
  )
}
