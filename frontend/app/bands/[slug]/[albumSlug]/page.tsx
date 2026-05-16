'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { getRelease, getReviews, upsertReview, deleteReview } from '@/lib/bandsApi'
import type { ReleaseDetail, AlbumReview, AlbumReviewsData } from '@/lib/bandsApi'
import { useUser } from '@/app/context/UserContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const TYPE_COLORS: Record<string, string> = {
  LP: 'var(--accent, #c43a2a)',
  EP: '#9a7abf',
  'Split-EP': '#9a7abf',
  Demo: '#6a9a7a',
  Live: '#9a8a4a',
  Single: '#4a8a9a',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/** 10-box rating picker */
function RatingPicker({
  value,
  onChange,
  readonly = false,
}: {
  value: number | null
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? value

  return (
    <Box sx={{ display: 'flex', gap: 0.25 }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <Box
          key={n}
          onClick={() => !readonly && onChange?.(n)}
          onMouseEnter={() => !readonly && setHover(n)}
          onMouseLeave={() => !readonly && setHover(null)}
          sx={{
            width: 22, height: 22,
            border: `1px solid ${active !== null && n <= active ? 'rgba(196,58,42,0.7)' : 'rgba(216,207,184,0.18)'}`,
            borderRadius: '2px',
            backgroundColor: active !== null && n <= active ? 'rgba(196,58,42,0.18)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: 0,
            color: active !== null && n <= active ? 'var(--accent, #c43a2a)' : 'rgba(216,207,184,0.3)',
            cursor: readonly ? 'default' : 'pointer',
            transition: 'background 0.08s, border-color 0.08s, color 0.08s',
            userSelect: 'none',
          }}
        >
          {n}
        </Box>
      ))}
    </Box>
  )
}

