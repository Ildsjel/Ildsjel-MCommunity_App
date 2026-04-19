'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, CircularProgress, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

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
        setError('User not found.')
      } finally {
        setLoading(false)
      }
    }

    if (userId) fetchUserInfo()
  }, [userId])

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={18} sx={{ color: 'var(--accent)' }} />
        </Box>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4 }}>
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center',
          }}>
            {error}
          </Typography>
        </Box>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={lbl}>◆ {userName}'s Gallery</span>
          <Box
            component="button"
            onClick={() => router.back()}
            sx={{
              background: 'none',
              border: '1.5px solid rgba(216,207,184,0.2)',
              borderRadius: '3px',
              px: 1.25,
              py: 0.5,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
            }}
          >
            ← Back
          </Box>
        </Box>

        <GalleryManager userId={userId} isOwnProfile={false} previewMode={false} />
      </Box>
    </>
  )
}
