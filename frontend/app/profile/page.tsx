'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
} from '@mui/material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import TopArtists from '@/app/components/TopArtists'
import SpotifyConnection from '@/app/components/SpotifyConnection'
import Sigil from '@/app/components/Sigil'
import { useUser } from '@/app/context/UserContext'
import { userAPI } from '@/lib/api'
import { galleryAPI } from '@/lib/galleryApi'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Prepend API base for relative paths (same logic as UserAvatar)
const getAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null
  return url.startsWith('/') ? `${API_BASE}${url}` : url
}

interface User {
  id: string
  handle: string
  email: string
  country?: string
  city?: string
  created_at: string
  source_accounts: string[]
  is_pro: boolean
  onboarding_complete: boolean
  profile_image_url?: string
  about_me?: string
  discoverable_by_name: boolean
  discoverable_by_music: boolean
  city_visible: string
}

interface TimelineItem {
  play_id: string
  played_at: string
  track: { id: string; name: string; uri: string; duration_ms: number; progress_ms: number }
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
  padding: '10px 12px',
  backgroundColor: '#120e18',
}

export default function ProfilePage() {
  const router = useRouter()
  const { updateAvatar } = useUser()
  const [user, setUser] = useState<User | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [error, setError] = useState('')
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [editAboutMe, setEditAboutMe] = useState(false)
  const [aboutMeText, setAboutMeText] = useState('')
  const [aboutMeSaving, setAboutMeSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image file'); return }
    if (file.size > 10 * 1024 * 1024) { alert('File too large. Maximum size: 10MB'); return }
    setAvatarUploading(true)
    try {
      const result = await galleryAPI.uploadAvatar(file)
      if (result.success && result.image_url) {
        setUser(prev => prev ? { ...prev, profile_image_url: result.image_url } : prev)
        updateAvatar(result.image_url!)
      }
    } catch (err: any) {
      alert(`Upload failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) { router.push('/auth/login'); return }
        const userData = await userAPI.getMe()
        setUser(userData)
        setAboutMeText(userData.about_me || '')
        // Sync avatar to context so the nav avatar stays in sync
        updateAvatar(userData.profile_image_url || '')
        if (userData.source_accounts.includes('spotify')) fetchTimeline(token)
      } catch (err: any) {
        setError('Failed to load profile')
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          router.push('/auth/login')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [router])

  const fetchTimeline = async (token?: string) => {
    setTimelineLoading(true)
    try {
      const t = token || localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE}/api/v1/spotify/timeline?limit=20`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      setTimeline(res.data.timeline)
    } catch { /* silent */ } finally {
      setTimelineLoading(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(`${API_BASE}/api/v1/spotify/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setDisconnectDialogOpen(false)
      window.location.reload()
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not disconnect')
    }
  }

  const handleSaveAboutMe = async () => {
    setAboutMeSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.patch(`${API_BASE}/api/v1/users/me`, { about_me: aboutMeText }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(res.data)
      setEditAboutMe(false)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not save')
    } finally {
      setAboutMeSaving(false)
    }
  }

  const formatJoined = (d: string) => {
    const date = new Date(d)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
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
      <Box sx={{ p: 2 }}><Alert severity="error">{error || 'User not found'}</Alert></Box>
    </>
  )

  const hasSpotify = user.source_accounts.includes('spotify')
  const avatarUrl  = getAvatarUrl(user.profile_image_url)

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 4 }}>

        {/* Header row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <span style={lbl}>ME</span>
          <span
            style={{ ...lbl, cursor: 'pointer' }}
            onClick={() => setEditAboutMe(!editAboutMe)}
          >
            ⚙ EDIT
          </span>
        </Box>

        {/* Sigil */}
        <Box sx={{ height: 160, display: 'flex', justifyContent: 'center', mb: 0 }}>
          <Sigil size={200} centerTop={user.handle} centerBottom="metal-id" />
        </Box>

        {/* Avatar circle — overlaps bottom of sigil, click to upload */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: '-28px', mb: 2, position: 'relative', zIndex: 2 }}>
          <Box
            onClick={() => fileInputRef.current?.click()}
            sx={{
              width: 72, height: 72, borderRadius: '50%',
              border: '2px solid rgba(216,207,184,0.25)',
              backgroundColor: '#1a1424', cursor: 'pointer',
              overflow: 'hidden', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              '&:hover .av-hint': { opacity: 1 },
            }}
          >
            {avatarUploading ? (
              <CircularProgress size={22} sx={{ color: 'var(--accent)' }} />
            ) : avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: 0 }}>◉</span>
            )}
            <Box className="av-hint" sx={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(8,6,10,0.72)',
              opacity: 0, transition: 'opacity 0.15s',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.12em', color: 'var(--ink)' }}>
                {avatarUrl ? 'CHANGE' : 'ADD PHOTO'}
              </span>
            </Box>
          </Box>
        </Box>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarSelect} />

        {/* Handle */}
        <Typography variant="h4" sx={{ textAlign: 'center', fontSize: '1.25rem', mb: 0.5 }}>
          {user.handle}
        </Typography>

        {/* Location + join date */}
        <Typography sx={{
          textAlign: 'center',
          fontFamily: 'var(--font-serif, "EB Garamond", serif)',
          fontStyle: 'italic',
          fontSize: '0.75rem',
          color: 'var(--muted)',
          mb: 2,
        }}>
          {[user.city, user.country].filter(Boolean).join(', ') || 'Location not set'}
          {user.created_at ? ` · since ${formatJoined(user.created_at)}` : ''}
        </Typography>

        {/* About box */}
        <div style={{ ...box, marginBottom: '12px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <span style={lbl}>ABOUT</span>
            {editAboutMe && (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <span
                  style={{ ...lbl, cursor: 'pointer' }}
                  onClick={() => { setEditAboutMe(false); setAboutMeText(user.about_me || '') }}
                >
                  ✕ CANCEL
                </span>
                <span
                  style={{ ...lbl, cursor: 'pointer', color: 'var(--accent)' }}
                  onClick={handleSaveAboutMe}
                >
                  {aboutMeSaving ? '…' : '✓ SAVE'}
                </span>
              </Box>
            )}
          </Box>
          {editAboutMe ? (
            <TextField
              fullWidth multiline rows={4}
              value={aboutMeText}
              onChange={(e) => setAboutMeText(e.target.value.slice(0, 1500))}
              placeholder="Write about yourself…"
              disabled={aboutMeSaving}
              size="small"
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem',
                },
              }}
            />
          ) : (
            <Typography
              onClick={() => setEditAboutMe(true)}
              sx={{
                fontFamily: 'var(--font-serif, "EB Garamond", serif)',
                fontStyle: 'italic',
                fontSize: '0.8125rem',
                lineHeight: 1.55,
                color: user.about_me ? 'var(--ink)' : 'var(--muted)',
                cursor: 'text',
                minHeight: 40,
              }}
            >
              {user.about_me ? `"${user.about_me}"` : 'Tap to add your about me…'}
            </Typography>
          )}
        </div>

        {/* 3 stats */}
        <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
          {([
            ['SCROBBLES', timelineLoading ? '—' : timeline.length > 0 ? `${timeline.length}+` : '—'],
            ['REVIEWS', '—'],
            ['COVEN', '—'],
          ] as [string, string][]).map(([label, value]) => (
            <Box key={label} sx={{
              flex: 1,
              border: '1.5px solid rgba(216,207,184,0.2)',
              borderRadius: '3px',
              p: 1,
              textAlign: 'center',
              backgroundColor: '#120e18',
            }}>
              <span style={{ ...lbl, display: 'block', marginBottom: 2 }}>{label}</span>
              <Typography variant="h5" sx={{ fontSize: '1rem' }}>{value}</Typography>
            </Box>
          ))}
        </Box>

        {/* Spotify callout (if not connected) */}
        {!hasSpotify && (
          <div style={{ ...box, marginBottom: '16px' }}>
            <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 6 }}>
              ◉ LINK YOUR LISTENING
            </span>
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.5,
            }}>
              Connect Spotify to generate your Metal-ID sigil.
            </Typography>
            <SpotifyConnection isConnected={false} onDisconnect={() => {}} />
          </div>
        )}

        {hasSpotify && (
          <Box sx={{ mb: 2 }}>
            <SpotifyConnection isConnected onDisconnect={() => setDisconnectDialogOpen(true)} />
          </Box>
        )}

        {/* Fits */}
        <div style={{ ...box, marginBottom: '16px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <span style={{ ...lbl, color: 'var(--accent)' }}>✶ FITS</span>
            <span style={{ ...lbl, fontSize: '0.5rem' }}>MUTUAL</span>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {[
              { handle: 'VOIDWALKER', initial: 'V', compat: 91 },
              { handle: 'SKALD_EIRIK', initial: 'S', compat: 87 },
            ].map((fit) => (
              <Box key={fit.handle} onClick={() => router.push('/search')} sx={{
                flex: 1, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                backgroundColor: '#08060a', p: 1, cursor: 'pointer', textAlign: 'center',
                '&:hover': { borderColor: 'var(--accent)' }, transition: 'border-color 0.1s',
              }}>
                <Box sx={{
                  width: 40, height: 40, mx: 'auto', mb: 0.75,
                  border: '1.5px solid var(--accent, #c43a2a)', borderRadius: '3px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#ece5d3',
                  backgroundColor: '#1a1424',
                }}>
                  {fit.initial}
                </Box>
                <span style={{ ...lbl, color: 'var(--ink)', display: 'block', marginBottom: 2 }}>{fit.handle}</span>
                <span style={{ ...lbl, color: 'var(--accent)', fontSize: '0.5rem' }}>{fit.compat}% COMPAT</span>
              </Box>
            ))}
            <Box sx={{
              flex: 1, border: '1.5px dashed rgba(216,207,184,0.12)', borderRadius: '3px',
              backgroundColor: 'transparent', p: 1, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4 }}>
                Find more in Discover
              </Typography>
            </Box>
          </Box>
        </div>

        {/* Gallery */}
        <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>◉ GALLERY</span>
        <GalleryManager
          userId={user.id}
          isOwnProfile={true}
          previewMode={true}
          onViewAll={() => router.push('/gallery')}
        />

        {/* Top Artists */}
        <Box sx={{ mt: 2 }}>
          <TopArtists userId={user.id} isOwnProfile={true} />
        </Box>
      </Box>

      <Dialog open={disconnectDialogOpen} onClose={() => setDisconnectDialogOpen(false)}>
        <DialogTitle>Disconnect Spotify?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Your scrobble history will be deleted within 24h. Your Metal-ID will be recalculated.
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>This cannot be undone.</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDisconnect} color="error" variant="contained">Disconnect</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
