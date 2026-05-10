'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'
import { eventsApi, requestGPS, Event, EventsResponse } from '@/lib/eventsApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.65) return '#4caf7d'
  if (score >= 0.35) return '#e0a840'
  return 'rgba(216,207,184,0.35)'
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
  const md  = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).toUpperCase()
  return { day, md }
}

// ── MatchBadge ────────────────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  const pct   = Math.round(score * 100)
  const color = scoreColor(score)
  return (
    <Box sx={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, minWidth: 38 }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '50%',
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${color}18`,
      }}>
        <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.04em', color, lineHeight: 1, fontWeight: 700 }}>
          {pct}%
        </Typography>
      </Box>
      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.3125rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
        match
      </Typography>
    </Box>
  )
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const { day, md } = formatDate(event.date)
  const color       = scoreColor(event.match_score)
  const { explain } = event

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', gap: 1.25, cursor: 'pointer',
        backgroundColor: '#110e18',
        border: '1px solid rgba(216,207,184,0.12)',
        borderLeft: `3px solid ${color}`,
        borderRadius: '4px',
        p: '10px 12px',
        transition: 'border-color 0.15s, background-color 0.15s',
        '&:hover': { backgroundColor: '#1a1424', borderColor: 'rgba(216,207,184,0.25)', borderLeftColor: color },
      }}
    >
      {/* Date block */}
      <Box sx={{
        flexShrink: 0, width: 40,
        border: '1px solid rgba(216,207,184,0.15)', borderRadius: '3px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        py: 0.75, backgroundColor: '#0a0810',
      }}>
        <Typography sx={{
          fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
          letterSpacing: '0.08em', color: 'var(--muted)', lineHeight: 1.4,
          textAlign: 'center', textTransform: 'uppercase',
        }}>
          {day}<br />{md.split(' ')[0]}<br />{md.split(' ')[1]}
        </Typography>
      </Box>

      {/* Event info */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.25 }}>
        <Typography sx={{
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: '0.9375rem', letterSpacing: '0.02em', textTransform: 'uppercase',
          lineHeight: 1.15, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.headliner?.name ?? event.title}
        </Typography>

        <Typography sx={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.venue} · {event.city}
        </Typography>

        {/* Supporting acts */}
        {event.supporting.length > 0 && (
          <Typography sx={{
            fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
            letterSpacing: '0.08em', color: 'rgba(216,207,184,0.45)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 220, mt: 0.25,
          }}>
            + {event.supporting.map(b => b.name).join(' · ')}
          </Typography>
        )}

        {/* Explain chips */}
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center', mt: 0.375 }}>
          {explain.location && (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.08em', color: 'var(--accent)', flexShrink: 0 }}>
              ⌖ {explain.location}
            </Typography>
          )}
          {explain.taste && (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.08em', color: '#a0c4a0', flexShrink: 0 }}>
              ♪ {explain.taste}
            </Typography>
          )}
          {explain.friends && (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.08em', color: 'rgba(154,122,191,0.85)', flexShrink: 0 }}>
              ♟ {explain.friends}
            </Typography>
          )}
          {event.is_interested && (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.08em', color: '#4caf7d', flexShrink: 0 }}>
              ✓ going
            </Typography>
          )}
        </Box>
      </Box>

      <MatchBadge score={event.match_score} />
    </Box>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, hasNext, hasPrev, onPage,
}: {
  page: number; totalPages: number; hasNext: boolean; hasPrev: boolean;
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em' }
  const btnStyle = (active: boolean) => ({
    border: active ? '1px solid rgba(216,207,184,0.5)' : '1px solid rgba(216,207,184,0.15)',
    borderRadius: '3px', px: 1, height: 26, minWidth: 26,
    background: active ? 'rgba(216,207,184,0.08)' : 'none',
    cursor: 'pointer', color: active ? 'var(--ink)' : 'var(--muted)',
    fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.05em',
    '&:disabled': { opacity: 0.3, cursor: 'not-allowed' },
    '&:hover:not(:disabled)': { borderColor: 'rgba(216,207,184,0.4)', color: 'var(--ink)' },
    transition: 'all 0.15s',
  })

  // Show a window of pages around current
  const pages: (number | '…')[] = []
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) pages.push(p)
    else if (pages[pages.length - 1] !== '…') pages.push('…')
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 3 }}>
      <Box component="button" onClick={() => onPage(page - 1)} disabled={!hasPrev} sx={btnStyle(false)}>
        ←
      </Box>
      {pages.map((p, i) =>
        p === '…' ? (
          <Typography key={`ellipsis-${i}`} sx={{ ...mono, color: 'var(--muted)', px: 0.25 }}>…</Typography>
        ) : (
          <Box key={p} component="button" onClick={() => onPage(p as number)} sx={btnStyle(p === page)}>
            {p}
          </Box>
        )
      )}
      <Box component="button" onClick={() => onPage(page + 1)} disabled={!hasNext} sx={btnStyle(false)}>
        →
      </Box>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'mine'

export default function EventsPage() {
  const router    = useRouter()
  const { user, isLoading: authLoading } = useUser()

  const [result, setResult]   = useState<EventsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [filter, setFilter]   = useState<Filter>('all')
  const [page, setPage]       = useState(1)
  const [gps, setGps]         = useState<{ lat: number; lon: number } | null>(null)
  const [gpsState, setGpsState] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle')

  // Try GPS once on mount
  useEffect(() => {
    if (!authLoading && user) {
      setGpsState('requesting')
      requestGPS().then(coords => {
        if (coords) {
          setGps(coords)
          setGpsState('granted')
        } else {
          setGpsState('denied')
        }
      })
    }
  }, [authLoading, user])

  const load = useCallback(async (p = 1, coords?: { lat: number; lon: number } | null) => {
    setLoading(true)
    setError(null)
    try {
      const data = await eventsApi.listEvents({
        lat: coords?.lat ?? gps?.lat,
        lon: coords?.lon ?? gps?.lon,
        page: p,
        limit: 25,
      })
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [gps])

  // Load when GPS resolves or on mount after auth
  useEffect(() => {
    if (authLoading || !user) return
    if (gpsState === 'idle' || gpsState === 'requesting') return  // wait for GPS attempt
    load(page, gpsState === 'granted' ? gps : null)
  }, [authLoading, user, gpsState]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [authLoading, user, router])

  const handlePage = (p: number) => {
    setPage(p)
    load(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // For "My List" tab: filter client-side on current page, but show all-page count
  const displayEvents = useMemo<Event[]>(() => {
    if (!result) return []
    if (filter === 'mine') return result.events.filter(e => e.is_interested)
    return result.events
  }, [result, filter])

  const tabs: { value: Filter; label: string }[] = [
    { value: 'all',  label: 'Upcoming' },
    { value: 'mine', label: 'My List' },
  ]

  const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }

  if (authLoading || gpsState === 'requesting') {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={24} sx={{ color: 'var(--accent)' }} />
        </Box>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 640, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 12 }}>

        {/* Header */}
        <Box sx={{ mb: 2.5 }}>
          <Typography sx={{ ...mono, fontSize: '0.5rem', color: 'var(--muted)', mb: 0.5 }}>
            ☍ Gather
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
            <Typography sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontSize: { xs: '1.375rem', md: '1.625rem' },
              letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.1,
            }}>
              Events
            </Typography>
            {result && (
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>
                {result.total} upcoming
              </Typography>
            )}
          </Box>

          {/* Location status */}
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.08em', color: 'var(--muted)', mt: 0.5 }}>
            {gpsState === 'granted'
              ? '⌖ ranked by your GPS location'
              : result?.location_source === 'city'
                ? '⌖ ranked by profile city — enable location for better results'
                : (
                  <>
                    no location —{' '}
                    <Box component="span"
                      onClick={() => router.push('/settings')}
                      sx={{ color: 'var(--accent)', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    >
                      set your city
                    </Box>
                    {' '}for proximity ranking
                  </>
                )
            }
          </Typography>
        </Box>

        {/* Filter tabs */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          {tabs.map(t => (
            <Box
              key={t.value}
              component="button"
              onClick={() => { setFilter(t.value); setPage(1) }}
              sx={{
                border: filter === t.value ? '1px solid rgba(216,207,184,0.4)' : '1px solid rgba(216,207,184,0.12)',
                borderRadius: '3px', px: 1.25, height: 26, background: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-mono)',
                fontSize: '0.4375rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                color: filter === t.value ? 'var(--ink)' : 'var(--muted)',
                backgroundColor: filter === t.value ? 'rgba(216,207,184,0.05)' : 'transparent',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </Box>
          ))}
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
          </Box>
        ) : error ? (
          <Box sx={{ border: '1px solid rgba(196,58,42,0.25)', borderRadius: '4px', p: '12px 16px', backgroundColor: 'rgba(196,58,42,0.06)' }}>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>
              ⚠ {error}
            </Typography>
          </Box>
        ) : displayEvents.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1.0625rem', color: 'var(--muted)', mb: 1 }}>
              {filter === 'mine'
                ? "No events marked yet — mark events you're interested in."
                : 'No upcoming events in the database yet.'}
            </Typography>
            {filter === 'mine' && (
              <Box component="button" onClick={() => setFilter('all')} sx={{
                border: '1px dashed rgba(216,207,184,0.2)', borderRadius: '3px',
                px: 1.5, py: 0.75, background: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                letterSpacing: '0.1em', color: 'var(--muted)',
                '&:hover': { color: 'var(--ink)', borderColor: 'rgba(216,207,184,0.4)' },
              }}>
                BROWSE UPCOMING EVENTS
              </Box>
            )}
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {displayEvents.map(event => (
                <EventCard key={event.id} event={event} onClick={() => router.push(`/events/${event.id}`)} />
              ))}
            </Box>

            {/* Pagination (only for 'all' tab — 'mine' is always client-side filtered) */}
            {filter === 'all' && result && (
              <Pagination
                page={result.page}
                totalPages={result.total_pages}
                hasNext={result.has_next}
                hasPrev={result.has_prev}
                onPage={handlePage}
              />
            )}
          </>
        )}

        {/* Legend */}
        {!loading && !error && displayEvents.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { color: '#4caf7d', label: 'Strong match' },
              { color: '#e0a840', label: 'Partial match' },
              { color: 'rgba(216,207,184,0.35)', label: 'Low match' },
            ].map(({ color, label }) => (
              <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.625 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  {label}
                </Typography>
              </Box>
            ))}
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.08em', color: 'rgba(216,207,184,0.3)', ml: 'auto' }}>
              location · taste · friends
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}
