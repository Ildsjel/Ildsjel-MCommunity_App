'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import SwipeFeed from '@/app/components/SwipeFeed'
import { useUser } from '@/app/context/UserContext'

type FeedMode = 'reviews' | 'people'
type Filter   = 'all' | 'coven' | 'near'

const MOCK_FEED = [
  { id: '1', albumPath: '/bands/panopticon/roads-to-the-north', user: 'MGLA_PURIST', initial: 'M', time: '2h',  artist: 'Panopticon',  album: 'Roads to the North',       review: '"a slow cathedral collapse — every riff earned, every silence deliberate."', horns: 42, discuss: 7,  stars: 4, filters: ['all', 'coven'] as Filter[] },
  { id: '2', albumPath: '/bands/bell-witch/mirror-reaper',       user: 'HRAFN',       initial: 'H', time: '5h',  artist: 'Bell Witch',  album: 'Mirror Reaper',             review: '"impenetrable. required. two hours of descent."',                           horns: 18, discuss: 2,  stars: 5, filters: ['all', 'near']  as Filter[] },
  { id: '3', albumPath: '/bands/mgla/exercises-in-futility',     user: 'VARG_OUTSIDER',initial:'V', time: '1d',  artist: 'Mgła',        album: 'Exercises in Futility',     review: null,                                                                        horns: 9,  discuss: 0,  stars: 5, filters: ['all']           as Filter[] },
  { id: '4', albumPath: '/bands/sunno/life-metal',               user: 'ASHES_42',    initial: 'A', time: '1d',  artist: 'Sunn O)))',   album: 'Life Metal',                review: '"drone as devotion. this record rewired something."',                      horns: 31, discuss: 11, stars: 4, filters: ['all', 'coven', 'near'] as Filter[] },
]

const FILTER_DESCRIPTIONS: Record<Filter, { label: string; desc: string }> = {
  all:   { label: 'ALL',   desc: 'What the underground is spinning' },
  coven: { label: 'COVEN', desc: 'From people in your circle' },
  near:  { label: 'NEAR',  desc: 'Listeners close to you' },
}

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: 'var(--accent, #9A1A1A)', letterSpacing: '1px', fontSize: '0.6rem' }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0.2 }}>★</span>
      ))}
    </span>
  )
}

export default function FeedPage() {
  const router = useRouter()
  const { user, isLoading: loading } = useUser()
  const [mode, setMode]               = useState<FeedMode>('reviews')
  const [activeFilter, setActiveFilter] = useState<Filter>('all')

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

  const items = MOCK_FEED.filter((item) => item.filters.includes(activeFilter))

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
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
              <span style={lbl}>◉ RECENT REVIEWS</span>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['all', 'coven', 'near'] as Filter[]).map((f) => {
                  const isActive = activeFilter === f
                  return (
                    <Box
                      key={f}
                      component="button"
                      onClick={() => setActiveFilter(f)}
                      sx={{
                        border: '1.5px solid rgba(216,207,184,0.2)',
                        borderRadius: '3px', px: 0.75, height: 22,
                        display: 'inline-flex', alignItems: 'center',
                        cursor: 'pointer',
                        backgroundColor: isActive ? '#ece5d3' : 'transparent',
                        fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: isActive ? '#120e18' : 'var(--muted)',
                        transition: 'background 0.1s',
                      }}
                    >
                      {FILTER_DESCRIPTIONS[f].label}
                    </Box>
                  )
                })}
              </Box>
            </Box>

            {/* Filter description */}
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.75 }}>
              {FILTER_DESCRIPTIONS[activeFilter].desc}
            </Typography>

            {/* Cards */}
            {items.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {items.map((item) => (
                  <Box
                    key={item.id}
                    onClick={() => router.push(item.albumPath)}
                    sx={{
                      border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                      backgroundColor: '#120e18', px: 1.25, py: 1.25,
                      display: 'flex', gap: 1.25, cursor: 'pointer',
                      boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.08)',
                      transition: 'box-shadow 0.1s, transform 0.08s',
                      '&:hover': { boxShadow: '3px 3px 0 rgba(216,207,184,.12)' },
                      '&:active': { transform: 'translate(1px,1px)', boxShadow: 'none' },
                    }}
                  >
                    <Box sx={{
                      width: 52, height: 52, flexShrink: 0,
                      border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '2px',
                      background: 'repeating-linear-gradient(45deg, #1a1424 0 3px, #120e18 3px 6px)',
                    }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                        <Box sx={{
                          width: 18, height: 18, flexShrink: 0,
                          border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: 'var(--font-display)', fontSize: '0.5rem',
                          color: '#ece5d3', backgroundColor: '#1a1424',
                        }}>
                          {item.initial}
                        </Box>
                        <span style={lbl}>{item.user} · {item.time}</span>
                      </Box>
                      <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.03em', mb: 0.125 }}>
                        {item.artist}
                      </Typography>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: item.review ? 0.625 : 0 }}>
                        {item.album}
                      </Typography>
                      {item.review && (
                        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--ink)', mb: 0.625, lineHeight: 1.4 }}>
                          {item.review}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em' }}>
                        <span style={{ color: 'var(--accent)' }}>✶ {item.horns}</span>
                        <span style={{ color: 'var(--muted)' }}>☍ {item.discuss}</span>
                        <Stars n={item.stars} />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
                {activeFilter === 'coven' ? (
                  <>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', mb: 1 }}>☍ YOUR COVEN IS EMPTY</Typography>
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>Find your kind in Discover and throw horns to build your circle.</Typography>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--accent)', mb: 1 }}>⌖ LOCATION NOT SET</Typography>
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>Set your city on your profile to find nearby listeners.</Typography>
                  </>
                )}
              </Box>
            )}

            {items.length > 0 && (
              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <span style={{ ...lbl, letterSpacing: '0.14em' }}>· · · end of current feed · · ·</span>
              </Box>
            )}
          </Box>
        )}

      </Box>
    </>
  )
}
