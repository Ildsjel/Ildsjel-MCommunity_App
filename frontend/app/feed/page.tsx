'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import SwipeFeed from '@/app/components/SwipeFeed'
import { useUser } from '@/app/context/UserContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ────────────────────────────────────────────────────────────────────

type FeedMode   = 'reviews' | 'people'
type FilterKey  = 'all' | 'coven' | 'near' | 'matches' | 'unread'

interface ReviewItem {
  id: string
  user_id: string
  user_handle: string
  user_avatar_url: string | null
  rating: number
  body: string | null
  created_at: string
  band_name: string
  band_slug: string
  release_title: string
  release_slug: string
  release_type: string | null
  release_year: number | null
  horns_count: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function toRoman(n: number): string {
  const vals = [50, 40, 10, 9, 5, 4, 1]
  const syms = ['L', 'XL', 'X', 'IX', 'V', 'IV', 'I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return `${Math.floor(diff / 604800)}w ago`
}

function formatTimeDivider(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return `TONIGHT · ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  const days   = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  return `EARLIER · ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

// ── Shared style atoms ────────────────────────────────────────────────────────

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const hatchBg = 'repeating-linear-gradient(135deg, #1a1424 0 5px, #120e18 5px 10px)'

// ── Sub-components ────────────────────────────────────────────────────────────

function AlbumPlaceholder({ size }: { size: number }) {
  return (
    <Box sx={{
      width: size, height: size, flexShrink: 0,
      border: '1.5px solid rgba(216,207,184,0.12)', borderRadius: '2px',
      background: hatchBg,
    }} />
  )
}

function MiniAvatar({ initial }: { initial: string }) {
  return (
    <Box sx={{
      width: 24, height: 24, flexShrink: 0, borderRadius: '50%',
      border: '1.5px solid rgba(216,207,184,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontSize: '0.5rem',
      color: '#ece5d3', backgroundColor: '#1a1424',
    }}>
      {initial}
    </Box>
  )
}

function TimeDivider({ iso }: { iso: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1 }}>
      <Box sx={{ flex: 1, height: '1px', background: 'rgba(216,207,184,0.1)' }} />
      <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--muted)' }}>
        {formatTimeDivider(iso)}
      </span>
      <Box sx={{ flex: 1, height: '1px', background: 'rgba(216,207,184,0.1)' }} />
    </Box>
  )
}

