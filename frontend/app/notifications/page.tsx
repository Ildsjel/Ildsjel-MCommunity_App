'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useNotifications, type Notification } from '@/app/context/NotificationContext'
import { useUser } from '@/app/context/UserContext'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const NOTIF_META: Record<string, { icon: string; label: string; desc: (h: string) => string }> = {
  fit_match:    { icon: '✶', label: 'MUTUAL FIT',     desc: (h) => `You and ${h} are a mutual fit.` },
  fit_received: { icon: '◈', label: 'FIT RECEIVED',   desc: (h) => `${h} marked you as a fit.` },
  comment:      { icon: '☍', label: 'NEW COMMENT',    desc: (h) => `${h} commented on your profile.` },
  horns:        { icon: '✶', label: 'HORNS THROWN',   desc: (h) => `${h} threw horns at your review.` },
}

function NotifRow({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const meta = NOTIF_META[n.type]
  return (
    <Box
      onClick={() => onRead(n.id)}
      sx={{
        display: 'flex', gap: 1.25, alignItems: 'flex-start',
        border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
        backgroundColor: n.read ? '#120e18' : '#1a1424',
        px: 1.25, py: 1.25, cursor: 'pointer',
        boxShadow: n.read ? 'none' : '1.5px 1.5px 0 rgba(216,207,184,.08)',
        transition: 'background 0.15s',
        '&:hover': { backgroundColor: '#1a1424' },
        position: 'relative',
      }}
    >
      {/* Unread dot */}
      {!n.read && (
        <Box sx={{
          position: 'absolute', top: 10, right: 10,
          width: 6, height: 6, borderRadius: '50%',
          backgroundColor: 'var(--accent, #c43a2a)',
        }} />
      )}

      {/* Avatar */}
      <Box sx={{
        width: 36, height: 36, flexShrink: 0,
        border: `1.5px solid ${n.type === 'fit_match' ? 'var(--accent, #c43a2a)' : 'rgba(216,207,184,0.2)'}`,
        borderRadius: '3px', backgroundColor: '#08060a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
        fontSize: '0.875rem', color: '#ece5d3',
      }}>
        {n.fromInitial}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 0.25 }}>
          <span style={{ ...lbl, color: n.type === 'fit_match' ? 'var(--accent)' : 'var(--ink)', fontSize: '0.5rem' }}>
            {meta.icon} {meta.label}
          </span>
          <span style={lbl}>{n.timestamp}</span>
        </Box>
        <Typography sx={{
          fontFamily: 'var(--font-serif, "EB Garamond", serif)',
          fontStyle: 'italic', fontSize: '0.875rem', lineHeight: 1.4,
          color: n.read ? 'var(--muted)' : 'var(--ink)',
        }}>
          {meta.desc(n.fromHandle)}
        </Typography>
      </Box>
    </Box>
  )
}

export default function NotificationsPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  const unread = notifications.filter((n) => !n.read)
  const read   = notifications.filter((n) => n.read)

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={lbl}>◉ NOTIFICATIONS</span>
          {unreadCount > 0 && (
            <Box component="button" onClick={markAllRead} sx={{
              background: 'none', border: 'none', cursor: 'pointer',
              ...lbl, color: 'var(--accent)', fontSize: '0.5rem',
            }}>
              MARK ALL READ
            </Box>
          )}
        </Box>

        {notifications.length === 0 ? (
          <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)' }}>
              No notifications yet.
            </Typography>
          </Box>
        ) : (
          <>
            {unread.length > 0 && (
              <>
                <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>NEW</span>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                  {unread.map((n) => <NotifRow key={n.id} n={n} onRead={markRead} />)}
                </Box>
              </>
            )}
            {read.length > 0 && (
              <>
                <span style={{ ...lbl, display: 'block', marginBottom: 8, marginTop: unread.length > 0 ? 8 : 0 }}>EARLIER</span>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {read.map((n) => <NotifRow key={n.id} n={n} onRead={markRead} />)}
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </>
  )
}
