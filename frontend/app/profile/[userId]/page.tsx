'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material'
import {
  MusicNote,
  LocationOn,
  CalendarToday,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
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

  // Format city display based on privacy settings
  const getCityDisplay = () => {
    if (user.city_visible === 'hidden') return 'Location hidden'
    if (user.city_visible === 'region') return user.country || 'Unknown'
    return `${user.city || 'Unknown'}${user.country ? `, ${user.country}` : ''}`
  }

  return (
    <>
      <Navigation />
      <Container maxWidth={false} sx={{ py: 4, px: 4 }}>
        <Grid container spacing={3}>
          {/* Left Column: Profile Info + About Me + Gallery */}
          <Grid item xs={12} md={9}>
            <Stack spacing={3}>
              {/* Profile Header */}
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                    <Avatar
                      src={user.profile_image_url ? `${API_BASE}${user.profile_image_url}` : undefined}
                      sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: 40 }}
                    >
                      {user.handle.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h3" gutterBottom>
                        {user.handle}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn fontSize="small" color="action" />
                          <Typography variant="body2">
                            {getCityDisplay()}
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
                  </Box>
                </CardContent>
              </Card>

              {/* About Me */}
              {user.about_me && (
                <Card>
                  <CardContent>
                    <Typography variant="h5" gutterBottom>
                      About Me
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {user.about_me}
                    </Typography>
                  </CardContent>
                </Card>
              )}

              {/* Gallery Preview */}
              <GalleryManager 
                userId={user.id} 
                isOwnProfile={false} 
                previewMode={true}
                onViewAll={() => router.push(`/gallery/${user.id}`)}
              />

              {/* Connected Accounts */}
              {user.source_accounts.length > 0 && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Connected Accounts
                    </Typography>
                    <Stack spacing={2}>
                      {user.source_accounts.map((source) => (
                        <Card key={source} variant="outlined" sx={{ bgcolor: 'rgba(74, 155, 142, 0.1)' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MusicNote color="success" />
                              <Typography variant="body1" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                {source}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              )}
            </Stack>
          </Grid>

          {/* Right Column: Top Artists & Recently Played Timeline */}
          <Grid item xs={12} md={3}>
            <Stack spacing={3}>
              {/* Top 10 Artists */}
              <TopArtists userId={user.id} isOwnProfile={false} />

              {/* Recently Played Timeline */}
              {user.source_accounts.includes('spotify') && (
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recently Played
                    </Typography>

                    <Box sx={{ maxHeight: '600px', overflow: 'auto' }}>
                      {timelineLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                          <CircularProgress />
                        </Box>
                      ) : timeline.length === 0 ? (
                        <Alert severity="info">
                          No recent plays
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
                                        {new Date(item.played_at).toLocaleString('en-US', {
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
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </>
  )
}

