'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import SwipeFeed from '@/app/components/SwipeFeed'
import { useUser } from '@/app/context/UserContext'

type FeedMode = 'reviews' | 'people'

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function FeedPage() {
  const router = useRouter()
  const { user, isLoading: loading } = useUser()
  const [mode, setMode] = useState<FeedMode>('reviews')

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress sx={{ color: 'var(--accent)' }} size={24} />
        </Box>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* ── Mode switcher ────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          {(['reviews', 'people'] as FeedMode[]).map((m) => {
            const isActive = mode === m
            return (
              <Box
                key={m}
                component="button"
                onClick={() => setMode(m)}
                sx={{
                  border: '1.5px solid rgba(216,207,184,0.2)',
                  borderRadius: '3px',
                  px: 1.25, height: 28,
                  display: 'inline-flex', alignItems: 'center',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#ece5d3' : 'transparent',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem', letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: isActive ? '#120e18' : 'var(--muted)',
                  transition: 'background 0.1s, color 0.1s',
                }}
              >
                {m === 'reviews' ? '◉ REVIEWS' : '◈ PEOPLE'}
              </Box>
            )
          })}
        </Box>

        {/* ── People swipe feed ───────────────────────────── */}
        {mode === 'people' && <SwipeFeed />}

        {/* ── Reviews feed ────────────────────────────────── */}
        {mode === 'reviews' && (
          <Box>
            <span style={labelStyle}>◉ RECENT REVIEWS</span>
            <Box sx={{ mt: 1.5, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', mb: 1 }}>
                ◉ NO REVIEWS YET
              </Typography>
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
                Reviews from the community will appear here.
              </Typography>
            </Box>
          </Box>
        )}

      </Box>
    </>
  )
}
