'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, GlobalStyles } from '@mui/material'
import Sigil from '@/app/components/Sigil'
import { useUser } from '@/app/context/UserContext'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Design tokens ─────────────────────────────────────────────────────────────
const paper   = '#120e18'
const paper2  = '#1a1424'
const paper3  = '#221a2e'
const ink     = '#ece5d3'
const ink2    = '#c9c2ae'
const muted   = '#7a7364'
const accent  = '#c43a2a'

// ── Font shorthands ───────────────────────────────────────────────────────────
const MONO    = '"JetBrains Mono", monospace'
const SERIF   = '"EB Garamond", serif'
const DISPLAY = '"Archivo Black", sans-serif'
const MEDIEVAL = '"UnifrakturCook", "UnifrakturMaguntia", "EB Garamond", serif'

// ── Shared style helpers ──────────────────────────────────────────────────────
const monoLabel = (color = muted): React.CSSProperties => ({
  fontFamily: MONO,
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  color,
})

const bodyText = (color = ink2): React.CSSProperties => ({
  fontFamily: SERIF,
  fontStyle: 'italic',
  fontSize: '0.8125rem',
  lineHeight: 1.55,
  color,
})

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <Box sx={{ display: 'flex', gap: '4px', mb: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Box
          key={s}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 1,
            backgroundColor:
              s < step ? accent : s === step ? ink : 'rgba(216,207,184,.15)',
            transition: 'background-color 0.3s',
          }}
        />
      ))}
    </Box>
  )
}

// ── Step header ───────────────────────────────────────────────────────────────
function StepHeader({ label, step }: { label: string; step: number }) {
  const roman = ['I', 'II', 'III', 'IV', 'V'][step - 1]
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <span style={monoLabel(ink)}>◉ {label}</span>
      <span style={monoLabel(accent)}>STEP {roman} / V</span>
    </Box>
  )
}

