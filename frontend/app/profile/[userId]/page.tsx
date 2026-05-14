'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  GlobalStyles,
} from '@mui/material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import TopArtists from '@/app/components/TopArtists'
import Sigil from '@/app/components/Sigil'
import SigilExplorer, { SigilCluster, FocusedNode } from '@/app/components/SigilExplorer'
import { friendsApi, FriendStatus } from '@/lib/friendsApi'
import { messagesApi } from '@/lib/messagesApi'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface User {
  id: string
  handle: string
  country?: string
  city?: string
  created_at: string
  source_accounts: string[]
  is_pro: boolean
  onboarding_complete: boolean
  profile_image_url?: string
  about_me?: string
  city_visible: string
}

interface TimelineItem {
  play_id: string
  played_at: string
  track: { id: string; name: string }
  artist: { id: string; name: string }
  album?: { id: string; name: string; image_url?: string }
}

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const box: React.CSSProperties = {
  border: '1.5px solid rgba(216,207,184,0.2)',
  borderRadius: '3px',
  padding: '8px 10px',
  backgroundColor: '#120e18',
  marginBottom: '8px',
}

const btn = (accent?: boolean, danger?: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  border: `1.5px solid ${danger ? 'rgba(196,58,42,0.5)' : accent ? 'rgba(154,26,26,0.6)' : 'rgba(216,207,184,0.25)'}`,
  borderRadius: '3px',
  background: 'none',
  cursor: 'pointer',
  color: danger ? 'var(--accent)' : accent ? 'var(--accent)' : 'var(--muted)',
  padding: '6px 12px',
  flex: 1,
})

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none')
  const [friendLoading, setFriendLoading] = useState(false)
  const [msgLoading, setMsgLoading] = useState(false)
  const [sigilData, setSigilData] = useState<{genres: string[], artists: string[], total_artists: number, clusters: SigilCluster[]} | null>(null)
  const [explorerOpen, setExplorerOpen] = useState(false)
  const [explorerLayer, setExplorerLayer] = useState<1|2|3>(1)
  const [focusedNode, setFocusedNode] = useState<FocusedNode>(null)

  const handleMessage = async () => {
    if (!user) return
    setMsgLoading(true)
    try {
      const conv = await messagesApi.startConversation(user.id)
      router.push(`/messages/${conv.id}`)
    } catch { /* silent */ } finally {
      setMsgLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) { router.push('/auth/login'); return }
        const [res, statusRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          friendsApi.getStatus(userId).catch(() => ({ status: 'none' as FriendStatus })),
        ])
        setUser(res.data)
        setFriendStatus(statusRes.status)
        // Fetch sigil data non-blocking — silently ignore errors
        axios.get(`${API_BASE}/api/v1/sigil/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(r => setSigilData(r.data)).catch(() => {})
        if (res.data.source_accounts.includes('spotify')) {
          try {
            const t = await axios.get(`${API_BASE}/api/v1/spotify/timeline/${userId}?limit=6`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            setTimeline(t.data.timeline)
          } catch { /* silent */ }
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status
        setError(status === 404 ? 'User not found' : 'Failed to load profile')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [userId, router])

  const handleSendRequest = async () => {
    setFriendLoading(true)
    try {
      await friendsApi.sendRequest(userId)
      setFriendStatus('pending_sent')
    } catch { /* silent */ } finally {
      setFriendLoading(false)
    }
  }

  const handleAccept = async () => {
    setFriendLoading(true)
    try {
      await friendsApi.respond(userId, 'accept')
      setFriendStatus('accepted')
    } catch { /* silent */ } finally {
      setFriendLoading(false)
    }
  }

  const handleDecline = async () => {
    setFriendLoading(true)
    try {
      await friendsApi.respond(userId, 'decline')
      setFriendStatus('none')
    } catch { /* silent */ } finally {
      setFriendLoading(false)
    }
  }

  const handleCancel = async () => {
    setFriendLoading(true)
    try {
      await friendsApi.cancelRequest(userId)
      setFriendStatus('none')
    } catch { /* silent */ } finally {
      setFriendLoading(false)
    }
  }

  const handleUnfriend = async () => {
    setFriendLoading(true)
    try {
      await friendsApi.unfriend(userId)
      setFriendStatus('none')
    } catch { /* silent */ } finally {
      setFriendLoading(false)
    }
  }

  if (loading) return (
    <>
      <Navigation />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress sx={{ color: 'var(--accent)' }} size={28} />
      </Box>
    </>
  )

  if (error || !user) return (
    <>
      <Navigation />
      <Box sx={{ p: 2 }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>{error || 'User not found.'}</span>
      </Box>
    </>
  )

  const getCityDisplay = () => {
    if (user.city_visible === 'hidden') return null
    if (user.city_visible === 'region') return user.country || null
    return [user.city, user.country].filter(Boolean).join(', ') || null
  }

  const cityDisplay = getCityDisplay()

  const timelineArtists = Array.from(new Set(timeline.map((t) => t.artist.name))).slice(0, 8)
  const topAlbums = timeline
    .filter((t) => t.album?.image_url)
    .filter((t, i, arr) => arr.findIndex((a) => a.album?.id === t.album?.id) === i)
    .slice(0, 3)

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 4 }}>

        {/* Nav row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={{ ...lbl, cursor: 'pointer' }} onClick={() => router.back()}>
            ← BACK
          </span>
          <span style={lbl}>⋯</span>
        </Box>

        {/* Identity row */}
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mb: 1.5 }}>
          <Avatar
            src={user.profile_image_url ? `${API_BASE}${user.profile_image_url}` : undefined}
            sx={{ width: 44, height: 44, flexShrink: 0, bgcolor: 'var(--ink)', fontSize: 18 }}
          >
            {user.handle.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontSize: '0.875rem', mb: 0.25 }}>
              {user.handle}
            </Typography>
            {cityDisplay && <span style={lbl}>{cityDisplay}</span>}
          </Box>
          {/* Compat badge placeholder */}
          <Box sx={{
            border: '1.5px solid var(--accent, #9A1A1A)',
            borderRadius: '3px',
            px: 1,
            py: 0.5,
            textAlign: 'center',
            flexShrink: 0,
          }}>
            <Typography sx={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: '1.25rem',
              lineHeight: 1,
              color: 'var(--accent)',
            }}>
              —
            </Typography>
            <span style={{ ...lbl, fontSize: '0.4375rem' }}>COMPAT.</span>
          </Box>
        </Box>

        {/* Friendship CTA */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5 }}>
          {friendStatus === 'none' && (
            <button style={btn(true)} onClick={handleSendRequest} disabled={friendLoading}>
              {friendLoading ? '…' : '✶ ADD COMRADE'}
            </button>
          )}
          {friendStatus === 'pending_sent' && (
            <button style={{ ...btn(), cursor: 'default' }} onClick={handleCancel} disabled={friendLoading}>
              {friendLoading ? '…' : '⏳ REQUEST SENT — CANCEL'}
            </button>
          )}
          {friendStatus === 'pending_received' && (
            <>
              <button style={btn(true)} onClick={handleAccept} disabled={friendLoading}>
                {friendLoading ? '…' : '✔ ACCEPT'}
              </button>
              <button style={btn(false, true)} onClick={handleDecline} disabled={friendLoading}>
                {friendLoading ? '…' : '✕ DECLINE'}
              </button>
            </>
          )}
          {friendStatus === 'accepted' && (
            <button style={{ ...btn(), cursor: 'pointer' }} onClick={handleUnfriend} disabled={friendLoading}>
              {friendLoading ? '…' : '⚔ COMRADES — UNFRIEND'}
            </button>
          )}
          {friendStatus === 'accepted' && (
            <button style={{ ...btn(), cursor: 'pointer' }} onClick={handleMessage} disabled={msgLoading}>
              {msgLoading ? '…' : '☍ MESSAGE'}
            </button>
          )}
        </Box>

        {/* Metal-ID Sigil */}
        {sigilData && (sigilData.genres.length > 0 || sigilData.artists.length > 0) && (
          <div style={{ ...box, padding: 0, overflow: 'hidden', cursor: 'pointer' }}
               onClick={() => setExplorerOpen(true)}>
            <div style={{ padding: '8px 10px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={lbl}>◈ METAL-ID SIGIL</span>
              <span style={{ ...lbl, fontSize: '0.4375rem', color: '#C75050' }}>TAP TO EXPLORE →</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', background: 'radial-gradient(ellipse at 50% 40%, #1B1626 0%, #0B0814 100%)', padding: '8px 0' }}>
              <Sigil
                size={220}
                genres={sigilData.genres}
                artists={sigilData.artists}
                handle={user!.handle}
                compact
              />
            </div>
            <div style={{ padding: '4px 10px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
              {sigilData.genres.slice(0, 4).map((g, i) => (
                <span key={g} style={{
                  ...lbl, fontSize: '0.4375rem',
                  color: i === 0 ? '#C75050' : '#5A5470',
                  border: `1px solid ${i === 0 ? 'rgba(199,80,80,0.35)' : 'rgba(90,84,112,0.3)'}`,
                  borderRadius: '2px', padding: '2px 6px',
                }}>{g}</span>
              ))}
            </div>
          </div>
        )}

        {/* Shared Devotion */}
        <div style={box}>
          <span style={{ ...lbl, display: 'block', marginBottom: 6 }}>◉ SHARED DEVOTION</span>
          {timelineArtists.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {timelineArtists.slice(0, 6).map((artist) => (
                <Box key={artist} sx={{
                  border: '1.5px solid var(--accent)',
                  borderRadius: '3px',
                  px: 0.75,
                  height: 24,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5625rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--accent)',
                }}>
                  {artist}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              Connect Spotify to reveal shared devotion.
            </Typography>
          )}
        </div>

        {/* Shared Genres */}
        <div style={box}>
          <span style={{ ...lbl, display: 'block', marginBottom: 4 }}>◉ SHARED GENRES</span>
          <Typography sx={{
            fontFamily: 'var(--font-serif, "EB Garamond", serif)',
            fontSize: '0.875rem',
            color: 'var(--ink)',
          }}>
            {user.about_me
              ? 'Genre data available after Metal-ID sync.'
              : 'No genre data available yet.'}
          </Typography>
        </div>

        {/* They introduce you to */}
        <div style={box}>
          <span style={{ ...lbl, display: 'block', marginBottom: 6 }}>⚡ THEY INTRODUCE YOU TO</span>
          {topAlbums.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {topAlbums.map((item) => (
                <Box
                  key={item.album!.id}
                  component="img"
                  src={item.album!.image_url}
                  alt={item.album!.name}
                  sx={{ width: 44, height: 44, borderRadius: '2px', border: '1px solid rgba(216,207,184,0.15)', objectFit: 'cover' }}
                />
              ))}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {[0, 1, 2].map((i) => (
                <Box key={i} sx={{
                  width: 44, height: 44, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                  background: 'repeating-linear-gradient(45deg, #1a1424 0 3px, #120e18 3px 6px)',
                }} />
              ))}
            </Box>
          )}
        </div>

        {/* About (if present) */}
        {user.about_me && (
          <div style={box}>
            <span style={{ ...lbl, display: 'block', marginBottom: 4 }}>ABOUT</span>
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', lineHeight: 1.55,
            }}>
              "{user.about_me}"
            </Typography>
          </div>
        )}

        {/* Gallery + Top Artists below */}
        <Box sx={{ mt: 3 }}>
          <GalleryManager
            userId={user.id}
            isOwnProfile={false}
            previewMode={true}
            onViewAll={() => router.push(`/gallery/${user.id}`)}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <TopArtists userId={user.id} isOwnProfile={false} />
        </Box>
      </Box>

      {/* ── Fullscreen Sigil Explorer ─────────────────────────────────────────── */}
      {explorerOpen && sigilData && (
        <>
          <GlobalStyles styles={`@keyframes sigilEnterOther { from { opacity:0 } to { opacity:1 } }`} />
          <Box sx={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'radial-gradient(ellipse at 50% 35%, #1B1626 0%, #0B0814 70%)',
            display: 'flex', flexDirection: 'column',
            animation: 'sigilEnterOther 0.3s ease forwards',
          }}>
            {/* Top bar */}
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              px: '16px', height: 52, flexShrink: 0,
              background: 'linear-gradient(180deg, rgba(11,8,20,0.95) 0%, rgba(11,8,20,0.6) 100%)',
            }}>
              <button onClick={() => { setExplorerOpen(false); setExplorerLayer(1); setFocusedNode(null) }}
                style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: '#8B8298', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                ← RETREAT
              </button>
              <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 22, color: '#EDE4D3' }}>
                {user!.handle.toUpperCase()}
              </span>
              <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.14em', color: '#C75050' }}>
                L{explorerLayer} · {explorerLayer === 1 ? 'SEAL' : explorerLayer === 2 ? 'SCENE' : 'ARTISTS'}
              </span>
            </Box>

            {/* Layer description */}
            <Box sx={{ px: '20px', pb: '4px', flexShrink: 0 }}>
              <em style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '0.75rem', color: '#5A5470' }}>
                {explorerLayer === 1 ? '— the seal of identity —'
                  : explorerLayer === 2 ? '— subgenres bloom from each genre point —'
                  : '— the figures, weighted by listening —'}
              </em>
            </Box>

            {/* Explorer */}
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
              overflow: 'hidden', position: 'relative', zIndex: 1,
              animation: 'sigilPulse 8s ease-in-out infinite',
              '@keyframes sigilPulse': {
                '0%,100%': { filter: 'drop-shadow(0 0 12px rgba(168,58,58,0.2))' },
                '50%':     { filter: 'drop-shadow(0 0 24px rgba(168,58,58,0.38))' },
              },
            }}>
              <SigilExplorer
                size={Math.min(typeof window !== 'undefined' ? window.innerWidth : 420, 500)}
                genres={sigilData.genres}
                artists={sigilData.artists}
                clusters={sigilData.clusters}
                friends={[]}
                handle={user!.handle}
                layer={explorerLayer}
                focusedNode={focusedNode}
                onNodeClick={(node) => {
                  if (node?.type === 'genre' && explorerLayer !== 3) setExplorerLayer(3)
                  setFocusedNode(node)
                }}
              />
            </Box>

            {/* +/− drill buttons */}
            <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', py: '10px' }}>
              <button
                onClick={() => { if (explorerLayer > 1) { setExplorerLayer((explorerLayer - 1) as 1|2|3); setFocusedNode(null) } }}
                disabled={explorerLayer === 1}
                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: explorerLayer === 1 ? 'transparent' : 'rgba(90,84,112,0.18)',
                  border: `1px solid ${explorerLayer === 1 ? '#36304A' : '#5A5470'}`,
                  borderRadius: '3px', cursor: explorerLayer === 1 ? 'default' : 'pointer',
                  color: explorerLayer === 1 ? '#5A5470' : '#EDE4D3', fontSize: '1.25rem', lineHeight: '1' }}>
                −
              </button>
              <Box sx={{ textAlign: 'center', minWidth: '90px' }}>
                <Box sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.5rem', letterSpacing: '0.2em', color: '#C75050', lineHeight: 1 }}>
                  L{explorerLayer}
                </Box>
                <Box sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.16em', color: '#5A5470', mt: '3px' }}>
                  {explorerLayer === 1 ? 'SEAL' : explorerLayer === 2 ? 'SCENE' : 'ARTISTS'}
                </Box>
                <Box sx={{ mt: '4px', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                  {[1,2,3].map(l => (
                    <Box key={l} sx={{ width: 5, height: 5, borderRadius: '50%',
                      background: l === explorerLayer ? '#C75050' : '#5A5470',
                      opacity: l === explorerLayer ? 1 : 0.4, transition: 'all 0.2s' }} />
                  ))}
                </Box>
              </Box>
              <button
                onClick={() => { if (explorerLayer < 3) { setExplorerLayer((explorerLayer + 1) as 1|2|3); setFocusedNode(null) } }}
                disabled={explorerLayer === 3}
                style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: explorerLayer === 3 ? 'transparent' : 'rgba(199,80,80,0.15)',
                  border: `1px solid ${explorerLayer === 3 ? '#36304A' : '#A83A3A'}`,
                  borderRadius: '3px', cursor: explorerLayer === 3 ? 'default' : 'pointer',
                  color: explorerLayer === 3 ? '#5A5470' : '#EDE4D3', fontSize: '1.25rem', lineHeight: '1' }}>
                +
              </button>
            </Box>

            {/* L3 tap hint */}
            {explorerLayer === 3 && !focusedNode && (
              <Box sx={{ textAlign: 'center', pb: '6px', flexShrink: 0 }}>
                <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.14em', color: '#5A5470' }}>
                  TAP A DOT TO EXPLORE
                </span>
              </Box>
            )}

            {/* Detail sheet — artist focused */}
            {focusedNode?.type === 'artist' && (() => {
              const cl = sigilData.clusters[focusedNode.ci]
              const artist = cl?.artists.find(a => a.name === focusedNode.name)
              const w = artist?.weight ?? 0
              const rank = cl?.artists.findIndex(a => a.name === focusedNode.name) ?? -1
              const sameCluster = (cl?.artists ?? []).filter(a => a.name !== focusedNode.name).slice(0, 3)
              return (
                <Box sx={{ position: 'relative', zIndex: 20, flexShrink: 0, mx: '12px', mb: '12px',
                  background: '#1B1626', border: '1px solid #36304A', borderRadius: '3px', padding: '14px 16px',
                  animation: 'sheetUp 0.25s ease forwards',
                  '@keyframes sheetUp': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                }}>
                  <button onClick={() => setFocusedNode(null)} style={{ position: 'absolute', top: 10, right: 12,
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', color: '#5A5470',
                    background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                  <Box sx={{ display: 'flex', gap: '10px', alignItems: 'baseline', mb: '6px' }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.16em', color: '#C75050' }}>
                      {cl?.label ?? ''}
                    </span>
                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(90,84,112,0.4)' }} />
                  </Box>
                  <Box sx={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1.1rem', color: '#EDE4D3', mb: '8px' }}>
                    {focusedNode.name}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', color: '#5A5470' }}>LISTENING WEIGHT</span>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', color: '#8B8298' }}>{w}</span>
                  </Box>
                  <Box sx={{ height: '3px', background: '#36304A', borderRadius: '2px', mb: '10px' }}>
                    <Box sx={{ height: '100%', width: `${w}%`, background: '#C75050', borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {cl && (
                      <button onClick={() => setFocusedNode({ type: 'genre', ci: focusedNode.ci })}
                        style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.12em',
                          color: '#C75050', padding: '4px 8px', border: '1px solid rgba(199,80,80,0.35)',
                          borderRadius: '2px', background: 'rgba(168,58,58,0.10)', cursor: 'pointer', textTransform: 'uppercase' as const }}>
                        ↗ {cl.label}
                      </button>
                    )}
                    {rank >= 0 && (
                      <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.12em',
                        color: '#8B8298', padding: '4px 8px', border: '1px solid #36304A', borderRadius: '2px', textTransform: 'uppercase' as const }}>
                        #{rank + 1} IN CLUSTER
                      </span>
                    )}
                    {sameCluster.map(a => (
                      <button key={a.name} onClick={() => setFocusedNode({ type: 'artist', name: a.name, ci: focusedNode.ci })}
                        style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '0.8125rem',
                          color: '#C7BEA9', padding: '3px 8px', border: '1px solid #36304A',
                          borderRadius: '2px', cursor: 'pointer', background: 'transparent' }}>
                        {a.name}
                      </button>
                    ))}
                  </Box>
                </Box>
              )
            })()}

            {/* Detail sheet — genre focused */}
            {focusedNode?.type === 'genre' && (() => {
              const cl = sigilData.clusters[focusedNode.ci]
              if (!cl) return null
              return (
                <Box sx={{ position: 'relative', zIndex: 20, flexShrink: 0, mx: '12px', mb: '12px',
                  background: '#1B1626', border: '1px solid #36304A', borderRadius: '3px', padding: '14px 16px',
                  animation: 'sheetUp 0.25s ease forwards',
                  '@keyframes sheetUp': { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                }}>
                  <button onClick={() => setFocusedNode(null)} style={{ position: 'absolute', top: 10, right: 12,
                    fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', color: '#5A5470',
                    background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                  <Box sx={{ display: 'flex', gap: '10px', alignItems: 'baseline', mb: '6px' }}>
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.16em', color: '#C75050' }}>
                      {cl.label}
                    </span>
                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(90,84,112,0.4)' }} />
                  </Box>
                  <Box sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', color: '#8B8298', mb: '10px', letterSpacing: '0.12em' }}>
                    {cl.artist_count} ARTISTS · {cl.subgenres.length} SUBGENRES
                  </Box>
                  {cl.subgenres.slice(0, 4).length > 0 && (
                    <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap', mb: '8px' }}>
                      {cl.subgenres.slice(0, 4).map(sg => (
                        <span key={sg.label} style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '0.8125rem',
                          color: '#8B8298', padding: '3px 8px', border: '1px solid #36304A', borderRadius: '2px' }}>
                          {sg.label}{sg.pct > 0 ? ` · ${sg.pct}%` : ''}
                        </span>
                      ))}
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {cl.artists.slice(0, 4).map(a => (
                      <button key={a.name} onClick={() => setFocusedNode({ type: 'artist', name: a.name, ci: focusedNode.ci })}
                        style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '0.8125rem',
                          color: '#C7BEA9', padding: '3px 8px', border: '1px solid #36304A',
                          borderRadius: '2px', cursor: 'pointer', background: 'transparent' }}>
                        {a.name}
                      </button>
                    ))}
                  </Box>
                </Box>
              )
            })()}

            {/* Bottom context strip */}
            {explorerLayer !== 1 && !focusedNode && (
              <Box sx={{ px: '16px', pb: '14px', flexShrink: 0 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {explorerLayer === 2 && sigilData.clusters.flatMap(cl =>
                    cl.subgenres.slice(0, 2).map(sg => (
                      <span key={`${cl.label}-${sg.label}`} style={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '0.75rem', color: '#5A5470' }}>
                        {sg.label}{sg.pct > 0 ? ` ${sg.pct}%` : ''}{' '}
                      </span>
                    ))
                  )}
                  {explorerLayer === 3 && (
                    <span style={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.4375rem', letterSpacing: '0.12em', color: '#5A5470' }}>
                      {sigilData.clusters.reduce((s, c) => s + c.artists.length, 0)} ARTISTS · DOT SIZE = LISTENING WEIGHT
                    </span>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </>
  )
}
