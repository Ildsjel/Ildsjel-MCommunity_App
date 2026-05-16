'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { bandFavouritesApi } from '@/lib/bandFavouritesApi'
import type { FavouriteBandSummary } from '@/lib/bandFavouritesApi'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function FavouriteBandsPage() {
  const router = useRouter()
  const [bands, setBands] = useState<FavouriteBandSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    bandFavouritesApi.getFavourites()
      .then(setBands)
      .catch(() => setBands([]))
      .finally(() => setLoading(false))
  }, [])

  const handleRemove = async (band: FavouriteBandSummary) => {
    setRemoving(band.id)
    try {
      await bandFavouritesApi.remove(band.id)
      setBands((prev) => prev.filter((b) => b.id !== band.id))
    } catch {
      // ignore
    } finally {
      setRemoving(null)
    }
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box
            component="button"
            onClick={() => router.push('/bands')}
            sx={{
              background: 'none', border: 'none', cursor: 'pointer', p: 0,
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
              letterSpacing: '0.12em', color: 'var(--muted)',
              '&:hover': { color: 'var(--ink)' }, transition: 'color 0.1s',
            }}
          >
            ← BANDS
          </Box>
          <span style={{ ...lbl, fontSize: '0.625rem' }}>
            {loading ? '…' : `${bands.length} SAVED`}
          </span>
        </Box>

        <Box sx={{ mb: 2.5 }}>
          <span style={{ ...lbl, color: 'var(--accent, #c43a2a)' }}>♥ MY FAVOURITE BANDS</span>
        </Box>

        {/* Loading */}
        {loading && (
          <Box sx={{ textAlign: 'center', pt: 6 }}>
            <span style={{ ...lbl, color: 'var(--muted)' }}>loading…</span>
          </Box>
        )}

        {/* Empty state */}
        {!loading && bands.length === 0 && (
          <Box sx={{
            border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
            backgroundColor: '#120e18', px: 2, py: 4, textAlign: 'center',
          }}>
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.5,
            }}>
              No favourite bands yet.
            </Typography>
            <Box
              component="button"
              onClick={() => router.push('/bands')}
              sx={{
                background: 'none',
                border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                px: 1.5, height: 26, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5625rem',
                letterSpacing: '0.12em', color: 'var(--muted)',
                '&:hover': { borderColor: 'rgba(216,207,184,0.4)', color: 'var(--ink)' },
              }}
            >
              BROWSE BANDS
            </Box>
          </Box>
        )}

        {/* Band list */}
        {!loading && bands.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {bands.map((band) => (
              <Box
                key={band.id}
                sx={{
                  display: 'flex', gap: 1.5, alignItems: 'center',
                  border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                  backgroundColor: '#120e18', px: 1.5, py: 1.25,
                  boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.06)',
                }}
              >
                {/* Logo block */}
                <Box
                  onClick={() => router.push(`/bands/${band.slug}`)}
                  sx={{
                    width: 48, height: 48, flexShrink: 0,
                    border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
                    background: 'repeating-linear-gradient(135deg, #1a1424 0 4px, #120e18 4px 8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden', cursor: 'pointer',
                  }}
                >
                  <Box sx={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at 40% 40%, rgba(196,58,42,.12), transparent 70%)',
                  }} />
                  <Typography sx={{
                    fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                    fontSize: '1.25rem', color: 'rgba(236,229,211,0.5)', lineHeight: 1,
                    position: 'relative', zIndex: 1,
                  }}>
                    {band.name.charAt(0)}
                  </Typography>
                </Box>

                {/* Info */}
                <Box
                  sx={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                  onClick={() => router.push(`/bands/${band.slug}`)}
                >
                  <Typography sx={{
                    fontFamily: 'var(--font-display)', fontSize: '0.875rem',
                    letterSpacing: '0.03em', mb: 0.375, lineHeight: 1.2,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {band.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.375 }}>
                    {band.genres.slice(0, 2).map((g) => (
                      <Box key={g.id} sx={{
                        border: '1px solid rgba(216,207,184,0.18)', borderRadius: '2px',
                        px: 0.625, height: 16, display: 'inline-flex', alignItems: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '0.5625rem',
                        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
                      }}>
                        {g.name}
                      </Box>
                    ))}
                  </Box>
                  <span style={{ ...lbl, fontSize: '0.625rem' }}>
                    {band.country_code} · est. {band.formed}
                  </span>
                </Box>

                {/* Remove button */}
                <Box
                  component="button"
                  onClick={() => handleRemove(band)}
                  disabled={removing === band.id}
                  sx={{
                    flexShrink: 0, background: 'none', border: 'none',
                    cursor: removing === band.id ? 'default' : 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
                    color: removing === band.id ? 'rgba(196,58,42,0.3)' : 'var(--accent, #c43a2a)',
                    lineHeight: 1, p: 0.5,
                    transition: 'opacity 0.1s',
                    '&:hover:not(:disabled)': { opacity: 0.7 },
                  }}
                  title="Remove from favourites"
                >
                  ♥
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </>
  )
}
