'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { getRelease } from '@/lib/mockBands'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const TYPE_COLORS: Record<string, string> = {
  LP: 'var(--accent, #c43a2a)',
  EP: '#9a7abf',
  'Split-EP': '#9a7abf',
  Demo: '#6a9a7a',
  Live: '#9a8a4a',
  Single: '#4a8a9a',
}

export default function AlbumPage({
  params,
}: {
  params: { slug: string; albumSlug: string }
}) {
  const { slug, albumSlug } = params
  const router = useRouter()
  const result = getRelease(slug, albumSlug)
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null)

  if (!result) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--accent)' }}>☍ RELEASE NOT FOUND</span>
        </Box>
      </>
    )
  }

  const { band, release } = result
  const typeColor = TYPE_COLORS[release.type] || 'rgba(216,207,184,0.4)'

  const totalSeconds = release.tracks.reduce((acc, t) => {
    const [m, s] = t.duration.split(':').map(Number)
    return acc + m * 60 + (s || 0)
  }, 0)
  const totalMins = Math.floor(totalSeconds / 60)
  const totalSecs = totalSeconds % 60

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', pb: 10 }}>

        {/* Artwork — full width */}
        <Box sx={{
          width: '100%', aspectRatio: '1 / 1', position: 'relative',
          background: 'repeating-linear-gradient(135deg, #1e1428 0 6px, #120e18 6px 12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Atmospheric glow */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 38% 38%, ${typeColor}1a, transparent 60%)`,
          }} />
          {/* Second glow accent */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 72% 68%, rgba(120,80,180,.07), transparent 50%)',
          }} />

          {/* Large initial watermark */}
          <Typography sx={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(8rem, 35vw, 14rem)',
            color: 'rgba(236,229,211,0.04)', lineHeight: 1, position: 'relative', zIndex: 1,
            userSelect: 'none',
          }}>
            {release.title.charAt(0)}
          </Typography>

          {/* Type badge */}
          <Box sx={{
            position: 'absolute', top: 14, right: 14,
            border: `1.5px solid ${typeColor}`, borderRadius: '2px',
            px: 1, height: 22, display: 'flex', alignItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em',
            color: typeColor, backgroundColor: 'rgba(8,6,10,0.85)',
          }}>
            {release.type}
          </Box>

          {/* Fret mock — play button area */}
          <Box sx={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '20px',
            px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1,
            backgroundColor: 'rgba(8,6,10,0.75)',
          }}>
            <span style={{ ...lbl, color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1 }}>▶</span>
            <span style={{ ...lbl, color: 'var(--muted)' }}>PLAY ON SPOTIFY</span>
          </Box>
        </Box>

        {/* Metadata block */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          {/* Back nav */}
          <Box
            component="button"
            onClick={() => router.push(`/bands/${band.slug}`)}
            sx={{
              background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 1.75,
              fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
              letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase',
              '&:hover': { color: 'var(--ink)' }, transition: 'color 0.1s',
            }}
          >
            ← {band.name}
          </Box>

          <Typography variant="h4" sx={{ fontSize: '1.25rem', lineHeight: 1.2, mb: 0.5 }}>
            {release.title}
          </Typography>
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.875rem', color: 'var(--muted)', mb: 1,
          }}>
            {band.name}
          </Typography>
          <span style={{ ...lbl, fontSize: '0.5rem' }}>
            {release.year} · {release.label} · {release.tracks.length} tracks · {totalMins}:{String(totalSecs).padStart(2, '0')}
          </span>
        </Box>

        {/* Divider */}
        <Box sx={{ mx: 2, borderTop: '1px solid rgba(216,207,184,0.1)', mb: 0 }} />

        {/* Tracklist */}
        <Box sx={{ px: 2, pt: 1.5 }}>
          <span style={{ ...lbl, display: 'block', marginBottom: 10 }}>◉ TRACKLIST</span>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {release.tracks.map((track) => {
              const isExpanded = expandedTrack === track.number
              const hasLyrics = !!track.lyrics

              return (
                <Box key={track.number}>
                  {/* Track row */}
                  <Box
                    onClick={() => {
                      if (!hasLyrics) return
                      setExpandedTrack(isExpanded ? null : track.number)
                    }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      py: 1.125, borderBottom: '1px solid rgba(216,207,184,0.08)',
                      cursor: hasLyrics ? 'pointer' : 'default',
                      transition: 'opacity 0.1s',
                      '&:hover': hasLyrics ? { opacity: 0.8 } : {},
                    }}
                  >
                    {/* Track number */}
                    <Box sx={{
                      width: 22, flexShrink: 0, textAlign: 'right',
                      fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                      letterSpacing: '0.06em', color: 'var(--muted)',
                    }}>
                      {isExpanded ? '▾' : String(track.number).padStart(2, '0')}
                    </Box>

                    {/* Title */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                        fontSize: '0.875rem', lineHeight: 1.3,
                        color: isExpanded ? 'var(--ink)' : 'var(--ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {track.title}
                      </Typography>
                    </Box>

                    {/* Lyrics indicator + duration */}
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {hasLyrics && (
                        <span style={{ ...lbl, fontSize: '0.4375rem', color: typeColor }}>
                          LYRICS
                        </span>
                      )}
                      <span style={{ ...lbl, fontSize: '0.5rem' }}>{track.duration}</span>
                    </Box>
                  </Box>

                  {/* Lyrics panel */}
                  {isExpanded && track.lyrics && (
                    <Box sx={{
                      mx: -2, px: 4, py: 2,
                      backgroundColor: '#08060a',
                      borderBottom: '1px solid rgba(216,207,184,0.08)',
                    }}>
                      <Typography sx={{
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                        fontSize: '0.9375rem', lineHeight: 1.85,
                        color: 'rgba(236,229,211,0.72)',
                        whiteSpace: 'pre-line',
                      }}>
                        {track.lyrics}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>
      </Box>
    </>
  )
}
