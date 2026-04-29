'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { getBand } from '@/lib/bandsApi'
import type { Band, Release } from '@/lib/bandsApi'

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

function ReleaseCard({ release, bandSlug, onClick }: { release: Release; bandSlug: string; onClick: () => void }) {
  const typeColor = TYPE_COLORS[release.type] || 'rgba(216,207,184,0.4)'
  const trackCount = release.tracks.length
  const totalSeconds = release.tracks.reduce((acc, t) => {
    const [m, s] = t.duration.split(':').map(Number)
    return acc + m * 60 + (s || 0)
  }, 0)
  const totalMins = Math.round(totalSeconds / 60)

  return (
    <Box
      onClick={onClick}
      sx={{
        border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
        backgroundColor: '#120e18', cursor: 'pointer',
        boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.06)',
        transition: 'box-shadow 0.1s, border-color 0.1s',
        overflow: 'hidden',
        '&:hover': { borderColor: 'rgba(216,207,184,0.35)', boxShadow: '3px 3px 0 rgba(216,207,184,.1)' },
        '&:active': { transform: 'translate(1px,1px)', boxShadow: 'none' },
      }}
    >
      {/* Artwork placeholder */}
      <Box sx={{
        width: '100%', aspectRatio: '1 / 1', position: 'relative',
        background: 'repeating-linear-gradient(135deg, #1e1428 0 5px, #120e18 5px 10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 35% 35%, ${typeColor}22, transparent 65%)`,
        }} />
        <Typography sx={{
          fontFamily: 'var(--font-display)', fontSize: '2.5rem',
          color: 'rgba(236,229,211,0.08)', lineHeight: 1, textAlign: 'center',
          px: 1, position: 'relative', zIndex: 1,
        }}>
          {release.title.charAt(0)}
        </Typography>
        {/* Type badge */}
        <Box sx={{
          position: 'absolute', top: 8, left: 8,
          border: `1.5px solid ${typeColor}`, borderRadius: '2px',
          px: 0.75, height: 18, display: 'flex', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em',
          color: typeColor, backgroundColor: 'rgba(8,6,10,0.8)',
        }}>
          {release.type}
        </Box>
      </Box>

      {/* Info */}
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography sx={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.8125rem', lineHeight: 1.3, mb: 0.375,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {release.title}
        </Typography>
        <span style={{ ...lbl, fontSize: '0.5rem' }}>
          {release.year} · {trackCount} track{trackCount !== 1 ? 's' : ''} · {totalMins} min
        </span>
      </Box>
    </Box>
  )
}

export default function BandPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router = useRouter()
  const [band, setBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBand(slug).then((b) => {
      setBand(b)
      setLoading(false)
    })
  }, [slug])

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--muted)' }}>loading…</span>
        </Box>
      </>
    )
  }

  if (!band) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--accent)' }}>☍ BAND NOT FOUND</span>
        </Box>
      </>
    )
  }

  const lps = band.releases.filter((r) => r.type === 'LP')
  const other = band.releases.filter((r) => r.type !== 'LP')

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Back */}
        <Box
          component="button"
          onClick={() => router.push('/bands')}
          sx={{
            background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2,
            display: 'flex', alignItems: 'center', gap: 0.75,
            fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
            letterSpacing: '0.12em', color: 'var(--muted)',
            '&:hover': { color: 'var(--ink)' }, transition: 'color 0.1s',
          }}
        >
          ← BANDS
        </Box>

        {/* Band header */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'flex-start' }}>
          {/* Logo */}
          <Box sx={{
            width: 88, height: 88, flexShrink: 0,
            border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '4px',
            background: 'repeating-linear-gradient(135deg, #1a1424 0 4px, #120e18 4px 8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 38% 38%, rgba(196,58,42,.2), transparent 65%)',
            }} />
            <Typography sx={{
              fontFamily: 'var(--font-display)', fontSize: '3rem',
              color: 'rgba(236,229,211,0.55)', lineHeight: 1, position: 'relative', zIndex: 1,
            }}>
              {band.name.charAt(0)}
            </Typography>
          </Box>

          {/* Name + meta */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontSize: '1.125rem', lineHeight: 1.2, mb: 0.75 }}>
              {band.name}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
              {band.genres.map((g) => (
                <Box key={g.id} sx={{
                  border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                  px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center',
                  fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
                }}>
                  {g.name}
                </Box>
              ))}
            </Box>
            <span style={{ ...lbl, fontSize: '0.5rem' }}>
              {band.country} · est. {band.formed}
            </span>
          </Box>
        </Box>

        {/* Bio */}
        {band.bio && (
          <Box sx={{
            border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
            backgroundColor: '#120e18', px: 1.5, py: 1.25, mb: 2.5,
          }}>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>ABOUT</span>
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--muted)',
            }}>
              {band.bio}
            </Typography>
          </Box>
        )}

        {/* Discography — LPs */}
        {lps.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
              <span style={lbl}>◉ FULL-LENGTHS</span>
              <span style={{ ...lbl, fontSize: '0.5rem' }}>{lps.length} LP{lps.length !== 1 ? 's' : ''}</span>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 2.5 }}>
              {lps.map((r) => (
                <ReleaseCard
                  key={r.id}
                  release={r}
                  bandSlug={band.slug}
                  onClick={() => router.push(`/bands/${band.slug}/${r.slug}`)}
                />
              ))}
            </Box>
          </>
        )}

        {/* Other releases */}
        {other.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
              <span style={lbl}>◈ OTHER RELEASES</span>
              <span style={{ ...lbl, fontSize: '0.5rem' }}>{other.length}</span>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              {other.map((r) => (
                <ReleaseCard
                  key={r.id}
                  release={r}
                  bandSlug={band.slug}
                  onClick={() => router.push(`/bands/${band.slug}/${r.slug}`)}
                />
              ))}
            </Box>
          </>
        )}

        {band.releases.length === 0 && (
          <Box sx={{ textAlign: 'center', pt: 3 }}>
            <span style={{ ...lbl, color: 'var(--muted)' }}>no releases yet</span>
          </Box>
        )}
      </Box>
    </>
  )
}
