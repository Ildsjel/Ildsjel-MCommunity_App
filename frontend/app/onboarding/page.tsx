'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, Button } from '@mui/material'
import Sigil from '@/app/components/Sigil'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) router.push('/auth/login')
  }, [router])

  const handleLinkSpotify = () => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth/login'); return }
    window.location.href = `${API_BASE}/api/v1/spotify/connect`
  }

  const handleSkip = () => {
    router.push('/feed')
  }

  return (
    <Box sx={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      px: 2,
      pt: 3,
      pb: 4,
      maxWidth: 480,
      mx: 'auto',
    }}>

      {/* Top: label + headline + body */}
      <Box>
        <Typography sx={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted, #7A756D)',
          mb: 2,
        }}>
          ◉ CONSECRATION
        </Typography>

        <Typography variant="h1" sx={{
          fontSize: 'clamp(2rem, 9vw, 3.5rem)',
          lineHeight: 0.95,
          mb: 1.5,
        }}>
          PROVE<br />YOU ARE
        </Typography>

        <Typography component="em" sx={{
          display: 'block',
          fontFamily: 'var(--font-serif, "EB Garamond", serif)',
          fontStyle: 'italic',
          fontWeight: 400,
          fontSize: 'clamp(1.75rem, 7vw, 3rem)',
          lineHeight: 1.0,
          color: 'var(--accent, #9A1A1A)',
          mb: 2,
        }}>
          one of us.
        </Typography>

        <Typography sx={{
          fontFamily: 'var(--font-serif, "EB Garamond", serif)',
          fontSize: '0.9375rem',
          lineHeight: 1.55,
          color: 'var(--muted)',
          maxWidth: '28ch',
        }}>
          Link Spotify — we read ~90 days of listening. That&apos;s it. Takes 10 seconds.
        </Typography>
      </Box>

      {/* Center: blank Sigil */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2 }}>
        <Box sx={{ width: 200, height: 200 }}>
          <Sigil
            size={220}
            loading
            genres={['?', '?', '?', '?', '?']}
            centerTop="—"
            centerBottom="awaits reading"
          />
        </Box>
        <Typography sx={{
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          mt: 1,
        }}>
          YOUR SIGIL · UNREAD
        </Typography>
      </Box>

      {/* Bottom: CTAs */}
      <Box>
        <Button
          fullWidth
          variant="contained"
          onClick={handleLinkSpotify}
          sx={{ py: 1.75, mb: 1.5, fontSize: '0.875rem' }}
        >
          ◉ LINK SPOTIFY
        </Button>
        <Typography
          onClick={handleSkip}
          sx={{
            textAlign: 'center',
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            fontSize: '0.5625rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            cursor: 'pointer',
            '&:hover': { color: 'var(--ink)' },
          }}
        >
          I&apos;LL DO THIS LATER
        </Typography>
      </Box>
    </Box>
  )
}
