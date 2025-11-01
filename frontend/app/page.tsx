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
} from '@mui/material'
import {
  MusicNote,
  People,
  Event,
  TrendingUp,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
  }, [])

  return (
    <>
      <Navigation />
      <Box
        sx={{
          minHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          {/* Hero Section */}
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '3rem', md: '5rem' },
                fontWeight: 700,
                mb: 2,
              }}
            >
              Grimr
            </Typography>
            <Typography variant="h5" color="text.secondary" gutterBottom>
              Metalheads Connect
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Letterboxd meets Bandcamp for Metal
            </Typography>

            {!isAuthenticated && (
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  component={Link}
                  href="/auth/register"
                  sx={{ px: 4 }}
                >
                  Sign Up
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  component={Link}
                  href="/auth/login"
                  sx={{ px: 4 }}
                >
                  Login
                </Button>
              </Box>
            )}
          </Box>

          {/* Features Grid */}
          <Grid container spacing={3} sx={{ mb: 8 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent sx={{ textAlign: 'center', p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <MusicNote sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Metal-ID
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Connect your Spotify, Last.fm, Discogs & Bandcamp. Auto-generate your Metal identity.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent sx={{ textAlign: 'center', p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <People sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Find Your Tribe
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Discover Metalheads with similar taste nearby. Compatibility matching based on your music DNA.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardContent sx={{ textAlign: 'center', p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  <Event sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" gutterBottom fontWeight="bold">
                    Events & Community
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
                    Find concerts, join event groups, share album reviews. Connect IRL.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Stats Section */}
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Grid container spacing={4}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    1K+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Metalheads
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    50K+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Scrobbled Tracks
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="h3" color="primary" fontWeight="bold">
                    100+
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upcoming Events
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* API Status */}
          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Chip
              icon={<TrendingUp />}
              label="Backend API: Running on localhost:8000"
              color="success"
              variant="outlined"
              size="small"
            />
          </Box>
        </Container>
      </Box>
    </>
  )
}
