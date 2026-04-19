'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import { useUser } from '@/app/context/UserContext'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function GalleryPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  if (!mounted || isLoading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
          <CircularProgress size={18} sx={{ color: 'var(--accent)' }} />
        </Box>
      </>
    )
  }

  if (!user) return null

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={lbl}>◆ Gallery</span>
          <Box
            component="button"
            onClick={() => router.push('/profile')}
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
            ← Profile
          </Box>
        </Box>

        <GalleryManager userId={user.id} isOwnProfile={true} previewMode={false} />
      </Box>
    </>
  )
}
