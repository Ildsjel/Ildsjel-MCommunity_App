'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { getErrorMessage } from '@/lib/types/apiError'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface LastFmStatus {
  is_connected: boolean
  username?: string
  total_plays?: number
  total_artists?: number
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

const sectionBox = {
  border: '1.5px solid rgba(216,207,184,0.15)',
  borderRadius: '3px',
  backgroundColor: '#120e18',
  p: '14px 16px',
  mb: 1.5,
}

export default function LastFmConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<LastFmStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const callbackFired = useRef(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth/login'); return }

    const lfmToken = searchParams.get('token')
    if (lfmToken) {
      if (callbackFired.current) return
      callbackFired.current = true
      handleCallback(lfmToken, token)
    } else {
      fetchStatus(token)
    }
  }, [searchParams, router])

  const fetchStatus = async (token: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/lastfm/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setStatus(res.data)
    } catch {
      setError('Could not load Last.fm status')
    } finally {
      setLoading(false)
    }
  }

  const handleCallback = async (lfmToken: string, authToken: string) => {
    setProcessing(true)
    try {
      await axios.post(
        `${API_BASE}/api/v1/lastfm/auth/callback`,
        { token: lfmToken },
        { headers: { Authorization: `Bearer ${authToken}` } }
      )
      await fetchStatus(authToken)
      window.history.replaceState({}, '', '/lastfm/connect')
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to complete Last.fm connection'))
      setLoading(false)
    } finally {
      setProcessing(false)
    }
  }

  const handleConnect = async () => {
    setError('')
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE}/api/v1/lastfm/auth/url`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      window.location.href = res.data.auth_url
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to start Last.fm authorization'))
    }
  }

  const handleDisconnect = async () => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(`${API_BASE}/api/v1/lastfm/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setConfirmDisconnect(false)
      await fetchStatus(token!)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to disconnect'))
    }
  }

  if (loading || processing) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={20} sx={{ color: 'var(--accent, #c43a2a)' }} />
        </Box>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 12 }}>

        <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent, #c43a2a)', display: 'block', marginBottom: 20 }}>
          ◈ Last.fm Connection
        </span>

        {error && (
          <Box sx={{ border: '1.5px solid rgba(196,58,42,0.4)', borderRadius: '3px', p: '10px 12px', mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--accent)' }}>✕ {error}</span>
            <Box component="button" onClick={() => setError('')} sx={{ ml: 1, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.5rem', fontFamily: 'var(--font-mono)' }}>
              dismiss
            </Box>
          </Box>
        )}

        {/* Status */}
        <Box sx={sectionBox}>
          <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 14 }}>
            Status
          </span>

          {status?.is_connected ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6a9a7a', flexShrink: 0,
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                }} />
                <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.1em', color: '#6a9a7a', textTransform: 'uppercase' }}>
                  Connected · {status.username}
                </span>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '2rem', color: 'var(--ink)', lineHeight: 1 }}>
                  {(status.total_plays || 0).toLocaleString()}
                </Typography>
                <span style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  scrobbles
                </span>
              </Box>
              {(status.total_artists || 0) > 0 && (
                <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                  {status.total_artists} top artists synced
                </span>
              )}

              {!confirmDisconnect ? (
                <Box component="button" onClick={() => setConfirmDisconnect(true)} sx={{
                  alignSelf: 'flex-start', background: 'none',
                  border: '1px solid rgba(196,58,42,0.35)', borderRadius: '3px',
                  px: 1.25, py: 0.5, cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'var(--accent)',
                  '&:hover': { borderColor: 'rgba(196,58,42,0.7)' },
                }}>
                  Disconnect
                </Box>
              ) : (
                <Box sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '3px', p: '10px 12px', backgroundColor: 'rgba(196,58,42,0.05)' }}>
                  <span style={{ ...mono, fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--ink)', display: 'block', marginBottom: 8 }}>
                    This will remove your Last.fm connection and synced data. Continue?
                  </span>
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <Box component="button" onClick={handleDisconnect} sx={{ background: 'none', border: '1px solid rgba(196,58,42,0.5)', borderRadius: '3px', px: 1.25, py: 0.5, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' } }}>
                      Yes, disconnect
                    </Box>
                    <Box component="button" onClick={() => setConfirmDisconnect(false)} sx={{ background: 'none', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 1.25, py: 0.5, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)' }}>
                      Cancel
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgba(216,207,184,0.2)', flexShrink: 0 }} />
                <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                  Not connected
                </span>
              </Box>
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Link your Last.fm account to sync your top artists and scrobble history.
              </Typography>
              <Box component="button" onClick={handleConnect} sx={{
                alignSelf: 'flex-start', background: 'none',
                border: '1.5px solid rgba(216,207,184,0.4)', borderRadius: '3px',
                px: 1.5, py: 0.75, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em',
                textTransform: 'uppercase', color: 'var(--ink)',
                '&:hover': { borderColor: 'rgba(216,207,184,0.7)' },
                transition: 'border-color 0.15s',
              }}>
                Connect Last.fm →
              </Box>
            </Box>
          )}
        </Box>

        {/* What gets tracked */}
        <Box sx={sectionBox}>
          <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
            What gets tracked
          </span>
          {[
            'Top 50 artists overall — with play counts',
            'Artists merged with Spotify data when both are connected',
            'MusicBrainz IDs used for accurate deduplication',
          ].map((item) => (
            <Box key={item} sx={{ display: 'flex', gap: 1, mb: 0.75, alignItems: 'flex-start' }}>
              <span style={{ ...mono, fontSize: '0.4375rem', color: 'var(--muted)', marginTop: 2 }}>◆</span>
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'rgba(236,229,211,0.7)', lineHeight: 1.4 }}>
                {item}
              </Typography>
            </Box>
          ))}
        </Box>

        <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.08em', color: 'rgba(122,117,109,0.7)', lineHeight: 1.6, display: 'block' }}>
          Session keys are stored only in your account. Disconnecting removes all synced Last.fm data.
        </span>

      </Box>
    </>
  )
}
