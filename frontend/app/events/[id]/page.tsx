'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import EventRsvpButtons from '@/app/components/EventRsvpButtons'
import AvatarGroup from '@/app/components/AvatarGroup'
import AttendeesModal from '@/app/components/AttendeesModal'
import { useUser } from '@/app/context/UserContext'
import { eventsApi, Event, RsvpResponse } from '@/lib/eventsApi'

// ── helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 0.65) return '#4caf7d'
  if (score >= 0.35) return '#e0a840'
  return 'rgba(216,207,184,0.35)'
}

function formatDateLong(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
}

function formatDateShort(iso: string) {
  const d = new Date(iso + 'T12:00:00Z')
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()
  const md = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).toUpperCase()
  return { day, md }
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { user, isLoading: authLoading } = useUser()

  const [event, setEvent]         = useState<Event | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [toggling, setToggling]   = useState(false)

  // Modal state
  const [modalOpen, setModalOpen]       = useState(false)
  const [modalTab, setModalTab]         = useState<'going' | 'interested'>('going')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const data = await eventsApi.getEvent(id)
      setEvent(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load event')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (authLoading || !user) return
    load()
  }, [authLoading, user, load])

  const handleRsvp = async (status: 'interested' | 'going') => {
    if (!event || toggling) return
    // Optimistic update
    const prevRsvp        = event.my_rsvp
    const newRsvp         = event.my_rsvp === status ? null : status
    const goingDelta      = (status === 'going'      ? (newRsvp ? 1 : -1) : 0)
                          + (prevRsvp === 'going'    && status !== 'going' ? -1 : 0)
    const interestedDelta = (status === 'interested' ? (newRsvp ? 1 : -1) : 0)
                          + (prevRsvp === 'interested' && status !== 'interested' ? -1 : 0)
    setEvent(prev => prev ? {
      ...prev,
      my_rsvp:          newRsvp,
      going_count:      Math.max(0, prev.going_count      + goingDelta),
      interested_count: Math.max(0, prev.interested_count + interestedDelta),
    } : prev)

    setToggling(true)
    try {
      const res: RsvpResponse = await eventsApi.rsvp(event.id, status)
      // Reconcile with server authoritative counts
      setEvent(prev => prev ? {
        ...prev,
        my_rsvp:          res.rsvp,
        going_count:      res.going_count,
        interested_count: res.interested_count,
      } : prev)
    } catch {
      // Rollback on error
      setEvent(prev => prev ? {
        ...prev,
        my_rsvp:          prevRsvp,
        going_count:      event.going_count,
        interested_count: event.interested_count,
      } : prev)
    } finally {
      setToggling(false)
    }
  }

  const openModal = (tab: 'going' | 'interested') => {
    setModalTab(tab)
    setModalOpen(true)
  }

  if (authLoading || loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={24} sx={{ color: 'var(--accent)' }} />
        </Box>
      </>
    )
  }

  if (error || !event) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, pt: 4 }}>
          <Box
            component="button"
            onClick={() => router.back()}
            sx={{ border: 'none', background: 'none', cursor: 'pointer', ...mono, fontSize: '0.4375rem', color: 'var(--muted)', mb: 2, display: 'flex', alignItems: 'center', gap: 0.5 }}
          >
            ← BACK
          </Box>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--muted)' }}>
            {error ?? 'Event not found.'}
          </Typography>
        </Box>
      </>
    )
  }

  const { day, md } = formatDateShort(event.date)
  const matchColor  = scoreColor(event.match_score)
  const matchPct    = Math.round(event.match_score * 100)
  const allBands    = [
    ...(event.headliner ? [{ ...event.headliner, role: 'headliner' }] : []),
    ...event.supporting.map(b => ({ ...b, role: 'support' })),
  ]

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 640, mx: 'auto', px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 }, pb: 12 }}>

        {/* Back link */}
        <Box
          component="button"
          onClick={() => router.push('/events')}
          sx={{
            border: 'none', background: 'none', cursor: 'pointer',
            ...mono, fontSize: '0.4375rem', color: 'var(--muted)', mb: 2.5,
            display: 'flex', alignItems: 'center', gap: 0.5,
            '&:hover': { color: 'var(--ink)' },
          }}
        >
          ← EVENTS
        </Box>

        {/* Header card */}
        <Box sx={{
          border: '1px solid rgba(216,207,184,0.12)',
          borderLeft: `3px solid ${matchColor}`,
          borderRadius: '4px', backgroundColor: '#110e18',
          p: '16px 18px', mb: 2.5,
        }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            {/* Date block */}
            <Box sx={{
              flexShrink: 0, width: 50,
              border: '1px solid rgba(216,207,184,0.15)', borderRadius: '3px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              py: 1, backgroundColor: '#0a0810',
            }}>
              <Typography sx={{ ...mono, fontSize: '0.4375rem', color: 'var(--muted)', lineHeight: 1.5, textAlign: 'center' }}>
                {day}<br />{md.split(' ')[0]}<br />{md.split(' ')[1]}
              </Typography>
            </Box>

            {/* Title + venue */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{
                fontFamily: '"Archivo Black", sans-serif',
                fontSize: { xs: '1.125rem', md: '1.375rem' },
                letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1.15,
                mb: 0.5,
              }}>
                {event.headliner?.name ?? event.title}
              </Typography>
              <Typography sx={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: '0.9375rem', color: 'var(--muted)', mb: 0.375,
              }}>
                {event.venue}
              </Typography>
              <Typography sx={{ ...mono, fontSize: '0.4375rem', color: 'var(--muted)' }}>
                {event.city}{event.country ? `, ${event.country}` : ''}
                {event.distance_km != null && (
                  <Box component="span" sx={{ color: 'var(--accent)', ml: 1.25 }}>
                    ⌖ {event.distance_km} km
                  </Box>
                )}
              </Typography>
              <Typography sx={{ ...mono, fontSize: '0.375rem', color: 'rgba(216,207,184,0.4)', mt: 0.375 }}>
                {formatDateLong(event.date)}
              </Typography>
            </Box>

            {/* Match badge */}
            <Box sx={{ flexShrink: 0, textAlign: 'center' }}>
              <Box sx={{
                width: 42, height: 42, borderRadius: '50%',
                border: `2px solid ${matchColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: `${matchColor}18`, mb: 0.25,
              }}>
                <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: matchColor, fontWeight: 700 }}>
                  {matchPct}%
                </Typography>
              </Box>
              <Typography sx={{ ...mono, fontSize: '0.3125rem', color: 'var(--muted)' }}>match</Typography>
            </Box>
          </Box>
        </Box>

        {/* RSVP buttons */}
        <Box sx={{ mb: 2.5 }}>
          <EventRsvpButtons
            myRsvp={event.my_rsvp}
            loading={toggling}
            onRsvp={handleRsvp}
          />
        </Box>

        {/* Avatar groups */}
        {(event.going_count > 0 || event.interested_count > 0) && (
          <Box sx={{
            mb: 2.5,
            border: '1px solid rgba(216,207,184,0.08)',
            borderRadius: '4px',
            backgroundColor: '#0d0b14',
            px: 1.5, py: 1.125,
            display: 'flex', flexWrap: 'wrap', gap: 1.75,
          }}>
            {/* Going */}
            {event.going_count > 0 && (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: 0.625, cursor: 'pointer' }}
                onClick={() => openModal('going')}
              >
                <Typography sx={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)' }}>
                  Going · {event.going_count}
                </Typography>
                <AvatarGroup
                  users={event.going_avatars}
                  total={event.going_count}
                  max={6}
                  size={22}
                />
              </Box>
            )}

            {/* Interested */}
            {event.interested_count > 0 && (
              <Box
                sx={{ display: 'flex', flexDirection: 'column', gap: 0.625, cursor: 'pointer' }}
                onClick={() => openModal('interested')}
              >
                <Typography sx={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)' }}>
                  Interested · {event.interested_count}
                </Typography>
                <AvatarGroup
                  users={event.interested_avatars}
                  total={event.interested_count}
                  max={6}
                  size={22}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Lineup */}
        {allBands.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ ...mono, fontSize: '0.4375rem', color: 'var(--muted)', mb: 1 }}>
              Lineup
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625 }}>
              {allBands.map(band => (
                <Box
                  key={band.id}
                  onClick={() => router.push(`/bands/${band.slug}`)}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: 1, px: 1.25, py: 0.875,
                    border: '1px solid rgba(216,207,184,0.1)', borderRadius: '3px',
                    backgroundColor: '#0d0b14', cursor: 'pointer',
                    '&:hover': { backgroundColor: '#1a1424', borderColor: 'rgba(216,207,184,0.22)' },
                  }}
                >
                  <Typography sx={{
                    fontFamily: '"Archivo Black", sans-serif',
                    fontSize: '0.875rem', letterSpacing: '0.02em', textTransform: 'uppercase',
                  }}>
                    {band.name}
                  </Typography>
                  <Typography sx={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)' }}>
                    {band.role === 'headliner' ? 'HEADLINER' : 'SUPPORT'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Ticket link */}
        {event.ticket_url && (
          <Box>
            <Box
              component="a"
              href={event.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                border: '1px solid rgba(196,58,42,0.35)', borderRadius: '3px',
                px: 1.5, height: 34, display: 'inline-flex', alignItems: 'center',
                textDecoration: 'none', ...mono, fontSize: '0.4375rem',
                color: 'var(--accent)',
                '&:hover': { backgroundColor: 'rgba(196,58,42,0.08)', borderColor: 'var(--accent)' },
              }}
            >
              ↗ GET TICKETS
            </Box>
          </Box>
        )}
      </Box>

      {/* Attendees modal */}
      <AttendeesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        eventId={event.id}
        eventTitle={event.headliner?.name ?? event.title}
        goingCount={event.going_count}
        interestedCount={event.interested_count}
        initialTab={modalTab}
      />
    </>
  )
}
