'use client'

import { useState } from 'react'
import { 
  Box, 
  IconButton, 
  Tooltip, 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress
} from '@mui/material'
import { CheckCircle, Cancel } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface SpotifyConnectionProps {
  isConnected: boolean
  onDisconnect?: () => void
}

export default function SpotifyConnection({ isConnected, onDisconnect }: SpotifyConnectionProps) {
  const router = useRouter()
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleConnect = () => {
    router.push('/spotify/connect')
  }

  const handleDisconnectConfirm = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      
      await axios.post(
        `${API_BASE}/api/v1/spotify/disconnect`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      setDisconnectDialogOpen(false)
      
      if (onDisconnect) {
        onDisconnect()
      }
      
      // Refresh page to update UI
      window.location.reload()
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error)
      alert('Failed to disconnect Spotify. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <Tooltip title={isConnected ? 'Spotify connected - Click to disconnect' : 'Connect Spotify'}>
          <IconButton
            onClick={isConnected ? () => setDisconnectDialogOpen(true) : handleConnect}
            sx={{
              width: 36,
              height: 36,
              bgcolor: '#1DB954',
              '&:hover': {
                bgcolor: '#1ed760',
              },
              position: 'relative',
            }}
          >
            {/* Spotify Logo */}
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="white"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </IconButton>
        </Tooltip>

        {/* Status Indicator */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            bgcolor: 'background.paper',
            borderRadius: '50%',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 2,
          }}
        >
          {isConnected ? (
            <CheckCircle sx={{ fontSize: 14, color: 'success.main' }} />
          ) : (
            <Cancel sx={{ fontSize: 14, color: 'error.main' }} />
          )}
        </Box>
      </Box>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={disconnectDialogOpen} onClose={() => setDisconnectDialogOpen(false)}>
        <DialogTitle>Disconnect Spotify</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to disconnect your Spotify account? 
            Your listening history will be preserved, but we won't be able to track new songs.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisconnectDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDisconnectConfirm} 
            color="error" 
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

