'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Avatar,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material'
import Navigation from '@/app/components/Navigation'
import GalleryManager from '@/app/components/GalleryManager'
import TopArtists from '@/app/components/TopArtists'
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

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId as string

  const [user, setUser] = useState<User | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!userId) return
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) { router.push('/auth/login'); return }
        const res = await axios.get(`${API_BASE}/api/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setUser(res.data)
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

  const getCityDisplay = () => {
    if (user.city_visible === 'hidden') return null
    if (user.city_visible === 'region') return user.country || null
    return [user.city, user.country].filter(Boolean).join(', ') || null
  }

  const cityDisplay = getCityDisplay()

  // Unique artists from timeline as "shared" proxy
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
          <span
            style={{ ...lbl, cursor: 'pointer' }}
            onClick={() => router.back()}
          >
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

        {/* CTA buttons */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button variant="contained" sx={{ flex: 1 }}>
            ✶ THROW HORNS
          </Button>
          <Button variant="outlined" sx={{ flex: 1 }}>
            ☍ MESSAGE
          </Button>
        </Box>

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
    </>
  )
}
