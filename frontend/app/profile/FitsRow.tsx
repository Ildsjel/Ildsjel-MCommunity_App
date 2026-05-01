'use client'

import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import type { FitUser } from '@/lib/profileAPI'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const cardBox: React.CSSProperties = {
  border: '1.5px solid rgba(216,207,184,0.2)',
  borderRadius: '3px',
  padding: '10px 12px',
  backgroundColor: '#120e18',
}

interface Props {
  fits: FitUser[]
}

export default function FitsRow({ fits }: Props) {
  const router = useRouter()
  return (
    <div style={{ ...cardBox, marginBottom: '16px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>✶ FITS</span>
        <span style={{ ...lbl, fontSize: '0.5rem' }}>MUTUAL</span>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {fits.slice(0, 2).map((fit) => (
          <Box
            key={fit.user_id}
            onClick={() => router.push(`/profile/${fit.user_id}`)}
            sx={{
              flex: 1, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
              backgroundColor: '#08060a', p: 1, cursor: 'pointer', textAlign: 'center',
              '&:hover': { borderColor: 'var(--accent)' }, transition: 'border-color 0.1s',
            }}
          >
            <Box sx={{
              width: 40, height: 40, mx: 'auto', mb: 0.75,
              border: '1.5px solid var(--accent, #c43a2a)', borderRadius: '3px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#ece5d3',
              backgroundColor: '#1a1424', overflow: 'hidden',
            }}>
              {fit.profile_image_url
                ? <img src={fit.profile_image_url} alt={fit.handle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : fit.handle[0].toUpperCase()
              }
            </Box>
            <span style={{ ...lbl, color: 'var(--ink)', display: 'block', marginBottom: 2 }}>
              {fit.handle.toUpperCase()}
            </span>
            <span style={{ ...lbl, color: 'var(--accent)', fontSize: '0.5rem' }}>
              {Math.round((fit.compatibility_score ?? 0) * 100)}% COMPAT
            </span>
          </Box>
        ))}
        {fits.length === 0 && (
          <Box sx={{
            flex: 2, border: '1.5px dashed rgba(216,207,184,0.12)', borderRadius: '3px',
            backgroundColor: 'transparent', p: 1, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
              Connect music to find your Fits
            </Typography>
          </Box>
        )}
        <Box
          onClick={() => router.push('/search')}
          sx={{
            flex: 1, border: '1.5px dashed rgba(216,207,184,0.12)', borderRadius: '3px',
            backgroundColor: 'transparent', p: 1, display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            '&:hover': { borderColor: 'rgba(216,207,184,0.3)' }, transition: 'border-color 0.15s',
          }}
        >
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
            Find more in Discover
          </Typography>
        </Box>
      </Box>
    </div>
  )
}
