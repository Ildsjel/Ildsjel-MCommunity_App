'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Box, Typography, Stack } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import Sigil from '@/app/components/Sigil'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const hasToken = !!localStorage.getItem('access_token')
    setIsAuthenticated(hasToken)
    if (hasToken) router.replace('/feed')
  }, [router])

  return (
    <>
      <Navigation />

      {/* ── Ritual poster landing ─────────────────────────────── */}
      <Box
        sx={{
          minHeight:      'calc(100dvh - 52px)',
          display:        'flex',
          flexDirection:  'column',
          px:             { xs: 3, md: 5 },
          py:             { xs: 3, md: 4 },
          maxWidth:       480,
          mx:             'auto',
          gap:            0,
        }}
      >
        {/* Top label */}
        <Typography
          className="fade-in-up"
          sx={{
            fontFamily:    '"JetBrains Mono", monospace',
            fontSize:      '0.5625rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color:         'text.secondary',
            mb:            1.5,
          }}
        >
          MMXXVI · Invitation
        </Typography>

        {/* Headline — gig poster typography */}
        <Box className="fade-in-up fade-in-up-delay-1">
          <Typography
            variant="h1"
            sx={{
              fontSize:      { xs: '3.5rem', sm: '4.5rem' },
              lineHeight:    0.88,
              letterSpacing: '-0.01em',
              mb:            0,
            }}
          >
            Metal
          </Typography>
          <Typography
            variant="h1"
            sx={{
              fontSize:      { xs: '3.5rem', sm: '4.5rem' },
              lineHeight:    0.88,
              letterSpacing: '-0.01em',
              mb:            0,
            }}
          >
            Heads
          </Typography>
          <Typography
            sx={{
              fontFamily: '"EB Garamond", serif',
              fontStyle:  'italic',
              fontWeight: 400,
              fontSize:   { xs: '3rem', sm: '4rem' },
              lineHeight: 0.95,
              color:      'primary.main',
              textTransform: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            connect.
          </Typography>
        </Box>

        {/* Rule with date */}
        <Box
          className="fade-in-up fade-in-up-delay-2"
          sx={{
            display:    'flex',
            gap:        1.5,
            alignItems: 'center',
            my:         2,
          }}
        >
          <Box sx={{ flex: 1, height: '1.5px', backgroundColor: 'rgba(216,207,184,0.3)' }} />
          <Typography
            sx={{
              fontFamily:    '"JetBrains Mono", monospace',
              fontSize:      '0.5rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color:         'text.secondary',
              flexShrink:    0,
            }}
          >
            XVI · IV · MMXXVI
          </Typography>
          <Box sx={{ flex: 1, height: '1.5px', backgroundColor: 'rgba(216,207,184,0.3)' }} />
        </Box>

        {/* Tagline */}
        <Typography
          className="fade-in-up fade-in-up-delay-2"
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontSize:   { xs: '0.9375rem', md: '1rem' },
            color:      'text.secondary',
            mb:         1,
            lineHeight: 1.55,
          }}
        >
          Letterboxd meets Bandcamp. Built for the underground. Connect Spotify — we read the sigil, you find your kind.
        </Typography>

        {/* Sigil centered */}
        <Box
          className="fade-in-up fade-in-up-delay-3"
          sx={{
            flex:         1,
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'center',
            py:           2,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 220, aspectRatio: '1' }}>
            <Sigil
              size={240}
              genres={['?', '?', '?', '?', '?']}
              artists={['', '', '', '', '', '']}
              centerTop="☩"
              centerBottom="GRIMR"
              loading={true}
            />
          </Box>
        </Box>

        {/* CTAs */}
        {mounted && (
          <Stack
            className="fade-in-up fade-in-up-delay-4"
            spacing={1}
            sx={{ pb: 2 }}
          >
            <Box
              component={Link}
              href="/auth/register"
              sx={{
                display:       'block',
                width:         '100%',
                py:            1.625,
                textAlign:     'center',
                border:        '1.5px solid',
                borderColor:   'primary.main',
                borderRadius:  '3px',
                background:    '#c43a2a',
                color:         '#ece5d3',
                fontFamily:    '"Archivo Black", sans-serif',
                fontSize:      '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                boxShadow:     '1.5px 1.5px 0 rgba(0,0,0,0.4)',
                transition:    'box-shadow 0.15s, transform 0.1s',
                '&:hover': {
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.4)',
                  transform: 'translate(-1px,-1px)',
                },
              }}
            >
              Summon Account
            </Box>
            <Box
              component={Link}
              href="/auth/login"
              sx={{
                display:       'block',
                width:         '100%',
                py:            1.375,
                textAlign:     'center',
                border:        '1.5px solid rgba(216,207,184,0.4)',
                borderRadius:  '3px',
                background:    'transparent',
                color:         '#ece5d3',
                fontFamily:    '"Archivo Black", sans-serif',
                fontSize:      '0.75rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                transition:    'background 0.12s',
                '&:hover': { background: 'rgba(236,229,211,0.06)' },
              }}
            >
              Sign In
            </Box>
          </Stack>
        )}
      </Box>
    </>
  )
}