function HeroCard({ review, onHorns }: { review: ReviewItem; onHorns: (id: string) => void }) {
  return (
    <Box sx={{
      border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
      backgroundColor: '#120e18', overflow: 'hidden',
      boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.08)', mb: 1,
    }}>
      <Box sx={{ position: 'relative', height: 140, background: hatchBg }}>
        <Box sx={{ position: 'absolute', top: 8, left: 8, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#d4a010', background: 'rgba(8,6,10,0.82)', px: 0.75, py: 0.25, borderRadius: '2px' }}>
          TOP OF YOUR COVEN
        </Box>
        <Box sx={{ position: 'absolute', top: 8, right: 8, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em', color: '#ece5d3', background: 'rgba(196,58,42,0.85)', px: 0.75, py: 0.25, borderRadius: '2px' }}>
          {review.rating}/10
        </Box>
      </Box>
      <Box sx={{ px: 1.5, py: 1.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <MiniAvatar initial={review.user_handle.charAt(0)} />
          <span style={{ ...mono, color: 'var(--ink)' }}>{review.user_handle}</span>
          <span style={mono}>{timeAgo(review.created_at)}</span>
        </Box>
        <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.03em', mb: 0.125 }}>
          {review.band_name}
        </Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9375rem', color: 'var(--muted)', mb: 0.75 }}>
          {review.release_title}{review.release_year ? ` · ${review.release_year}` : ''}
        </Typography>
        {review.body && (
          <Box sx={{ borderLeft: '2px solid var(--accent)', pl: 1, mb: 0.875, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9375rem', lineHeight: 1.45, color: 'var(--ink)' }}>
              "{review.body}"
            </Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em' }}>
          <Box component="button" onClick={() => onHorns(review.id)} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, color: 'var(--accent)', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>
            ✶ {review.horns_count}
          </Box>
          <span style={{ color: 'var(--muted)' }}>☍ 0</span>
          <span style={{ color: 'var(--muted)' }}>★ {review.rating}/10</span>
        </Box>
      </Box>
    </Box>
  )
}

function StandardCard({ review, onHorns, onClick }: { review: ReviewItem; onHorns: (id: string) => void; onClick: () => void }) {
  return (
    <Box onClick={onClick} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.25, py: 1.25, display: 'flex', gap: 1.25, cursor: 'pointer', boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.08)', transition: 'box-shadow 0.1s, transform 0.08s', '&:hover': { boxShadow: '3px 3px 0 rgba(216,207,184,.12)' }, '&:active': { transform: 'translate(1px,1px)', boxShadow: 'none' } }}>
      <AlbumPlaceholder size={78} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.375 }}>
          <MiniAvatar initial={review.user_handle.charAt(0)} />
          <span style={{ ...mono, color: 'var(--ink)', fontSize: '0.5rem' }}>{review.user_handle}</span>
          <span style={{ ...mono, fontSize: '0.5rem' }}>{timeAgo(review.created_at)}</span>
        </Box>
        <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', letterSpacing: '0.03em', mb: 0.125 }}>{review.band_name}</Typography>
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: review.body ? 0.5 : 0 }}>{review.release_title}</Typography>
        {review.body && (
          <Box sx={{ borderLeft: '2px solid var(--accent)', pl: 1, mb: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', lineHeight: 1.4, color: 'var(--ink)' }}>"{review.body}"</Typography>
          </Box>
        )}
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em' }} onClick={(e) => e.stopPropagation()}>
          <Box component="button" onClick={() => onHorns(review.id)} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, color: 'var(--accent)', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit' }}>✶ {review.horns_count}</Box>
          <span style={{ color: 'var(--muted)' }}>☍ 0</span>
          <span style={{ color: 'var(--muted)' }}>{review.rating}/10</span>
        </Box>
      </Box>
    </Box>
  )
}

function SoulsTeaser({ onTap }: { onTap: () => void }) {
  return (
    <Box onClick={onTap} sx={{ border: '1.5px solid rgba(216,207,184,0.18)', borderRadius: '3px', backgroundColor: '#120e18', py: 1.25, px: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', boxShadow: '2px 2px 0 rgba(216,207,184,.08)', transition: 'border-color 0.1s', '&:hover': { borderColor: 'rgba(216,207,184,0.3)' } }}>
      <span style={{ fontFamily: 'var(--font-display, "Archivo Black", sans-serif)', fontSize: '0.6875rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink)' }}>
        DISCOVER SOULS NEAR YOU
      </span>
      <span style={{ ...mono, fontSize: '0.5rem', color: 'var(--muted)' }}>SEE ALL →</span>
    </Box>
  )
}

function SkeletonFeed() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ height: 200, borderRadius: '3px', background: hatchBg, border: '1.5px solid rgba(216,207,184,0.1)' }} />
      {[0, 1, 2].map((i) => (
        <Box key={i} sx={{ display: 'flex', gap: 1.25, border: '1.5px solid rgba(216,207,184,0.1)', borderRadius: '3px', p: 1.25, backgroundColor: '#120e18' }}>
          <Box sx={{ width: 78, height: 78, flexShrink: 0, borderRadius: '2px', background: hatchBg }} />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.75, justifyContent: 'center' }}>
            <Box sx={{ height: 8, borderRadius: '2px', background: hatchBg, width: '60%' }} />
            <Box sx={{ height: 10, borderRadius: '2px', background: hatchBg, width: '80%' }} />
            <Box sx={{ height: 8, borderRadius: '2px', background: hatchBg, width: '45%' }} />
          </Box>
        </Box>
      ))}
    </Box>
  )
}

// ── Filter chip config ────────────────────────────────────────────────────────

const FILTER_CHIPS: { key: FilterKey; label: string; api: 'all' | 'coven' | 'near' | null }[] = [
  { key: 'all',     label: 'ALL',         api: 'all'   },
  { key: 'coven',   label: 'COVEN',       api: 'coven' },
  { key: 'near',    label: 'NEAR · 25KM', api: 'near'  },
  { key: 'matches', label: 'MATCHES',     api: null     },
  { key: 'unread',  label: 'UNREAD',      api: null     },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useUser()

  const [mode, setMode]                 = useState<FeedMode>('reviews')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [reviews, setReviews]           = useState<ReviewItem[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(false)
  const [pendingCoven, setPendingCoven] = useState(0)
  const [hornedIds, setHornedIds]       = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login')
  }, [user, authLoading, router])

  const fetchReviews = useCallback(async (filter: FilterKey) => {
    const apiFilter = FILTER_CHIPS.find((c) => c.key === filter)?.api
    if (!apiFilter) { setReviews([]); setLoading(false); return }
    setLoading(true); setError(false)
    try {
      const token = localStorage.getItem('access_token')
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res = await fetch(`${API_BASE}/api/v1/feed/reviews?filter=${apiFilter}&skip=0&limit=20`, { headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setReviews(await res.json())
    } catch { setError(true) }
    finally { setLoading(false) }
  }, [])

  const fetchCovenCount = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    try {
      const res = await fetch(`${API_BASE}/api/v1/feed/reviews/count`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setPendingCoven(data.pending_coven ?? 0) }
    } catch { /* non-critical */ }
  }, [])

  useEffect(() => {
    if (!authLoading && user) { fetchReviews(activeFilter); fetchCovenCount() }
  }, [activeFilter, authLoading, user, fetchReviews, fetchCovenCount])

  const handleHorns = (id: string) => {
    setHornedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setReviews((rs) => rs.map((r) => r.id === id ? { ...r, horns_count: r.horns_count - 1 } : r))
      } else {
        next.add(id)
        setReviews((rs) => rs.map((r) => r.id === id ? { ...r, horns_count: r.horns_count + 1 } : r))
      }
      return next
    })
  }

  const week = toRoman(getISOWeek(new Date()))

  if (authLoading) {
    return (<><Navigation /><Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}><SkeletonFeed /></Box></>)
  }

  const buildFeedItems = () => {
    if (loading) return <SkeletonFeed />
    if (error) {
      return (
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
          <span style={{ ...mono, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>◉ ERROR · COULD NOT REACH THE ALTAR.</span>
          <Box component="button" onClick={() => fetchReviews(activeFilter)} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 2, py: 0.75, background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
            [ TRY AGAIN ]
          </Box>
        </Box>
      )
    }

    const nodes: React.ReactNode[] = []
    const bucketA = reviews.slice(0, 2)
    const bucketB = reviews.slice(2, 4)
    const bucketC = reviews.slice(4)

    bucketA.forEach((review, idx) => {
      if (idx === 0 && review.body && review.body.length >= 80 && review.rating >= 8) {
        nodes.push(<HeroCard key={`hero-${review.id}`} review={review} onHorns={handleHorns} />)
        return
      }
      if (idx === 1 || idx === 0) nodes.push(<TimeDivider key={`divider-a-${idx}`} iso={review.created_at} />)
      nodes.push(<StandardCard key={review.id} review={review} onHorns={handleHorns} onClick={() => router.push(`/bands/${review.band_slug}/${review.release_slug}`)} />)
    })

    if (reviews.length === 0) {
      nodes.push(
        <Box key="quiet" sx={{ border: '1.5px solid rgba(216,207,184,0.12)', borderRadius: '3px', p: 2, textAlign: 'center', backgroundColor: '#120e18' }}>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9375rem', color: 'var(--muted)' }}>
            "The coven is quiet tonight."
          </Typography>
        </Box>
      )
    }

    nodes.push(<SoulsTeaser key="souls-teaser" onTap={() => setMode('people')} />)

    if (bucketB.length > 0) nodes.push(<TimeDivider key="divider-b" iso={bucketB[0].created_at} />)
    bucketB.forEach((review) => nodes.push(<StandardCard key={review.id} review={review} onHorns={handleHorns} onClick={() => router.push(`/bands/${review.band_slug}/${review.release_slug}`)} />))

    if (bucketC.length > 0) nodes.push(<TimeDivider key="divider-c" iso={bucketC[0].created_at} />)
    bucketC.forEach((review) => nodes.push(<StandardCard key={review.id} review={review} onHorns={handleHorns} onClick={() => router.push(`/bands/${review.band_slug}/${review.release_slug}`)} />))

    nodes.push(
      <Box key="terminator" sx={{ textAlign: 'center', mt: 3, mb: 1 }}>
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9375rem', color: 'var(--muted)', mb: 0.5 }}>
          "you have read everything."
        </Typography>
        <span style={{ ...mono, fontSize: '0.5rem' }}>↑ PULL TO REFRESH · OR REST.</span>
      </Box>
    )

    return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>{nodes}</Box>
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <span style={{ ...mono, color: 'var(--accent)', fontSize: '0.5625rem' }}>FEED · WEEK {week} · MMXXVI</span>
          <Box component="button" onClick={() => router.push('/bands')} sx={{ width: 32, height: 32, border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.875rem', transition: 'border-color 0.1s, color 0.1s', '&:hover': { borderColor: 'rgba(216,207,184,0.4)', color: 'var(--ink)' } }}>✎</Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.625, overflowX: 'auto', pb: 0.5, mb: 1.25, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          {FILTER_CHIPS.map((chip) => {
            const isActive = activeFilter === chip.key
            return (
              <Box key={chip.key} component="button" onClick={() => setActiveFilter(chip.key)} sx={{ flexShrink: 0, scrollSnapAlign: 'start', position: 'relative', border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 1.25, height: 26, display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', backgroundColor: isActive ? '#ece5d3' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: isActive ? '#120e18' : 'var(--muted)', transition: 'background 0.1s, color 0.1s' }}>
                {chip.label}
                {chip.key === 'coven' && pendingCoven > 0 && (
                  <Box sx={{ minWidth: 16, height: 16, borderRadius: '50%', backgroundColor: 'var(--accent)', color: '#ece5d3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.4rem', letterSpacing: 0 }}>
                    {pendingCoven > 99 ? '99+' : pendingCoven}
                  </Box>
                )}
                {chip.key === 'matches' && <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent)' }} />}
              </Box>
            )
          })}
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.75 }}>
          {(['reviews', 'people'] as FeedMode[]).map((m) => {
            const isActive = mode === m
            return (
              <Box key={m} component="button" onClick={() => setMode(m)} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 1.25, height: 28, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: isActive ? '#ece5d3' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: isActive ? '#120e18' : 'var(--muted)', transition: 'background 0.1s, color 0.1s' }}>
                {m === 'reviews' ? '◉ REVIEWS' : '◈ PEOPLE'}
              </Box>
            )
          })}
        </Box>

        {mode === 'people' && <SwipeFeed />}
        {mode === 'reviews' && buildFeedItems()}

      </Box>
    </>
  )
}
