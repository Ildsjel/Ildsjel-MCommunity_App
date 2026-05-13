'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'
import { userAPI } from '@/lib/api'
import { adminAPI } from '@/lib/adminAPI'
import { profileAPI } from '@/lib/profileAPI'
import { getErrorMessage } from '@/lib/types/apiError'
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

// ── Connection types ──────────────────────────────────────────────────────────

interface SpotifyStatus { is_connected: boolean; total_artists?: number }
interface LastFmStatus  { is_connected: boolean; username?: string; total_plays?: number; total_artists?: number }

// ── Service icons ─────────────────────────────────────────────────────────────

function SpotifyIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  )
}

function LastFmIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M10.584 17.21l-.88-2.392s-1.43 1.596-3.573 1.596c-1.897 0-3.244-1.648-3.244-4.288 0-3.38 1.704-4.59 3.38-4.59 2.42 0 3.19 1.57 3.85 3.574l.88 2.75c.88 2.64 2.53 4.76 7.293 4.76 3.41 0 5.72-1.047 5.72-3.796 0-2.224-1.266-3.37-3.63-3.93l-1.757-.385c-1.21-.275-1.567-.77-1.567-1.596 0-.935.742-1.485 1.952-1.485 1.32 0 2.034.495 2.145 1.677l2.75-.33c-.22-2.475-1.924-3.49-4.73-3.49-2.475 0-4.895.935-4.895 3.93 0 1.87.907 3.05 3.19 3.63l1.87.44c1.375.33 1.87.88 1.87 1.76 0 1.045-.99 1.485-2.86 1.485-2.75 0-3.906-1.457-4.565-3.38l-.907-2.75c-1.155-3.573-2.97-4.895-6.653-4.895C2.09 5.505 0 7.952 0 12.186c0 4.07 2.09 6.27 5.978 6.27 3.08 0 4.606-1.246 4.606-1.246z"/>
    </svg>
  )
}

// ── ConnectionRow ─────────────────────────────────────────────────────────────

interface ConnectionRowProps {
  icon: React.ReactNode
  name: string
  accentColor: string
  isConnected: boolean
  detail?: string          // e.g. "username · 12,450 scrobbles · 48 artists"
  connectLabel?: string
  onConnect: () => void
  onDisconnect: () => void
  busy: boolean
}

