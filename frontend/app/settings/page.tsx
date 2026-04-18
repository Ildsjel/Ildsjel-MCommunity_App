'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import SpotifyConnection from '@/app/components/SpotifyConnection'
import { useUser } from '@/app/context/UserContext'
import { userAPI } from '@/lib/api'
import { adminAPI } from '@/lib/adminAPI'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const sectionBox: React.CSSProperties = {
  border: '1.5px solid rgba(216,207,184,0.2)',
  borderRadius: '3px',
  backgroundColor: '#120e18',
  padding: '14px 16px',
  marginBottom: '12px',
}

const inputSx = {
  '& .MuiInputBase-root': { fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--ink)' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.2)', borderRadius: '3px' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.4)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.6)', borderWidth: '1.5px' },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--muted)' },
}

function SaveButton({ onClick, saving, label = 'SAVE' }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={saving}
      sx={{
        border: '1.5px solid rgba(216,207,184,0.35)', borderRadius: '3px',
        px: 1.5, py: 0.625, background: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em',
        color: 'var(--ink)',
        '&:hover': { borderColor: 'rgba(216,207,184,0.65)' },
        '&:disabled': { opacity: 0.4, cursor: 'default' },
        transition: 'border-color 0.1s',
      }}
    >
      {saving ? '…' : label}
    </Box>
  )
}

