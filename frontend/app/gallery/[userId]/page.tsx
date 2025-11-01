'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function UserGalleryPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

  const [userName, setUserName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/v1/users/${userId}/profile`)
        setUserName(response.data.handle)
      } catch (err) {
        setError('User nicht gefunden')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchUserInfo()
    }
  }, [userId])

  if (loading) {
    return (
      <>
        <Navigation />
        <Container>
          <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navigation />
        <Container>
          <Box sx={{ py: 4 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        </Container>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.back()}
            sx={{ mb: 2 }}
          >
            Zurück
          </Button>
          <Typography variant="h3" gutterBottom>
            {userName}'s Galerie
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Öffentliche Galerie
          </Typography>
        </Box>

        <GalleryManager userId={userId} isOwnProfile={false} previewMode={false} />
      </Container>
    </>
  )
}

