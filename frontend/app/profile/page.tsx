'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider,
  IconButton,
  TextField,
  Stack,
} from '@mui/material'
import {
  MusicNote,
  Refresh,
  LinkOff,
  Warning,
  CheckCircle,
  LocationOn,
  CalendarToday,
  Link as LinkIcon,
  Edit,
  Save,
  Close,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import AvatarUpload from '@/app/components/AvatarUpload'
import GalleryManager from '@/app/components/GalleryManager'
import TopArtists from '@/app/components/TopArtists'
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
      
      setUser(response.data)
      setEditAboutMe(false)
    } catch (err: any) {
      alert(`❌ Fehler: ${err.response?.data?.detail || 'About Me konnte nicht gespeichert werden'}`)
    } finally {
      setAboutMeSaving(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <Container>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <CircularProgress />
          </Box>
        </Container>
      </>
    )
  }

  if (error || !user) {
    return (
      <>
        <Navigation />
        <Container>
          <Box sx={{ mt: 4 }}>
            <Alert severity="error">{error || 'User not found'}</Alert>
          </Box>
        </Container>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <Container maxWidth={false} sx={{ py: 4, px: 4 }}>
        <Grid container spacing={3}>
          {/* Left Column: Profile Info + About Me + Connected Accounts */}
          <Grid item xs={12} md={9}>
            <Stack spacing={3}>
              {/* Profile Header */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                    <AvatarUpload size={100} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h3" gutterBottom>
                        {user.handle}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">
                            {user.city || 'Unknown'}{user.country && `, ${user.country}`}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarToday fontSize="small" color="action" />
                          <Typography variant="body2">
                            Member since {new Date(user.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        {user.is_pro && <Chip label="PRO" color="secondary" size="small" />}
                      </Stack>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<LinkIcon />}
                      component={Link}
                      href="/spotify/connect"
                    >
                      Connect Spotify
                    </Button>
                  </Box>
                </CardContent>
              </Card>

              {/* About Me */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5">
                      About Me
                    </Typography>
                    {!editAboutMe ? (
                      <IconButton onClick={() => setEditAboutMe(true)} size="small">
                        <Edit />
                      </IconButton>
                    ) : (
                      <Box>
                        <IconButton onClick={() => { setEditAboutMe(false); setAboutMeText(user.about_me || ''); }} size="small">
                          <Close />
                        </IconButton>
                        <IconButton onClick={handleSaveAboutMe} size="small" color="primary" disabled={aboutMeSaving}>
                          <Save />
                        </IconButton>
                      </Box>
                    )}
                  </Box>

                  {editAboutMe ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      value={aboutMeText}
                      onChange={(e) => setAboutMeText(e.target.value.slice(0, 1500))}
                      placeholder="Enter information about you"
                      helperText={`${aboutMeText.length}/1500 characters`}
                      disabled={aboutMeSaving}
                    />
                  ) : (
                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', minHeight: 80 }}>
                      {user.about_me || 'Click the edit button to add information about yourself'}
                    </Typography>
                  )}
                </CardContent>
              </Card>

              {/* Gallery Preview - Direkt unter About Me */}
              <GalleryManager 
                userId={user.id} 
                isOwnProfile={true} 
                previewMode={true}
                onViewAll={() => router.push('/gallery')}
              />

              {/* Connected Accounts */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Connected Accounts
                  </Typography>
                  {user.source_accounts.length > 0 ? (
                    <Stack spacing={2}>
                      {user.source_accounts.map((source) => (
                        <Card key={source} variant="outlined" sx={{ bgcolor: 'rgba(74, 155, 142, 0.1)' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <MusicNote color="success" />
                                <Box>
                                  <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                    {source}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Aktiv verbunden
                                  </Typography>
                                </Box>
                              </Box>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDisconnectDialogOpen(true)}
                              >
                                <LinkOff />
                              </IconButton>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info">
                      No music accounts connected yet.{' '}
                      <Link href="/spotify/connect" style={{ color: 'inherit' }}>
                        Connect Spotify
                      </Link>
                    </Alert>
                  )}

                  {!user.onboarding_complete && (
                    <Alert severity="warning" sx={{ mt: 2 }} icon={<Warning />}>
                      <Typography variant="body2" fontWeight="bold" gutterBottom>
                        Complete your Metal-ID
                      </Typography>
                      <Typography variant="caption">
                        Connect your music accounts to generate your Metal-ID
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Right Column: Top Artists & Recently Played Timeline */}
          <Grid item xs={12} md={3}>
            <Stack spacing={3}>
              {/* Top 10 Artists */}
              <TopArtists userId={user.id} isOwnProfile={true} />

              {/* Recently Played Timeline */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Recently Played
                    </Typography>
                    {user.source_accounts.includes('spotify') && (
                      <IconButton onClick={() => fetchTimeline()} disabled={timelineLoading} size="small">
                        <Refresh />
                      </IconButton>
                    )}
                  </Box>

                  <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
                    {!user.source_accounts.includes('spotify') ? (
                      <Alert severity="info">
                        Connect your Spotify account to see your listening history
                      </Alert>
                    ) : timelineLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                      </Box>
                    ) : timeline.length === 0 ? (
                      <Alert severity="info">
                        No scrobbles yet. Play some music on Spotify!
                      </Alert>
                    ) : (
                      <List sx={{ py: 0 }}>
                        {timeline.map((item, index) => (
                          <Box key={item.play_id}>
                            <ListItem alignItems="flex-start" sx={{ px: 0, py: 1.5 }}>
                              <ListItemAvatar>
                                {item.album?.image_url ? (
                                  <Avatar
                                    variant="rounded"
                                    src={item.album.image_url}
                                    alt={item.album.name}
                                    sx={{ width: 56, height: 56 }}
                                  />
                                ) : (
                                  <Avatar variant="rounded" sx={{ width: 56, height: 56 }}>
                                    <MusicNote />
                                  </Avatar>
                                )}
                              </ListItemAvatar>
                              <ListItemText
                                primary={
                                  <Typography variant="body2" fontWeight="bold" noWrap>
                                    {item.track.name}
                                  </Typography>
                                }
                                secondary={
                                  <>
                                    <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                      {item.artist.name}
                                    </Typography>
                                    {item.album && (
                                      <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                        {item.album.name}
                                      </Typography>
                                    )}
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                      {new Date(item.played_at).toLocaleString('de-DE', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </Typography>
                                  </>
                                }
                              />
                            </ListItem>
                            {index < timeline.length - 1 && <Divider />}
                          </Box>
                        ))}
                      </List>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* Disconnect Dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={() => setDisconnectDialogOpen(false)}
      >
        <DialogTitle>
          <Warning color="warning" sx={{ mr: 1, verticalAlign: 'middle' }} />
          Spotify-Verbindung trennen?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Folgende Daten werden innerhalb von 24h gelöscht:
          </DialogContentText>
          <List dense>
            <ListItem>• Alle Spotify-Scrobbles ({timeline.length}+)</ListItem>
            <ListItem>• Top Artists & Genres</ListItem>
            <ListItem>• Hörstatistiken</ListItem>
          </List>
          <DialogContentText sx={{ mt: 2 }}>
            Deine Metal-ID wird neu berechnet.
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialogOpen(false)}>
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
