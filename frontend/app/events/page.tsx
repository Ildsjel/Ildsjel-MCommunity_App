'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'
import { eventsApi, Event } from '@/lib/eventsApi'

// ── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.65) return '#4caf7d'       // strong match – green
  if (score >= 0.35) return '#e0a840'       // partial match – amber
  return 'rgba(216,207,184,0.35)'           // weak – muted
}

function formatDate(iso: string) {
  // iso = "2025-06-14" → { day: "SAT", md: "14 JUN" }
  const d = new Date(iso + 'T12:00:00Z')   // noon UTC avoids TZ shift
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
  const md = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).toUpperCase()
  return { day, md }
}

function MatchBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = scoreColor(score)
  return (
    <Box sx={{
      flexShrink: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25,
      minWidth: 38,
    }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '50%',
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: `${color}18`,
      }}>
        <Typography sx={{
          fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
          letterSpacing: '0.04em', color, lineHeight: 1, fontWeight: 700,
        }}>
          {pct}%
        </Typography>
      </Box>
      <Typography sx={{
        fontFamily: 'var(--font-mono)', fontSize: '0.3125rem',
        letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase',
      }}>
        match
      </Typography>
    </Box>
  )
}

function EventCard({ event, onClick }: { event: Event; onClick: () => void }) {
  const { day, md } = formatDate(event.date)
  const color = scoreColor(event.match_score)

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
        '&:hover': {
          backgroundColor: '#1a1424',
          borderColor: 'rgba(216,207,184,0.25)',
          borderLeftColor: color,
        },
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
        {/* Headliner / title */}
        <Typography sx={{
          fontFamily: '"Archivo Black", sans-serif',
          fontSize: '0.9375rem', letterSpacing: '0.02em', textTransform: 'uppercase',
          lineHeight: 1.15, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.headliner?.name ?? event.title}
        </Typography>

        {/* Venue · City */}
        <Typography sx={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {event.venue} · {event.city}
        </Typography>

        {/* Supporting + meta row */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mt: 0.25 }}>
          {event.supporting.length > 0 && (
            <Typography sx={{
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.08em', color: 'rgba(216,207,184,0.45)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: 180,
            }}>
              + {event.supporting.map(b => b.name).join(' · ')}
            </Typography>
          )}
          {event.distance_km != null && (
            <Typography sx={{
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.08em', color: 'var(--accent)', flexShrink: 0,
            }}>
              ⌖ {event.distance_km} km
            </Typography>
          )}
          {event.friends_interested.length > 0 && (
            <Typography sx={{
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.08em', color: 'rgba(154,122,191,0.8)', flexShrink: 0,
            }}>
              ♟ {event.friends_interested.length} friend{event.friends_interested.length !== 1 ? 's' : ''}
            </Typography>
          )}
          {event.is_interested && (
            <Typography sx={{
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.08em', color: '#4caf7d', flexShrink: 0,
            }}>
              ✓ going
            </Typography>
          )}
        </Box>
      </Box>

      {/* Match badge */}
      <MatchBadge score={event.match_score} />
    </Box>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'mine'

export default function EventsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useUser()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (authLoading || !user) return
    load()
  }, [authLoading, user]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await eventsApi.listEvents()
      setEvents(data.events)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'mine') return events.filter(e => e.is_interested)
    return events
  }, [events, filter])

  const tabs: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Upcoming' },
    { value: 'mine', label: 'My List' },
  ]

  const mono: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  }

  if (authLoading) {
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
          <Typography sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: { xs: '1.375rem', md: '1.625rem' },
            letterSpacing: '0.02em', textTransform: 'uppercase',
            lineHeight: 1.1,
          }}>
            Events
          </Typography>
          {!user?.city && (
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', color: 'var(--muted)', mt: 0.5,
            }}>
              Set your city on your{' '}
              <Box component="span"
                onClick={() => router.push('/settings')}
                sx={{ color: 'var(--accent)', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
                profile
              </Box>{' '}
              to see distances and improve ranking.
            </Typography>
          )}
        </Box>

        {/* Filter tabs */}
        <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
          {tabs.map(t => (
            <Box
              key={t.value}
              component="button"
              onClick={() => setFilter(t.value)}
              sx={{
                border: filter === t.value
                  ? '1px solid rgba(216,207,184,0.4)'
                  : '1px solid rgba(216,207,184,0.12)',
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
          <Box sx={{
            border: '1px solid rgba(196,58,42,0.25)', borderRadius: '4px',
            p: '12px 16px', backgroundColor: 'rgba(196,58,42,0.06)',
          }}>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>
              ⚠ {error}
            </Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '1.0625rem', color: 'var(--muted)', mb: 1,
            }}>
              {filter === 'mine'
                ? 'No events marked yet — mark events you\'re interested in.'
                : 'No upcoming events in the database yet.'}
            </Typography>
            {filter === 'mine' && (
              <Box
                component="button"
                onClick={() => setFilter('all')}
                sx={{
                  border: '1px dashed rgba(216,207,184,0.2)', borderRadius: '3px',
                  px: 1.5, py: 0.75, background: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                  letterSpacing: '0.1em', color: 'var(--muted)',
                  '&:hover': { color: 'var(--ink)', borderColor: 'rgba(216,207,184,0.4)' },
                }}
              >
                BROWSE UPCOMING EVENTS
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filtered.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => router.push(`/events/${event.id}`)}
              />
            ))}
          </Box>
        )}

        {/* Legend */}
        {!loading && !error && filtered.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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
              ranked by location · taste · friends
            </Typography>
          </Box>
        )}
      </Box>
    </>
  )
}
