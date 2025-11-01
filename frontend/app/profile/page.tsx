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
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Profile Card */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                  <Avatar
                    sx={{
                      width: 120,
                      height: 120,
                      bgcolor: 'primary.main',
                      fontSize: '3rem',
                      mb: 2,
                    }}
                  >
                    {user.handle.charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography variant="h4" gutterBottom>
                    {user.handle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {user.email}
                  </Typography>
                  {user.is_pro && (
                    <Chip
                      label="PRO"
                      color="secondary"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(user.city || user.country) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">
                        {user.city}{user.city && user.country && ', '}{user.country}
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarToday fontSize="small" color="action" />
                    <Typography variant="body2">
                      Member since {new Date(user.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Connected Accounts */}
                <Typography variant="h6" gutterBottom>
                  Connected Accounts
                </Typography>
                {user.source_accounts.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {user.source_accounts.map((source) => (
                      <Card key={source} variant="outlined" sx={{ bgcolor: 'success.main', bgcolor: 'rgba(74, 155, 142, 0.1)' }}>
                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MusicNote color="success" />
                              <Box>
                                <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
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
                  </Box>
                ) : (
                  <Alert severity="info" sx={{ mt: 1 }}>
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

            {/* Quick Actions */}
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                component={Link}
                href="/spotify/connect"
                fullWidth
              >
                Connect Spotify
              </Button>
            </Box>
          </Grid>

          {/* Timeline */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5">
                    Recently Played
                  </Typography>
                  {user.source_accounts.includes('spotify') && (
                    <IconButton onClick={() => fetchTimeline()} disabled={timelineLoading}>
                      <Refresh />
                    </IconButton>
                  )}
                </Box>

                {!user.source_accounts.includes('spotify') ? (
                  <Alert severity="info">
                    Connect your Spotify account to see your listening history
                  </Alert>
                ) : timelineLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : timeline.length === 0 ? (
                  <Alert severity="info">
                    No scrobbles yet. Play some music on Spotify!
                  </Alert>
                ) : (
                  <List>
                    {timeline.map((item, index) => (
                      <Box key={item.play_id}>
                        <ListItem alignItems="flex-start" sx={{ px: 0 }}>
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
                              <Typography variant="body1" fontWeight="bold">
                                {item.track.name}
                              </Typography>
                            }
                            secondary={
                              <>
                                <Typography variant="body2" color="text.secondary">
                                  {item.artist.name}
                                </Typography>
                                {item.album && (
                                  <Typography variant="caption" color="text.secondary">
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
              </CardContent>
            </Card>
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
