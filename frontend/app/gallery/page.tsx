'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
} from '@mui/material'
import { ArrowBack } from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import { useUser } from '@/app/context/UserContext'

export default function GalleryPage() {
  const router = useRouter()
  const { user } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <>
        <Navigation />
        <Container>
          <Box sx={{ py: 4 }}>
            <Typography>Loading...</Typography>
          </Box>
        </Container>
      </>
    )
  }

  if (!user) {
    return (
      <>
        <Navigation />
        <Container>
          <Box sx={{ py: 4 }}>
            <Alert severity="warning">
              Bitte melde dich an, um deine Galerie zu sehen.
            </Alert>
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
            onClick={() => router.push('/profile')}
            sx={{ mb: 2 }}
          >
            Zurück zum Profil
          </Button>
          <Typography variant="h3" gutterBottom>
            Meine Galerie
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Verwalte deine Bilder (max. 10 Bilder)
          </Typography>
        </Box>

        <GalleryManager userId={user.id} isOwnProfile={true} previewMode={false} />
      </Container>
    </>
  )
}