/** Single review card */
function ReviewCard({
  review,
  isOwn,
  onDelete,
}: {
  review: AlbumReview
  isOwn: boolean
  onDelete: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <Box sx={{
      border: `1px solid ${isOwn ? 'rgba(196,58,42,0.2)' : 'rgba(216,207,184,0.1)'}`,
      borderRadius: '3px',
      backgroundColor: isOwn ? 'rgba(196,58,42,0.03)' : '#120e18',
      px: 1.5, py: 1.25,
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        {/* Avatar */}
        <Box sx={{
          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
          border: '1px solid rgba(216,207,184,0.15)',
          background: 'repeating-linear-gradient(135deg, #1a1424 0 3px, #120e18 3px 6px)',
          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {review.user_avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${API_BASE}${review.user_avatar_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'rgba(236,229,211,0.4)' }}>
              {review.user_handle.charAt(0).toUpperCase()}
            </span>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
              letterSpacing: '0.06em', color: 'var(--ink)',
            }}>
              {review.user_handle}
            </span>
            {isOwn && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em',
                color: 'rgba(196,58,42,0.7)', border: '1px solid rgba(196,58,42,0.25)',
                borderRadius: '2px', padding: '0 3px',
              }}>
                YOU
              </span>
            )}
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.5625rem',
              color: 'var(--muted)', letterSpacing: '0.04em',
            }}>
              {timeAgo(review.updated_at || review.created_at)}
            </span>
          </Box>
        </Box>

        {/* Rating badge */}
        <Box sx={{
          border: '1px solid rgba(196,58,42,0.4)', borderRadius: '2px',
          px: 0.75, height: 20, display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent, #c43a2a)', fontWeight: 600 }}>
            {review.rating}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'rgba(196,58,42,0.5)' }}>/10</span>
        </Box>
      </Box>

      {/* Body */}
      {review.body && (
        <Typography sx={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.8125rem', lineHeight: 1.65, color: 'rgba(236,229,211,0.8)',
          mb: isOwn ? 0.75 : 0,
        }}>
          {review.body}
        </Typography>
      )}

      {/* Delete own review */}
      {isOwn && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, mt: 0.5 }}>
          {confirmDelete ? (
            <>
              <Box component="button" onClick={() => setConfirmDelete(false)}
                sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.75, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
                CANCEL
              </Box>
              <Box component="button" onClick={onDelete}
                sx={{ border: '1px solid rgba(196,58,42,0.5)', borderRadius: '2px', px: 0.75, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' } }}>
                CONFIRM DELETE
              </Box>
            </>
          ) : (
            <Box component="button" onClick={() => setConfirmDelete(true)}
              sx={{ border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'rgba(196,58,42,0.45)', '&:hover': { color: 'var(--accent)' }, p: 0 }}>
              delete review
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

/** Review write form + list section */
function ReviewSection({ bandSlug, releaseSlug }: { bandSlug: string; releaseSlug: string }) {
  const { user } = useUser()
  const [data, setData] = useState<AlbumReviewsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [rating, setRating] = useState<number | null>(null)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    getReviews(bandSlug, releaseSlug)
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [bandSlug, releaseSlug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill form with existing review
  useEffect(() => {
    if (data?.my_review) {
      setRating(data.my_review.rating)
      setBody(data.my_review.body || '')
    }
  }, [data?.my_review])

  const showFlash = (msg: string) => {
    setFlash(msg); setTimeout(() => setFlash(null), 3000)
  }

  const handleSubmit = async () => {
    if (!rating) return
    setSubmitting(true); setErr(null)
    try {
      await upsertReview(bandSlug, releaseSlug, rating, body.trim() || null)
      showFlash(data?.my_review ? 'Review updated' : 'Review published')
      load()
    } catch {
      setErr('Could not save review — try again')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteReview(bandSlug, releaseSlug)
      setRating(null); setBody('')
      showFlash('Review deleted')
      load()
    } catch { /* silent */ }
  }

  const lbl: React.CSSProperties = {
    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
    fontSize: '0.6875rem', letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'var(--muted, #7A756D)',
  }

  return (
    <Box sx={{ px: 2, pt: 2.5, pb: 2 }}>
      {/* Section header */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
        <span style={lbl}>◈ REVIEWS</span>
        {!loading && data && data.count > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--accent, #c43a2a)', fontWeight: 600 }}>
              {data.avg_rating?.toFixed(1)}
            </span>
            <span style={{ ...lbl, fontSize: '0.5625rem' }}>AVG · {data.count} review{data.count !== 1 ? 's' : ''}</span>
          </Box>
        )}
      </Box>

      {/* Write / edit form — only when logged in */}
      {user && (
        <Box sx={{
          border: `1.5px solid ${data?.my_review ? 'rgba(196,58,42,0.2)' : 'rgba(216,207,184,0.15)'}`,
          borderRadius: '3px', backgroundColor: '#120e18',
          px: 1.5, py: 1.25, mb: 1.5,
        }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 8 }}>
            {data?.my_review ? 'YOUR REVIEW' : 'WRITE A REVIEW'}
          </span>

          {/* Rating picker */}
          <Box sx={{ mb: 1 }}>
            <span style={{ ...lbl, fontSize: '0.625rem', display: 'block', marginBottom: 5 }}>SCORE (1–10)</span>
            <RatingPicker value={rating} onChange={setRating} />
          </Box>

          {/* Text area */}
          <Box sx={{ mb: 1 }}>
            <span style={{ ...lbl, fontSize: '0.625rem', display: 'block', marginBottom: 5 }}>REVIEW (OPTIONAL)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your thoughts on this release…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'vertical',
                background: '#0a0810', border: '1px solid rgba(216,207,184,0.15)',
                borderRadius: '3px', color: 'var(--ink)',
                fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem',
                lineHeight: 1.6, padding: '8px 10px', outline: 'none',
              }}
            />
          </Box>

          {err && <span style={{ ...lbl, fontSize: '0.5625rem', color: 'var(--accent)', display: 'block', marginBottom: 6 }}>⚠ {err}</span>}
          {flash && <span style={{ ...lbl, fontSize: '0.5625rem', color: '#6a9a7a', display: 'block', marginBottom: 6 }}>✓ {flash}</span>}

          <Box sx={{ display: 'flex', gap: 0.625 }}>
            <Box component="button" onClick={handleSubmit} disabled={!rating || submitting}
              sx={{
                border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '2px',
                px: 1.25, height: 24, background: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em',
                color: 'var(--ink)', transition: 'border-color 0.12s',
                '&:not(:disabled):hover': { borderColor: 'rgba(216,207,184,0.6)' },
                '&:disabled': { opacity: 0.35, cursor: 'default' },
              }}>
              {submitting ? '…' : data?.my_review ? 'UPDATE REVIEW' : 'PUBLISH REVIEW'}
            </Box>
          </Box>
        </Box>
      )}

      {/* Reviews list */}
      {loading ? (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <span style={{ ...lbl, fontSize: '0.5625rem' }}>loading…</span>
        </Box>
      ) : !data || data.reviews.length === 0 ? (
        <Box sx={{ py: 2, textAlign: 'center' }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', color: 'rgba(216,207,184,0.3)' }}>
            {user ? 'Be the first to review this release' : 'No reviews yet'}
          </span>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625 }}>
          {data.reviews.map((rv) => (
            <ReviewCard
              key={rv.id}
              review={rv}
              isOwn={!!user && rv.user_id === user.id}
              onDelete={handleDelete}
            />
          ))}
        </Box>
      )}

      {!user && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', color: 'rgba(216,207,184,0.3)' }}>
            sign in to write a review
          </span>
        </Box>
      )}
    </Box>
  )
}

