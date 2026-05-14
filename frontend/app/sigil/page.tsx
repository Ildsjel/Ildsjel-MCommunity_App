'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, GlobalStyles } from '@mui/material'
import Sigil from '@/app/components/Sigil'
import BottomNav from '@/app/components/BottomNav'
import { useUser } from '@/app/context/UserContext'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Design tokens (Sigil dark palette) ───────────────────────────────────────
const INK1  = '#14101D'
const INK2  = '#1B1626'
const INK3  = '#251F31'
const INK4  = '#36304A'
const BONE  = '#EDE4D3'
const BONE2 = '#C7BEA9'
const BONE3 = '#8B8298'
const BONE4 = '#5A5470'
const BLOOD      = '#A83A3A'
const BLOOD2     = '#C75050'
const BLOOD3     = '#6E2424'
const BLOOD_FAINT = 'rgba(168,58,58,0.10)'

// ── Type shorthands ───────────────────────────────────────────────────────────
const DISPLAY = '"Archivo Black", sans-serif'
const SERIF   = '"EB Garamond", serif'
const MONO    = '"JetBrains Mono", monospace'
const MEDIEVAL = '"UnifrakturCook", serif'

function mono(color = BONE3, size = '0.5625rem'): React.CSSProperties {
  return { fontFamily: MONO, fontSize: size, letterSpacing: '0.14em', textTransform: 'uppercase', color }
}
function monoRed(size = '0.5625rem'): React.CSSProperties {
  return { fontFamily: MONO, fontSize: size, letterSpacing: '0.14em', textTransform: 'uppercase', color: BLOOD2 }
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
function IconBack() {
  return <svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <path d="M15 6l-6 6 6 6" stroke={BONE} strokeWidth={1.4} strokeLinecap="square" />
  </svg>
}
function IconShare() {
  return <svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <path d="M12 4v12M12 4L8 8M12 4l4 4M5 14v5h14v-5" stroke={BONE} strokeWidth={1.3} strokeLinecap="square" />
  </svg>
}
function IconRefresh() {
  return <svg width={13} height={13} viewBox="0 0 24 24" fill="none">
    <path d="M4 10a8 8 0 0 1 14-4M20 14a8 8 0 0 1-14 4M18 4v4h-4M6 20v-4h4" stroke="currentColor" strokeWidth={1.6} strokeLinecap="square" />
  </svg>
}

// ── Data ──────────────────────────────────────────────────────────────────────
interface SigilData {
  genres: string[]
  artists: string[]
  total_artists: number
}

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function SigilPage() {
  const router = useRouter()
  const { user, isLoading: userLoading } = useUser()
  const [data, setData]     = useState<SigilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [entered, setEntered] = useState(false)   // fullscreen immersive state

  useEffect(() => {
    if (userLoading) return
    if (!user) { router.push('/auth/login'); return }
    fetchSigil()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading])

  const fetchSigil = () => {
    setLoading(true)
    axios
      .get(`${API_BASE}/api/v1/sigil`, { headers: authHeaders() })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err.response?.status === 401) router.push('/auth/login')
        else setData({ genres: [], artists: [], total_artists: 0 })
      })
      .finally(() => setLoading(false))
  }

  const handleSync = () => {
    if (syncing) return
    setSyncing(true)
    setSyncMsg('')
    axios
      .post(`${API_BASE}/api/v1/sigil/sync`, {}, { headers: authHeaders() })
      .then(() => {
        setSyncMsg('◉ SYNCING — CHECK BACK IN A FEW SECONDS')
        setTimeout(() => { fetchSigil(); setSyncing(false); setSyncMsg('') }, 5000)
      })
      .catch(() => { setSyncing(false); setSyncMsg('◉ SYNC FAILED') })
  }

  const hasData   = (data?.genres.length ?? 0) > 0
  const handle    = user?.handle ?? ''
  const year      = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()
  const est       = `Est. ${year} · Grimr`
  const dominant  = data?.genres[0] ?? ''
  const totalArtists = data?.total_artists ?? data?.artists.length ?? 0
  const genreCount   = data?.genres.length ?? 0

  return (
    <>
      {/* ── Global styles for this page ───────────────────────────────── */}
      <GlobalStyles styles={`
        @keyframes sigilGridScroll {
          0% { background-position: 0 0; }
          100% { background-position: 48px 48px; }
        }
      `} />

      {/* ── Full-bleed dark container ─────────────────────────────────── */}
      <Box sx={{
        minHeight: '100dvh',
        background: `radial-gradient(ellipse at 50% 30%, #1B1626 0%, #14101D 60%, #0B0814 100%)`,
        color: BONE,
        position: 'relative',
        pb: '90px',
      }}>

        {/* Grid overlay */}
        <Box sx={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(237,228,211,0.035) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(237,228,211,0.035) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }} />

        {/* ── Top gradient fade (makes top bar readable over sigil) ──── */}
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 160,
          background: `linear-gradient(180deg, rgba(11,8,20,0.92) 0%, transparent 100%)`,
          pointerEvents: 'none', zIndex: 5,
        }} />

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <Box sx={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
          height: 52, display: 'flex', alignItems: 'center', px: 2,
        }}>
          <Box component="button" onClick={() => router.back()} sx={{
            background: 'none', border: 'none', cursor: 'pointer', p: 0,
            display: 'flex', alignItems: 'center',
          }}>
            <IconBack />
          </Box>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <span style={{
              fontFamily: MEDIEVAL,
              fontWeight: 700, fontSize: 26,
              color: BONE, letterSpacing: '0.01em',
            }}>Grimr</span>
          </Box>
          <Box component="button" sx={{
            background: 'none', border: 'none', cursor: 'pointer', p: 0,
            display: 'flex', alignItems: 'center',
          }}>
            <IconShare />
          </Box>
        </Box>

        {/* ── Sub-header: METAL-ID + sync ──────────────────────────────── */}
        <Box sx={{
          position: 'fixed', top: 52, left: 0, right: 0, zIndex: 9,
          px: '20px', py: '8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={mono(BONE3, '0.5rem')}>METAL-ID · {new Date().getFullYear()}</span>
          <button onClick={handleSync} disabled={syncing} style={{
            fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.18em',
            textTransform: 'uppercase', color: syncing ? BONE4 : BLOOD2,
            background: 'transparent', border: 'none', cursor: syncing ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 5, padding: 0,
          }}>
            <IconRefresh /> {syncing ? 'SYNCING…' : 'SYNC'}
          </button>
        </Box>

        {/* ── Sync status message ───────────────────────────────────────── */}
        {syncMsg && (
          <Box sx={{
            position: 'fixed', top: 92, left: 0, right: 0, zIndex: 8,
            textAlign: 'center', px: 2,
          }}>
            <span style={mono(BLOOD2, '0.4375rem')}>{syncMsg}</span>
          </Box>
        )}

        {/* ── Page content (scrollable) ─────────────────────────────────── */}
        <Box sx={{ pt: '110px', px: 0, position: 'relative', zIndex: 1 }}>

          {loading ? (
            // ── Loading skeleton ─────────────────────────────────────────
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
              <span style={mono(BONE4, '0.5rem')}>◉ READING THE SEAL…</span>
              <Box sx={{ mt: 3, width: 280, height: 280, opacity: 0.3 }}>
                <Sigil size={280} loading />
              </Box>
            </Box>
          ) : hasData ? (
            // ══════════════════════════════════════════════════════════════
            // FULL SIGIL STATE
            // ══════════════════════════════════════════════════════════════
            <>
              {/* Handle + italic decor */}
              <Box sx={{ textAlign: 'center', px: 2, mb: 1 }}>
                <em style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.8125rem', color: BONE3 }}>
                  — the reading of —
                </em>
                <Box sx={{
                  fontFamily: DISPLAY, fontSize: 'clamp(1.4rem, 6vw, 1.9rem)',
                  color: BONE, letterSpacing: '0.06em',
                  textTransform: 'uppercase', mt: '4px', lineHeight: 1,
                }}>
                  {handle}
                </Box>
              </Box>

              {/* Sigil canvas */}
              <Box sx={{
                height: 420, position: 'relative', mx: 0,
                // Remove `showCenterSeal` — the handle + decor is shown above
              }}>
                <Sigil
                  size={402}
                  genres={data?.genres ?? []}
                  artists={data?.artists ?? []}
                  handle={handle}
                  est={est}
                  compact
                  style={{ width: '100%', height: '100%' }}
                />
              </Box>

              {/* Genre chips */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px', px: '20px', mb: '18px' }}>
                {(data?.genres ?? []).map((g, i) => (
                  <Box key={g} sx={{
                    border: `1px solid ${i === 0 ? BLOOD : INK4}`,
                    padding: '6px 11px',
                    fontFamily: MONO,
                    fontSize: '0.5625rem',
                    letterSpacing: '0.18em',
                    color: i === 0 ? BONE : BONE3,
                    textTransform: 'uppercase',
                    borderRadius: '2px',
                    background: i === 0 ? BLOOD_FAINT : 'transparent',
                    cursor: 'default',
                  }}>
                    {g}
                  </Box>
                ))}
              </Box>

              {/* Stats grid */}
              <Box sx={{
                mx: '16px', mb: '14px',
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '1px', background: INK4, border: `1px solid ${INK4}`,
              }}>
                {[
                  [String(totalArtists), 'ARTISTS'],
                  [String(genreCount), 'GENRES'],
                  ['—', 'NICHE'],
                ].map(([v, l]) => (
                  <Box key={l} sx={{ background: INK1, padding: '10px 4px', textAlign: 'center' }}>
                    <Box sx={{
                      fontFamily: DISPLAY, fontSize: '1.375rem',
                      color: BONE, lineHeight: 1,
                    }}>{v}</Box>
                    <Box sx={{ ...mono(BONE4, '0.5rem'), mt: '2px' }}>{l}</Box>
                  </Box>
                ))}
              </Box>

              {/* Dominant cluster strip */}
              {dominant && (
                <Box sx={{
                  mx: '16px', mb: '14px',
                  border: `1px solid ${INK4}`, background: INK3,
                  padding: '12px 14px',
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Box>
                      <Box sx={{ ...monoRed('0.5rem'), mb: '4px' }}>DOMINANT</Box>
                      <Box sx={{
                        fontFamily: DISPLAY, fontSize: '1.25rem',
                        color: BONE, letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        {dominant}
                      </Box>
                    </Box>
                    <Box sx={{
                      fontFamily: DISPLAY, fontSize: '1.625rem',
                      color: BLOOD2, lineHeight: 1,
                    }}>
                      #{1}
                    </Box>
                  </Box>
                  {/* Weight bar across genres */}
                  <Box sx={{ mt: '10px', display: 'flex', gap: '3px', height: '3px' }}>
                    {(data?.genres ?? []).map((g, i) => (
                      <Box key={g} sx={{
                        flex: genreCount - i,
                        height: '100%',
                        background: i === 0 ? BLOOD2 : BONE4,
                        opacity: i === 0 ? 1 : 0.4,
                      }} />
                    ))}
                  </Box>
                </Box>
              )}

              {/* CTA button */}
              <Box sx={{ px: '16px', mb: '18px' }}>
                <button
                  onClick={() => setEntered(true)}
                  style={{
                    width: '100%',
                    padding: '13px 0',
                    fontFamily: MONO,
                    fontSize: '0.5625rem',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    color: BONE,
                    background: BLOOD3,
                    border: `1px solid ${BLOOD}`,
                    borderRadius: '2px',
                    cursor: 'pointer',
                  }}>
                  enter the sigil →
                </button>
              </Box>

              {/* Anatomy cards */}
              <Box sx={{ px: '16px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {[
                  {
                    label: 'OUTER RING · GENRES',
                    body: (data?.genres ?? []).join(' · ') || 'Your top metal subgenres from listening data',
                  },
                  {
                    label: 'INNER POINTS · TOP SEVEN',
                    body: (data?.artists ?? []).join(' · ') || 'Your most-played artists',
                  },
                  {
                    label: 'HEPTAGRAM · CORE',
                    body: 'Calculated from play-depth × rarity × consistency. The centre holds your most-channelled selves.',
                  },
                ].map((card) => (
                  <Box key={card.label} sx={{
                    border: `1px solid ${INK4}`,
                    background: `rgba(27,22,38,0.4)`,
                    padding: '14px 16px',
                    borderRadius: '2px',
                  }}>
                    <Box sx={{ ...monoRed(), mb: '8px' }}>{card.label}</Box>
                    <em style={{
                      fontFamily: SERIF,
                      fontStyle: 'italic',
                      fontSize: '0.875rem',
                      lineHeight: 1.5,
                      color: BONE2,
                    }}>
                      {card.body}
                    </em>
                  </Box>
                ))}
              </Box>

              {/* Sync source */}
              <Box sx={{ textAlign: 'center', mt: '14px', mb: '8px' }}>
                <span style={mono(BONE4, '0.4375rem')}>
                  SOURCE · SPOTIFY + LAST.FM
                </span>
              </Box>
            </>
          ) : (
            // ══════════════════════════════════════════════════════════════
            // COLD START — "UNFORGED"
            // ══════════════════════════════════════════════════════════════
            <Box sx={{ textAlign: 'center', px: '24px' }}>

              {/* Empty sigil */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, mb: 3 }}>
                <Box sx={{
                  width: 280, height: 280,
                  position: 'relative',
                  background: `radial-gradient(ellipse at center, #1B1626 0%, #14101D 70%, #0B0814 100%)`,
                }}>
                  <Sigil size={280} loading />
                </Box>
              </Box>

              <Box sx={{ ...monoRed('0.625rem'), mb: '4px' }}>STATUS · UNFORGED</Box>
              <em style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.8125rem', color: BONE3 }}>
                — the reading is incomplete —
              </em>

              <Box sx={{
                fontFamily: DISPLAY,
                fontSize: 'clamp(1.4rem, 7vw, 1.75rem)',
                color: BONE, textTransform: 'uppercase',
                letterSpacing: '0.04em', mt: '14px', lineHeight: 1.1,
              }}>
                your sigil<br />is not yet drawn
              </Box>

              <em style={{
                fontFamily: SERIF, fontStyle: 'italic',
                fontSize: '0.8125rem', color: BONE3,
                display: 'block', marginTop: '14px', lineHeight: 1.55,
              }}>
                Connect Spotify or Last.fm so we can read your Metal-DNA
                and forge the sigil.
              </em>

              {/* Connect buttons */}
              <Box sx={{ display: 'flex', gap: '8px', mt: '20px', mb: '24px' }}>
                <button
                  onClick={() => router.push('/spotify/connect')}
                  style={{
                    flex: 1, padding: '13px 0',
                    fontFamily: MONO, fontSize: '0.5rem',
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: BONE, background: BLOOD3,
                    border: `1px solid ${BLOOD}`, borderRadius: '2px', cursor: 'pointer',
                  }}>
                  ◉ CONNECT SPOTIFY
                </button>
                <button
                  onClick={() => router.push('/lastfm/connect')}
                  style={{
                    flex: 1, padding: '13px 0',
                    fontFamily: MONO, fontSize: '0.5rem',
                    letterSpacing: '0.18em', textTransform: 'uppercase',
                    color: BONE2, background: 'transparent',
                    border: `1px solid ${INK4}`, borderRadius: '2px', cursor: 'pointer',
                  }}>
                  ◉ LAST.FM
                </button>
              </Box>

              {/* Sync button */}
              <button
                onClick={handleSync}
                disabled={syncing}
                style={{
                  width: '100%', padding: '11px 0',
                  fontFamily: MONO, fontSize: '0.5rem',
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: BONE3, background: 'transparent',
                  border: `1px solid ${INK4}`, borderRadius: '2px',
                  cursor: syncing ? 'default' : 'pointer',
                }}>
                {syncing ? '↻ SYNCING…' : '↻ RE-SYNC SPOTIFY'}
              </button>
              <Box sx={{ ...mono(BONE4, '0.4375rem'), mt: '10px' }}>
                NEXT AUTO-SYNC · IN 7 DAYS
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      {/* Standard bottom nav */}
      <BottomNav />

      {/* ═══════════════════════════════════════════════════════════════════════
          FULLSCREEN IMMERSIVE OVERLAY — "Enter the Sigil"
          ═══════════════════════════════════════════════════════════════════════ */}
      {entered && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'radial-gradient(ellipse at 50% 40%, #1B1626 0%, #0B0814 70%)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          // fade-in
          animation: 'sigilEnter 0.4s ease forwards',
          '@keyframes sigilEnter': {
            from: { opacity: 0 },
            to:   { opacity: 1 },
          },
        }}>

          {/* Dot grid */}
          <Box sx={{
            position: 'fixed', inset: 0, pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(to right, rgba(237,228,211,0.025) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(237,228,211,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
          }} />

          {/* Top bar */}
          <Box sx={{
            position: 'sticky', top: 0, zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: '16px', height: 52,
            background: 'linear-gradient(180deg, rgba(11,8,20,0.95) 0%, transparent 100%)',
          }}>
            <button
              onClick={() => setEntered(false)}
              style={{
                fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: BONE3,
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                <path d="M15 6l-6 6 6 6" stroke={BONE3} strokeWidth={1.5} strokeLinecap="square" />
              </svg>
              retreat
            </button>
            <span style={{ fontFamily: MEDIEVAL, fontWeight: 700, fontSize: 22, color: BONE }}>
              Grimr
            </span>
            <span style={{ fontFamily: MONO, fontSize: '0.4375rem', letterSpacing: '0.14em', color: BONE4 }}>
              L1 · SEAL
            </span>
          </Box>

          {/* ── Sigil — large, centered, slow pulse ──────────────────────────── */}
          <Box sx={{
            flex: '0 0 auto',
            display: 'flex', justifyContent: 'center',
            px: 0, pt: 1, pb: 2,
            position: 'relative', zIndex: 1,
          }}>
            <Box sx={{
              animation: 'sigilPulse 8s ease-in-out infinite',
              '@keyframes sigilPulse': {
                '0%,100%': { filter: 'drop-shadow(0 0 14px rgba(168,58,58,0.25))' },
                '50%':     { filter: 'drop-shadow(0 0 28px rgba(168,58,58,0.45))' },
              },
            }}>
              <Sigil
                size={Math.min(typeof window !== 'undefined' ? window.innerWidth : 420, 460)}
                genres={data?.genres ?? []}
                artists={data?.artists ?? []}
                handle={handle}
                est={est}
              />
            </Box>
          </Box>

          {/* ── Artist roster ─────────────────────────────────────────────────── */}
          <Box sx={{ px: '20px', pb: '32px', position: 'relative', zIndex: 1 }}>

            <Box sx={{
              display: 'flex', alignItems: 'center', gap: '10px', mb: '14px',
            }}>
              <Box sx={{ flex: 1, height: '1px', background: `rgba(90,84,112,0.4)` }} />
              <span style={{ fontFamily: MONO, fontSize: '0.4375rem', letterSpacing: '0.2em', color: BONE4 }}>
                THE SEVEN
              </span>
              <Box sx={{ flex: 1, height: '1px', background: `rgba(90,84,112,0.4)` }} />
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {(data?.artists ?? []).map((artist, i) => (
                <Box key={artist} sx={{
                  display: 'flex', alignItems: 'center',
                  padding: '9px 14px',
                  background: i === 0 ? `rgba(168,58,58,0.08)` : 'rgba(27,22,38,0.4)',
                  border: `1px solid ${i === 0 ? BLOOD3 : INK4}`,
                  borderRadius: '2px',
                }}>
                  <span style={{
                    fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.12em',
                    color: i === 0 ? BLOOD2 : BONE4,
                    minWidth: '1.6rem',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{
                    fontFamily: DISPLAY, fontSize: '0.9375rem',
                    color: i === 0 ? BONE : BONE2,
                    flex: 1, letterSpacing: '0.02em',
                  }}>
                    {artist}
                  </span>
                  {i === 0 && (
                    <span style={{
                      fontFamily: MONO, fontSize: '0.4375rem', letterSpacing: '0.16em',
                      color: BLOOD2, textTransform: 'uppercase',
                    }}>
                      DOMINANT
                    </span>
                  )}
                </Box>
              ))}
            </Box>

            {(data?.total_artists ?? 0) > (data?.artists?.length ?? 0) && (
              <Box sx={{ textAlign: 'center', mt: '10px' }}>
                <span style={{ fontFamily: MONO, fontSize: '0.4375rem', letterSpacing: '0.14em', color: BONE4 }}>
                  + {(data!.total_artists - data!.artists.length)} MORE IN THE ARCHIVE
                </span>
              </Box>
            )}

            {/* ── Genre legend ─────────────────────────────────────────────── */}
            <Box sx={{
              display: 'flex', alignItems: 'center', gap: '10px', mt: '24px', mb: '14px',
            }}>
              <Box sx={{ flex: 1, height: '1px', background: `rgba(90,84,112,0.4)` }} />
              <span style={{ fontFamily: MONO, fontSize: '0.4375rem', letterSpacing: '0.2em', color: BONE4 }}>
                THE OUTER RING
              </span>
              <Box sx={{ flex: 1, height: '1px', background: `rgba(90,84,112,0.4)` }} />
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(data?.genres ?? []).map((g, i) => (
                <Box key={g} sx={{
                  padding: '7px 12px',
                  fontFamily: MONO, fontSize: '0.5rem', letterSpacing: '0.16em',
                  color: i === 0 ? BONE : BONE3,
                  textTransform: 'uppercase',
                  border: `1px solid ${i === 0 ? BLOOD : INK4}`,
                  background: i === 0 ? BLOOD_FAINT : 'transparent',
                  borderRadius: '2px',
                }}>
                  {g}
                </Box>
              ))}
            </Box>

            {/* Layer note */}
            <Box sx={{ mt: '24px', textAlign: 'center' }}>
              <em style={{
                fontFamily: SERIF, fontStyle: 'italic',
                fontSize: '0.8125rem', color: BONE4, lineHeight: 1.6,
              }}>
                This is Layer I — the seal of identity.<br />
                Deeper layers reveal artist kinship and genre topology.
              </em>
            </Box>

          </Box>
        </Box>
      )}
    </>
  )
}
