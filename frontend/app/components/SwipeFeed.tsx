'use client'

import { useState, useRef, useEffect } from 'react'
import { Box, Typography } from '@mui/material'
import { useNotifications } from '@/app/context/NotificationContext'
import { api } from '@/lib/api'

const THRESHOLD = 80

const CARD_PALETTES = [
  { bg: 'linear-gradient(155deg, #1e1228 0%, #08060a 50%, #200a08 100%)', glow: 'rgba(196,58,42,.18)' },
  { bg: 'linear-gradient(155deg, #0e1020 0%, #08060a 50%, #1a0e24 100%)', glow: 'rgba(120,80,180,.1)' },
  { bg: 'linear-gradient(155deg, #081820 0%, #08060a 50%, #200a14 100%)', glow: 'rgba(40,120,160,.1)' },
  { bg: 'linear-gradient(155deg, #1a1424 0%, #08060a 50%, #200810 100%)', glow: 'rgba(196,58,42,.14)' },
  { bg: 'linear-gradient(155deg, #1e1208 0%, #08060a 50%, #0a1820 100%)', glow: 'rgba(30,100,60,.1)' },
]

interface ApiHit {
  user_id: string
  handle: string
  city_bucket: string | null
  profile_image_url: string | null
  top_shared_artists: { artist_id: string; artist_name: string }[]
  shared_genres: string[]
  compatibility_score: number | null
  last_active: string | null
}

interface Profile {
  id: string
  handle: string
  initial: string
  location: string
  compatibility: number
  artists: string[]
  genres: string[]
  lastActive: string | null
}

interface Comment {
  id: string
  user: string
  text: string
  time: string
}

