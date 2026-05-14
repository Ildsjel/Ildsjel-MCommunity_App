'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  TextField,
  Alert,
  List,
  ListItem,
  Avatar,
} from '@mui/material'
import {
  Edit,
  Save,
  Close,
  Warning,
  MusicNote,
  PlayArrow,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import AvatarUpload from '@/app/components/AvatarUpload'
import GalleryManager from '@/app/components/GalleryManager'
import TopArtists from '@/app/components/TopArtists'
import SpotifyConnection from '@/app/components/SpotifyConnection'
import { userAPI } from '@/lib/api'
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

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [error, setError] = useState('')
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [editAboutMe, setEditAboutMe] = useState(false)
  const [aboutMeText, setAboutMeText] = useState('')
  const [aboutMeSaving, setAboutMeSaving] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const userData = await userAPI.getMe()
        setUser(userData)
        setAboutMeText(userData.about_me || '')
        
        // Fetch timeline if Spotify is connected
        if (userData.source_accounts.includes('spotify')) {
          fetchTimeline(token)
        }
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
      const authToken = token || localStorage.getItem('access_token')
      const response = await axios.get(`${API_BASE}/api/v1/spotify/timeline?limit=20`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      setTimeline(response.data.timeline)
    } catch (err) {
      console.error('Failed to load timeline:', err)
    } finally {
      setTimelineLoading(false)
    }
  }

  const handleDisconnectSpotify = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        `${API_BASE}/api/v1/spotify/disconnect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setDisconnectDialogOpen(false)
      
      // Reload profile to update UI
      window.location.reload()
    } catch (err: any) {
      alert(`❌ Fehler: ${err.response?.data?.detail || 'Verbindung konnte nicht getrennt werden'}`)
    }
  }

  const handleSaveAboutMe = async () => {
    setAboutMeSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.patch(
        `${API_BASE}/api/v1/users/me`,
        { about_me: aboutMeText },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setUser({ ...user!, about_me: aboutMeText })
      setEditAboutMe(false)
      alert('✅ About Me updated successfully!')
    } catch (err: any) {
      alert(`❌ Error: ${err.response?.data?.detail || 'Failed to update About Me'}`)
    } finally {
      setAboutMeSaving(false)
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

  const isOwnProfile = true
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
              position: 'relative',
              flexShrink: 0,
            }}>
              <AvatarUpload size={232} />
              <Box sx={{ 
                position: 'absolute',
                bottom: 8,
                right: 8,
              }}>
                <SpotifyConnection 
                  isConnected={user.source_accounts.includes('spotify')}
                  onDisconnect={() => {}}
                />
              </Box>
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

            {/* Edit Button */}
            {isOwnProfile && (
              <Button
                variant="outlined"
                onClick={() => setEditAboutMe(!editAboutMe)}
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  borderRadius: '500px',
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  '&:hover': {
                    borderColor: 'white',
                    bgcolor: 'rgba(255,255,255,0.1)',
                  }
                }}
              >
                Details bearbeiten
              </Button>
            )}
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
          {(editAboutMe || user.about_me) && (
            <Box sx={{ mb: 6 }}>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                mb: 2,
                fontSize: '1.5rem',
              }}>
                Über mich
              </Typography>
              
              {editAboutMe ? (
                <Box>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    value={aboutMeText}
                    onChange={(e) => setAboutMeText(e.target.value)}
                    sx={{ 
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        color: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        '& fieldset': {
                          borderColor: 'rgba(255,255,255,0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255,255,255,0.5)',
                        },
                      }
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSaveAboutMe}
                      disabled={aboutMeSaving}
                      sx={{
                        bgcolor: 'primary.main',
                        borderRadius: '500px',
                        px: 3,
                        textTransform: 'none',
                        fontWeight: 700,
                      }}
                    >
                      {aboutMeSaving ? 'Speichern...' : 'Speichern'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => setEditAboutMe(false)}
                      sx={{
                        borderColor: 'rgba(255,255,255,0.3)',
                        color: 'white',
                        borderRadius: '500px',
                        px: 3,
                        textTransform: 'none',
                        fontWeight: 700,
                      }}
                    >
                      Abbrechen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Typography sx={{ 
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}>
                  {user.about_me || 'Noch keine Beschreibung.'}
                </Typography>
              )}
            </Box>
          )}

          {/* Gallery Preview */}
          <Box sx={{ mb: 6 }}>
            <GalleryManager 
              userId={user.id} 
              isOwnProfile={true} 
              previewMode={true}
              onViewAll={() => router.push('/gallery')}
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
                Nur für dich sichtbar
              </Typography>

              <TopArtists userId={user.id} isOwnProfile={true} />
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

      {/* Disconnect Dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#282828',
            color: 'white',
          }
        }}
      >
        <DialogTitle>
          <Warning color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Spotify-Verbindung trennen?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Folgende Daten werden innerhalb von 24h gelöscht:
          </DialogContentText>
          <List dense>
            <ListItem sx={{ color: 'rgba(255,255,255,0.7)' }}>
              • Alle Spotify-Scrobbles ({timeline.length}+)
            </ListItem>
            <ListItem sx={{ color: 'rgba(255,255,255,0.7)' }}>
              • Top Artists & Genres
            </ListItem>
            <ListItem sx={{ color: 'rgba(255,255,255,0.7)' }}>
              • Hörstatistiken
            </ListItem>
          </List>
          <DialogContentText sx={{ mt: 2, color: 'rgba(255,255,255,0.7)' }}>
            Deine Metal-ID wird neu berechnet.
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialogOpen(false)} sx={{ color: 'white' }}>
            Abbrechen
          </Button>
          <Button onClick={handleDisconnectSpotify} color="error" variant="contained">
            Trennen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}


