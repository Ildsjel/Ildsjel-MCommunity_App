'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box, Typography, Card, CardContent, Stack, Chip, CircularProgress, Alert,
} from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'

// Placeholder feed items (until backend feed endpoint exists)
const MOCK_FEED = [
  {
    id: '1',
    user: 'MGLA_PURIST',
    time: '2h',
    artist: 'Panopticon',
    album: 'Roads to the North',
    review: '"a slow cathedral collapse — every riff earned, every silence deliberate."',
    horns: 42,
    discuss: 7,
    stars: 4,
  },
  {
    id: '2',
    user: 'HRAFN',
    time: '5h',
    artist: 'Bell Witch',
    album: 'Mirror Reaper',
    review: '"impenetrable. required. two hours of descent."',
    horns: 18,
    discuss: 2,
    stars: 5,
  },
  {
    id: '3',
    user: 'VARG_OUTSIDER',
    time: '1d',
    artist: 'Mgła',
    album: 'Exercises in Futility',
    review: null,
    horns: 9,
    discuss: 0,
    stars: 5,
  },
  {
    id: '4',
    user: 'ASHES_42',
    time: '1d',
    artist: 'Sunn O)))',
    album: 'Life Metal',
    review: '"drone as devotion. this record rewired something."',
    horns: 31,
    discuss: 11,
    stars: 4,
  },
]

function StarRating({ n }: { n: number }) {
  return (
    <Box sx={{ display: 'inline-flex', gap: '1px', color: '#9A1A1A', fontSize: '0.7rem' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0.2 }}>★</span>
      ))}
    </Box>
  )
}

export default function FeedPage() {
  const router = useRouter()
  const { user, isLoading: loading } = useUser()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
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

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 640, mx: 'auto', px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>

        {/* Header */}
        <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            Feed
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {['All', 'Coven', 'Near'].map((f, i) => (
              <Chip
                key={f}
                label={f}
                size="small"
                sx={{
                  backgroundColor: i === 0 ? '#ece5d3' : 'transparent',
                  color: i === 0 ? '#120e18' : 'text.secondary',
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Feed cards */}
        <Stack spacing={1.5}>
          {MOCK_FEED.map((item) => (
            <Card
              key={item.id}
              sx={{ cursor: 'pointer', '&:hover': { boxShadow: '3px 3px 0 rgba(20,20,20,0.25)' } }}
            >
              <CardContent sx={{ display: 'flex', gap: 1.5, p: '12px 14px !important' }}>
                {/* Album art placeholder */}
                <Box
                  sx={{
                    width:           56,
                    height:          56,
                    flexShrink:      0,
                    border:          '1.5px solid rgba(216,207,184,0.2)',
                    borderRadius:    '3px',
                    backgroundColor: '#08060a',
                    display:         'flex',
                    alignItems:      'center',
                    justifyContent:  'center',
                    backgroundImage: 'repeating-linear-gradient(135deg, transparent 0, transparent 5px, rgba(20,20,20,.08) 5px, rgba(20,20,20,.08) 6px)',
                  }}
                />

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* User + time */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                    <Box
                      sx={{
                        width:           18, height: 18,
                        border:          '1.5px solid rgba(216,207,184,0.2)',
                        borderRadius:    '50%',
                        display:         'flex',
                        alignItems:      'center',
                        justifyContent:  'center',
                        fontFamily:      '"Archivo Black", sans-serif',
                        fontSize:        '0.5rem',
                        color:           '#ece5d3',
                        backgroundColor: '#1a1424',
                        flexShrink:      0,
                      }}
                    >
                      {item.user.charAt(0)}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily:    '"JetBrains Mono", monospace',
                        fontSize:      '0.5625rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color:         'text.secondary',
                      }}
                    >
                      {item.user} · {item.time}
                    </Typography>
                  </Box>

                  {/* Artist + album */}
                  <Typography
                    sx={{
                      fontFamily:    '"Archivo Black", sans-serif',
                      fontSize:      '0.8125rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      mb:            0.25,
                    }}
                  >
                    {item.artist}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"EB Garamond", serif',
                      fontStyle:  'italic',
                      fontSize:   '0.8125rem',
                      color:      'text.secondary',
                      mb:         item.review ? 0.5 : 0,
                    }}
                  >
                    {item.album}
                  </Typography>

                  {/* Review snippet */}
                  {item.review && (
                    <Typography
                      sx={{
                        fontFamily: '"EB Garamond", serif',
                        fontStyle:  'italic',
                        fontSize:   '0.875rem',
                        color:      '#2A2A2A',
                        mb:         0.5,
                        lineHeight: 1.4,
                      }}
                    >
                      {item.review}
                    </Typography>
                  )}

                  {/* Actions */}
                  <Box
                    sx={{
                      display:    'flex',
                      gap:        1.5,
                      alignItems: 'center',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize:   '0.5625rem',
                      letterSpacing: '0.1em',
                    }}
                  >
                    <Box sx={{ color: '#9A1A1A', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      ✶ <span>{item.horns}</span>
                    </Box>
                    <Box sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.25 }}>
                      ☍ <span>{item.discuss}</span>
                    </Box>
                    <StarRating n={item.stars} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography
            sx={{
              fontFamily:    '"JetBrains Mono", monospace',
              fontSize:      '0.5625rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'text.secondary',
            }}
          >
            · · · End of current feed · · ·
          </Typography>
        </Box>
      </Box>
    </>
  )
}
