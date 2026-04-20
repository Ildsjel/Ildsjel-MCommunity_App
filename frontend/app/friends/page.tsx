'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Avatar, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { friendsApi, FriendUser, GlobeMarker } from '@/lib/friendsApi'
import { messagesApi } from '@/lib/messagesApi'
import GlobeWidget from '@/app/components/GlobeWidget'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const PAGE_SIZE = 25

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
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [pending, setPending] = useState<FriendUser[]>([])
  const [globeMarkers, setGlobeMarkers] = useState<GlobeMarker[]>([])
  const [loading, setLoading] = useState(true)
  const [pageLoading, setPageLoading] = useState(false)
  const [responding, setResponding] = useState<string | null>(null)
  const [msgLoading, setMsgLoading] = useState<string | null>(null)

  const handleMessage = async (friendId: string) => {
    setMsgLoading(friendId)
    try {
      const conv = await messagesApi.startConversation(friendId)
      router.push(`/messages/${conv.id}`)
    } catch { /* silent */ } finally {
      setMsgLoading(null)
    }
  }

  const loadPage = async (p: number) => {
    setPageLoading(true)
    try {
      const result = await friendsApi.listFriends(p * PAGE_SIZE, PAGE_SIZE)
      setFriends(result.friends)
      setTotal(result.total)
      setPage(p)
    } catch { /* silent */ } finally {
      setPageLoading(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const [result, p, g] = await Promise.all([
        friendsApi.listFriends(0, PAGE_SIZE),
        friendsApi.listPending(),
        friendsApi.getGlobeData().catch(() => [] as GlobeMarker[]),
      ])
      setFriends(result.friends)
      setTotal(result.total)
      setPage(0)
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
      setTotal((t) => t - 1)
    } catch { /* silent */ }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

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

        {/* Globe — always visible at top */}
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
                  <span style={{ ...lbl, color: 'var(--ink)', flex: 1, cursor: 'pointer', fontSize: '0.625rem' }} onClick={() => router.push(`/profile/${req.id}`)}>
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

        {/* Full friends list with pagination */}
        {!loading && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <span style={{ ...lbl }}>◆ COMRADES ({total})</span>
              {totalPages > 1 && (
                <span style={{ ...lbl, fontSize: '0.4375rem' }}>
                  PAGE {page + 1} / {totalPages}
                </span>
              )}
            </Box>

            {total === 0 ? (
              <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
                <span style={{ ...lbl, color: 'var(--muted)' }}>No comrades yet</span>
              </Box>
            ) : (
              <>
                {pageLoading ? (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: totalPages > 1 ? 1.5 : 0 }}>
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
                        <span style={{ ...lbl, color: 'var(--ink)', flex: 1, cursor: 'pointer', fontSize: '0.625rem' }} onClick={() => router.push(`/profile/${friend.id}`)}>
                          {friend.handle}
                        </span>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Box component="button" onClick={() => handleMessage(friend.id)} disabled={msgLoading === friend.id} sx={{ border: '1px solid rgba(216,207,184,0.25)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { borderColor: 'rgba(216,207,184,0.5)', color: 'var(--ink)' } }}>
                            {msgLoading === friend.id ? '…' : 'MSG'}
                          </Box>
                          <Box component="button" onClick={() => handleUnfriend(friend.id)} sx={{ border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--accent)', borderColor: 'rgba(196,58,42,0.3)' } }}>
                            REMOVE
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'center' }}>
                    <Box
                      component="button"
                      onClick={() => loadPage(page - 1)}
                      disabled={page === 0 || pageLoading}
                      sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 1.25, height: 24, background: 'none', cursor: page === 0 ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: page === 0 ? 'rgba(216,207,184,0.2)' : 'var(--muted)', '&:hover:not(:disabled)': { borderColor: 'rgba(216,207,184,0.4)' } }}
                    >
                      ← PREV
                    </Box>
                    <Box
                      component="button"
                      onClick={() => loadPage(page + 1)}
                      disabled={page >= totalPages - 1 || pageLoading}
                      sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 1.25, height: 24, background: 'none', cursor: page >= totalPages - 1 ? 'default' : 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: page >= totalPages - 1 ? 'rgba(216,207,184,0.2)' : 'var(--muted)', '&:hover:not(:disabled)': { borderColor: 'rgba(216,207,184,0.4)' } }}
                    >
                      NEXT →
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}
      </Box>
    </>
  )
}
