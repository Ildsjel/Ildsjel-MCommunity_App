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
import { API_BASE_URL as API_BASE } from '@/lib/api'
import axios from 'axios'

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

interface Artist {
  name: string
  spotify_id: string
  genres: string[]
  image_url: string | null
  rank: number
}

const labelStyle: React.CSSProperties = {
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
  const [myArtists, setMyArtists] = useState<Artist[]>([])
  const [theirArtists, setTheirArtists] = useState<Artist[]>([])
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

        // Fetch both users' top artists in parallel
        const [myRes, theirRes] = await Promise.allSettled([
          axios.get(`${API_BASE}/api/v1/spotify/top/artists?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_BASE}/api/v1/spotify/top/artists/${userId}?limit=20`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        if (myRes.status === 'fulfilled') setMyArtists(myRes.value.data.artists ?? [])
        if (theirRes.status === 'fulfilled') setTheirArtists(theirRes.value.data.artists ?? [])
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

  const myArtistNames = new Set(myArtists.map(a => a.name.toLowerCase()))
  const sharedArtists = theirArtists.filter(a => myArtistNames.has(a.name.toLowerCase()))
  const uniqueToThem = theirArtists.filter(a => !myArtistNames.has(a.name.toLowerCase())).slice(0, 3)

  const myGenres = new Set(myArtists.flatMap(a => a.genres))
  const sharedGenres = [...new Set(theirArtists.flatMap(a => a.genres))].filter(g => myGenres.has(g))

  const hasTheirMusic = theirArtists.length > 0
  const hasMyMusic = myArtists.length > 0

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 4 }}>

        {/* Nav row */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span
            style={{ ...labelStyle, cursor: 'pointer' }}
            onClick={() => router.back()}
          >
            ← BACK
          </span>
          <span style={labelStyle}>⋯</span>
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
            {cityDisplay && <span style={labelStyle}>{cityDisplay}</span>}
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
            <span style={{ ...labelStyle, fontSize: '0.4375rem' }}>COMPAT.</span>
          </Box>
        </Box>

        {/* Shared Devotion */}
        <div style={box}>
          <span style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>◉ SHARED DEVOTION</span>
          {sharedArtists.length > 0 ? (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {sharedArtists.slice(0, 6).map((artist) => (
                <Box key={artist.name} sx={{
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
                  {artist.name}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)' }}>
              {!hasTheirMusic
                ? 'No music data yet for this user.'
                : !hasMyMusic
                ? 'Connect Spotify to reveal shared devotion.'
                : 'No artists in common yet.'}
            </Typography>
          )}
        </div>

        {/* Shared Genres */}
        <div style={box}>
          <span style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>◉ SHARED GENRES</span>
          {sharedGenres.length > 0 ? (
            <Typography sx={{
              fontFamily: 'var(--font-serif, "EB Garamond", serif)',
              fontSize: '0.875rem',
              color: 'var(--ink)',
              lineHeight: 1.6,
            }}>
              {sharedGenres.slice(0, 5).join(' · ')}
            </Typography>
          ) : (
            <Typography sx={{
              fontFamily: 'var(--font-serif, "EB Garamond", serif)',
              fontStyle: 'italic',
              fontSize: '0.8125rem',
              color: 'var(--muted)',
            }}>
              {!hasTheirMusic || !hasMyMusic ? 'No genre data available yet.' : 'No shared genres found.'}
            </Typography>
          )}
        </div>

        {/* They introduce you to */}
        <div style={box}>
          <span style={{ ...labelStyle, display: 'block', marginBottom: 6 }}>⚡ THEY INTRODUCE YOU TO</span>
          {uniqueToThem.length > 0 ? (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {uniqueToThem.map((artist) => (
                artist.image_url ? (
                  <Box
                    key={artist.name}
                    component="img"
                    src={artist.image_url}
                    alt={artist.name}
                    title={artist.name}
                    sx={{ width: 44, height: 44, borderRadius: '2px', border: '1px solid rgba(216,207,184,0.15)', objectFit: 'cover' }}
                  />
                ) : (
                  <Box key={artist.name} sx={{
                    width: 44, height: 44, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                    background: 'repeating-linear-gradient(45deg, #1a1424 0 3px, #120e18 3px 6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ ...labelStyle, fontSize: '0.375rem', textAlign: 'center', lineHeight: 1.2, padding: '2px' }}>
                      {artist.name.slice(0, 8)}
                    </span>
                  </Box>
                )
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
            <span style={{ ...labelStyle, display: 'block', marginBottom: 4 }}>ABOUT</span>
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
