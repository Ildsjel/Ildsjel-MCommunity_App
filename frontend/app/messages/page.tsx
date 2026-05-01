'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Avatar, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { messagesApi, Conversation } from '@/lib/messagesApi'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  if (d >= todayStart) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (d >= yesterdayStart) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function MessagesPage() {
  const router = useRouter()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    messagesApi.listConversations()
      .then(setConvs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box component="button" onClick={() => router.back()} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
            ← BACK
          </Box>
          <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.75rem', color: 'var(--ink)', lineHeight: 1.1 }}>
            Correspondences
          </Box>
          <span style={{ ...lbl }}>◆ YOUR DISPATCHES</span>
        </Box>

        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
          </Box>
        )}

        {!loading && convs.length === 0 && (
          <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 4, textAlign: 'center', backgroundColor: '#120e18' }}>
            <span style={{ ...lbl, color: 'var(--muted)' }}>No correspondences yet</span>
            <Box sx={{ mt: 1, fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Send a message to a comrade to begin.
            </Box>
          </Box>
        )}

        {!loading && convs.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {convs.map((conv) => (
              <Box
                key={conv.id}
                onClick={() => router.push(`/messages/${conv.id}`)}
                sx={{
                  border: '1.5px solid rgba(216,207,184,0.2)',
                  borderRadius: '3px',
                  backgroundColor: '#120e18',
                  px: 1.5,
                  py: 1.25,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                  '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
                  ...(conv.unread_count > 0 && { borderColor: 'rgba(196,58,42,0.35)' }),
                }}
              >
                <Avatar
                  src={conv.other_user.profile_image_url ? `${API_BASE}${conv.other_user.profile_image_url}` : undefined}
                  sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: 'var(--ink)', fontSize: 14 }}
                >
                  {conv.other_user.handle.charAt(0).toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.25 }}>
                    <span style={{ ...lbl, color: conv.unread_count > 0 ? 'var(--ink)' : 'var(--muted)', fontSize: '0.625rem', fontWeight: conv.unread_count > 0 ? 700 : 400 }}>
                      {conv.other_user.handle}
                    </span>
                    {conv.last_message && (
                      <span style={{ ...lbl, fontSize: '0.4375rem', color: 'var(--muted)', flexShrink: 0, ml: 8 }}>
                        {formatTime(conv.last_message.created_at)}
                      </span>
                    )}
                  </Box>

                  {conv.other_user.city && (
                    <Box sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.08em', color: 'var(--muted)', mb: 0.375 }}>
                      {conv.other_user.city}{conv.other_user.country ? `, ${conv.other_user.country}` : ''}
                    </Box>
                  )}

                  {conv.last_message && (
                    <Box sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(216,207,184,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.last_message.text}
                    </Box>
                  )}
                </Box>

                {conv.unread_count > 0 && (
                  <Box sx={{
                    flexShrink: 0,
                    minWidth: 18,
                    height: 18,
                    borderRadius: '9px',
                    backgroundColor: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.4375rem',
                    color: '#ece5d3',
                    px: '4px',
                  }}>
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </Box>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </>
  )
}