function FeedbackMsg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null
  return (
    <Typography sx={{
      fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em',
      color: msg.ok ? '#6a9a7a' : 'var(--accent)', mt: 1,
    }}>
      {msg.ok ? '✓ ' : '✕ '}{msg.text}
    </Typography>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { user: ctxUser, setUser: setCtxUser } = useUser()
  const [loading, setLoading] = useState(true)
  const [hasSpotify, setHasSpotify] = useState(false)

  // Account
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMsg, setAccountMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Password reset
  const [pwSending, setPwSending] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Location
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [locationSaving, setLocationSaving] = useState(false)
  const [locationMsg, setLocationMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Redeem token
  const [redeemToken, setRedeemToken] = useState('')
  const [redeemLoading, setRedeemLoading] = useState(false)
  const [redeemMsg, setRedeemMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth/login'); return }
    userAPI.getMe().then((data) => {
      setHandle(data.handle || '')
      setEmail(data.email || '')
      setCity(data.city || '')
      setCountry(data.country || '')
      setHasSpotify(data.source_accounts?.includes('spotify') ?? false)
      setCtxUser(data)
    }).catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleSaveAccount = async () => {
    setAccountSaving(true)
    setAccountMsg(null)
    try {
      const updated = await axios.patch(
        `${API_BASE}/api/v1/users/me`,
        { handle },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      )
      setCtxUser(updated.data)
      setAccountMsg({ ok: true, text: 'Account updated' })
    } catch (e: any) {
      setAccountMsg({ ok: false, text: e.response?.data?.detail || e.message })
    } finally {
      setAccountSaving(false)
    }
  }

  const handleSendPasswordReset = async () => {
    setPwSending(true)
    setPwMsg(null)
    try {
      await axios.post(`${API_BASE}/api/v1/auth/request-password-reset`, { email })
      setPwMsg({ ok: true, text: 'Password reset email sent — check your inbox' })
    } catch (e: any) {
      setPwMsg({ ok: false, text: e.response?.data?.detail || e.message })
    } finally {
      setPwSending(false)
    }
  }

  const handleSaveLocation = async () => {
    setLocationSaving(true)
    setLocationMsg(null)
    try {
      const updated = await axios.patch(
        `${API_BASE}/api/v1/users/me`,
        { city, country },
        { headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` } }
      )
      setCtxUser(updated.data)
      setLocationMsg({ ok: true, text: 'Location updated' })
    } catch (e: any) {
      setLocationMsg({ ok: false, text: e.response?.data?.detail || e.message })
    } finally {
      setLocationSaving(false)
    }
  }

  const handleRedeemToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!redeemToken.trim()) return
    setRedeemLoading(true)
    setRedeemMsg(null)
    try {
      const result = await adminAPI.redeemToken(redeemToken.trim())
      setRedeemMsg({ ok: true, text: result.message })
      setRedeemToken('')
      // Refresh user so role updates in context
      const fresh = await userAPI.getMe()
      setCtxUser(fresh)
    } catch (e: any) {
      setRedeemMsg({ ok: false, text: e.message })
    } finally {
      setRedeemLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={24} sx={{ color: 'var(--accent)' }} />
        </Box>
      </>
    )
  }

  const isAdmin = ctxUser?.role === 'admin' || ctxUser?.role === 'superadmin'

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>⚙ SETTINGS</span>

        {/* ── Account ─────────────────────────────────────────────── */}
        <div style={sectionBox}>
          <span style={{ ...lbl, display: 'block', marginBottom: 14 }}>ACCOUNT</span>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <TextField
              label="Handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              size="small" fullWidth sx={inputSx}
            />
            <TextField
              label="Email"
              value={email}
              size="small" fullWidth sx={inputSx}
              disabled
              helperText="Email changes are not yet supported"
              FormHelperTextProps={{ sx: { fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', ml: 0 } }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SaveButton onClick={handleSaveAccount} saving={accountSaving} />
            </Box>
            <FeedbackMsg msg={accountMsg} />
          </Box>
        </div>

        {/* ── Password ─────────────────────────────────────────────── */}
        <div style={sectionBox}>
          <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>PASSWORD</span>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.25 }}>
            We'll send a reset link to {email}.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveButton onClick={handleSendPasswordReset} saving={pwSending} label="SEND RESET EMAIL" />
          </Box>
          <FeedbackMsg msg={pwMsg} />
        </div>

        {/* ── Location ─────────────────────────────────────────────── */}
        <div style={sectionBox}>
          <span style={{ ...lbl, display: 'block', marginBottom: 14 }}>LOCATION</span>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <TextField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              size="small" fullWidth sx={inputSx}
              placeholder="e.g. Oslo"
            />
            <TextField
              label="Country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              size="small" fullWidth sx={inputSx}
              placeholder="e.g. Norway"
            />
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)' }}>
              Used to find nearby listeners and events.
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SaveButton onClick={handleSaveLocation} saving={locationSaving} />
            </Box>
            <FeedbackMsg msg={locationMsg} />
          </Box>
        </div>

        {/* ── Connections ───────────────────────────────────────────── */}
        <div style={sectionBox}>
          <span style={{ ...lbl, display: 'block', marginBottom: 14 }}>CONNECTIONS</span>
          <SpotifyConnection
            isConnected={hasSpotify}
            onDisconnect={() => {
              axios.post(`${API_BASE}/api/v1/spotify/disconnect`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
              }).then(() => { setHasSpotify(false) })
                .catch((e) => alert(e.response?.data?.detail || 'Could not disconnect'))
            }}
          />
        </div>

        {/* ── Access — only shown to non-admins ────────────────────── */}
        {!isAdmin && (
          <div style={sectionBox}>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>ACCESS</span>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.25 }}>
              Have an admin invitation token? Redeem it here.
            </Typography>
            <Box component="form" onSubmit={handleRedeemToken} sx={{ display: 'flex', gap: 0.75 }}>
              <TextField
                value={redeemToken}
                onChange={(e) => setRedeemToken(e.target.value)}
                placeholder="Paste token…"
                size="small" fullWidth
                sx={inputSx}
              />
              <Box
                component="button" type="submit"
                disabled={redeemLoading || !redeemToken.trim()}
                sx={{
                  border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px',
                  px: 1.25, background: 'none', cursor: 'pointer', flexShrink: 0,
                  fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--ink)',
                  '&:disabled': { opacity: 0.4 },
                }}
              >
                {redeemLoading ? '…' : 'REDEEM'}
              </Box>
            </Box>
            <FeedbackMsg msg={redeemMsg} />
          </div>
        )}

      </Box>
    </>
  )
}
