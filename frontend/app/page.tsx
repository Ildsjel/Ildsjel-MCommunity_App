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
    icon: <GroupIcon sx={{ fontSize: 32, color: 'secondary.main' }} />,
    title: 'Find Your Tribe',
    body: 'Discover metalheads in your city and around the world. Connect over shared artists and subgenres.',
  },
  {
    icon: <LibraryMusicIcon sx={{ fontSize: 32, color: 'secondary.main' }} />,
    title: 'Build Your Metal-ID',
    body: 'Link Spotify and let your listening history speak. Your top artists and genres define your profile.',
  },
  {
    icon: <TravelExploreIcon sx={{ fontSize: 32, color: 'secondary.main' }} />,
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
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
  }, [])

  return (
    <>
      <Navigation />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <Box
        sx={{
          minHeight: '88vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Container maxWidth="md">
          {/* Pre-heading badge */}
          <Chip
            label="The Metal Community"
            size="small"
            sx={{
              mb: 4,
              border: '1px solid rgba(212,175,55,0.4)',
              color: 'secondary.main',
              bgcolor: 'rgba(212,175,55,0.06)',
              letterSpacing: '0.08em',
              fontSize: '0.7rem',
              fontWeight: 600,
              textTransform: 'uppercase',
            }}
            className="fade-in-up"
          />

          {/* Main title */}
          <Typography
            variant="h1"
            className="grimr-glow fade-in-up fade-in-up-delay-1"
            sx={{
              fontSize: { xs: '4.5rem', sm: '6rem', md: '8rem' },
              fontWeight: 700,
              letterSpacing: '0.04em',
              mb: 2,
              lineHeight: 1,
            }}
          >
            Grimr
          </Typography>

          {/* Tagline */}
          <Typography
            variant="h4"
            className="fade-in-up fade-in-up-delay-2"
            sx={{
              color: 'text.secondary',
              fontWeight: 400,
              fontStyle: 'italic',
              mb: 2,
              fontSize: { xs: '1.25rem', md: '1.6rem' },
            }}
          >
            Where Metalheads Connect
          </Typography>

          {/* Sub-tagline */}
          <Typography
            variant="body1"
            color="text.secondary"
            className="fade-in-up fade-in-up-delay-3"
            sx={{ mb: 5, maxWidth: 480, mx: 'auto', fontSize: '1rem' }}
          >
            Letterboxd meets Bandcamp — for Metal. Track your listening, discover
            fans who share your taste, and find your local community.
          </Typography>

          {/* CTAs */}
          {mounted && (
            <Box
              className="fade-in-up fade-in-up-delay-4"
              sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}
            >
              {isAuthenticated ? (
                <>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={() => router.push('/profile')}
                    endIcon={<ArrowForwardIcon />}
                    sx={{ minWidth: 180 }}
                  >
                    My Profile
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={() => router.push('/search')}
                    sx={{ minWidth: 160 }}
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
                    sx={{ minWidth: 180 }}
                  >
                    Sign Up Free
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    component={Link}
                    href="/auth/login"
                    sx={{ minWidth: 140 }}
                  >
                    Login
                  </Button>
                </>
              )}
            </Box>
          )}
        </Container>
      </Box>

      {/* ── Section divider ──────────────────────────────────── */}
      <Box sx={{ px: { xs: 3, md: 8 } }}>
        <Divider
          sx={{
            borderColor: 'rgba(212,175,55,0.15)',
            '&::before, &::after': { borderColor: 'rgba(212,175,55,0.15)' },
          }}
        >
          <Box
            component="span"
            sx={{
              display: 'inline-block',
              width: 8,
              height: 8,
              bgcolor: 'secondary.dark',
              transform: 'rotate(45deg)',
              mx: 1,
              opacity: 0.6,
            }}
          />
        </Divider>
      </Box>

      {/* ── Features ─────────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography
          variant="h3"
          align="center"
          sx={{ mb: 1, fontSize: { xs: '1.75rem', md: '2rem' } }}
        >
          Everything you need
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          align="center"
          sx={{ mb: 6, maxWidth: 480, mx: 'auto' }}
        >
          A social layer built specifically for the metal community
        </Typography>

        <Grid container spacing={3}>
          {FEATURES.map((f) => (
            <Grid item xs={12} md={4} key={f.title}>
              <Card
                className="gold-accent-top"
                sx={{
                  height: '100%',
                  p: 1,
                  '&:hover': {
                    boxShadow: '0 0 24px rgba(139,0,0,0.15)',
                    borderColor: 'rgba(212,175,55,0.2)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ mb: 2 }}>{f.icon}</Box>
                  <Typography variant="h6" gutterBottom>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                    {f.body}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ── Stats ────────────────────────────────────────────── */}
      <Container maxWidth="md" sx={{ pb: { xs: 8, md: 12 } }}>
        <Card
          sx={{
            border: '1px solid rgba(212,175,55,0.12)',
            background: 'rgba(14,14,14,0.9)',
          }}
        >
          <CardContent sx={{ py: 5 }}>
            <Grid container spacing={2}>
              {[
                { value: '1K+', label: 'Active Metalheads' },
                { value: '50K+', label: 'Scrobbled Tracks' },
                { value: '100+', label: 'Genres Covered' },
              ].map((stat) => (
                <Grid item xs={12} sm={4} key={stat.label}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="h3"
                      className="gold-shimmer"
                      sx={{ fontWeight: 700, mb: 0.5 }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Container>
    </>
  )
}
