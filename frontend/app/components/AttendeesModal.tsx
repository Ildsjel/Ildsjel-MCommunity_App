'use client'

/**
 * AttendeesModal
 *
 * Bottom-sheet modal showing the full Going / Interested attendee list for an event.
 * Sorted server-side: friends first → most shared bands → alphabetical.
 * Each entry shows a badge: FRIEND or "N shared" (taste match hint).
 *
 * Usage:
 *   <AttendeesModal
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     eventId={event.id}
 *     eventTitle={event.title}
 *     goingCount={event.going_count}
 *     interestedCount={event.interested_count}
 *     initialTab="going"
 *   />
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import { eventsApi, AttendeeRef } from '@/lib/eventsApi'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
}

type TabStatus = 'going' | 'interested'

interface Props {
  open: boolean
  onClose: () => void
  eventId: string
  eventTitle: string
  goingCount: number
  interestedCount: number
  initialTab?: TabStatus
  currentUserId?: string   // own user ID — routes to /profile instead of /profile/[id]
}

// ── AttendeeRow ────────────────────────────────────────────────────────────

function AttendeeRow({
  attendee,
  isMe,
  onClick,
}: {
  attendee: AttendeeRef
  isMe: boolean
  onClick: () => void
}) {
  const src = attendee.profile_image_url
    ? `${API_BASE}${attendee.profile_image_url}`
    : undefined
  const initials = (attendee.handle?.[0] ?? '?').toUpperCase()

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: 1.25, py: 0.875,
        borderBottom: '1px solid rgba(216,207,184,0.06)',
        cursor: 'pointer',
        '&:hover': { backgroundColor: 'rgba(216,207,184,0.04)' },
        transition: 'background-color 0.12s',
      }}
    >
      {/* Avatar */}
      <Box sx={{
        width: 30, height: 30, borderRadius: '50%',
        backgroundColor: '#2a1f38',
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: 'cover', backgroundPosition: 'center',
        flexShrink: 0, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1px solid rgba(216,207,184,0.1)',
      }}>
        {!src && (
          <Typography sx={{ ...mono, fontSize: '0.5rem', color: 'rgba(216,207,184,0.5)' }}>
            {initials}
          </Typography>
        )}
      </Box>

      {/* Handle */}
      <Typography sx={{
        fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
        letterSpacing: '0.06em', color: 'var(--ink)', flex: 1, minWidth: 0,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {attendee.handle}
      </Typography>

      {/* Badge */}
      {isMe ? (
        <Box sx={{
          border: '1px solid rgba(216,207,184,0.25)', borderRadius: '2px',
          px: 0.625, py: 0.25,
          backgroundColor: 'rgba(216,207,184,0.06)',
        }}>
          <Typography sx={{ ...mono, fontSize: '0.3rem', color: 'var(--muted)' }}>
            you
          </Typography>
        </Box>
      ) : attendee.is_friend ? (
        <Box sx={{
          border: '1px solid rgba(154,122,191,0.4)', borderRadius: '2px',
          px: 0.625, py: 0.25,
          backgroundColor: 'rgba(154,122,191,0.08)',
        }}>
          <Typography sx={{ ...mono, fontSize: '0.3rem', color: 'rgba(154,122,191,0.9)' }}>
            friend
          </Typography>
        </Box>
      ) : attendee.shared_bands > 0 ? (
        <Box sx={{
          border: '1px solid rgba(160,196,160,0.25)', borderRadius: '2px',
          px: 0.625, py: 0.25,
          backgroundColor: 'rgba(160,196,160,0.06)',
        }}>
          <Typography sx={{ ...mono, fontSize: '0.3rem', color: 'rgba(160,196,160,0.7)' }}>
            {attendee.shared_bands} shared
          </Typography>
        </Box>
      ) : null}

      <Typography sx={{ ...mono, fontSize: '0.375rem', color: 'var(--muted)', flexShrink: 0 }}>
        →
      </Typography>
    </Box>
  )
}

// ── AttendeesModal ────────────────────────────────────────────────────────────