function ConnectionRow({
  icon, name, accentColor, isConnected, detail,
  connectLabel = 'CONNECT', onConnect, onDisconnect, busy,
}: ConnectionRowProps) {
  const [confirming, setConfirming] = useState(false)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      {/* Main row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {/* Logo badge */}
        <Box sx={{
          width: 32, height: 32, borderRadius: '4px', flexShrink: 0,
          backgroundColor: accentColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff',
        }}>
          {icon}
        </Box>

        {/* Name + status */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <span style={{ ...lbl, color: 'var(--ink)', fontSize: '0.5625rem' }}>{name}</span>
            {isConnected ? (
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#6a9a7a', flexShrink: 0 }} />
            ) : (
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'rgba(216,207,184,0.2)', flexShrink: 0 }} />
            )}
          </Box>
          {detail && (
            <span style={{ ...lbl, fontSize: '0.4375rem', color: 'var(--muted)' }}>{detail}</span>
          )}
          {!isConnected && !detail && (
            <span style={{ ...lbl, fontSize: '0.4375rem', color: 'var(--muted)' }}>NOT CONNECTED</span>
          )}
        </Box>

        {/* Action button */}
        {isConnected ? (
          <Box
            component="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            sx={{
              border: '1.5px solid rgba(196,58,42,0.35)', borderRadius: '3px',
              px: 1, py: 0.4, background: 'none', cursor: 'pointer', flexShrink: 0,
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.1em', color: 'var(--accent)',
              '&:hover': { borderColor: 'var(--accent)' },
              '&:disabled': { opacity: 0.4, cursor: 'default' },
            }}
          >
            {busy ? '…' : 'DISCONNECT'}
          </Box>
        ) : (
          <Box
            component="button"
            onClick={onConnect}
            disabled={busy}
            sx={{
              border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px',
              px: 1, py: 0.4, background: 'none', cursor: 'pointer', flexShrink: 0,
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.1em', color: 'var(--ink)',
              '&:hover': { borderColor: 'rgba(216,207,184,0.6)' },
              '&:disabled': { opacity: 0.4, cursor: 'default' },
            }}
          >
            {busy ? '…' : connectLabel}
          </Box>
        )}
      </Box>

      {/* Disconnect confirmation */}
      {confirming && (
        <Box sx={{ border: '1px solid rgba(196,58,42,0.25)', borderRadius: '3px', p: '8px 10px', background: 'rgba(196,58,42,0.04)' }}>
          <span style={{ ...lbl, fontSize: '0.4375rem', color: 'var(--muted)', display: 'block', marginBottom: 6 }}>
            Remove {name} connection? Synced data will be deleted.
          </span>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <Box
              component="button"
              onClick={() => { setConfirming(false); onDisconnect() }}
              sx={{
                background: 'none', border: '1px solid rgba(196,58,42,0.45)', borderRadius: '3px',
                px: 1, py: 0.4, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--accent)',
              }}
            >
              YES, DISCONNECT
            </Box>
            <Box
              component="button"
              onClick={() => setConfirming(false)}
              sx={{
                background: 'none', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                px: 1, py: 0.4, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)',
              }}
            >
              CANCEL
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  )
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
  const [spotifyStatus, setSpotifyStatus] = useState<SpotifyStatus>({ is_connected: false })
  const [lastfmStatus, setLastfmStatus]   = useState<LastFmStatus>({ is_connected: false })
  const [spotifyBusy, setSpotifyBusy] = useState(false)
  const [lastfmBusy, setLastfmBusy]   = useState(false)

  // Account
  const [handle, setHandle] = useState('')
  const [email, setEmail] = useState('')
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountMsg, setAccountMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Change password
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Delete account
  const [deleteConfirmPw, setDeleteConfirmPw] = useState('')
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [deleteMsg, setDeleteMsg] = useState<{ ok: boolean; text: string } | null>(null)

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

    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      userAPI.getMe(),
      axios.get(`${API_BASE}/api/v1/spotify/status`, { headers }).catch(() => ({ data: { is_connected: false } })),
      axios.get(`${API_BASE}/api/v1/lastfm/status`,  { headers }).catch(() => ({ data: { is_connected: false } })),
    ]).then(([userData, spotifyRes, lastfmRes]) => {
      setHandle(userData.handle || '')
      setEmail(userData.email || '')
      setCity(userData.city || '')
      setCountry(userData.country || '')
      setCtxUser(userData)
      setSpotifyStatus(spotifyRes.data)
      setLastfmStatus(lastfmRes.data)
    }).catch(() => router.push('/auth/login'))
      .finally(() => setLoading(false))
  }, [router])

  const handleSaveAccount = async () => {
    setAccountSaving(true)
    setAccountMsg(null)
    try {
      const updated = await profileAPI.updateMe({ handle })
      setCtxUser(updated)
      setAccountMsg({ ok: true, text: 'Account updated' })
    } catch (e: unknown) {
      setAccountMsg({ ok: false, text: getErrorMessage(e) })
    } finally {
      setAccountSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!newPw || newPw.length < 8) {
      setPwMsg({ ok: false, text: 'New password must be at least 8 characters' })
      return
    }
    setPwSaving(true)
    setPwMsg(null)
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(
        `${API_BASE}/api/v1/auth/change-password`,
        { old_password: oldPw, new_password: newPw },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setPwMsg({ ok: true, text: 'Password changed' })
      setOldPw('')
      setNewPw('')
    } catch (e: unknown) {
      setPwMsg({ ok: false, text: getErrorMessage(e) })
    } finally {
      setPwSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeletePhase('deleting')
    setDeleteMsg(null)
    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(`${API_BASE}/api/v1/users/me`, {
        data: { password: deleteConfirmPw },
        headers: { Authorization: `Bearer ${token}` },
      })
      // Clean up local state and redirect
      localStorage.removeItem('access_token')
      router.push('/')
    } catch (e: unknown) {
      setDeleteMsg({ ok: false, text: getErrorMessage(e) })
      setDeletePhase('confirm')
    }
  }

  const handleSaveLocation = async () => {
    setLocationSaving(true)
    setLocationMsg(null)
    try {
      const updated = await profileAPI.updateMe({ city, country })
      setCtxUser(updated)
      setLocationMsg({ ok: true, text: 'Location updated' })
    } catch (e: unknown) {
      setLocationMsg({ ok: false, text: getErrorMessage(e) })
    } finally {
      setLocationSaving(false)
    }
  }

  const handleConnectSpotify = () => router.push('/spotify/connect')

  const handleDisconnectSpotify = async () => {
    setSpotifyBusy(true)
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(`${API_BASE}/api/v1/spotify/disconnect`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setSpotifyStatus({ is_connected: false })
    } catch (e) { console.error(e) }
    finally { setSpotifyBusy(false) }
  }

  const handleConnectLastFm = async () => {
    setLastfmBusy(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE}/api/v1/lastfm/auth/url`, { headers: { Authorization: `Bearer ${token}` } })
      window.location.href = res.data.auth_url
    } catch (e) { console.error(e) }
    finally { setLastfmBusy(false) }
  }

  const handleDisconnectLastFm = async () => {
    setLastfmBusy(true)
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(`${API_BASE}/api/v1/lastfm/disconnect`, {}, { headers: { Authorization: `Bearer ${token}` } })
      setLastfmStatus({ is_connected: false })
    } catch (e) { console.error(e) }
    finally { setLastfmBusy(false) }
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
    } catch (e: unknown) {
      setRedeemMsg({ ok: false, text: getErrorMessage(e) })
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
          <span style={{ ...lbl, display: 'block', marginBottom: 14 }}>PASSWORD</span>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <TextField
              label="Current password"
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              size="small" fullWidth sx={inputSx}
              autoComplete="current-password"
            />
            <TextField
              label="New password"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              size="small" fullWidth sx={inputSx}
              autoComplete="new-password"
              helperText="Minimum 8 characters"
              FormHelperTextProps={{ sx: { fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', ml: 0 } }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <SaveButton onClick={handleChangePassword} saving={pwSaving} label="CHANGE PASSWORD" />
            </Box>
            <FeedbackMsg msg={pwMsg} />
          </Box>
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
          <span style={{ ...lbl, display: 'block', marginBottom: 16 }}>CONNECTIONS</span>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* Spotify */}
            <ConnectionRow
              icon={<SpotifyIcon size={18} />}
              name="SPOTIFY"
              accentColor="#1DB954"
              isConnected={spotifyStatus.is_connected}
              detail={spotifyStatus.is_connected
                ? [
                    spotifyStatus.total_artists ? `${spotifyStatus.total_artists} TOP ARTISTS` : null,
                  ].filter(Boolean).join(' · ') || 'CONNECTED'
                : undefined}
              onConnect={handleConnectSpotify}
              onDisconnect={handleDisconnectSpotify}
              busy={spotifyBusy}
            />

            <Box sx={{ height: '1px', background: 'rgba(216,207,184,0.08)' }} />

            {/* Last.fm */}
            <ConnectionRow
              icon={<LastFmIcon size={18} />}
              name="LAST.FM"
              accentColor="#d51007"
              isConnected={lastfmStatus.is_connected}
              detail={lastfmStatus.is_connected
                ? [
                    lastfmStatus.username ? lastfmStatus.username.toUpperCase() : null,
                    lastfmStatus.total_plays ? `${lastfmStatus.total_plays.toLocaleString()} SCROBBLES` : null,
                    lastfmStatus.total_artists ? `${lastfmStatus.total_artists} ARTISTS` : null,
                  ].filter(Boolean).join(' · ')
                : undefined}
              connectLabel="CONNECT →"
              onConnect={handleConnectLastFm}
              onDisconnect={handleDisconnectLastFm}
              busy={lastfmBusy}
            />

          </Box>
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

        {/* ── Danger zone ───────────────────────────────────────────── */}
        <div style={{
          ...sectionBox,
          border: '1.5px solid rgba(196,58,42,0.35)',
          marginBottom: 0,
        }}>
          <span style={{ ...lbl, display: 'block', marginBottom: 8, color: 'var(--accent)' }}>DANGER ZONE</span>

          {deletePhase === 'idle' && (
            <>
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.25 }}>
                Permanently delete your account and all associated data. This cannot be undone.
              </Typography>
              <Box
                component="button"
                onClick={() => setDeletePhase('confirm')}
                sx={{
                  border: '1.5px solid rgba(196,58,42,0.45)', borderRadius: '3px',
                  px: 1.5, py: 0.625, background: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em',
                  color: 'var(--accent)',
                  '&:hover': { borderColor: 'var(--accent)', backgroundColor: 'rgba(196,58,42,0.06)' },
                  transition: 'all 0.1s',
                }}
              >
                DELETE ACCOUNT
              </Box>
            </>
          )}

          {(deletePhase === 'confirm' || deletePhase === 'deleting') && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', color: 'var(--accent)' }}>
                Enter your password to confirm deletion. All your data will be permanently erased.
              </Typography>
              <TextField
                label="Confirm your password"
                type="password"
                value={deleteConfirmPw}
                onChange={(e) => setDeleteConfirmPw(e.target.value)}
                size="small" fullWidth sx={{
                  ...inputSx,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(196,58,42,0.35)', borderRadius: '3px' },
                  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(196,58,42,0.6)' },
                }}
                autoComplete="current-password"
                disabled={deletePhase === 'deleting'}
              />
              <Box sx={{ display: 'flex', gap: 0.75 }}>
                <Box
                  component="button"
                  onClick={() => { setDeletePhase('idle'); setDeleteConfirmPw(''); setDeleteMsg(null) }}
                  disabled={deletePhase === 'deleting'}
                  sx={{
                    flex: 1, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                    py: 0.625, background: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)',
                    '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
                    '&:disabled': { opacity: 0.4, cursor: 'default' },
                  }}
                >
                  CANCEL
                </Box>
                <Box
                  component="button"
                  onClick={handleDeleteAccount}
                  disabled={!deleteConfirmPw || deletePhase === 'deleting'}
                  sx={{
                    flex: 1, border: '1.5px solid var(--accent)', borderRadius: '3px',
                    py: 0.625, background: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--accent)',
                    '&:hover': { backgroundColor: 'rgba(196,58,42,0.08)' },
                    '&:disabled': { opacity: 0.4, cursor: 'default' },
                  }}
                >
                  {deletePhase === 'deleting' ? '…' : 'CONFIRM DELETE'}
                </Box>
              </Box>
              <FeedbackMsg msg={deleteMsg} />
            </Box>
          )}
        </div>

      </Box>
    </>
  )
}
