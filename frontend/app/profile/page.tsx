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
} from '@mui/material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import MusicProfile from '@/app/components/MusicProfile'
import Sigil from '@/app/components/Sigil'
import { useUser } from '@/app/context/UserContext'
import { galleryAPI } from '@/lib/galleryApi'
import { adminAPI } from '@/lib/adminAPI'
import { profileAPI } from '@/lib/profileAPI'
import { getErrorMessage } from '@/lib/types/apiError'
import LinkListeningCard from './LinkListeningCard'
import FitsRow from './FitsRow'
import { useProfileData } from './useProfileData'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const getAvatarUrl = (url?: string | null): string | null => {
  if (!url) return null
  return url.startsWith('/') ? `${API_BASE}${url}` : url
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
  const { updateAvatar, setUser: setCtxUser } = useUser()
  const {
    user, setUser, timeline, timelineLoading,
    loading, error, lastFmConnected, sigilData, fits,
  } = useProfileData((u) => {
    setCtxUser(u)
    updateAvatar(u.profile_image_url || '')
  })

  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [editAboutMe, setEditAboutMe] = useState(false)
  const [aboutMeText, setAboutMeText] = useState('')
  const [aboutMeSaving, setAboutMeSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [redeemToken, setRedeemToken] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (user) setAboutMeText(user.about_me || '')
  }, [user])

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
    } catch (err: unknown) {
      alert(`Upload failed: ${getErrorMessage(err)}`)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDisconnect = async () => {
    try {
      await profileAPI.disconnectSpotify()
      setDisconnectDialogOpen(false)
      window.location.reload()
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Could not disconnect'))
    }
  }

  const handleSaveAboutMe = async () => {
    setAboutMeSaving(true)
    try {
      const updated = await profileAPI.updateMe({ about_me: aboutMeText })
      setUser(updated)
      setEditAboutMe(false)
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Could not save'))
    } finally {
      setAboutMeSaving(false)
    }
  }

  const handleRedeemToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemToken.trim()) return
    setRedeemLoading(true)
    setRedeemMsg(null)
    try {
      const result = await adminAPI.redeemToken(redeemToken.trim())
      setRedeemMsg({ ok: true, text: result.message })
      setRedeemToken('')
    } catch (err: unknown) {
      setRedeemMsg({ ok: false, text: getErrorMessage(err) })
    } finally {
      setRedeemLoading(false)
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
  const hasLastFm  = lastFmConnected
  const avatarUrl  = getAvatarUrl(user.profile_image_url)

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 4 }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <span style={lbl}>ME</span>
        </Box>

        <Box sx={{ height: 160, display: 'flex', justifyContent: 'center', mb: 0 }}>
          <Sigil
            size={200}
            centerTop={user.handle}
            centerBottom="metal-id"
            genres={sigilData.genres.length > 0 ? sigilData.genres : undefined}
            artists={sigilData.artists.length > 0 ? sigilData.artists : undefined}
            loading={sigilData.genres.length === 0 && sigilData.artists.length === 0}
          />
        </Box>

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

        <Typography variant="h4" sx={{ textAlign: 'center', fontSize: '1.25rem', mb: 0.5 }}>
          {user.handle}
        </Typography>

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

        <div style={{ ...box, marginBottom: '12px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <span style={lbl}>ABOUT</span>
            {editAboutMe ? (
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
            ) : (
              <span
                style={{ ...lbl, cursor: 'pointer' }}
                onClick={() => setEditAboutMe(true)}
              >
                ⚙ EDIT
              </span>
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

        <Box
          onClick={() => router.push('/globe')}
          sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
            p: '9px 12px', mb: 2, cursor: 'pointer', backgroundColor: '#120e18',
            '&:hover': { borderColor: 'rgba(216,207,184,0.3)' },
            transition: 'border-color 0.15s',
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
            <span style={{ ...lbl, color: 'var(--accent)' }}>◎ Globe View</span>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)' }}>
              {[user.city, user.country].filter(Boolean).join(', ') || 'Atlas of the Devoted'}
            </Typography>
          </Box>
          <span style={{ ...lbl, color: 'var(--muted)', fontSize: '0.625rem' }}>→</span>
        </Box>

        <LinkListeningCard hasSpotify={hasSpotify} hasLastFm={hasLastFm} />

        <FitsRow fits={fits} />

        <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>◉ GALLERY</span>
        <GalleryManager
          userId={user.id}
          isOwnProfile={true}
          previewMode={true}
          onViewAll={() => router.push('/gallery')}
        />

        <Box sx={{ mt: 2 }}>
          <MusicProfile userId={user.id} isOwnProfile={true} />
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
