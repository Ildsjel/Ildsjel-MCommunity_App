'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material'
import {
  Group as GroupIcon,
  LibraryMusic as LibraryMusicIcon,
  TravelExplore as TravelExploreIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'

const FEATURES = [
  {
    icon: <GroupIcon sx={{ fontSize: 28, color: 'secondary.main' }} />,
    title: 'Find Your Tribe',
    body: 'Discover metalheads in your city and around the world. Connect over shared artists and subgenres.',
  },
  {
    icon: <LibraryMusicIcon sx={{ fontSize: 28, color: 'secondary.main' }} />,
    title: 'Build Your Metal-ID',
    body: 'Link Spotify and let your listening history speak. Your top artists and genres define your identity.',
  },
  {
    icon: <TravelExploreIcon sx={{ fontSize: 28, color: 'secondary.main' }} />,
    title: 'Discover by Taste',
    body: 'Search by artist, genre, or location. See who you share the most music with before reaching out.',
  },
]

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setIsAuthenticated(!!localStorage.getItem('access_token'))
  }, [])

  return (
    <>
      <Navigation />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <Box
        sx={{
          minHeight: { xs: 'calc(100dvh - 56px)', md: '88vh' },
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          px: { xs: 3, md: 4 },
          py: { xs: 6, md: 10 },
        }}
      >
        <Box sx={{ maxWidth: { xs: '100%', sm: 560, md: 700 } }}>
          {/* Badge */}
          <Chip
            label="The Metal Community"
            size="small"
            className="fade-in-up"
            sx={{
              mb: { xs: 3, md: 4 },
              border: '1px solid rgba(212,175,55,0.4)',
              color: 'secondary.main',
              bgcolor: 'rgba(212,175,55,0.06)',
              letterSpacing: '0.08em',
              fontSize: '0.65rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
          />

          {/* Title — Archivo Black, fluid size */}
          <Typography
            variant="h1"
            className="grimr-glow fade-in-up fade-in-up-delay-1"
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: { xs: '4rem', sm: '5.5rem', md: '7rem' },
              lineHeight: 1,
              letterSpacing: '0.02em',
              mb: { xs: 2, md: 2.5 },
            }}
          >
            Grimr
          </Typography>

          {/* Tagline — EB Garamond italic */}
          <Typography
            className="fade-in-up fade-in-up-delay-2"
            sx={{
              fontFamily: '"EB Garamond", Georgia, serif',
              fontSize: { xs: '1.25rem', md: '1.6rem' },
              fontStyle: 'italic',
              color: 'text.secondary',
              mb: { xs: 1.5, md: 2 },
            }}
          >
            Where Metalheads Connect
          </Typography>

          {/* Sub-copy */}
          <Typography
            variant="body1"
            color="text.secondary"
            className="fade-in-up fade-in-up-delay-3"
            sx={{
              mb: { xs: 4, md: 5 },
              maxWidth: 420,
              mx: 'auto',
              fontSize: { xs: '0.95rem', md: '1rem' },
            }}
          >
            Letterboxd meets Bandcamp — for Metal. Track your listening,
            discover fans who share your taste, and find your local community.
          </Typography>

          {/* CTAs */}
          {mounted && (
            <Box
              className="fade-in-up fade-in-up-delay-4"
              sx={{
                display: 'flex',
                gap: 1.5,
                justifyContent: 'center',
                flexDirection: { xs: 'column', sm: 'row' },
                maxWidth: { xs: 280, sm: 'unset' },
                mx: 'auto',
              }}
            >
              {isAuthenticated ? (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth={false}
                    onClick={() => router.push('/profile')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ minWidth: { xs: '100%', sm: 180 } }}
                  >
                    My Profile
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => router.push('/search')}
                    sx={{ minWidth: { xs: '100%', sm: 160 } }}
                  >
                    Find Metalheads
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    href="/auth/register"
                    sx={{ minWidth: { xs: '100%', sm: 180 } }}
                  >
                    Sign Up Free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    href="/auth/login"
                    sx={{ minWidth: { xs: '100%', sm: 140 } }}
                  >
                    Login
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Section divider ──────────────────────────────────── */}
      <Box sx={{ px: { xs: 3, md: 8 } }}>
        <Divider sx={{ '&::before, &::after': { borderColor: 'rgba(212,175,55,0.12)' } }}>
          <Box
            sx={{
              width: 6, height: 6,
              bgcolor: 'secondary.dark',
              transform: 'rotate(45deg)',
              opacity: 0.55,
            }}
          />
        </Divider>
      </Box>

      {/* ── Features ─────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 }, px: { xs: 2, md: 3 } }}>
        <Typography
          variant="h3"
          align="center"
          sx={{ mb: 1, fontSize: { xs: '1.5rem', md: '2rem' } }}
        >
          Everything you need
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mb: { xs: 4, md: 6 }, maxWidth: 420, mx: 'auto', fontSize: { xs: '0.9rem', md: '1rem' } }}
        >
          A social layer built specifically for the metal community
        </Typography>

        {/* Features: vertical stack on mobile, 3-col on desktop */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: { xs: 2, md: 3 },
          }}
        >
          {FEATURES.map((f) => (
            <Card
              key={f.title}
              className="gold-accent-top"
              sx={{
                '&:hover': {
                  boxShadow: '0 0 24px rgba(139,0,0,0.12)',
                  borderColor: 'rgba(212,175,55,0.18)',
                },
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Box sx={{ mb: 1.5 }}>{f.icon}</Box>
                <Typography variant="h5" gutterBottom sx={{ fontSize: '1rem' }}>
                  {f.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ lineHeight: 1.65, fontSize: '0.875rem' }}
                >
                  {f.body}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      {/* ── Stats ────────────────────────────────────────────── */}
      <Container maxWidth="sm" sx={{ pb: { xs: 6, md: 10 }, px: { xs: 2, md: 3 } }}>
        <Card
          sx={{
            border: '1px solid rgba(212,175,55,0.12)',
            background: 'rgba(12,12,12,0.9)',
          }}
        >
          <CardContent sx={{ py: { xs: 3, md: 4 } }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 1,
                textAlign: 'center',
              }}
            >
              {[
                { value: '1K+',  label: 'Metalheads' },
                { value: '50K+', label: 'Scrobbles' },
                { value: '100+', label: 'Genres' },
              ].map((s) => (
                <Box key={s.label}>
                  <Typography
                    className="gold-shimmer"
                    sx={{
                      fontFamily: '"Archivo Black", sans-serif',
                      fontSize: { xs: '1.6rem', md: '2rem' },
                      lineHeight: 1,
                      mb: 0.5,
                    }}
                  >
                    {s.value}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: '0.7rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}