// ── CTA button ────────────────────────────────────────────────────────────────
function CtaButton({
  children, onClick, disabled = false, fullWidth = true, style,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  fullWidth?: boolean
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        width: fullWidth ? '100%' : undefined,
        padding: '14px 20px',
        backgroundColor: disabled ? 'transparent' : accent,
        color: disabled ? muted : '#fff',
        border: disabled ? `1.5px solid rgba(216,207,184,.2)` : `1.5px solid ${accent}`,
        borderRadius: 3,
        fontFamily: MONO,
        fontSize: '0.6875rem',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'opacity 0.15s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

// ── Ghost link ────────────────────────────────────────────────────────────────
function GhostLink({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontFamily: MONO,
        fontSize: '0.5625rem',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: muted,
        marginTop: 14,
        display: 'block',
        width: '100%',
        textAlign: 'center',
      }}
    >
      {children}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP I — THE THRESHOLD
// ══════════════════════════════════════════════════════════════════════════════
function StepOne({ onNext, onSignIn }: { onNext: () => void; onSignIn: () => void }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StepHeader label="THE THRESHOLD" step={1} />
      <ProgressBar step={1} />

      {/* Headline */}
      <Box sx={{ mb: 3 }}>
        <h1 style={{
          fontFamily: DISPLAY,
          fontSize: 'clamp(2rem, 9vw, 3.2rem)',
          lineHeight: 0.95,
          textTransform: 'uppercase',
          color: ink,
          margin: 0,
          marginBottom: 4,
        }}>
          PROVE YOU ARE
        </h1>
        <em style={{
          display: 'block',
          fontFamily: MEDIEVAL,
          fontStyle: 'normal',
          fontSize: 'clamp(1.75rem, 7vw, 2.8rem)',
          lineHeight: 1.0,
          color: accent,
        }}>
          one of us.
        </em>
      </Box>

      <p style={{ ...bodyText(), margin: '0 0 24px', maxWidth: '30ch' }}>
        Five marks. Two minutes. We read your listening, draw your sigil, find the others.
      </p>

      {/* Unread sigil */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Box
          sx={{
            width: 220,
            height: 220,
            opacity: 0.3,
            animation: 'sigilPulse 4s ease-in-out infinite',
            position: 'relative',
          }}
        >
          <Sigil
            size={220}
            loading={true}
            centerTop="?"
            centerBottom="UNREAD"
          />
        </Box>
        <em style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '0.75rem',
          color: muted,
          marginTop: 12,
          letterSpacing: '0.04em',
        }}>
          your sigil — awaiting reading.
        </em>
      </Box>

      {/* CTAs */}
      <Box sx={{ mt: 3 }}>
        <CtaButton onClick={onNext}>BEGIN THE RITUAL →</CtaButton>
        <GhostLink onClick={onSignIn}>ALREADY INITIATED · SIGN IN</GhostLink>
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP II — OFFER YOUR LISTENING
// ══════════════════════════════════════════════════════════════════════════════
function StepTwo({
  onNext,
  spotifyLinked,
  setSpotifyLinked,
  lastfmLinked,
  setLastfmLinked,
}: {
  onNext: () => void
  spotifyLinked: boolean
  setSpotifyLinked: (v: boolean) => void
  lastfmLinked: boolean
  setLastfmLinked: (v: boolean) => void
}) {
  const [spotifyError, setSpotifyError] = useState('')
  const [lastfmError, setLastfmError] = useState('')
  const [checkingSpotify, setCheckingSpotify] = useState(false)

  // Check server-side status on mount
  useEffect(() => {
    const init = async () => {
      // Spotify: localStorage flag or API
      const lsFlag = localStorage.getItem('spotify_connected') === 'true'
      if (lsFlag) { setSpotifyLinked(true) }
      if (!lsFlag) {
        try {
          setCheckingSpotify(true)
          const res = await axios.get(`${API_BASE}/api/v1/spotify/status`, { headers: authHeaders() })
          if (res.data.is_connected) {
            setSpotifyLinked(true)
            localStorage.setItem('spotify_connected', 'true')
          }
        } catch { /* ignore */ } finally { setCheckingSpotify(false) }
      }
      // Last.fm: API
      const lfLsFlag = localStorage.getItem('lastfm_connected') === 'true'
      if (lfLsFlag) { setLastfmLinked(true) }
      if (!lfLsFlag) {
        try {
          const res = await axios.get(`${API_BASE}/api/v1/lastfm/status`, { headers: authHeaders() })
          if (res.data.is_connected) {
            setLastfmLinked(true)
            localStorage.setItem('lastfm_connected', 'true')
          }
        } catch { /* ignore */ }
      }
    }
    init()
  }, [setSpotifyLinked, setLastfmLinked])

  const handleSpotifyLink = async () => {
    setSpotifyError('')
    try {
      const res = await axios.get(`${API_BASE}/api/v1/spotify/auth/url`, { headers: authHeaders() })
      const packed = btoa(JSON.stringify({ s: res.data.state, cv: res.data.code_verifier }))
      const url = new URL(res.data.auth_url)
      url.searchParams.set('state', packed)
      window.location.href = url.toString()
    } catch {
      setSpotifyError('◉ ERROR · COULDN\'T REACH SPOTIFY.')
    }
  }

  const handleLastFmLink = async () => {
    setLastfmError('')
    try {
      const res = await axios.get(`${API_BASE}/api/v1/lastfm/auth/url`, { headers: authHeaders() })
      window.location.href = res.data.auth_url
    } catch {
      setLastfmError('◉ ERROR · COULDN\'T REACH LAST.FM.')
    }
  }

  const serviceRowStyle = (linked: boolean): React.CSSProperties => ({
    border: `1.5px solid ${linked ? accent : ink}`,
    borderRadius: 3,
    backgroundColor: paper2,
    padding: '14px 16px',
    marginBottom: 8,
    boxShadow: linked
      ? '2px 2px 0 rgba(196,58,42,.35)'
      : '2px 2px 0 rgba(216,207,184,.1)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  })

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StepHeader label="OFFER YOUR LISTENING" step={2} />
      <ProgressBar step={2} />

      <h2 style={{
        fontFamily: DISPLAY,
        fontSize: '1.375rem',
        textTransform: 'uppercase',
        color: ink,
        margin: '0 0 8px',
      }}>
        READ MY LISTENING.
      </h2>
      <p style={{ ...bodyText(), fontSize: '0.8125rem', margin: '0 0 20px' }}>
        Connect Spotify so we can draw your sigil. Optionally fold in Last.fm for scrobble history — depth, not just recents.
      </p>

      {/* Spotify row */}
      <div style={serviceRowStyle(spotifyLinked)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          {/* Logo */}
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#1ed760',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="11" width="2" height="3" fill="#000" />
              <rect x="5" y="8" width="2" height="6" fill="#000" />
              <rect x="8" y="5" width="2" height="9" fill="#000" />
              <rect x="11" y="3" width="2" height="11" fill="#000" />
            </svg>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: '0.75rem', color: ink, letterSpacing: '0.06em' }}>SPOTIFY</span>
              <span style={{
                fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.1em',
                border: `1px solid ${accent}`, color: accent, padding: '1px 5px', borderRadius: 2,
              }}>REQUIRED</span>
            </Box>
            <em style={{ ...bodyText(ink2), fontSize: '0.75rem', display: 'block', marginTop: 2 }}>
              top artists, genres, ~90 days of play data.
            </em>
          </Box>
          {/* Action */}
          <button
            onClick={spotifyLinked ? undefined : handleSpotifyLink}
            style={{
              fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '6px 12px',
              borderRadius: 3,
              border: 'none',
              cursor: spotifyLinked ? 'default' : 'pointer',
              backgroundColor: spotifyLinked ? accent : ink,
              color: spotifyLinked ? '#fff' : paper,
              flexShrink: 0,
            }}
          >
            {checkingSpotify ? '...' : spotifyLinked ? '◉ LINKED' : 'LINK'}
          </button>
        </Box>
        {spotifyError && (
          <p style={{ ...monoLabel(accent), fontSize: '0.5rem', margin: '8px 0 0' }}>{spotifyError}</p>
        )}
      </div>

      {/* Provenance card */}
      <div style={{
        border: '1.5px dashed rgba(216,207,184,.35)',
        borderRadius: 3,
        padding: '10px 14px',
        marginBottom: 16,
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: '6px 12px', alignItems: 'baseline' }}>
          <span style={{ ...monoLabel(accent), fontSize: '0.5rem' }}>WE READ</span>
          <em style={{ ...bodyText(ink2), fontSize: '0.75rem' }}>Top artists, tracks, genres · last 90/365 days · play counts</em>
          <span style={{ ...monoLabel(accent), fontSize: '0.5rem' }}>WE DON'T</span>
          <em style={{ ...bodyText(ink2), fontSize: '0.75rem' }}>Playlists, friends, non-metal listening, anything we don't need</em>
        </Box>
      </div>

      {/* Last.fm row */}
      <div style={serviceRowStyle(lastfmLinked)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          {/* Logo */}
          <Box sx={{
            width: 32, height: 32, borderRadius: '50%',
            backgroundColor: '#d51007',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: MONO, fontSize: '0.4375rem', color: '#fff', fontWeight: 700, letterSpacing: '-0.02em' }}>last/</span>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span style={{ fontFamily: DISPLAY, fontSize: '0.75rem', color: ink, letterSpacing: '0.06em' }}>LAST.FM</span>
              <span style={{
                fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.1em',
                border: `1px solid ${muted}`, color: muted, padding: '1px 5px', borderRadius: 2,
              }}>OPTIONAL</span>
            </Box>
            <em style={{ ...bodyText(ink2), fontSize: '0.75rem', display: 'block', marginTop: 2 }}>
              years of scrobbles — for the deep-cut sigil.
            </em>
          </Box>
          <button
            onClick={lastfmLinked ? undefined : handleLastFmLink}
            style={{
              fontFamily: MONO, fontSize: '0.5625rem', letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '6px 12px',
              borderRadius: 3,
              border: 'none',
              cursor: lastfmLinked ? 'default' : 'pointer',
              backgroundColor: lastfmLinked ? accent : ink,
              color: lastfmLinked ? '#fff' : paper,
              flexShrink: 0,
            }}
          >
            {lastfmLinked ? '◉ LINKED' : 'LINK'}
          </button>
        </Box>
        {lastfmError && (
          <p style={{ ...monoLabel(accent), fontSize: '0.5rem', margin: '8px 0 0' }}>{lastfmError}</p>
        )}
      </div>

      {/* CTAs */}
      <Box sx={{ mt: 'auto' }}>
        <CtaButton onClick={onNext} disabled={!spotifyLinked}>CONTINUE →</CtaButton>
        {!lastfmLinked && (
          <GhostLink onClick={onNext}>SKIP LAST.FM FOR NOW</GhostLink>
        )}
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP III — MARK YOUR PLACE
// ══════════════════════════════════════════════════════════════════════════════
function StepThree({
  onNext,
  locationGranted,
  setLocationGranted,
  locationDenied,
  setLocationDenied,
  locationPrivacy,
  setLocationPrivacy,
  nearbyCount,
  setNearbyCount,
  cityName,
  setCityName,
}: {
  onNext: () => void
  locationGranted: boolean
  setLocationGranted: (v: boolean) => void
  locationDenied: boolean
  setLocationDenied: (v: boolean) => void
  locationPrivacy: 'city' | 'district' | 'km'
  setLocationPrivacy: (v: 'city' | 'district' | 'km') => void
  nearbyCount: number | null
  setNearbyCount: (v: number | null) => void
  cityName: string
  setCityName: (v: string) => void
}) {
  const [locating, setLocating] = useState(false)

  const handleUseLocation = () => {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 10) / 10
        const lng = Math.round(pos.coords.longitude * 10) / 10
        try {
          // Reverse geocode for city name (best effort)
          try {
            const geo = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            )
            const geoData = await geo.json()
            const city =
              geoData?.address?.city ||
              geoData?.address?.town ||
              geoData?.address?.village ||
              geoData?.address?.county ||
              ''
            setCityName(city)
          } catch { /* ignore geocode errors */ }

          await axios.patch(
            `${API_BASE}/api/v1/users/me`,
            { latitude: lat, longitude: lng },
            { headers: authHeaders() }
          )
          setLocationGranted(true)
          setLocationDenied(false)

          // Fetch nearby count
          try {
            const res = await axios.get(`${API_BASE}/api/v1/globe/nearby`, {
              headers: authHeaders(),
              params: { lat, lng, radius_km: 50 },
            })
            setNearbyCount(res.data?.count ?? res.data?.users?.length ?? null)
          } catch { /* nearby count is best-effort */ }
        } catch { /* patch error */ } finally { setLocating(false) }
      },
      (_err) => {
        setLocationDenied(true)
        setLocating(false)
      },
      { timeout: 10000 }
    )
  }

  const privacyOptions: { key: 'city' | 'district' | 'km'; label: string; sub: string }[] = [
    { key: 'city', label: 'CITY', sub: cityName || 'your city' },
    { key: 'district', label: 'DISTRICT', sub: 'your district' },
    { key: 'km', label: '~KM', sub: '4 km away' },
  ]

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StepHeader label="MARK YOUR PLACE" step={3} />
      <ProgressBar step={3} />

      <h2 style={{
        fontFamily: DISPLAY,
        fontSize: 'clamp(1.75rem, 7vw, 2.8rem)',
        textTransform: 'uppercase',
        color: ink,
        margin: '0 0 4px',
        lineHeight: 0.95,
      }}>
        FIND YOUR
      </h2>
      <em style={{
        fontFamily: MEDIEVAL,
        fontStyle: 'normal',
        fontSize: 'clamp(1.6rem, 6vw, 2.5rem)',
        color: accent,
        display: 'block',
        lineHeight: 1.0,
        marginBottom: 12,
      }}>
        coven near.
      </em>
      <p style={{ ...bodyText(), margin: '0 0 16px', fontSize: '0.8125rem' }}>
        Your exact location lets us surface gigs and metalheads in your district. Stored as one km-rounded point — never tracked.
      </p>

      {/* Map area */}
      <Box sx={{
        flex: 1,
        minHeight: 200,
        border: `1.5px solid ${ink}`,
        borderRadius: '3px',
        position: 'relative',
        overflow: 'hidden',
        mb: 1.5,
        background: `
          repeating-linear-gradient(45deg, rgba(216,207,184,.04) 0 8px, transparent 8px 14px),
          linear-gradient(160deg, #181222 0%, #0d091a 100%)
        `,
      }}>
        {/* Abstract street lines SVG */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.6 }}
          viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice"
        >
          <path d="M-20 120 Q80 100 200 130 Q320 160 420 140" stroke="#3a2f4a" strokeWidth="1.5" fill="none" />
          <path d="M0 80 Q100 60 180 90 Q260 120 400 100" stroke="#3a2f4a" strokeWidth="1" fill="none" />
          <path d="M50 0 Q70 80 90 140 Q110 200 100 260" stroke="#3a2f4a" strokeWidth="1" fill="none" />
          <path d="M200 0 Q220 70 210 130 Q200 190 220 260" stroke="#3a2f4a" strokeWidth="1" fill="none" />
          <path d="M300 0 Q280 90 310 160 Q340 220 320 260" stroke="#3a2f4a" strokeWidth="0.8" fill="none" />
          <path d="M-20 180 Q120 170 200 180 Q280 190 420 175" stroke="#3a2f4a" strokeWidth="0.8" fill="none" />
        </svg>

        {/* Animated pin */}
        <Box sx={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -60%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* Ripple */}
          <Box sx={{
            position: 'absolute',
            width: 60, height: 60,
            borderRadius: '50%',
            border: `1.5px solid rgba(196,58,42,.5)`,
            top: -12, left: -12,
            animation: 'pinRipple 2.6s ease-out infinite',
          }} />
          {/* Pin circle */}
          <Box sx={{
            width: 36, height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(196,58,42,.18)',
            border: `1.5px solid ${accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: accent }} />
          </Box>
          {/* Stem */}
          <Box sx={{ width: 2, height: 12, backgroundColor: accent, opacity: 0.8 }} />
        </Box>

        {/* City label top-right */}
        <Box sx={{
          position: 'absolute', top: 10, right: 10,
          backgroundColor: paper2,
          border: `1px solid rgba(216,207,184,.15)`,
          borderRadius: 1,
          px: 1, py: 0.5,
        }}>
          <span style={monoLabel(locationGranted ? ink : muted)}>
            {locationGranted ? cityName || 'LOCATED' : '◉ LOCATING...'}
          </span>
        </Box>

        {/* Overlay card bottom-left */}
        <Box sx={{
          position: 'absolute', bottom: 10, left: 10,
          backgroundColor: paper2,
          border: `1px solid rgba(216,207,184,.15)`,
          borderRadius: 1,
          px: 1.5, py: 1,
        }}>
          <span style={{ ...monoLabel(ink), display: 'block', marginBottom: 4 }}>YOUR PIN · ± 80 M</span>
          {nearbyCount !== null ? (
            <span style={monoLabel(accent)}>◉ {nearbyCount} NEARBY</span>
          ) : (
            <span style={monoLabel(muted)}>◉ — NEARBY</span>
          )}
        </Box>
      </Box>

      {/* Privacy toggle */}
      <Box sx={{ display: 'flex', gap: '4px', mb: 1 }}>
        {privacyOptions.map(({ key, label, sub }) => (
          <button
            key={key}
            onClick={() => setLocationPrivacy(key)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: `1.5px solid ${locationPrivacy === key ? 'transparent' : ink}`,
              borderRadius: 3,
              backgroundColor: locationPrivacy === key ? ink : paper,
              color: locationPrivacy === key ? paper : ink,
              fontFamily: MONO,
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <span style={{ display: 'block' }}>{label}</span>
            <em style={{
              fontFamily: SERIF,
              fontStyle: 'italic',
              fontSize: '0.625rem',
              color: locationPrivacy === key ? paper3 : muted,
              textTransform: 'none',
              display: 'block',
              marginTop: 2,
              letterSpacing: 0,
            }}>{sub}</em>
          </button>
        ))}
      </Box>

      {/* Privacy card */}
      <div style={{
        border: '1.5px dashed rgba(216,207,184,.25)',
        borderRadius: 3,
        padding: '10px 14px',
        marginBottom: 16,
      }}>
        <span style={{ ...monoLabel(accent), fontSize: '0.5rem', display: 'block', marginBottom: 6 }}>
          DISPLAYED TO OTHERS AS
        </span>
        <em style={{ ...bodyText(ink2), fontSize: '0.75rem' }}>
          Never your pin. Never your address. You can change this any time.
        </em>
      </div>

      {/* Denied banner */}
      {locationDenied && (
        <Box sx={{
          border: `1.5px solid rgba(196,58,42,.4)`,
          borderRadius: 1,
          p: '10px 14px',
          mb: 1.5,
          backgroundColor: 'rgba(196,58,42,.05)',
        }}>
          <span style={monoLabel(accent)}>◉ LOCATION DENIED · YOU CAN STILL CONTINUE.</span>
        </Box>
      )}

      {/* CTAs */}
      <Box sx={{ mt: 'auto' }}>
        {locationGranted ? (
          <CtaButton onClick={onNext}>CONTINUE →</CtaButton>
        ) : locationDenied ? (
          <CtaButton onClick={onNext}>CONTINUE WITHOUT LOCATION →</CtaButton>
        ) : (
          <CtaButton onClick={handleUseLocation} disabled={locating}>
            {locating ? 'LOCATING...' : 'USE THIS LOCATION →'}
          </CtaButton>
        )}
        <GhostLink onClick={onNext}>SKIP · I'LL STAY UNPLACED</GhostLink>
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP IV — SHOW YOUR FACE
// ══════════════════════════════════════════════════════════════════════════════
function StepFour({
  onNext,
  handle,
  setHandle,
  handleStatus,
  setHandleStatus,
}: {
  onNext: () => void
  handle: string
  setHandle: (v: string) => void
  handleStatus: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  setHandleStatus: (v: 'idle' | 'checking' | 'available' | 'taken' | 'invalid') => void
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleFileSelect = async (file: File) => {
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await axios.post(`${API_BASE}/api/v1/users/me/avatar`, form, {
        headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' },
      })
    } catch { /* avatar upload failure is non-blocking */ } finally { setUploading(false) }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  // Debounced handle check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!handle) { setHandleStatus('idle'); return }
    debounceRef.current = setTimeout(async () => {
      setHandleStatus('checking')
      try {
        const res = await axios.get(`${API_BASE}/api/v1/users/handle/check?q=${handle}`, {
          headers: authHeaders(),
        })
        setHandleStatus(res.data.status)
      } catch { setHandleStatus('idle') }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [handle, setHandleStatus])

  const handleStatusText = () => {
    if (handleStatus === 'checking') return { text: '◉ CHECKING...', color: muted }
    if (handleStatus === 'available') return { text: '◉ AVAILABLE · LOCKED FOR YOU', color: accent }
    if (handleStatus === 'taken') return { text: '◉ TAKEN · CHOOSE ANOTHER', color: accent }
    if (handleStatus === 'invalid') return { text: '◉ INVALID · 3–24 LOWERCASE LETTERS, NUMBERS, UNDERSCORE', color: muted }
    return { text: '', color: muted }
  }

  const hs = handleStatusText()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StepHeader label="SHOW YOUR FACE" step={4} />
      <ProgressBar step={4} />

      <h2 style={{
        fontFamily: DISPLAY,
        fontSize: 'clamp(1.75rem, 7vw, 2.8rem)',
        textTransform: 'uppercase',
        color: ink,
        margin: '0 0 4px',
        lineHeight: 0.95,
      }}>
        A FACE
      </h2>
      <em style={{
        fontFamily: MEDIEVAL,
        fontStyle: 'normal',
        fontSize: 'clamp(1.5rem, 5.5vw, 2.3rem)',
        color: accent,
        display: 'block',
        lineHeight: 1.0,
        marginBottom: 12,
      }}>
        or a mask.
      </em>
      <p style={{ ...bodyText(), margin: '0 0 20px', fontSize: '0.8125rem' }}>
        Optional. A portrait makes you human; a band shirt does too. Whatever you give, give one thing.
      </p>

      {/* Portrait frame */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Box sx={{
          width: 200, height: 200,
          borderRadius: '50%',
          border: `1.5px dashed ${ink}`,
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${paper3} 0%, ${paper} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Photo preview or placeholder */}
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPreview}
              alt="Portrait preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontFamily: DISPLAY, fontSize: '2.25rem', color: accent }}>+</span>
          )}

          {/* Corner markers */}
          {[
            { top: 0, left: 0, borderTop: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` },
            { top: 0, right: 0, borderTop: `2px solid ${accent}`, borderRight: `2px solid ${accent}` },
            { bottom: 0, left: 0, borderBottom: `2px solid ${accent}`, borderLeft: `2px solid ${accent}` },
            { bottom: 0, right: 0, borderBottom: `2px solid ${accent}`, borderRight: `2px solid ${accent}` },
          ].map((style, i) => (
            <Box key={i} sx={{
              position: 'absolute',
              width: 22, height: 22,
              ...style,
            }} />
          ))}
        </Box>
      </Box>

      {/* Upload buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFileChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={onFileChange} />
        {[
          { label: '▤ FROM LIBRARY', ref: fileInputRef },
          { label: '⊙ CAMERA', ref: cameraInputRef },
        ].map(({ label, ref }) => (
          <button
            key={label}
            onClick={() => ref.current?.click()}
            style={{
              flex: 1,
              padding: '10px 8px',
              backgroundColor: paper2,
              border: `1px solid ${ink}`,
              borderRadius: 3,
              color: ink,
              fontFamily: MONO,
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: `2px 2px 0 rgba(216,207,184,.1)`,
            }}
          >
            {label}
          </button>
        ))}
      </Box>

      {/* Handle input */}
      <Box sx={{ mb: 1 }}>
        <span style={{ ...monoLabel(), fontSize: '0.5rem', display: 'block', marginBottom: 8 }}>
          YOUR HANDLE · REQUIRED
        </span>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: paper2,
            border: `1.5px solid ${handleStatus === 'available' ? accent : handleStatus === 'taken' ? accent : ink}`,
            borderRadius: 3,
            color: ink,
            fontFamily: MEDIEVAL,
            fontSize: '1.375rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          placeholder="your_handle"
          autoComplete="off"
          spellCheck={false}
        />
        {hs.text && (
          <span style={{ ...monoLabel(hs.color), fontSize: '0.4375rem', display: 'block', marginTop: 6 }}>
            {hs.text}
          </span>
        )}
      </Box>

      {/* CTAs */}
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <CtaButton onClick={onNext} disabled={handleStatus !== 'available'}>CONTINUE →</CtaButton>
        <GhostLink onClick={onNext}>SKIP PHOTO · LET MY SIGIL SPEAK</GhostLink>
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  STEP V — THE READING
// ══════════════════════════════════════════════════════════════════════════════
function StepFive({
  handle,
  cityName,
  sigilData,
}: {
  handle: string
  cityName: string
  sigilData: { genres: string[]; artists: string[] } | null
}) {
  const router = useRouter()
  const { user } = useUser()
  const [sharing, setSharing] = useState(false)

  const handleEnter = async () => {
    try {
      await axios.post(`${API_BASE}/api/v1/users/me/onboarding-complete`, {}, { headers: authHeaders() })
    } catch { /* non-blocking */ }
    router.push('/feed')
  }

  const handleShare = async () => {
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My Grimr Sigil', text: `${handle} — Metal-ID`, url: window.location.origin })
      }
    } catch { /* ignore */ } finally { setSharing(false) }
  }

  const genres = sigilData?.genres ?? []
  const artists = sigilData?.artists ?? []
  const displayHandle = handle || user?.handle || 'initiate'
  const avatarInitial = (displayHandle[0] || 'G').toUpperCase()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <StepHeader label="THE READING" step={5} />
      <ProgressBar step={5} />

      {/* Mini user card */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: '50%',
          backgroundColor: paper3,
          border: `1.5px solid ${ink}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {user?.profile_image_url || user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.profile_image_url || user.avatar_url}
              alt=""
              style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontFamily: MEDIEVAL, fontSize: '1.25rem', color: ink }}>{avatarInitial}</span>
          )}
        </Box>
        <Box>
          <span style={{ fontFamily: MEDIEVAL, fontSize: '1.125rem', color: ink, display: 'block' }}>
            {displayHandle}
          </span>
          <span style={{ ...monoLabel(), fontSize: '0.4375rem' }}>
            {cityName ? `${cityName} · ` : ''}INITIATE
          </span>
        </Box>
      </Box>

      {/* Sigil */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <Box sx={{ width: 230, height: 230 }}>
          <Sigil
            size={230}
            loading={genres.length === 0}
            genres={genres.length > 0 ? genres : undefined}
            artists={artists.length > 0 ? artists : undefined}
            centerTop={displayHandle.slice(0, 6).toUpperCase()}
            centerBottom="METAL-ID"
          />
        </Box>

        {/* Meta row */}
        <Box sx={{ display: 'flex', gap: 2, mt: 1.5, mb: 2 }}>
          {[
            `LVL VII`,
            `RARITY 84%`,
            `PURITY 91%`,
          ].map((label) => (
            <span key={label} style={monoLabel(ink2)}>{label}</span>
          ))}
        </Box>

        {/* Genre chips */}
        {genres.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
            {genres.slice(0, 3).map((g, i) => (
              <span
                key={g}
                style={{
                  fontFamily: MONO,
                  fontSize: '0.5rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 2,
                  backgroundColor: i === 0 ? accent : 'transparent',
                  color: i === 0 ? '#fff' : ink2,
                  border: i === 0 ? 'none' : `1px solid rgba(216,207,184,.3)`,
                }}
              >
                {g} {i === 0 ? '· PURIST' : ''}
              </span>
            ))}
          </Box>
        )}

        <em style={{
          fontFamily: SERIF,
          fontStyle: 'italic',
          fontSize: '0.8125rem',
          color: muted,
          textAlign: 'center',
        }}>
          five marks made. you are read.
        </em>
      </Box>

      {/* CTAs */}
      <Box sx={{ mt: 2 }}>
        <CtaButton onClick={handleEnter}>ENTER THE FEED →</CtaButton>
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '12px 20px',
            backgroundColor: 'transparent',
            color: ink,
            border: `1.5px solid ${ink}`,
            borderRadius: 3,
            fontFamily: MONO,
            fontSize: '0.6875rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          ↗ SHARE MY SIGIL
        </button>
      </Box>
    </Box>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
//  ROOT PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function OnboardingPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()

  const [step, setStep] = useState(1)
  const [spotifyLinked, setSpotifyLinked] = useState(false)
  const [lastfmLinked, setLastfmLinked] = useState(false)
  const [locationGranted, setLocationGranted] = useState(false)
  const [locationDenied, setLocationDenied] = useState(false)
  const [locationPrivacy, setLocationPrivacy] = useState<'city' | 'district' | 'km'>('district')
  const [nearbyCount, setNearbyCount] = useState<number | null>(null)
  const [cityName, setCityName] = useState('')
  const [handle, setHandle] = useState('')
  const [handleStatus, setHandleStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
  const [sigilData, setSigilData] = useState<{ genres: string[]; artists: string[] } | null>(null)

  // Routing guard + initial state
  useEffect(() => {
    if (isLoading) return
    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth/login'); return }
    if (user?.onboarding_complete) { router.push('/feed'); return }
    // Pre-fill handle
    if (user?.handle) setHandle(user.handle)
    // Pre-set spotify linked
    if (localStorage.getItem('spotify_connected') === 'true') setSpotifyLinked(true)
    if (localStorage.getItem('lastfm_connected') === 'true') setLastfmLinked(true)
  }, [user, isLoading, router])

  // Load sigil data when reaching step 5
  useEffect(() => {
    if (step !== 5) return
    const load = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/v1/sigil`, { headers: authHeaders() })
        setSigilData(res.data)
      } catch { /* sigil load failure is non-blocking */ }
    }
    load()
  }, [step])

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 5)), [])

  if (isLoading) {
    return (
      <Box sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: paper,
      }}>
        <span style={monoLabel()}>PREPARING THE RITUAL...</span>
      </Box>
    )
  }

  return (
    <>
      <GlobalStyles styles={`
        @keyframes sigilPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.5; }
        }
        @keyframes pinRipple {
          0% { transform: scale(0.4); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `} />

      <Box sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: paper,
        color: ink,
        maxWidth: 480,
        mx: 'auto',
        px: 2,
        pt: '18px',
        pb: 3,
        boxSizing: 'border-box',
      }}>
        {step === 1 && (
          <StepOne
            onNext={nextStep}
            onSignIn={() => router.push('/auth/login')}
          />
        )}
        {step === 2 && (
          <StepTwo
            onNext={nextStep}
            spotifyLinked={spotifyLinked}
            setSpotifyLinked={setSpotifyLinked}
            lastfmLinked={lastfmLinked}
            setLastfmLinked={setLastfmLinked}
          />
        )}
        {step === 3 && (
          <StepThree
            onNext={nextStep}
            locationGranted={locationGranted}
            setLocationGranted={setLocationGranted}
            locationDenied={locationDenied}
            setLocationDenied={setLocationDenied}
            locationPrivacy={locationPrivacy}
            setLocationPrivacy={setLocationPrivacy}
            nearbyCount={nearbyCount}
            setNearbyCount={setNearbyCount}
            cityName={cityName}
            setCityName={setCityName}
          />
        )}
        {step === 4 && (
          <StepFour
            onNext={nextStep}
            handle={handle}
            setHandle={setHandle}
            handleStatus={handleStatus}
            setHandleStatus={setHandleStatus}
          />
        )}
        {step === 5 && (
          <StepFive
            handle={handle}
            cityName={cityName}
            sigilData={sigilData}
          />
        )}
      </Box>
    </>
  )
}