export default function AttendeesModal({
  open,
  onClose,
  eventId,
  eventTitle,
  goingCount,
  interestedCount,
  initialTab = 'going',
  currentUserId,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabStatus>(initialTab)
  const [attendees, setAttendees] = useState<Record<TabStatus, AttendeeRef[] | null>>({
    going: null,
    interested: null,
  })
  const [loading, setLoading] = useState(false)

  // Load attendees when tab changes or modal opens
  useEffect(() => {
    if (!open) return
    if (attendees[tab] !== null) return  // already loaded
    let cancelled = false
    setLoading(true)
    eventsApi.getAttendees(eventId, tab).then(data => {
      if (!cancelled) {
        setAttendees(prev => ({ ...prev, [tab]: data }))
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) {
        setAttendees(prev => ({ ...prev, [tab]: [] }))
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [open, tab, eventId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset loaded data when eventId changes
  useEffect(() => {
    setAttendees({ going: null, interested: null })
    setTab(initialTab)
  }, [eventId, initialTab])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const list = attendees[tab]
  const count = tab === 'going' ? goingCount : interestedCount

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed', inset: 0, zIndex: 1200,
          backgroundColor: 'rgba(10,8,16,0.7)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Bottom sheet */}
      <Box sx={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        zIndex: 1201,
        backgroundColor: '#120e18',
        border: '1px solid rgba(216,207,184,0.12)',
        borderBottom: 'none',
        borderRadius: '12px 12px 0 0',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        // Center on wider screens
        maxWidth: 640,
        mx: 'auto',
      }}>
        {/* Handle bar */}
        <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5, flexShrink: 0 }}>
          <Box sx={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(216,207,184,0.15)' }} />
        </Box>

        {/* Title */}
        <Box sx={{ px: 2, pt: 0.5, pb: 1.25, flexShrink: 0 }}>
          <Typography sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: '0.8125rem', letterSpacing: '0.04em',
            textTransform: 'uppercase', lineHeight: 1.2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            color: 'var(--ink)',
          }}>
            {eventTitle}
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{
          display: 'flex', gap: 0, px: 1.5, pb: 1.25, flexShrink: 0,
          borderBottom: '1px solid rgba(216,207,184,0.08)',
        }}>
          {(['going', 'interested'] as TabStatus[]).map(t => {
            const cnt = t === 'going' ? goingCount : interestedCount
            const active = tab === t
            return (
              <Box
                key={t}
                component="button"
                onClick={() => setTab(t)}
                sx={{
                  border: active ? '1px solid rgba(216,207,184,0.3)' : '1px solid transparent',
                  borderRadius: '3px', px: 1.25, height: 28,
                  background: active ? 'rgba(216,207,184,0.05)' : 'none',
                  cursor: 'pointer', mr: 0.75,
                  fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: active ? 'var(--ink)' : 'var(--muted)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 0.625,
                }}
              >
                {t}
                <Box sx={{
                  px: 0.5, py: 0.125,
                  backgroundColor: active ? 'rgba(216,207,184,0.12)' : 'rgba(216,207,184,0.04)',
                  borderRadius: '2px',
                }}>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.3125rem', color: active ? 'var(--ink)' : 'var(--muted)' }}>
                    {cnt}
                  </Typography>
                </Box>
              </Box>
            )
          })}
        </Box>

        {/* Attendee list */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={18} sx={{ color: 'var(--accent)' }} />
            </Box>
          ) : list === null ? null
            : list.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{
                fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                fontSize: '0.875rem', color: 'var(--muted)',
              }}>
                No one {tab === 'going' ? 'going' : 'interested'} yet.
              </Typography>
            </Box>
          ) : (
            list.map(a => (
              <AttendeeRow
                key={a.id}
                attendee={a}
                isMe={!!currentUserId && a.id === currentUserId}
                onClick={() => {
                  onClose()
                  // Route to own profile view rather than the "other user" view
                  router.push(currentUserId && a.id === currentUserId ? '/profile' : `/profile/${a.id}`)
                }}
              />
            ))
          )}
        </Box>

        {/* Close button */}
        <Box sx={{ px: 2, py: 1.5, flexShrink: 0, borderTop: '1px solid rgba(216,207,184,0.06)' }}>
          <Box
            component="button"
            onClick={onClose}
            sx={{
              width: '100%', border: '1px solid rgba(216,207,184,0.15)',
              borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--muted)',
              '&:hover': { color: 'var(--ink)', borderColor: 'rgba(216,207,184,0.3)' },
              transition: 'all 0.15s',
            }}
          >
            Close
          </Box>
        </Box>
      </Box>
    </>
  )
}
