'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Avatar, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { friendsApi, FriendUser, GlobeMarker } from '@/lib/friendsApi'
import GlobeWidget from '@/app/components/GlobeWidget'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function FriendsPage() {
  const router = useRouter()
  const [friends, setFriends] = useState<FriendUser[]>([])
  const [pending, setPending] = useState<FriendUser[]>([])
  const [globeMarkers, setGlobeMarkers] = useState<GlobeMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [f, p, g] = await Promise.all([
        friendsApi.listFriends(),
        friendsApi.listPending(),
        friendsApi.getGlobeData().catch(() => [] as GlobeMarker[]),
      ])
      setFriends(f)
      setPending(p)
      setGlobeMarkers(g)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleAccept = async (requesterId: string) => {
    setResponding(requesterId)
    try {
      await friendsApi.respond(requesterId, 'accept')
      await load()
    } catch { /* silent */ } finally {
      setResponding(null)
    }
  }

  const handleDecline = async (requesterId: string) => {
    setResponding(requesterId)
    try {
      await friendsApi.respond(requesterId, 'decline')
      setPending((prev) => prev.filter((u) => u.id !== requesterId))
    } catch { /* silent */ } finally {
      setResponding(null)
    }
  }

  const handleUnfriend = async (friendId: string) => {
    try {
      await friendsApi.unfriend(friendId)
      setFriends((prev) => prev.filter((u) => u.id !== friendId))
    } catch { /* silent */ }
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Header */}
        <Box sx={{ mb: 2.5 }}>
          <Box component="button" onClick={() => router.back()} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
            ← BACK
          </Box>
          <span style={{ ...lbl, color: 'var(--accent)' }}>⚔ COMRADES</span>
        </Box>

        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
          </Box>
        )}

        {/* Globe */}
        {!loading && (
          <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1.5, mb: 2.5 }}>
            <span style={{ ...lbl, display: 'block', marginBottom: 12, color: 'var(--accent)' }}>◆ COMRADES ON THE ATLAS</span>
            <GlobeWidget markers={globeMarkers} />
          </Box>
        )}

        {/* Pending requests */}
        {!loading && pending.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>◈ PENDING REQUESTS ({pending.length})</span>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {pending.map((req) => (
                <Box key={req.id} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Avatar
                    src={req.profile_image_url ? `${API_BASE}${req.profile_image_url}` : undefined}
                    sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: 'var(--ink)', fontSize: 13 }}
                    onClick={() => router.push(`/profile/${req.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {req.handle.charAt(0).toUpperCase()}
                  </Avatar>
                  <span
                    style={{ ...lbl, color: 'var(--ink)', flex: 1, cursor: 'pointer', fontSize: '0.625rem' }}
                    onClick={() => router.push(`/profile/${req.id}`)}
                  >
                    {req.handle}
                  </span>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box component="button" onClick={() => handleAccept(req.id)} disabled={responding === req.id} sx={{ border: '1px solid rgba(106,154,122,0.5)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: '#6a9a7a', '&:hover': { borderColor: '#6a9a7a' } }}>
                      {responding === req.id ? '…' : '✔ ACCEPT'}
                    </Box>
                    <Box component="button" onClick={() => handleDecline(req.id)} disabled={responding === req.id} sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' } }}>
                      ✕
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Friends list */}
        {!loading && (
          <Box>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>◆ COMRADES ({friends.length})</span>
            {friends.length === 0 ? (
              <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
                <span style={{ ...lbl, color: 'var(--muted)' }}>No comrades yet</span>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {friends.map((friend) => (
                  <Box key={friend.id} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <Avatar
                      src={friend.profile_image_url ? `${API_BASE}${friend.profile_image_url}` : undefined}
                      sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: 'var(--ink)', fontSize: 13 }}
                      onClick={() => router.push(`/profile/${friend.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {friend.handle.charAt(0).toUpperCase()}
                    </Avatar>
                    <span
                      style={{ ...lbl, color: 'var(--ink)', flex: 1, cursor: 'pointer', fontSize: '0.625rem' }}
                      onClick={() => router.push(`/profile/${friend.id}`)}
                    >
                      {friend.handle}
                    </span>
                    <Box component="button" onClick={() => handleUnfriend(friend.id)} sx={{ border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--accent)', borderColor: 'rgba(196,58,42,0.3)' } }}>
                      REMOVE
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </>
  )
}
