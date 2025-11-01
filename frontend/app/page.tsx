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
  TrendingUp,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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

            {mounted && !isAuthenticated && (
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
