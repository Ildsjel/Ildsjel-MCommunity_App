'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, Card, CardContent, Stack, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'

const MOCK_EVENTS = [
  {
    id: '1',
    date: 'SAT 14 JUN',
    name: 'Batushka',
    venue: 'Arena Wien',
    city: 'Vienna',
    distance: '12 km',
    genre: 'Orthodox Black Metal',
  },
  {
    id: '2',
    date: 'SUN 22 JUN',
    name: 'Bell Witch',
    venue: 'Berghain',
    city: 'Berlin',
    distance: '32 km',
    genre: 'Doom / Funeral Doom',
  },
  {
    id: '3',
    date: 'FRI 04 JUL',
    name: 'Wacken Open Air',
    venue: 'Wacken',
    city: 'Wacken',
    distance: '180 km',
    genre: 'Festival',
  },
  {
    id: '4',
    date: 'SAT 12 JUL',
    name: 'Ulcerate',
    venue: 'Klub Proxima',
    city: 'Warsaw',
    distance: '520 km',
    genre: 'Technical Death Metal',
  },
]

export default function EventsPage() {
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
        <Box sx={{ mb: 2.5 }}>
          <Typography
            sx={{
              fontFamily:    '"JetBrains Mono", monospace',
              fontSize:      '0.5625rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'text.secondary',
              mb:            0.5,
            }}
          >
            ☍ Gather
          </Typography>
          <Typography variant="h4" sx={{ fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
            Near You
          </Typography>
        </Box>

        {/* Placeholder notice */}
        <Card sx={{ mb: 2.5, borderColor: 'primary.main' }}>
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
              Coming Soon
            </Typography>
            <Typography sx={{ fontFamily: '"EB Garamond", serif', fontSize: '0.9rem', color: 'text.secondary' }}>
              Event discovery powered by your location + listening profile. Currently showing example events.
            </Typography>
          </CardContent>
        </Card>

        {/* Event list */}
        <Stack spacing={1.5}>
          {MOCK_EVENTS.map((event) => (
            <Card key={event.id} sx={{ cursor: 'pointer' }}>
              <CardContent sx={{ display: 'flex', gap: 2, p: '12px 14px !important' }}>
                {/* Date block */}
                <Box
                  sx={{
                    flexShrink:      0,
                    width:           52,
                    border:          '1.5px solid rgba(216,207,184,0.2)',
                    borderRadius:    '3px',
                    display:         'flex',
                    flexDirection:   'column',
                    alignItems:      'center',
                    justifyContent:  'center',
                    py:              0.75,
                    px:              0.5,
                    backgroundColor: '#1a1424',
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily:    '"JetBrains Mono", monospace',
                      fontSize:      '0.5rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color:         'text.secondary',
                      lineHeight:    1.2,
                      textAlign:     'center',
                    }}
                  >
                    {event.date.split(' ')[0]}
                    <br />
                    {event.date.split(' ')[1]}
                    <br />
                    {event.date.split(' ')[2]}
                  </Typography>
                </Box>

                {/* Event info */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontFamily:    '"Archivo Black", sans-serif',
                      fontSize:      '0.9375rem',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      mb:            0.25,
                    }}
                  >
                    {event.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: '"EB Garamond", serif',
                      fontStyle:  'italic',
                      fontSize:   '0.875rem',
                      color:      'text.secondary',
                      mb:         0.25,
                    }}
                  >
                    {event.venue}, {event.city}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                    <Typography
                      sx={{
                        fontFamily:    '"JetBrains Mono", monospace',
                        fontSize:      '0.5rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color:         'text.secondary',
                      }}
                    >
                      {event.genre}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily:    '"JetBrains Mono", monospace',
                        fontSize:      '0.5rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color:         'primary.main',
                      }}
                    >
                      {event.distance}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    </>
  )
}
