'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
} from '@mui/material'
import {
  MusicNote,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import UserAvatar from '@/app/components/UserAvatar'
import GalleryManager from '@/app/components/GalleryManager'
import TopArtists from '@/app/components/TopArtists'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
  track: {
    id: string
    name: string
    uri: string
    duration_ms: number
    progress_ms: number
  }
  artist: {
    id: string
    name: string
  }
  album?: {
    id: string
    name: string
    image_url?: string
  }
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params?.userId as string
  
  const [user, setUser] = useState<User | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (userId) {
      fetchProfile()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await axios.get(`${API_BASE}/api/v1/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setUser(response.data)
      
      // Fetch timeline if Spotify is connected
      if (response.data.source_accounts.includes('spotify')) {
        fetchTimeline(token)
      }
    } catch (err: any) {
      setError('Failed to load profile')
      if (err.response?.status === 404) {
        setError('User not found')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeline = async (token?: string) => {
    setTimelineLoading(true)
    try {
      const authToken = token || localStorage.getItem('access_token')
      const response = await axios.get(`${API_BASE}/api/v1/spotify/timeline/${userId}?limit=20`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      setTimeline(response.data.timeline)
    } catch (err) {
      console.error('Failed to load timeline:', err)
    } finally {
      setTimelineLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
          <CircularProgress />
        </Box>
      </>
    )
  }

  if (error || !user) {
    return (
      <>
        <Navigation />
        <Box sx={{ p: 4 }}>
          <Alert severity="error">{error || 'Failed to load profile'}</Alert>
        </Box>
      </>
    )
  }

  const currentTrack = timeline[0]

  return (
    <>
      <Navigation />
      
      {/* Spotify-Style Profile Layout */}
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(180deg, rgba(30,30,30,1) 0%, rgba(18,18,18,1) 100%)',
        color: 'white',
      }}>
        {/* Hero Section - Spotify Style */}
        <Box sx={{ 
          background: 'linear-gradient(180deg, rgba(83,83,83,1) 0%, rgba(30,30,30,1) 100%)',
          px: { xs: 3, md: 6 },
          pt: 8,
          pb: 6,
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-end',
            gap: 3,
            maxWidth: '1400px',
            mx: 'auto',
          }}>
            {/* Large Avatar - Spotify Style */}
            <Box sx={{ 
              flexShrink: 0,
            }}>
              <UserAvatar
                avatarUrl={user.profile_image_url}
                userName={user.handle}
                userId={user.id}
                size={232}
              />
            </Box>

            {/* Profile Info */}
            <Box sx={{ flex: 1, pb: 2 }}>
              <Typography variant="caption" sx={{ 
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: 1,
                fontSize: '0.75rem',
              }}>
                Profil
              </Typography>
              
              <Typography variant="h1" sx={{ 
                fontSize: { xs: '3rem', md: '6rem' },
                fontWeight: 900,
                lineHeight: 1,
                mt: 1,
                mb: 2,
                letterSpacing: '-0.04em',
              }}>
                {user.handle}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                {user.city && (
                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                    {user.city}{user.country && `, ${user.country}`}
                  </Typography>
                )}
                <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                  • {timeline.length} scrobbles
                </Typography>
                {user.is_pro && (
                  <Box sx={{ 
                    bgcolor: 'primary.main',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    PRO
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Main Content */}
        <Box sx={{ 
          px: { xs: 3, md: 6 },
          py: 4,
          maxWidth: '1400px',
          mx: 'auto',
        }}>
          {/* About Me Section */}
          {user.about_me && (
            <Box sx={{ mb: 6 }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                mb: 2,
                fontSize: '1.5rem',
              }}>
                Über {user.handle}
              </Typography>
              
              <Typography sx={{ 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}>
                {user.about_me}
              </Typography>
            </Box>
          )}

          {/* Gallery Preview */}
          <Box sx={{ mb: 6 }}>
            <GalleryManager 
              userId={user.id} 
              isOwnProfile={false} 
              previewMode={true}
              onViewAll={() => router.push(`/gallery/${user.id}`)}
            />
          </Box>

          {/* Two Column Layout */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
            gap: 4,
          }}>
            {/* Left Column: Top Artists */}
            <Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                mb: 3,
                fontSize: '1.5rem',
              }}>
                Top-Künstler diesen Monat
              </Typography>
              
              <Typography variant="caption" sx={{ 
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.75rem',
                mb: 2,
                display: 'block',
              }}>
                Öffentlich sichtbar
              </Typography>

              <TopArtists userId={user.id} isOwnProfile={false} />
            </Box>

            {/* Right Column: Currently Playing / Recently Played */}
            <Box>
              {currentTrack && (
                <Box sx={{ 
                  position: 'sticky',
                  top: 24,
                }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    mb: 2,
                    fontSize: '1.25rem',
                  }}>
                    Zuletzt gehört
                  </Typography>

                  {/* Large Album Cover */}
                  <Box sx={{ 
                    aspectRatio: '1',
                    borderRadius: 2,
                    overflow: 'hidden',
                    mb: 2,
                    bgcolor: 'rgba(255,255,255,0.1)',
                    position: 'relative',
                  }}>
                    {currentTrack.album?.image_url ? (
                      <img 
                        src={`${API_BASE}${currentTrack.album.image_url}`}
                        alt={currentTrack.album.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <Box sx={{ 
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <MusicNote sx={{ fontSize: 80, color: 'rgba(255,255,255,0.3)' }} />
                      </Box>
                    )}
                  </Box>

                  {/* Track Info */}
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700,
                    fontSize: '1.25rem',
                    mb: 0.5,
                  }}>
                    {currentTrack.track.name}
                  </Typography>
                  
                  <Typography sx={{ 
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.875rem',
                    mb: 1,
                  }}>
                    {currentTrack.artist.name}
                  </Typography>

                  {currentTrack.album && (
                    <Typography sx={{ 
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '0.75rem',
                    }}>
                      {currentTrack.album.name}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  )
}


