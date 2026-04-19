'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import Sigil from '@/app/components/Sigil'
import { useUser } from '@/app/context/UserContext'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

interface SigilData {
  genres: string[]
  artists: string[]
}

export default function SigilPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  const [data, setData] = useState<SigilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/auth/login'); return }

    const token = localStorage.getItem('access_token')
    if (!token) { router.push('/auth/login'); return }

    fetchSigil(token)
  }, [user, userLoading, router])

  const fetchSigil = (token: string) => {
    setLoading(true)
    axios
      .get(`${API_BASE}/api/v1/sigil`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err.response?.status === 401) {
          router.push('/auth/login')
        } else {
          setData({ genres: [], artists: [] })
        }
      })
      .finally(() => setLoading(false))
  }

  const handleSync = () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    setSyncing(true)
    axios
      .post(`${API_BASE}/api/v1/sigil/sync`, {}, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setTimeout(() => {
        fetchSigil(token)
        setSyncing(false)
      }, 4000))
      .catch(() => setSyncing(false))
  }

  if (userLoading || loading) return (
    <>
      <Navigation />
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
      </Box>
    </>
  )

  const hasData = (data?.artists.length ?? 0) > 0
  const year = user?.created_at ? new Date(user.created_at).getFullYear() : '—'

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 12 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' }}>
            Metal-ID · {new Date().getFullYear()}
          </span>
          <Box
            component="button"
            onClick={handleSync}
            disabled={syncing}
            sx={{ background: 'none', border: 'none', cursor: syncing ? 'default' : 'pointer', p: 0 }}
          >
            <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: syncing ? 'var(--muted)' : 'var(--accent)' }}>
              {syncing ? '↻ Syncing…' : '↻ Sync'}
            </span>
          </Box>
        </Box>

        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center', mb: 0.5 }}>
          — the reading of —
        </Typography>
        <Typography variant="h4" sx={{ textAlign: 'center', mb: 2.5, fontSize: '1.35rem', letterSpacing: '0.04em' }}>
          {user?.handle}
        </Typography>

        {/* Sigil */}
        <Box sx={{ width: '100%', aspectRatio: '1', maxWidth: 320, mx: 'auto', mb: 2.5 }}>
          <Sigil
            size={300}
            loading={!hasData}
            genres={data?.genres.length ? data.genres : undefined}
            artists={data?.artists.length ? data.artists : undefined}
            centerTop={user?.handle?.toUpperCase() ?? '—'}
            centerBottom={`Est. ${year} · Grimr`}
          />
        </Box>

        {/* Genre chips */}
        {data?.genres.length ? (
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center', mb: 2.5 }}>
            {data.genres.map((g) => (
              <Box key={g} sx={{
                border: '1px solid rgba(216,207,184,0.25)', borderRadius: '3px',
                px: 1, py: 0.25,
              }}>
                <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'var(--muted)' }}>{g}</span>
              </Box>
            ))}
          </Box>
        ) : null}

        {/* No data callout */}
        {!hasData && (
          <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', p: '14px 16px', mb: 2, backgroundColor: '#120e18' }}>
            <span style={{ ...mono, fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 8 }}>
              Sigil · Unread
            </span>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)', mb: 1.5, lineHeight: 1.5 }}>
              Connect Spotify or Last.fm so we can read your Metal-DNA and complete the sigil.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box component="button" onClick={() => router.push('/spotify/connect')} sx={{ flex: 1, py: 1, border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', '&:hover': { borderColor: 'rgba(216,207,184,0.6)' } }}>
                ◉ Spotify
              </Box>
              <Box component="button" onClick={() => router.push('/lastfm/connect')} sx={{ flex: 1, py: 1, border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', '&:hover': { borderColor: 'rgba(216,207,184,0.6)' } }}>
                ◉ Last.fm
              </Box>
            </Box>
          </Box>
        )}

        {/* Anatomy */}
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', backgroundColor: '#120e18', overflow: 'hidden' }}>
          {[
            { label: 'Outer Ring · Genres', desc: data?.genres.length ? data.genres.join(' · ') : 'Your top metal subgenres from listening data' },
            { label: 'Inner Points · Artists', desc: data?.artists.length ? data.artists.join(' · ') : 'Your most-played artists' },
            { label: 'Heptagram · Core', desc: 'Calculated from play-depth × rarity × consistency' },
          ].map((row, i) => (
            <Box key={row.label} sx={{ p: '10px 14px', borderTop: i > 0 ? '1px solid rgba(216,207,184,0.08)' : 'none' }}>
              <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', display: 'block', marginBottom: 4 }}>
                {row.label}
              </span>
              <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', lineHeight: 1.4 }}>
                {row.desc}
              </Typography>
            </Box>
          ))}
        </Box>

      </Box>
    </>
  )
}
