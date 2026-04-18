'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, Card, CardContent, Stack, Chip, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import Sigil from '@/app/components/Sigil'
import { useUser } from '@/app/context/UserContext'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TopArtist {
  artist_name: string
  play_count: number
}

export default function SigilPage() {
  const router = useRouter()
  const { user, isLoading: loading } = useUser()
  const [topArtists, setTopArtists] = useState<TopArtist[]>([])
  const [artistsLoading, setArtistsLoading] = useState(false)

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login'); return }
    if (!user) return

    const token = localStorage.getItem('access_token')
    if (!token || !user.source_accounts?.includes('spotify')) return

    setArtistsLoading(true)
    axios
      .get(`${API_BASE}/api/v1/users/${user.id}/top-artists?limit=6`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setTopArtists(r.data?.artists ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setArtistsLoading(false))
  }, [user, loading, router])

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </>
    )
  }

  const hasSpotify = user?.source_accounts?.includes('spotify')
  const sigilArtists = topArtists.slice(0, 6).map((a) => a.artist_name)

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography
            sx={{
              fontFamily:    '"JetBrains Mono", monospace',
              fontSize:      '0.5625rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'text.secondary',
            }}
          >
            Sigil · {new Date().getFullYear()}
          </Typography>
          <Box
            sx={{
              fontFamily:    '"JetBrains Mono", monospace',
              fontSize:      '0.5625rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'primary.main',
              cursor:        'pointer',
            }}
          >
            ↗ Share
          </Box>
        </Box>

        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontStyle:  'italic',
            fontSize:   '0.875rem',
            color:      'text.secondary',
            textAlign:  'center',
            mb:         0.5,
          }}
        >
          — the reading of —
        </Typography>
        <Typography
          variant="h4"
          sx={{ textAlign: 'center', mb: 2, fontSize: { xs: '1.35rem', md: '1.75rem' } }}
        >
          {user?.handle}
        </Typography>

        {/* Sigil SVG */}
        <Box
          sx={{
            width:   '100%',
            aspectRatio: '1',
            maxWidth: 320,
            mx:      'auto',
            mb:      2,
            color:   '#141414',
          }}
        >
          <Sigil
            size={300}
            loading={!hasSpotify || artistsLoading}
            artists={sigilArtists.length ? sigilArtists : undefined}
            centerTop={user?.handle?.toUpperCase() ?? '—'}
            centerBottom={`Est. ${new Date(user?.created_at ?? '').getFullYear() || '—'} · Lvl I`}
          />
        </Box>

        {/* Stats row */}
        <Box
          sx={{
            display:         'flex',
            justifyContent:  'space-between',
            px:              2,
            mb:              2,
            fontFamily:      '"JetBrains Mono", monospace',
            fontSize:        '0.5625rem',
            letterSpacing:   '0.12em',
            textTransform:   'uppercase',
            color:           'text.secondary',
          }}
        >
          <span>Lvl <strong style={{ color: '#9A1A1A' }}>I</strong></span>
          <span>Rarity <strong style={{ color: '#9A1A1A' }}>—</strong></span>
          <span>Purity <strong style={{ color: '#9A1A1A' }}>—</strong></span>
        </Box>

        {/* Genre chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center', mb: 2.5 }}>
          <Chip label="Metal" size="small" />
          {hasSpotify && <Chip label="Spotify Connected" size="small" sx={{ color: 'primary.main', borderColor: 'primary.main' }} />}
        </Box>

        {/* No Spotify callout */}
        {!hasSpotify && (
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography
                sx={{
                  fontFamily:    '"JetBrains Mono", monospace',
                  fontSize:      '0.5625rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'primary.main',
                  mb:            0.75,
                }}
              >
                Sigil · Unread
              </Typography>
              <Typography
                sx={{ fontFamily: '"EB Garamond", serif', fontSize: '0.9375rem', color: 'text.secondary', mb: 1.5 }}
              >
                Connect Spotify so we can read your Metal-DNA and complete the sigil.
              </Typography>
              <Box
                component="button"
                onClick={() => router.push('/spotify/connect')}
                sx={{
                  width:         '100%',
                  py:            1.25,
                  border:        '1.5px solid',
                  borderColor:   'primary.main',
                  borderRadius:  '3px',
                  background:    'primary.main',
                  backgroundColor: '#9A1A1A',
                  color:         '#F3EFE7',
                  fontFamily:    '"Archivo Black", sans-serif',
                  fontSize:      '0.75rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  cursor:        'pointer',
                  boxShadow:     '1.5px 1.5px 0 rgba(20,20,20,0.3)',
                }}
              >
                ◉ Link Spotify
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Anatomy — what the sigil encodes */}
        <Stack spacing={1}>
          <Card>
            <CardContent sx={{ p: '10px 14px !important' }}>
              <Typography
                sx={{
                  fontFamily:    '"JetBrains Mono", monospace',
                  fontSize:      '0.5rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'primary.main',
                  mb:            0.5,
                }}
              >
                Outer Ring · Genres
              </Typography>
              <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '0.875rem', color: 'text.secondary' }}>
                Your top metal subgenres from listening data
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: '10px 14px !important' }}>
              <Typography
                sx={{
                  fontFamily:    '"JetBrains Mono", monospace',
                  fontSize:      '0.5rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'primary.main',
                  mb:            0.5,
                }}
              >
                Inner Points · Top Artists
              </Typography>
              <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '0.875rem', color: 'text.secondary' }}>
                {sigilArtists.length
                  ? sigilArtists.join(' · ')
                  : 'Connect Spotify to populate'}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: '10px 14px !important' }}>
              <Typography
                sx={{
                  fontFamily:    '"JetBrains Mono", monospace',
                  fontSize:      '0.5rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'primary.main',
                  mb:            0.5,
                }}
              >
                Heptagram · Level
              </Typography>
              <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '0.875rem', color: 'text.secondary' }}>
                Calculated from play-depth × rarity × consistency
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </>
  )
}
