'use client'

import { useState, useRef, useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import { useNotifications } from '@/app/context/NotificationContext'
import { useUser } from '@/app/context/UserContext'
import { distanceBetweenCities } from '@/lib/geo'

const THRESHOLD = 80

const CARD_PALETTES = [
  { bg: 'linear-gradient(155deg, #1e1228 0%, #08060a 50%, #200a08 100%)', glow: 'rgba(196,58,42,.18)' },
  { bg: 'linear-gradient(155deg, #0e1020 0%, #08060a 50%, #1a0e24 100%)', glow: 'rgba(120,80,180,.1)' },
  { bg: 'linear-gradient(155deg, #081820 0%, #08060a 50%, #200a14 100%)', glow: 'rgba(40,120,160,.1)' },
  { bg: 'linear-gradient(155deg, #1a1424 0%, #08060a 50%, #200810 100%)', glow: 'rgba(196,58,42,.14)' },
  { bg: 'linear-gradient(155deg, #1e1208 0%, #08060a 50%, #0a1820 100%)', glow: 'rgba(30,100,60,.1)' },
]

interface Profile {
  id: string
  handle: string
  initial: string
  city: string
  country: string
  compatibility: number
  artists: string[]
  about: string
}

interface Comment {
  id: string
  user: string
  text: string
  time: string
}

const PROFILES: Profile[] = [
  { id: 'u1', handle: 'SKALD_EIRIK',   initial: 'S', city: 'Oslo',       country: 'NO', compatibility: 87, artists: ['Enslaved', 'Ihsahn', 'Mgła'],                        about: 'Black metal pilgrim. Concerts are church.' },
  { id: 'u2', handle: 'FENRIR_KEEPER', initial: 'F', city: 'Hamburg',    country: 'DE', compatibility: 74, artists: ['Bolt Thrower', 'Cannibal Corpse', 'Morbid Angel'],    about: 'Death metal only. No exceptions.' },
  { id: 'u3', handle: 'VOIDWALKER',    initial: 'V', city: 'Düsseldorf', country: 'DE', compatibility: 91, artists: ['Sunn O)))', 'Earth', 'Sleep'],                        about: 'Drone is prayer. Volume is god.' },
  { id: 'u4', handle: 'BRISINGR_PATH', initial: 'B', city: 'Cologne',    country: 'DE', compatibility: 68, artists: ['Bathory', 'Dissection', 'Watain'],                    about: 'Vikings, darkness, riffs.' },
  { id: 'u5', handle: 'MORDGRIMM',     initial: 'M', city: 'Frankfurt',  country: 'DE', compatibility: 82, artists: ['Primordial', 'Agalloch', 'Wolves in the Throne Room'], about: 'Folk-tinged black metal devotee.' },
]

// Profiles that already liked the current user → mutual fit on right-swipe
const ALREADY_LIKED = new Set(['u1', 'u3'])

const SEED_COMMENTS: Record<string, Comment[]> = {
  u1: [
    { id: 'c1', user: 'HRAFN',       text: 'Enslaved at Øya was life-changing',    time: '2h' },
    { id: 'c2', user: 'ASHES_42',    text: 'Bergen scene is unreal right now',     time: '5h' },
  ],
  u2: [],
  u3: [{ id: 'c3', user: 'MGLA_PURIST', text: 'Portland drone scene is something else', time: '1d' }],
  u4: [],
  u5: [{ id: 'c4', user: 'HRAFN', text: 'Agalloch farewell show made me weep', time: '3d' }],
}

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function SwipeFeed() {
  const { addNotification } = useNotifications()
  const { user } = useUser()

  // Pre-compute distances from user's city to each profile city
  const distances = useMemo(() => {
    const userCity = user?.city ?? null
    return Object.fromEntries(
      PROFILES.map((p) => {
        const km = userCity ? distanceBetweenCities(userCity, p.city) : null
        return [p.id, km]
      })
    ) as Record<string, number | null>
  }, [user?.city])
  const [idx, setIdx]               = useState(0)
  const [dragX, setDragX]           = useState(0)
  const [dragY, setDragY]           = useState(0)
  const [dragging, setDragging]     = useState(false)
  const [exitDir, setExitDir]       = useState<'left' | 'right' | null>(null)
  const [matchProfile, setMatchProfile] = useState<Profile | null>(null)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments]     = useState<Record<string, Comment[]>>(SEED_COMMENTS)
  const [newComment, setNewComment] = useState('')
  const startX = useRef(0)
  const startY = useRef(0)
  const moved  = useRef(false)

  const profile     = PROFILES[idx]
  const nextProfile = PROFILES[idx + 1]
  const done        = idx >= PROFILES.length

  const palette     = CARD_PALETTES[idx % CARD_PALETTES.length]
  const nextPalette = CARD_PALETTES[(idx + 1) % CARD_PALETTES.length]

  const dismiss = (dir: 'left' | 'right') => {
    if (dir === 'right' && profile && ALREADY_LIKED.has(profile.id)) {
      // Mutual fit — show match overlay and fire notification
      setMatchProfile(profile)
      addNotification({ type: 'fit_match', fromHandle: profile.handle, fromInitial: profile.initial, timestamp: 'now' })
      setTimeout(() => setMatchProfile(null), 2200)
    }
    setExitDir(dir)
    setTimeout(() => {
      setIdx(i => i + 1)
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
    if (dragX > THRESHOLD)  dismiss('right')
    else if (dragX < -THRESHOLD) dismiss('left')
    else { setDragX(0); setDragY(0) }
  }

  const addComment = () => {
    if (!newComment.trim() || !profile) return
    const c: Comment = { id: `c${Date.now()}`, user: 'ME', text: newComment.trim(), time: 'now' }
    setComments(prev => ({ ...prev, [profile.id]: [...(prev[profile.id] || []), c] }))
    setNewComment('')
  }

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 2, px: 2 }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>☍ ALL CAUGHT UP</span>
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center' }}>
          You've seen everyone nearby.<br />Check back tomorrow for new faces.
        </Typography>
        <Box component="button" onClick={() => setIdx(0)} sx={{
          mt: 1, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
          px: 2, py: 0.75, background: 'transparent', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em',
          color: 'var(--ink)',
        }}>
          RESTART
        </Box>
      </Box>
    )
  }

  const profileComments = comments[profile.id] || []

  // Card transform
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
            <span style={{ ...lbl, color: 'var(--ink)', fontSize: '0.5rem' }}>
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
              <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '2rem', lineHeight: 1, color: 'var(--accent, #c43a2a)' }}>
                {profile.compatibility}%
              </Typography>
            </Box>

            <span style={{ ...lbl, display: 'block', marginBottom: 10 }}>
              ⌖ {profile.city}
              {distances[profile.id] !== null && distances[profile.id] !== undefined
                ? ` · ${distances[profile.id]} km`
                : ''}
            </span>

            {/* Artists */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.25 }}>
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

            <Typography sx={{ fontFamily: 'var(--font-serif, "EB Garamond", serif)', fontStyle: 'italic', fontSize: '0.9375rem', color: 'rgba(236,229,211,.72)', lineHeight: 1.4 }}>
              "{profile.about}"
            </Typography>
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

      {/* ── Mutual fit overlay ──────────────────────────────── */}
      {matchProfile && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 1400,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at center, rgba(196,58,42,.35) 0%, rgba(8,6,10,.97) 70%)',
          animation: 'fadeInUp 0.3s ease both',
          pointerEvents: 'none',
        }}>
          <Typography sx={{
            fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
            fontSize: '0.5625rem', letterSpacing: '0.2em',
            color: 'var(--accent)', mb: 1,
          }}>
            ✶ MUTUAL FIT ✶
          </Typography>
          <Typography sx={{
            fontFamily: 'var(--font-serif, "EB Garamond", serif)',
            fontStyle: 'italic', fontSize: '1.5rem',
            color: 'var(--ink)', textAlign: 'center', lineHeight: 1.3,
          }}>
            You and<br />{matchProfile.handle}
          </Typography>
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.9375rem', color: 'var(--muted)', mt: 0.75,
          }}>
            found each other.
          </Typography>
        </Box>
      )}

      {/* ── Comment sheet ────────────────────────────────────── */}
      {showComments && (
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
            {/* Header */}
            <Box sx={{ px: 2, pt: 1.5, pb: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(216,207,184,0.1)', flexShrink: 0 }}>
              <span style={lbl}>☍ {profile.handle}</span>
              <Box component="button" onClick={() => setShowComments(false)} sx={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1, p: 0.5 }}>
                ✕
              </Box>
            </Box>

            {/* Comments list */}
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {profileComments.length === 0 ? (
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center', py: 2.5 }}>
                  No comments yet. Be first.
                </Typography>
              ) : (
                profileComments.map((c) => (
                  <Box key={c.id} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <Box sx={{
                      width: 26, height: 26, flexShrink: 0,
                      border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: '0.5625rem',
                      color: '#ece5d3', backgroundColor: '#120e18',
                    }}>
                      {c.user.charAt(0)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: 'flex', gap: 1, mb: 0.25, alignItems: 'center' }}>
                        <span style={{ ...lbl, color: 'var(--ink)', fontSize: '0.5rem' }}>{c.user}</span>
                        <span style={lbl}>{c.time}</span>
                      </Box>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', lineHeight: 1.45 }}>
                        {c.text}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>

            {/* Input row */}
            <Box sx={{ px: 2, pb: 1.5, pt: 1, borderTop: '1px solid rgba(216,207,184,0.1)', display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
              <Box
                component="input"
                value={newComment}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') addComment() }}
                placeholder="Leave a comment…"
                sx={{
                  flex: 1,
                  border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                  background: '#120e18', color: 'var(--ink)',
                  fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem',
                  px: 1.25, py: 0.875, outline: 'none',
                  '&::placeholder': { color: 'var(--muted)' },
                }}
              />
              <Box component="button" onClick={addComment} sx={{
                border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                px: 1.25, py: 0.875, background: 'transparent', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em',
                color: newComment.trim() ? 'var(--accent)' : 'var(--muted)',
                transition: 'color 0.1s', flexShrink: 0,
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
