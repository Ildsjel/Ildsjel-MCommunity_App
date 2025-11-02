'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material'
import {
  MusicNote,
  EmojiEvents,
} from '@mui/icons-material'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface TopArtist {
  artist_id: string
  artist_name: string
  spotify_url: string | null
  play_count: number
  rank: number
}

interface TopArtistsProps {
  userId?: string
  isOwnProfile: boolean
}

export default function TopArtists({ userId, isOwnProfile }: TopArtistsProps) {
  const [artists, setArtists] = useState<TopArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchTopArtists = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('access_token')
        const endpoint = isOwnProfile 
          ? `${API_BASE}/api/v1/users/me/top-artists?limit=5`
          : `${API_BASE}/api/v1/users/${userId}/top-artists?limit=5`
        
        const headers = isOwnProfile 
          ? { Authorization: `Bearer ${token}` }
          : {}

        const response = await axios.get(endpoint, { headers })
        setArtists(response.data)
      } catch (err: any) {
        console.error('Failed to load top artists:', err)
        setError('Failed to load top artists')
      } finally {
        setLoading(false)
      }
    }

    fetchTopArtists()
  }, [userId, isOwnProfile])

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return null
  }

  const getMedalColor = (rank: number) => {
    if (rank === 1) return '#FFD700' // Gold
    if (rank === 2) return '#C0C0C0' // Silver
    if (rank === 3) return '#CD7F32' // Bronze
    return 'text.secondary'
  }

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    )
  }

  if (artists.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EmojiEvents color="primary" />
            <Typography variant="h6">
              Top 5 Artists
            </Typography>
          </Box>
          <Alert severity="info">
            {isOwnProfile 
              ? 'No scrobbles yet. Connect your Spotify account and listen to music!'
              : 'This user has no scrobbles yet.'}
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EmojiEvents color="primary" />
          <Typography variant="h6">
            Top 5 Artists
          </Typography>
        </Box>

        <List sx={{ py: 0 }}>
          {artists.map((artist, index) => (
            <Box key={artist.artist_id}>
              <ListItem
                sx={{
                  px: 0,
                  py: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {/* Rank */}
                <Box
                  sx={{
                    minWidth: 40,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {getMedalIcon(artist.rank) ? (
                    <Typography variant="h5">
                      {getMedalIcon(artist.rank)}
                    </Typography>
                  ) : (
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'text.secondary',
                        fontWeight: 'bold',
                      }}
                    >
                      {artist.rank}
                    </Typography>
                  )}
                </Box>

                {/* Artist Info */}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="body1"
                    fontWeight="bold"
                    noWrap
                    sx={{
                      color: artist.rank <= 3 ? getMedalColor(artist.rank) : 'text.primary',
                    }}
                  >
                    {artist.artist_name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <MusicNote fontSize="small" sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {artist.play_count} {artist.play_count === 1 ? 'play' : 'plays'}
                    </Typography>
                  </Box>
                </Box>

                {/* Play Count Badge */}
                <Chip
                  label={artist.play_count}
                  size="small"
                  sx={{
                    bgcolor: artist.rank <= 3 ? 'primary.main' : 'action.hover',
                    color: artist.rank <= 3 ? 'primary.contrastText' : 'text.primary',
                    fontWeight: 'bold',
                  }}
                />
              </ListItem>
              {index < artists.length - 1 && <Divider />}
            </Box>
          ))}
        </List>

        {artists.length > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" align="center" display="block">
              Based on {artists.reduce((sum, a) => sum + a.play_count, 0)} plays
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