export default function AlbumPage({
  params,
}: {
  params: { slug: string; albumSlug: string }
}) {
  const { slug, albumSlug } = params
  const router = useRouter()
  const [result, setResult] = useState<ReleaseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedTrack, setExpandedTrack] = useState<number | null>(null)

  useEffect(() => {
    getRelease(slug, albumSlug).then((r) => {
      setResult(r)
      setLoading(false)
    })
  }, [slug, albumSlug])

  if (loading) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--muted)' }}>loading…</span>
        </Box>
      </>
    )
  }

  if (!result) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--accent)' }}>☍ RELEASE NOT FOUND</span>
        </Box>
      </>
    )
  }

  const { band, release } = result
  const typeColor = TYPE_COLORS[release.type] || 'rgba(216,207,184,0.4)'

  const totalSeconds = release.tracks.reduce((acc, t) => {
    const [m, s] = t.duration.split(':').map(Number)
    return acc + m * 60 + (s || 0)
  }, 0)
  const totalMins = Math.floor(totalSeconds / 60)
  const totalSecs = totalSeconds % 60

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', pb: 10 }}>

        {/* Artwork — full width */}
        <Box sx={{
          width: '100%', aspectRatio: '1 / 1', position: 'relative',
          background: 'repeating-linear-gradient(135deg, #1e1428 0 6px, #120e18 6px 12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {/* Atmospheric glow */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(circle at 38% 38%, ${typeColor}1a, transparent 60%)`,
          }} />
          {/* Second glow accent */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(circle at 72% 68%, rgba(120,80,180,.07), transparent 50%)',
          }} />

          {/* Large initial watermark */}
          <Typography sx={{
            fontFamily: 'var(--font-display)', fontSize: 'clamp(8rem, 35vw, 14rem)',
            color: 'rgba(236,229,211,0.04)', lineHeight: 1, position: 'relative', zIndex: 1,
            userSelect: 'none',
          }}>
            {release.title.charAt(0)}
          </Typography>

          {/* Type badge */}
          <Box sx={{
            position: 'absolute', top: 14, right: 14,
            border: `1.5px solid ${typeColor}`, borderRadius: '2px',
            px: 1, height: 22, display: 'flex', alignItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em',
            color: typeColor, backgroundColor: 'rgba(8,6,10,0.85)',
          }}>
            {release.type}
          </Box>

          {/* Fret mock — play button area */}
          <Box sx={{
            position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
            border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '20px',
            px: 2, py: 0.75, display: 'flex', alignItems: 'center', gap: 1,
            backgroundColor: 'rgba(8,6,10,0.75)',
          }}>
            <span style={{ ...lbl, color: 'var(--muted)', fontSize: '0.875rem', lineHeight: 1 }}>▶</span>
            <span style={{ ...lbl, color: 'var(--muted)' }}>PLAY ON SPOTIFY</span>
          </Box>
        </Box>

        {/* Metadata block */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
          {/* Back nav */}
          <Box
            component="button"
            onClick={() => router.push(`/bands/${band.slug}`)}
            sx={{
              background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 1.75,
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
              letterSpacing: '0.12em', color: 'var(--muted)', textTransform: 'uppercase',
              '&:hover': { color: 'var(--ink)' }, transition: 'color 0.1s',
            }}
          >
            ← {band.name}
          </Box>

          <Typography variant="h4" sx={{ fontSize: '1.25rem', lineHeight: 1.2, mb: 0.5 }}>
            {release.title}
          </Typography>
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.875rem', color: 'var(--muted)', mb: 1,
          }}>
            {band.name}
          </Typography>
          <span style={{ ...lbl, fontSize: '0.625rem' }}>
            {release.year}
            {release.label ? ` · ${release.label}` : ''}
            {` · ${release.tracks.length} track${release.tracks.length !== 1 ? 's' : ''}`}
            {` · ${totalMins}:${String(totalSecs).padStart(2, '0')}`}
          </span>
        </Box>

        {/* Divider */}
        <Box sx={{ mx: 2, borderTop: '1px solid rgba(216,207,184,0.1)', mb: 0 }} />

        {/* Tracklist */}
        <Box sx={{ px: 2, pt: 1.5 }}>

          <span style={{ ...lbl, display: 'block', marginBottom: 10 }}>◉ TRACKLIST</span>

          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {release.tracks.map((track) => {
              const isExpanded = expandedTrack === track.number
              const hasLyrics = !!track.lyrics

              return (
                <Box key={track.number}>
                  {/* Track row */}
                  <Box
                    onClick={() => {
                      if (!hasLyrics) return
                      setExpandedTrack(isExpanded ? null : track.number)
                    }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.25,
                      py: 1.125, borderBottom: '1px solid rgba(216,207,184,0.08)',
                      cursor: hasLyrics ? 'pointer' : 'default',
                      transition: 'opacity 0.1s',
                      '&:hover': hasLyrics ? { opacity: 0.8 } : {},
                    }}
                  >
                    {/* Track number */}
                    <Box sx={{
                      width: 22, flexShrink: 0, textAlign: 'right',
                      fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
                      letterSpacing: '0.06em', color: 'var(--muted)',
                    }}>
                      {isExpanded ? '▾' : String(track.number).padStart(2, '0')}
                    </Box>

                    {/* Title */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                        fontSize: '0.875rem', lineHeight: 1.3,
                        color: 'var(--ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {track.title}
                      </Typography>
                    </Box>

                    {/* Lyrics indicator + duration */}
                    <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                      {hasLyrics && (
                        <span style={{ ...lbl, fontSize: '0.5625rem', color: typeColor }}>
                          LYRICS
                        </span>
                      )}
                      <span style={{ ...lbl, fontSize: '0.625rem' }}>{track.duration}</span>
                    </Box>
                  </Box>

                  {/* Lyrics panel */}
                  {isExpanded && track.lyrics && (
                    <Box sx={{
                      mx: -2, px: 4, py: 2,
                      backgroundColor: '#08060a',
                      borderBottom: '1px solid rgba(216,207,184,0.08)',
                    }}>
                      <Typography sx={{
                        fontFamily: 'var(--font-serif)', fontStyle: 'italic',
                        fontSize: '0.9375rem', lineHeight: 1.85,
                        color: 'rgba(236,229,211,0.72)',
                        whiteSpace: 'pre-line',
                      }}>
                        {track.lyrics}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* Reviews */}
        <Box sx={{ mx: 2, borderTop: '1px solid rgba(216,207,184,0.1)', mt: 1 }} />
        <ReviewSection bandSlug={slug} releaseSlug={albumSlug} />
      </Box>
    </>
  )
}
