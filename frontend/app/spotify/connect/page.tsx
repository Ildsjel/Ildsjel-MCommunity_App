'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  MusicNote,
  CheckCircle,
  Sync,
  LinkOff,
  Warning,
  FiberManualRecord,
} from '@mui/icons-material'
import Navigation from '@/app/components/Navigation'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SpotifyStatus {
  is_connected: boolean
  spotify_user_id?: string
  total_plays?: number
  last_sync?: string
}

export default function SpotifyConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<SpotifyStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      router.push('/auth/login')
      return
    }

    // Check for OAuth callback
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    if (errorParam) {
      setError(`Spotify authorization failed: ${errorParam}`)
      setLoading(false)
      return
    }

    if (code && state) {
      handleCallback(code, state, token)
    } else {
      fetchStatus(token)
    }
  }, [searchParams, router])

  const fetchStatus = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE}/api/v1/spotify/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setStatus(response.data)
    } catch (err: any) {
      setError('Failed to load Spotify status')
    } finally {
      setLoading(false)
    }
  }

  const handleCallback = async (code: string, state: string, token: string) => {
    try {
      await axios.post(
        `${API_BASE}/api/v1/spotify/callback`,
        { code, state },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Refresh status
      await fetchStatus(token)
      
      // Clean URL
      window.history.replaceState({}, '', '/spotify/connect')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to connect Spotify')
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.get(`${API_BASE}/api/v1/spotify/authorize`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      window.location.href = response.data.authorization_url
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start authorization')
    }
  }

  const handleDisconnect = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) return
      
      await axios.post(
        `${API_BASE}/api/v1/spotify/disconnect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setDisconnectDialogOpen(false)
      
      // Refresh status
      await fetchStatus(token)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to disconnect')
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

  return (
    <>
      <Navigation />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" gutterBottom>
            Spotify Integration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Connect your Spotify account to track your listening history
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Status Card */}
        <Card>
          <CardContent sx={{ p: 4 }}>
            {status?.is_connected ? (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CheckCircle color="success" sx={{ fontSize: 40 }} />
                    <Box>
                      <Typography variant="h5" gutterBottom>
                        Verbunden
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Spotify ist aktiv
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<LinkOff />}
                    onClick={() => setDisconnectDialogOpen(true)}
                  >
                    Trennen
                  </Button>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 3 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Scrobbles
                      </Typography>
                      <Typography variant="h4" color="primary">
                        {status.total_plays || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Auto-Sync
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FiberManualRecord
                          color="success"
                          sx={{
                            fontSize: 12,
                            animation: 'pulse 2s infinite',
                            '@keyframes pulse': {
                              '0%, 100%': { opacity: 1 },
                              '50%': { opacity: 0.5 },
                            },
                          }}
                        />
                        <Typography variant="body1" color="success.main">
                          Alle 5 Min
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>

                <Alert severity="success" icon={<CheckCircle />}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>
                    Automatische Synchronisierung aktiv
                  </Typography>
                  <Typography variant="body2">
                    Deine Spotify-Hörgewohnheiten werden automatisch alle 5 Minuten synchronisiert. 
                    Du musst nichts weiter tun – spiele einfach Musik und wir tracken sie für dich!
                  </Typography>
                </Alert>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center' }}>
                <MusicNote sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Nicht verbunden
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Verbinde deinen Spotify-Account, um deine Hörgewohnheiten zu tracken
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<MusicNote />}
                  onClick={handleConnect}
                >
                  Mit Spotify verbinden
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Was wird getrackt?
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Recently Played Tracks"
                  secondary="Songs, die du auf Spotify hörst"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Artists & Albums"
                  secondary="Deine Lieblingskünstler und Alben"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Listening Stats"
                  secondary="Statistiken über deine Hörgewohnheiten"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Privacy Note */}
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Datenschutz & DSGVO
          </Typography>
          <Typography variant="body2">
            Wir speichern nur die nötigsten Daten und du kannst deine Verbindung jederzeit trennen. 
            Nach dem Trennen werden alle Spotify-Daten innerhalb von 24h gelöscht.
          </Typography>
        </Alert>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            component={Link}
            href="/profile"
            variant="text"
          >
            ← Zurück zum Profil
          </Button>
        </Box>
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
            <ListItem>• Alle Spotify-Scrobbles ({status?.total_plays || 0}+)</ListItem>
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
          <Button onClick={handleDisconnect} color="error" variant="contained">
            Trennen
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
