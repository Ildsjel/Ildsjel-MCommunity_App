'use client'

import { useParams, useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'

// Mock data — replace with real API once review endpoint exists
const MOCK_REVIEW = {
  album: {
    title: 'MIRROR REAPER',
    artist: 'Bell Witch',
    year: 2017,
    label: 'Profound Lore',
    thumbnail: null as string | null,
    rating: '★★★★★',
  },
  reviewer: {
    handle: 'HRAFN',
    initial: 'H',
    date: '22/04',
  },
  body: `Eighty-three minutes is not an album. It is a mourning rite. The band lost Adrian Guerra in 2016 and this record is the reckoning — one long, slow descent where every tremor of the bass feels deliberate, every silence earned.

Put it on and don't do anything else. Don't reach for your phone. Don't fold laundry. This asks for all of you. It gets all of me every time.`,
  reactions: { horns: 42, discuss: 7 },
}

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function AlbumPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  // In a real implementation, fetch by `id`
  const review = MOCK_REVIEW

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 4 }}>

        {/* Back row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={{ ...lbl, cursor: 'pointer' }} onClick={() => router.back()}>
            ← BACK
          </span>
          <span style={lbl}>⋯</span>
        </Box>

        {/* Album header: thumbnail + title + rating */}
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mb: 1.5 }}>
          {review.album.thumbnail ? (
            <Box
              component="img"
              src={review.album.thumbnail}
              alt={review.album.title}
              sx={{ width: 44, height: 44, border: '1.5px solid #1A1A1A', borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <Box sx={{
              width: 44, height: 44, flexShrink: 0,
              border: '1.5px solid #1A1A1A', borderRadius: '2px',
              background: 'repeating-linear-gradient(45deg, #DCD6C8 0 3px, #EBE6DC 3px 6px)',
            }} />
          )}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <span style={lbl}>
              {review.album.title} · {review.album.artist}
            </span>
            <Typography sx={{
              fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
              fontSize: '0.5625rem',
              letterSpacing: '0.12em',
              color: 'var(--accent, #9A1A1A)',
              display: 'block',
            }}>
              {review.album.rating}
            </Typography>
          </Box>
        </Box>

        {/* Reviewer row */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.5 }}>
          <Box sx={{
            width: 28, height: 28, flexShrink: 0,
            border: '1.5px solid #1A1A1A', borderRadius: '3px',
            backgroundColor: '#141414', color: '#F3EFE7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
            fontSize: '0.75rem',
          }}>
            {review.reviewer.initial}
          </Box>
          <Typography sx={{
            fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
            fontSize: '0.6875rem',
            letterSpacing: '0.04em',
            flex: 1,
          }}>
            {review.reviewer.handle}
          </Typography>
          <span style={lbl}>{review.reviewer.date}</span>
        </Box>

        {/* Review body */}
        <Box sx={{
          border: '1.5px solid #1A1A1A',
          borderRadius: '3px',
          backgroundColor: '#F3EFE7',
          p: 1.75,
          mb: 2,
          boxShadow: '1.5px 1.5px 0 rgba(20,20,20,0.15)',
        }}>
          {review.body.split('\n\n').map((para, i) => (
            <Typography
              key={i}
              sx={{
                fontFamily: 'var(--font-serif, "EB Garamond", serif)',
                fontSize: '1rem',
                fontStyle: 'italic',
                lineHeight: 1.65,
                color: 'var(--ink)',
                mb: i < review.body.split('\n\n').length - 1 ? 1.5 : 0,
              }}
            >
              {i === 0 ? `"${para}` : para}
              {i === review.body.split('\n\n').length - 1 ? '"' : ''}
            </Typography>
          ))}
        </Box>

        {/* Actions row */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
          fontSize: '0.5625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          alignItems: 'center',
        }}>
          <span style={{ color: 'var(--accent)', cursor: 'pointer' }}>
            ✶ {review.reactions.horns}
          </span>
          <span style={{ color: 'var(--muted)', cursor: 'pointer' }}>
            ☍ {review.reactions.discuss} DISCUSS
          </span>
          <span style={{ color: 'var(--muted)', cursor: 'pointer', marginLeft: 'auto' }}>
            ↗ SHARE
          </span>
        </Box>

        {/* Album metadata */}
        <Box sx={{
          mt: 3,
          border: '1.5px solid #1A1A1A',
          borderRadius: '3px',
          backgroundColor: '#F3EFE7',
          p: 1.25,
        }}>
          <span style={{ ...lbl, display: 'block', marginBottom: 4 }}>ALBUM INFO</span>
          <Typography sx={{
            fontFamily: 'var(--font-serif, "EB Garamond", serif)',
            fontStyle: 'italic',
            fontSize: '0.875rem',
            color: 'var(--muted)',
          }}>
            {review.album.artist} · {review.album.year} · {review.album.label}
          </Typography>
        </Box>
      </Box>
    </>
  )
}