function mapHit(hit: ApiHit): Profile {
  return {
    id: hit.user_id,
    handle: hit.handle,
    initial: hit.handle.charAt(0).toUpperCase(),
    location: hit.city_bucket || '',
    compatibility: Math.round(hit.compatibility_score || 0),
    artists: hit.top_shared_artists.slice(0, 3).map((a) => a.artist_name),
    genres: hit.shared_genres.slice(0, 3),
    lastActive: hit.last_active,
  }
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function SwipeFeed() {
  const { addNotification } = useNotifications()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [idx, setIdx]           = useState(0)
  const [dragX, setDragX]       = useState(0)
  const [dragY, setDragY]       = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exitDir, setExitDir]   = useState<'left' | 'right' | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [newComment, setNewComment] = useState('')
  const startX = useRef(0)
  const startY = useRef(0)
  const moved  = useRef(false)

  useEffect(() => {
    api.get<{ hits: ApiHit[] }>('/search/random?limit=20')
      .then((res) => setProfiles(res.data.hits.map(mapHit)))
      .catch(() => {/* show empty state */})
      .finally(() => setLoading(false))
  }, [])

  const profile     = profiles[idx]
  const nextProfile = profiles[idx + 1]
  const done        = !loading && idx >= profiles.length

  const palette     = CARD_PALETTES[idx % CARD_PALETTES.length]
  const nextPalette = CARD_PALETTES[(idx + 1) % CARD_PALETTES.length]

  const dismiss = (dir: 'left' | 'right') => {
    if (dir === 'right' && profile) {
      addNotification({ type: 'match', fromHandle: profile.handle, fromInitial: profile.initial })
    }
    setExitDir(dir)
    setTimeout(() => {
      setIdx((i) => i + 1)
      setExitDir(null)
      setDragX(0)
      setDragY(0)
    }, 280)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (showComments || done) return
    startX.current = e.clientX
    startY.current = e.clientY
    moved.current  = false
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - startX.current
    const dy = e.clientY - startY.current
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true
    setDragX(dx)
    setDragY(dy)
  }

  const onPointerUp = () => {
    if (!dragging) return
    setDragging(false)
    if (!moved.current) { setDragX(0); setDragY(0); return }
    if (dragX > THRESHOLD)       dismiss('right')
    else if (dragX < -THRESHOLD) dismiss('left')
    else { setDragX(0); setDragY(0) }
  }

  const addComment = () => {
    if (!newComment.trim() || !profile) return
    const c: Comment = { id: `c${Date.now()}`, user: 'ME', text: newComment.trim(), time: 'now' }
    setComments((prev) => ({ ...prev, [profile.id]: [...(prev[profile.id] || []), c] }))
    setNewComment('')
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 420 }}>
        <span style={{ ...labelStyle, color: 'var(--accent)' }}>LOADING…</span>
      </Box>
    )
  }

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 2, px: 2 }}>
        <span style={{ ...labelStyle, color: 'var(--accent)' }}>☍ ALL CAUGHT UP</span>
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center' }}>
          {profiles.length === 0
            ? 'No one to discover yet. Check back later.'
            : "You've seen everyone. Check back tomorrow for new faces."}
        </Typography>
        {profiles.length > 0 && (
          <Box component="button" onClick={() => setIdx(0)} sx={{
            mt: 1, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
            px: 2, py: 0.75, background: 'transparent', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em',
            color: 'var(--ink)',
          }}>
            RESTART
          </Box>
        )}
      </Box>
    )
  }

  const profileComments = comments[profile.id] || []

  const tx  = exitDir === 'right' ? 600 : exitDir === 'left' ? -600 : dragX
  const ty  = exitDir ? dragY * 0.3 : dragY * 0.12
  const rot = dragging ? dragX * 0.05 : 0
  const fitOpacity  = Math.min(1, Math.max(0, (dragX - 28) / 55))
  const passOpacity = Math.min(1, Math.max(0, (-dragX - 28) / 55))

  return (
    <Box sx={{ position: 'relative', userSelect: 'none' }}>

      {/* ── Card stack ───────────────────────────────────────── */}
      <Box sx={{ position: 'relative' }}>

        {/* Next card peek */}
        {nextProfile && (
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 0,
            borderRadius: '6px', overflow: 'hidden',
            border: '1.5px solid rgba(216,207,184,0.12)',
            background: nextPalette.bg,
            transform: 'scale(0.95) translateY(12px)',
            transformOrigin: 'bottom center',
          }} />
        )}

        {/* Current card */}
        <Box
          sx={{
            position: 'relative', zIndex: 1,
            width: '100%',
            height: 'clamp(440px, calc(100dvh - 210px), 580px)',
            borderRadius: '6px', overflow: 'hidden',
            border: '1.5px solid rgba(216,207,184,0.2)',
            background: palette.bg,
            cursor: dragging ? 'grabbing' : 'grab',
            transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg)`,
            transition: dragging ? 'none' : exitDir ? 'transform 0.28s ease-in' : 'transform 0.16s cubic-bezier(.17,.67,.4,1.4)',
            touchAction: 'none',
            willChange: 'transform',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* Atmospheric glow */}
          <Box sx={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            background: `radial-gradient(circle at 28% 25%, ${palette.glow}, transparent 58%)`,
          }} />

          {/* Large watermark initial */}
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -58%)',
            zIndex: 0, pointerEvents: 'none',
          }}>
            <Typography sx={{
              fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
              fontSize: 'clamp(9rem, 38vw, 15rem)',
              color: 'rgba(216,207,184,0.035)',
              lineHeight: 1,
            }}>
              {profile.initial}
            </Typography>
          </Box>

          {/* FIT stamp */}
          <Box sx={{
            position: 'absolute', top: 22, left: 18, zIndex: 4,
            border: '2.5px solid var(--accent, #c43a2a)', borderRadius: '3px',
            px: 1.25, py: 0.375, opacity: fitOpacity,
            transform: 'rotate(-9deg)', pointerEvents: 'none',
          }}>
            <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', letterSpacing: '0.06em', color: 'var(--accent)', lineHeight: 1 }}>
              FIT
            </Typography>
          </Box>

          {/* PASS stamp */}
          <Box sx={{
            position: 'absolute', top: 22, right: 18, zIndex: 4,
            border: '2.5px solid rgba(216,207,184,0.55)', borderRadius: '3px',
            px: 1.25, py: 0.375, opacity: passOpacity,
            transform: 'rotate(9deg)', pointerEvents: 'none',
          }}>
            <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '1.375rem', letterSpacing: '0.06em', color: 'rgba(216,207,184,0.65)', lineHeight: 1 }}>
              PASS
            </Typography>
          </Box>

          {/* Comment badge */}
          <Box
            onClick={(e) => { e.stopPropagation(); setShowComments(true) }}
            sx={{
              position: 'absolute', top: 16, right: 16, zIndex: 4,
              display: 'flex', alignItems: 'center', gap: 0.5,
              border: '1.5px solid rgba(216,207,184,0.25)', borderRadius: '20px',
              px: 1, py: 0.4, backgroundColor: 'rgba(8,6,10,0.65)',
              cursor: 'pointer',
            }}
          >
            <span style={{ ...labelStyle, color: 'var(--ink)', fontSize: '0.5rem' }}>
              ☍ {profileComments.length > 0 ? profileComments.length : 'COMMENT'}
            </span>
          </Box>

          {/* Bottom info overlay */}
          <Box sx={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
            background: 'linear-gradient(to top, rgba(8,6,10,.97) 0%, rgba(8,6,10,.82) 52%, transparent 100%)',
            p: 2.25, pointerEvents: 'none',
          }}>
            {/* Handle + compat */}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: '1.25rem', lineHeight: 1 }}>
                {profile.handle}
              </Typography>
              {profile.compatibility > 0 && (
                <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--accent, #c43a2a)' }}>
                  {profile.compatibility}%
                </Typography>
              )}
            </Box>

            {profile.location && (
              <span style={{ ...labelStyle, display: 'block', marginBottom: 10 }}>
                ⌖ {profile.location}
              </span>
            )}

            {/* Shared artists */}
            {profile.artists.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: profile.genres.length > 0 ? 0.75 : 1.25 }}>
                {profile.artists.map((a) => (
                  <Box key={a} sx={{
                    border: '1.5px solid rgba(216,207,184,0.25)', borderRadius: '3px',
                    px: 0.75, height: 22, display: 'inline-flex', alignItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'var(--ink)',
                  }}>
                    {a}
                  </Box>
                ))}
              </Box>
            )}

            {/* Shared genres */}
            {profile.genres.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
                {profile.genres.map((g) => (
                  <Box key={g} sx={{
                    border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
                    px: 0.75, height: 20, display: 'inline-flex', alignItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--muted)',
                  }}>
                    {g}
                  </Box>
                ))}
              </Box>
            )}

            {profile.lastActive && (
              <span style={{ ...labelStyle, fontSize: '0.4375rem', display: 'block' }}>
                {profile.lastActive}
              </span>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Action row ───────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, mt: 2.5 }}>
        <Box component="button" onClick={() => dismiss('left')} sx={{
          width: 54, height: 54, borderRadius: '50%',
          border: '1.5px solid rgba(216,207,184,0.2)', background: '#1a1424',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '1.375rem', color: 'rgba(216,207,184,0.5)',
          transition: 'transform 0.1s, border-color 0.1s',
          '&:hover': { borderColor: 'rgba(216,207,184,0.4)', transform: 'scale(1.06)' },
          '&:active': { transform: 'scale(0.93)' },
        }}>
          ✕
        </Box>

        <Box component="button" onClick={() => setShowComments(true)} sx={{
          width: 44, height: 44, borderRadius: '50%',
          border: '1.5px solid rgba(216,207,184,0.2)', background: '#1a1424',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '1rem', color: 'var(--muted)',
          transition: 'transform 0.1s, border-color 0.1s',
          '&:hover': { borderColor: 'rgba(216,207,184,0.35)', transform: 'scale(1.06)' },
          '&:active': { transform: 'scale(0.93)' },
        }}>
          ☍
        </Box>

        <Box component="button" onClick={() => dismiss('right')} sx={{
          width: 54, height: 54, borderRadius: '50%',
          border: '1.5px solid var(--accent, #c43a2a)', background: '#1a1424',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: '1.375rem', color: 'var(--accent, #c43a2a)',
          transition: 'transform 0.1s, background 0.1s',
          '&:hover': { background: 'rgba(196,58,42,0.12)', transform: 'scale(1.06)' },
          '&:active': { transform: 'scale(0.93)' },
        }}>
          ✶
        </Box>
      </Box>

      {/* ── Comment sheet ────────────────────────────────────── */}
      {showComments && profile && (
        <>
          <Box onClick={() => setShowComments(false)} sx={{
            position: 'fixed', inset: 0, zIndex: 1300,
            backgroundColor: 'rgba(8,6,10,.72)', backdropFilter: 'blur(3px)',
          }} />

          <Box sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1301,
            maxWidth: 480, mx: 'auto',
            backgroundColor: '#1a1424',
            borderTop: '1.5px solid rgba(216,207,184,0.2)',
            borderRadius: '10px 10px 0 0',
            paddingBottom: 'env(safe-area-inset-bottom)',
            maxHeight: '60dvh', display: 'flex', flexDirection: 'column',
          }}>
            <Box sx={{ px: 2, pt: 1.5, pb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(216,207,184,0.1)', flexShrink: 0 }}>
              <span style={labelStyle}>☍ {profile.handle}</span>
              <Box component="button" onClick={() => setShowComments(false)} sx={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1, p: 0.5 }}>
                ✕
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {profileComments.length === 0 ? (
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center', py: 2.5 }}>
                  No comments yet. Be first.
                </Typography>
              ) : (
                profileComments.map((c) => (
                  <Box key={c.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Box sx={{
                      width: 20, height: 20, flexShrink: 0,
                      border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: '0.5rem', color: '#ece5d3',
                      backgroundColor: '#120e18',
                    }}>
                      {c.user.charAt(0)}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <span style={{ ...labelStyle, fontSize: '0.4375rem' }}>{c.user} · {c.time}</span>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.45, mt: 0.25 }}>
                        {c.text}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            <Box sx={{ px: 2, py: 1.25, borderTop: '1px solid rgba(216,207,184,0.1)', flexShrink: 0, display: 'flex', gap: 1 }}>
              <Box
                component="input"
                value={newComment}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') addComment() }}
                placeholder="Leave a comment…"
                sx={{
                  flex: 1, background: '#120e18',
                  border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                  px: 1.25, py: 0.75,
                  fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--ink)',
                  outline: 'none',
                  '&::placeholder': { color: 'var(--muted)' },
                  '&:focus': { borderColor: 'rgba(216,207,184,0.4)' },
                }}
              />
              <Box component="button" onClick={addComment} sx={{
                background: 'none', border: '1.5px solid rgba(216,207,184,0.2)',
                borderRadius: '3px', px: 1.25, cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                letterSpacing: '0.1em', color: 'var(--ink)',
                '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
              }}>
                POST
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}
