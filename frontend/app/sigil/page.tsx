'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, GlobalStyles } from '@mui/material'
import Sigil from '@/app/components/Sigil'
import SigilExplorer, { SigilCluster, SigilFriend, FocusedNode } from '@/app/components/SigilExplorer'
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
const FRIEND_COL = '#8BCAD4'

// ── Type shorthands ───────────────────────────────────────────────────────────
const DISPLAY = '"Archivo Black", sans-serif'
const SERIF   = '"EB Garamond", serif'
const MONO    = '"JetBrains Mono", monospace'
const MEDIEVAL = '"UnifrakturCook", serif'

function mono(color = BONE3, size = '0.75rem'): React.CSSProperties {
  return { fontFamily: MONO, fontSize: size, letterSpacing: '0.14em', textTransform: 'uppercase', color }
}
function monoRed(size = '0.75rem'): React.CSSProperties {
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
  clusters: SigilCluster[]
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
  const [entered, setEntered]   = useState(false)
  const [layer, setLayer]       = useState<1|2|3>(1)
  const [focusedNode, setFocusedNode] = useState<FocusedNode>(null)
  const [friends, setFriends]   = useState<SigilFriend[]>([])

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
        else setData({ genres: [], artists: [], total_artists: 0, clusters: [] })
      })
      .finally(() => setLoading(false))
    // Fetch friend overlap data (non-blocking)
    axios
      .get(`${API_BASE}/api/v1/sigil/friends`, { headers: authHeaders() })
      .then((r) => setFriends(r.data.friends ?? []))
      .catch(() => setFriends([]))
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

  // ── onNodeClick handler ───────────────────────────────────────────────────
  const handleNodeClick = (node: FocusedNode) => {
    // Genre click in L1/L2 → jump to L3 and focus that genre
    if (node?.type === 'genre' && layer !== 3) {
      setLayer(3)
    }
    setFocusedNode(node)
  }

  const hasData   = (data?.genres.length ?? 0) > 0
  const handle    = user?.handle ?? ''
  const year      = user?.created_at ? new Date(user.created_at).getFullYear() : new Date().getFullYear()
  const est       = `Est. ${year} · Grimr`
  const dominant  = data?.genres[0] ?? ''
  const totalArtists = data?.total_artists ?? data?.artists.length ?? 0
  const genreCount   = data?.genres.length ?? 0

  // ── Chip style helpers ────────────────────────────────────────────────────
  const chipStyle = (color = BONE3, bg = 'transparent', borderColor = INK4): React.CSSProperties => ({
    fontFamily: MONO, fontSize: '0.6875rem', letterSpacing: '0.12em',
    color, padding: '5px 10px',
    border: `1px solid ${borderColor}`,
    borderRadius: '2px', background: bg,
    cursor: 'pointer', textTransform: 'uppercase' as const,
  })

  const artistChipStyle: React.CSSProperties = {
    fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.8125rem',
    color: BONE2, padding: '3px 8px',
    border: `1px solid ${INK4}`, borderRadius: '2px',
    cursor: 'pointer', background: 'transparent',
  }

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
            fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.18em',
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
                    fontSize: '0.6875rem',
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
                    fontSize: '0.6875rem',
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
                    fontFamily: MONO, fontSize: '0.625rem',
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
                    fontFamily: MONO, fontSize: '0.625rem',
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
                  fontFamily: MONO, fontSize: '0.625rem',
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
          FULLSCREEN LOD EXPLORER — "Enter the Sigil"
          ═══════════════════════════════════════════════════════════════════════ */}
      {entered && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1300,
          background: 'radial-gradient(ellipse at 50% 35%, #1B1626 0%, #0B0814 70%)',
          display: 'flex', flexDirection: 'column',
          animation: 'sigilEnter 0.35s ease forwards',
          '@keyframes sigilEnter': { from: { opacity: 0 }, to: { opacity: 1 } },
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

          {/* ── Top bar ──────────────────────────────────────────────────────── */}
          <Box sx={{
            position: 'relative', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: '16px', height: 52, flexShrink: 0,
            background: 'linear-gradient(180deg, rgba(11,8,20,0.95) 0%, rgba(11,8,20,0.6) 100%)',
          }}>
            <button
              onClick={() => { setEntered(false); setLayer(1); setFocusedNode(null) }}
              style={{
                fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.18em',
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
            <span style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.14em', color: BLOOD2 }}>
              L{layer} · {layer === 1 ? 'SEAL' : layer === 2 ? 'SCENE' : 'ARTISTS'}
            </span>
          </Box>

          {/* ── Layer description ─────────────────────────────────────────────── */}
          <Box sx={{ px: '20px', pb: '4px', flexShrink: 0 }}>
            <em style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.75rem', color: BONE4 }}>
              {layer === 1
                ? '— the seal of identity · seven genres, seven artists —'
                : layer === 2
                ? '— subgenres bloom from each genre point —'
                : '— the figures, weighted by listening —'}
            </em>
          </Box>

          {/* ── SigilExplorer — fills remaining space ────────────────────────── */}
          <Box sx={{
            flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
            position: 'relative', zIndex: 1, overflow: 'hidden',
            animation: 'sigilPulse 8s ease-in-out infinite',
            '@keyframes sigilPulse': {
              '0%,100%': { filter: 'drop-shadow(0 0 12px rgba(168,58,58,0.2))' },
              '50%':     { filter: 'drop-shadow(0 0 24px rgba(168,58,58,0.38))' },
            },
          }}>
            <SigilExplorer
              size={Math.min(typeof window !== 'undefined' ? window.innerWidth : 420, 500)}
              genres={data?.genres ?? []}
              artists={data?.artists ?? []}
              clusters={data?.clusters ?? []}
              friends={friends}
              handle={handle}
              est={est}
              layer={layer}
              focusedNode={focusedNode}
              onNodeClick={handleNodeClick}
            />
          </Box>

          {/* ── +/− drill buttons ─────────────────────────────────────────────── */}
          <Box sx={{
            flexShrink: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            gap: '20px', py: '10px',
          }}>
            {/* − Surface */}
            <button
              onClick={() => {
                if (layer > 1) {
                  setLayer((layer - 1) as 1|2|3)
                  setFocusedNode(null)
                }
              }}
              disabled={layer === 1}
              style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: layer === 1 ? 'transparent' : 'rgba(90,84,112,0.18)',
                border: `1px solid ${layer === 1 ? INK4 : BONE4}`,
                borderRadius: '3px', cursor: layer === 1 ? 'default' : 'pointer',
                color: layer === 1 ? BONE4 : BONE,
                fontSize: '1.25rem', lineHeight: 1, transition: 'all 0.2s',
              }}>
              −
            </button>

            {/* Layer indicator */}
            <Box sx={{ textAlign: 'center', minWidth: '90px' }}>
              <Box sx={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.2em', color: BLOOD2, lineHeight: 1 }}>
                L{layer}
              </Box>
              <Box sx={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.16em', color: BONE4, mt: '3px' }}>
                {layer === 1 ? 'SEAL' : layer === 2 ? 'SCENE' : 'ARTISTS'}
              </Box>
              <Box sx={{ mt: '4px', display: 'flex', justifyContent: 'center', gap: '4px' }}>
                {[1,2,3].map(l => (
                  <Box key={l} sx={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: l === layer ? BLOOD2 : BONE4,
                    opacity: l === layer ? 1 : 0.4,
                    transition: 'all 0.2s',
                  }} />
                ))}
              </Box>
            </Box>

            {/* + Deeper */}
            <button
              onClick={() => {
                if (layer < 3) {
                  setLayer((layer + 1) as 1|2|3)
                  setFocusedNode(null)
                }
              }}
              disabled={layer === 3}
              style={{
                width: 40, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: layer === 3 ? 'transparent' : 'rgba(199,80,80,0.15)',
                border: `1px solid ${layer === 3 ? INK4 : BLOOD}`,
                borderRadius: '3px', cursor: layer === 3 ? 'default' : 'pointer',
                color: layer === 3 ? BONE4 : BONE,
                fontSize: '1.25rem', lineHeight: 1, transition: 'all 0.2s',
              }}>
              +
            </button>
          </Box>

          {/* ── L3 hint (no focus) ────────────────────────────────────────────── */}
          {layer === 3 && !focusedNode && (
            <Box sx={{ textAlign: 'center', pb: '6px', flexShrink: 0 }}>
              <span style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.14em', color: BONE4 }}>
                TAP A DOT · ARTISTS{friends.length > 0 ? ` · ${friends.length} FRIEND${friends.length > 1 ? 'S' : ''} ON SEAL` : ''}
              </span>
            </Box>
          )}

          {/* ══════════════════════════════════════════════════════════════════
              UNIFIED DETAIL SHEET — based on focusedNode type
              ══════════════════════════════════════════════════════════════════ */}
          {focusedNode && (() => {
            const clusters = data?.clusters ?? []

            // ── ARTIST FOCUSED ─────────────────────────────────────────────
            if (focusedNode.type === 'artist') {
              const { name, ci } = focusedNode
              const cl = clusters[ci]
              const artist = cl?.artists.find(a => a.name === name)
              const w = artist?.weight ?? 0
              const isNatural = artist?.natural !== false
              const rank = cl?.artists.findIndex(a => a.name === name) ?? -1
              const sharedFriends = friends.filter(f => f.shared_artists.includes(name))
              const sameClusterArtists = (cl?.artists ?? [])
                .filter(a => a.name !== name)
                .slice(0, 3)

              return (
                <Box sx={{
                  position: 'relative', zIndex: 20, flexShrink: 0,
                  mx: '12px', mb: '12px',
                  background: INK2, border: `1px solid ${INK4}`,
                  borderRadius: '3px', padding: '14px 16px',
                  animation: 'sheetUp 0.25s ease forwards',
                  '@keyframes sheetUp': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to:   { opacity: 1, transform: 'translateY(0)' },
                  },
                }}>
                  <button onClick={() => setFocusedNode(null)} style={{
                    position: 'absolute', top: 10, right: 12,
                    fontFamily: MONO, fontSize: '0.75rem', color: BONE4,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>✕</button>

                  {/* Header */}
                  <Box sx={{ display: 'flex', gap: '10px', alignItems: 'baseline', mb: '6px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.16em', color: BLOOD2 }}>
                      {cl?.label ?? ''}
                    </span>
                    <Box sx={{ flex: 1, height: '1px', background: `rgba(90,84,112,0.4)` }} />
                    {!isNatural && (
                      <span style={{ fontFamily: MONO, fontSize: '0.625rem', letterSpacing: '0.1em', color: BONE4 }}>
                        UNCLASSIFIED
                      </span>
                    )}
                  </Box>

                  <Box sx={{ fontFamily: DISPLAY, fontSize: '1.1rem', color: BONE, mb: '8px' }}>
                    {name}
                  </Box>

                  {/* Weight bar */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: '4px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', color: BONE4 }}>LISTENING WEIGHT</span>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', color: BONE3 }}>{w}</span>
                  </Box>
                  <Box sx={{ height: '3px', background: INK4, borderRadius: '2px', mb: '10px' }}>
                    <Box sx={{ height: '100%', width: `${w}%`, background: BLOOD2, borderRadius: '2px', transition: 'width 0.4s ease' }} />
                  </Box>

                  {/* Chips row */}
                  <Box sx={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Cluster chip */}
                    {cl && (
                      <button
                        onClick={() => setFocusedNode({ type: 'genre', ci })}
                        style={chipStyle(BLOOD2, BLOOD_FAINT, 'rgba(199,80,80,0.35)')}>
                        ↗ {cl.label}
                      </button>
                    )}
                    {/* Rank chip */}
                    {rank >= 0 && (
                      <span style={chipStyle(BONE3, 'transparent', INK4)}>
                        #{rank + 1} IN CLUSTER
                      </span>
                    )}
                    {/* Core channel badge */}
                    {w >= 70 && (
                      <span style={chipStyle(BLOOD2, BLOOD_FAINT, 'rgba(199,80,80,0.35)')}>
                        CORE CHANNEL
                      </span>
                    )}
                    {/* Same-cluster artist chips */}
                    {sameClusterArtists.map(a => (
                      <button
                        key={a.name}
                        onClick={() => setFocusedNode({ type: 'artist', name: a.name, ci })}
                        style={artistChipStyle}>
                        {a.name}
                      </button>
                    ))}
                    {/* Shared friend chips */}
                    {sharedFriends.map(f => (
                      <button
                        key={f.handle}
                        onClick={() => setFocusedNode({ type: 'friend', handle: f.handle })}
                        style={chipStyle(FRIEND_COL, 'rgba(139,202,212,0.08)', 'rgba(139,202,212,0.35)')}>
                        {f.handle} ↔
                      </button>
                    ))}
                  </Box>
                </Box>
              )
            }

            // ── GENRE FOCUSED ──────────────────────────────────────────────
            if (focusedNode.type === 'genre') {
              const { ci } = focusedNode
              const cl = clusters[ci]
              if (!cl) return null
              const topSubgenres = cl.subgenres.slice(0, 4)
              const topArtists = cl.artists.slice(0, 4)
              const genreFriends = friends.filter(f =>
                f.shared_artists.some(name => cl.artists.find(a => a.name === name))
              )

              return (
                <Box sx={{
                  position: 'relative', zIndex: 20, flexShrink: 0,
                  mx: '12px', mb: '12px',
                  background: INK2, border: `1px solid ${INK4}`,
                  borderRadius: '3px', padding: '14px 16px',
                  animation: 'sheetUp 0.25s ease forwards',
                  '@keyframes sheetUp': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to:   { opacity: 1, transform: 'translateY(0)' },
                  },
                }}>
                  <button onClick={() => setFocusedNode(null)} style={{
                    position: 'absolute', top: 10, right: 12,
                    fontFamily: MONO, fontSize: '0.75rem', color: BONE4,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>✕</button>

                  {/* Header */}
                  <Box sx={{ display: 'flex', gap: '10px', alignItems: 'baseline', mb: '6px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.16em', color: BLOOD2 }}>
                      {cl.label}
                    </span>
                    <Box sx={{ flex: 1, height: '1px', background: `rgba(90,84,112,0.4)` }} />
                  </Box>

                  <Box sx={{ fontFamily: MONO, fontSize: '0.75rem', color: BONE3, mb: '10px', letterSpacing: '0.12em' }}>
                    {cl.artist_count} ARTISTS · {cl.subgenres.length} SUBGENRES
                  </Box>

                  {/* Subgenre chips */}
                  {topSubgenres.length > 0 && (
                    <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap', mb: '8px' }}>
                      {topSubgenres.map(sg => (
                        <span key={sg.label} style={{
                          fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.8125rem',
                          color: BONE3, padding: '3px 8px',
                          border: `1px solid ${INK4}`, borderRadius: '2px',
                        }}>
                          {sg.label}{sg.pct > 0 ? ` · ${sg.pct}%` : ''}
                        </span>
                      ))}
                    </Box>
                  )}

                  {/* Artist chips */}
                  <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap', mb: genreFriends.length > 0 ? '8px' : 0 }}>
                    {topArtists.map(a => (
                      <button
                        key={a.name}
                        onClick={() => setFocusedNode({ type: 'artist', name: a.name, ci })}
                        style={artistChipStyle}>
                        {a.name}
                      </button>
                    ))}
                  </Box>

                  {/* Friend chips */}
                  {genreFriends.length > 0 && (
                    <Box sx={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {genreFriends.map(f => (
                        <button
                          key={f.handle}
                          onClick={() => setFocusedNode({ type: 'friend', handle: f.handle })}
                          style={chipStyle(FRIEND_COL, 'rgba(139,202,212,0.08)', 'rgba(139,202,212,0.35)')}>
                          {f.handle}
                        </button>
                      ))}
                    </Box>
                  )}
                </Box>
              )
            }

            // ── FRIEND FOCUSED ─────────────────────────────────────────────
            if (focusedNode.type === 'friend') {
              const { handle: friendHandle } = focusedNode
              const f = friends.find(fr => fr.handle === friendHandle)
              if (!f) return null

              return (
                <Box sx={{
                  position: 'relative', zIndex: 20, flexShrink: 0,
                  mx: '12px', mb: '12px',
                  background: INK2, border: '1px solid rgba(139,202,212,0.3)',
                  borderRadius: '3px', padding: '14px 16px',
                  animation: 'sheetUp 0.25s ease forwards',
                  '@keyframes sheetUp': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to:   { opacity: 1, transform: 'translateY(0)' },
                  },
                }}>
                  <button onClick={() => setFocusedNode(null)} style={{
                    position: 'absolute', top: 10, right: 12,
                    fontFamily: MONO, fontSize: '0.75rem', color: BONE4,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                  }}>✕</button>

                  {/* Header */}
                  <Box sx={{ display: 'flex', gap: '10px', alignItems: 'baseline', mb: '6px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.16em', color: FRIEND_COL }}>
                      LISTENER
                    </span>
                    <Box sx={{ flex: 1, height: '1px', background: 'rgba(139,202,212,0.2)' }} />
                  </Box>

                  <Box sx={{ fontFamily: DISPLAY, fontSize: '1.1rem', color: BONE, mb: '10px' }}>
                    @{friendHandle}
                  </Box>

                  <Box sx={{ mb: '6px' }}>
                    <span style={{ fontFamily: MONO, fontSize: '0.75rem', color: BONE4, letterSpacing: '0.12em' }}>
                      SHARED ARTISTS
                    </span>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {f.shared_artists.map(name => {
                      // Find which cluster this artist belongs to
                      let artistCi = 0
                      for (let i = 0; i < clusters.length; i++) {
                        if (clusters[i].artists.find(a => a.name === name)) {
                          artistCi = i
                          break
                        }
                      }
                      return (
                        <button
                          key={name}
                          onClick={() => setFocusedNode({ type: 'artist', name, ci: artistCi })}
                          style={artistChipStyle}>
                          {name}
                        </button>
                      )
                    })}
                  </Box>
                </Box>
              )
            }

            return null
          })()}

          {/* ── Bottom layer labels (L2/L3 context — only when no focus) ──────── */}
          {layer !== 1 && !focusedNode && (
            <Box sx={{ px: '16px', pb: '14px', flexShrink: 0 }}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {layer === 2 && (data?.clusters ?? []).flatMap(cl =>
                  cl.subgenres.slice(0, 2).map(sg => (
                    <span
                      key={`${cl.label}-${sg.label}`}
                      style={{
                        fontFamily: SERIF, fontStyle: 'italic',
                        fontSize: '0.75rem', color: BONE4,
                      }}>
                      {sg.label}
                      {sg.pct > 0 ? ` ${sg.pct}%` : ''}{' '}
                    </span>
                  ))
                )}
                {layer === 3 && (
                  <span style={{ fontFamily: MONO, fontSize: '0.75rem', letterSpacing: '0.12em', color: BONE4 }}>
                    {(data?.clusters ?? []).reduce((s, c) => s + c.artists.length, 0)} ARTISTS MAPPED · DOT SIZE = LISTENING WEIGHT
                  </span>
                )}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
