'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import TagPicker from '@/app/components/TagPicker'
import { getBand, removeBandTag, suggestAlbum } from '@/lib/bandsApi'
import type { Band, Release } from '@/lib/bandsApi'
import { bandFavouritesApi } from '@/lib/bandFavouritesApi'
import { useUser } from '@/app/context/UserContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
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

const RELEASE_TYPES = ['LP', 'EP', 'Split-EP', 'Demo', 'Live', 'Single', 'Compilation']

function ReleaseCard({ release, bandSlug, onClick }: { release: Release; bandSlug: string; onClick: () => void }) {
  const typeColor = TYPE_COLORS[release.type] || 'rgba(216,207,184,0.4)'
  const trackCount = release.tracks.length
  const totalSeconds = release.tracks.reduce((acc, t) => {
    const [m, s] = t.duration.split(':').map(Number)
    return acc + m * 60 + (s || 0)
  }, 0)
  const totalMins = Math.round(totalSeconds / 60)

  return (
    <Box
      onClick={onClick}
      sx={{
        border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
        backgroundColor: '#120e18', cursor: 'pointer',
        boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.06)',
        transition: 'box-shadow 0.1s, border-color 0.1s',
        overflow: 'hidden',
        '&:hover': { borderColor: 'rgba(216,207,184,0.35)', boxShadow: '3px 3px 0 rgba(216,207,184,.1)' },
        '&:active': { transform: 'translate(1px,1px)', boxShadow: 'none' },
      }}
    >
      {/* Artwork placeholder */}
      <Box sx={{
        width: '100%', aspectRatio: '1 / 1', position: 'relative',
        background: 'repeating-linear-gradient(135deg, #1e1428 0 5px, #120e18 5px 10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at 35% 35%, ${typeColor}22, transparent 65%)`,
        }} />
        <Typography sx={{
          fontFamily: 'var(--font-display)', fontSize: '2.5rem',
          color: 'rgba(236,229,211,0.08)', lineHeight: 1, textAlign: 'center',
          px: 1, position: 'relative', zIndex: 1,
        }}>
          {release.title.charAt(0)}
        </Typography>
        {/* Type badge */}
        <Box sx={{
          position: 'absolute', top: 8, left: 8,
          border: `1.5px solid ${typeColor}`, borderRadius: '2px',
          px: 0.75, height: 18, display: 'flex', alignItems: 'center',
          fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em',
          color: typeColor, backgroundColor: 'rgba(8,6,10,0.8)',
        }}>
          {release.type}
        </Box>
      </Box>

      {/* Info */}
      <Box sx={{ px: 1.25, py: 1 }}>
        <Typography sx={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic',
          fontSize: '0.8125rem', lineHeight: 1.3, mb: 0.375,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {release.title}
        </Typography>
        <span style={{ ...lbl, fontSize: '0.5rem' }}>
          {release.year} · {trackCount} track{trackCount !== 1 ? 's' : ''} · {totalMins} min
        </span>
      </Box>
    </Box>
  )
}

export default function BandPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const router = useRouter()
  const { user } = useUser()
  const [band, setBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFavourite, setIsFavourite] = useState(false)
  const [favLoading, setFavLoading] = useState(false)
  /** Bumping this triggers a band reload (e.g. after tag mutation). */
  const [refetchKey, setRefetchKey] = useState(0)
  /** Non-null for a few seconds after a successful match against Spotify/Last.fm */
  const [matchNotice, setMatchNotice] = useState<string | null>(null)

  // Suggest album form
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestTitle, setSuggestTitle] = useState('')
  const [suggestType, setSuggestType] = useState('')
  const [suggestYear, setSuggestYear] = useState('')
  const [suggestStatus, setSuggestStatus] = useState<'idle' | 'submitting' | 'success' | 'duplicate' | 'error'>('idle')
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const reload = useCallback(() => setRefetchKey((k) => k + 1), [])

  useEffect(() => {
    setLoading(true)
    getBand(slug).then((b) => {
      setBand(b)
      setLoading(false)
      if (b) {
        bandFavouritesApi.getStatus(b.id)
          .then((s) => setIsFavourite(s.is_favourite))
          .catch(() => {})
      }
    })
  }, [slug, refetchKey])

  const handleToggleFavourite = async () => {
    if (!band || favLoading) return
    setFavLoading(true)
    try {
      if (isFavourite) {
        await bandFavouritesApi.remove(band.id)
        setIsFavourite(false)
        setMatchNotice(null)
      } else {
        const result = await bandFavouritesApi.add(band.id)
        setIsFavourite(true)
        if (result?.matched_external && result.matched_artist_name) {
          const src = result.matched_source === 'spotify'
            ? 'Spotify'
            : result.matched_source === 'lastfm'
            ? 'Last.fm'
            : 'Spotify & Last.fm'
          setMatchNotice(`Matched from your ${src} library`)
          setTimeout(() => setMatchNotice(null), 4000)
        }
      }
    } catch {
      // silently ignore — user might not be logged in
    } finally {
      setFavLoading(false)
    }
  }

  const handleRemoveTag = useCallback(async (nodeId: string) => {
    if (!band) return
    try {
      await removeBandTag(band.id, nodeId)
      reload()
    } catch {
      // silently ignore
    }
  }, [band, reload])

  const handleSuggestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!band || !suggestTitle.trim()) return
    setSuggestStatus('submitting')
    setSuggestError(null)
    try {
      await suggestAlbum(
        band.id,
        suggestTitle.trim(),
        suggestType || null,
        suggestYear ? parseInt(suggestYear) : null,
      )
      setSuggestStatus('success')
      setSuggestTitle('')
      setSuggestType('')
      setSuggestYear('')
      setTimeout(() => {
        setShowSuggest(false)
        setSuggestStatus('idle')
      }, 2500)
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || ''
      if (msg.includes('already exists') || msg.includes('already been suggested')) {
        setSuggestStatus('duplicate')
        setSuggestError(msg)
      } else {
        setSuggestStatus('error')
        setSuggestError('Could not submit — please try again.')
      }
    }
  }

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

  if (!band) {
    return (
      <>
        <Navigation />
        <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--accent)' }}>☍ BAND NOT FOUND</span>
        </Box>
      </>
    )
  }

  const lps = band.releases.filter((r) => r.type === 'LP')
  const other = band.releases.filter((r) => r.type !== 'LP')
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin'

  // Shared styles for tag/genre remove button
  const removeBtn: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0 0 0 3px',
    lineHeight: 1,
    color: 'inherit',
    opacity: 0.5,
    fontSize: '0.5rem',
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Back + Favourite */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box
            component="button"
            onClick={() => router.push('/bands')}
            sx={{
              background: 'none', border: 'none', cursor: 'pointer', p: 0,
              display: 'flex', alignItems: 'center', gap: 0.75,
              fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
              letterSpacing: '0.12em', color: 'var(--muted)',
              '&:hover': { color: 'var(--ink)' }, transition: 'color 0.1s',
            }}
          >
            ← BANDS
          </Box>
          <Box
            component="button"
            onClick={handleToggleFavourite}
            disabled={favLoading}
            sx={{
              background: 'none',
              border: `1.5px solid ${isFavourite ? 'var(--accent, #c43a2a)' : 'rgba(216,207,184,0.2)'}`,
              borderRadius: '3px',
              px: 1.25, height: 26,
              cursor: favLoading ? 'default' : 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.4375rem',
              letterSpacing: '0.12em',
              color: isFavourite ? 'var(--accent, #c43a2a)' : 'var(--muted)',
              display: 'flex', alignItems: 'center', gap: 0.5,
              transition: 'border-color 0.15s, color 0.15s',
              '&:hover:not(:disabled)': {
                borderColor: isFavourite ? 'var(--accent, #c43a2a)' : 'rgba(216,207,184,0.4)',
                color: isFavourite ? 'var(--accent, #c43a2a)' : 'var(--ink)',
              },
            }}
          >
            {isFavourite ? '♥ FAVOURITED' : '♡ FAVOURITE'}
          </Box>
        </Box>

        {/* Library-match notice — appears briefly after a Spotify/Last.fm match */}
        {matchNotice && (
          <Box sx={{
            mb: 1.5,
            border: '1px solid rgba(196,58,42,0.35)',
            borderRadius: '3px',
            backgroundColor: 'rgba(196,58,42,0.08)',
            px: 1.25, py: 0.75,
            display: 'flex', alignItems: 'center', gap: 0.75,
          }}>
            <span style={{ fontSize: '0.75rem', lineHeight: 1 }}>◈</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(236,229,211,0.7)',
            }}>
              {matchNotice}
            </span>
          </Box>
        )}

        {/* Band header */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, alignItems: 'flex-start' }}>
          {/* Logo — real image if available, initial letter fallback otherwise */}
          <Box sx={{
            width: 88, height: 88, flexShrink: 0,
            border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '4px',
            background: 'repeating-linear-gradient(135deg, #1a1424 0 4px, #120e18 4px 8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            {band.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={`${API_BASE}${band.logo_url}`}
                alt={`${band.name} logo`}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <>
                <Box sx={{
                  position: 'absolute', inset: 0,
                  background: 'radial-gradient(circle at 38% 38%, rgba(196,58,42,.2), transparent 65%)',
                }} />
                <Typography sx={{
                  fontFamily: 'var(--font-display)', fontSize: '3rem',
                  color: 'rgba(236,229,211,0.55)', lineHeight: 1, position: 'relative', zIndex: 1,
                }}>
                  {band.name.charAt(0)}
                </Typography>
              </>
            )}
          </Box>

          {/* Name + meta */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" sx={{ fontSize: '1.125rem', lineHeight: 1.2, mb: 0.75 }}>
              {band.name}
            </Typography>

            {/* Genres + Tags + Picker */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75, alignItems: 'center' }}>

              {/* Genre chips */}
              {band.genres.map((g) => (
                <Box
                  key={g.id}
                  sx={{
                    border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px',
                    px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
                  }}
                >
                  {g.name}
                  {user && (
                    <button
                      style={removeBtn}
                      onClick={() => handleRemoveTag(g.id)}
                      title={`Remove genre ${g.name}`}
                    >
                      ×
                    </button>
                  )}
                </Box>
              ))}

              {/* Tag chips (purple-tinted to distinguish from genres) */}
              {band.tags.map((t) => (
                <Box
                  key={t.id}
                  sx={{
                    border: '1px solid rgba(154,122,191,0.35)', borderRadius: '2px',
                    px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center',
                    fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'rgba(154,122,191,0.85)',
                  }}
                >
                  {t.name}
                  {user && (
                    <button
                      style={removeBtn}
                      onClick={() => handleRemoveTag(t.id)}
                      title={`Remove tag ${t.name}`}
                    >
                      ×
                    </button>
                  )}
                </Box>
              ))}

              {/* Tag picker — authenticated users only */}
              {user && (
                <TagPicker
                  bandId={band.id}
                  appliedGenreIds={band.genres.map((g) => g.id)}
                  appliedTagIds={band.tags.map((t) => t.id)}
                  isAdmin={isAdmin}
                  onDone={reload}
                />
              )}
            </Box>

            <span style={{ ...lbl, fontSize: '0.5rem' }}>
              {band.country} · est. {band.formed}
            </span>
          </Box>
        </Box>

        {/* Band photo — 16:9 banner, only shown when one has been uploaded */}
        {band.image_url && (
          <Box sx={{
            width: '100%', aspectRatio: '16 / 9',
            borderRadius: '3px', overflow: 'hidden', mb: 2.5,
            border: '1.5px solid rgba(216,207,184,0.12)',
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${API_BASE}${band.image_url}`}
              alt={`${band.name}`}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </Box>
        )}

        {/* Bio */}
        {band.bio && (
          <Box sx={{
            border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
            backgroundColor: '#120e18', px: 1.5, py: 1.25, mb: 2.5,
          }}>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>ABOUT</span>
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--muted)',
            }}>
              {band.bio}
            </Typography>
          </Box>
        )}

        {/* Discography — LPs */}
        {lps.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
              <span style={lbl}>◉ FULL-LENGTHS</span>
              <span style={{ ...lbl, fontSize: '0.5rem' }}>{lps.length} LP{lps.length !== 1 ? 's' : ''}</span>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mb: 2.5 }}>
              {lps.map((r) => (
                <ReleaseCard
                  key={r.id}
                  release={r}
                  bandSlug={band.slug}
                  onClick={() => router.push(`/bands/${band.slug}/${r.slug}`)}
                />
              ))}
            </Box>
          </>
        )}

        {/* Other releases */}
        {other.length > 0 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
              <span style={lbl}>◈ OTHER RELEASES</span>
              <span style={{ ...lbl, fontSize: '0.5rem' }}>{other.length}</span>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75 }}>
              {other.map((r) => (
                <ReleaseCard
                  key={r.id}
                  release={r}
                  bandSlug={band.slug}
                  onClick={() => router.push(`/bands/${band.slug}/${r.slug}`)}
                />
              ))}
            </Box>
          </>
        )}

        {band.releases.length === 0 && (
          <Box sx={{ textAlign: 'center', pt: 3 }}>
            <span style={{ ...lbl, color: 'var(--muted)' }}>no releases yet</span>
          </Box>
        )}

        {/* ── Suggest an album ── */}
        {user && (
          <Box sx={{ mt: 3, borderTop: '1px solid rgba(216,207,184,0.08)', pt: 2.5 }}>
            {!showSuggest ? (
              <Box
                component="button"
                onClick={() => { setShowSuggest(true); setSuggestStatus('idle'); setSuggestError(null) }}
                sx={{
                  background: 'none',
                  border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px',
                  px: 1.25, height: 26,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                  letterSpacing: '0.12em', color: 'var(--muted)',
                  '&:hover': { borderColor: 'rgba(216,207,184,0.35)', color: 'var(--ink)' },
                  transition: 'border-color 0.15s, color 0.15s',
                }}
              >
                ＋ SUGGEST ALBUM
              </Box>
            ) : (
              <Box
                component="form"
                onSubmit={handleSuggestSubmit}
                sx={{
                  border: '1.5px solid rgba(216,207,184,0.18)', borderRadius: '3px',
                  backgroundColor: '#120e18', p: '14px 16px',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ ...lbl, fontSize: '0.5rem' }}>SUGGEST AN ALBUM</span>
                  <Box
                    component="button"
                    type="button"
                    onClick={() => { setShowSuggest(false); setSuggestStatus('idle'); setSuggestError(null) }}
                    sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}
                  >
                    ✕
                  </Box>
                </Box>

                {suggestStatus === 'success' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.5 }}>
                    <span style={{ ...lbl, fontSize: '0.5rem', color: '#6a9a7a', letterSpacing: '0.1em' }}>
                      ✓ SUGGESTION SUBMITTED — THANKS!
                    </span>
                  </Box>
                ) : (
                  <>
                    {/* Title */}
                    <Box>
                      <span style={{ ...lbl, fontSize: '0.4375rem', display: 'block', marginBottom: 4 }}>ALBUM TITLE *</span>
                      <input
                        type="text"
                        value={suggestTitle}
                        onChange={(e) => { setSuggestTitle(e.target.value); setSuggestStatus('idle'); setSuggestError(null) }}
                        placeholder="e.g. Under a Funeral Moon"
                        required
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)',
                          borderRadius: '3px', color: 'var(--ink)',
                          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem',
                          padding: '7px 10px', outline: 'none',
                        }}
                      />
                    </Box>

                    {/* Type + Year row */}
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <span style={{ ...lbl, fontSize: '0.4375rem', display: 'block', marginBottom: 4 }}>TYPE</span>
                        <select
                          value={suggestType}
                          onChange={(e) => setSuggestType(e.target.value)}
                          style={{
                            width: '100%',
                            background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)',
                            borderRadius: '3px', color: suggestType ? 'var(--ink)' : 'var(--muted)',
                            fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.06em',
                            padding: '7px 8px', outline: 'none',
                          }}
                        >
                          <option value="">— optional —</option>
                          {RELEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </Box>
                      <Box sx={{ width: 90 }}>
                        <span style={{ ...lbl, fontSize: '0.4375rem', display: 'block', marginBottom: 4 }}>YEAR</span>
                        <input
                          type="number"
                          value={suggestYear}
                          onChange={(e) => setSuggestYear(e.target.value)}
                          placeholder="optional"
                          min={1960}
                          max={2100}
                          style={{
                            width: '100%', boxSizing: 'border-box',
                            background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)',
                            borderRadius: '3px', color: 'var(--ink)',
                            fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                            padding: '7px 8px', outline: 'none',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Error feedback */}
                    {(suggestStatus === 'duplicate' || suggestStatus === 'error') && suggestError && (
                      <span style={{ ...lbl, fontSize: '0.4375rem', color: 'var(--accent)', letterSpacing: '0.08em' }}>
                        ⚠ {suggestError}
                      </span>
                    )}

                    {/* Submit */}
                    <Box
                      component="button"
                      type="submit"
                      disabled={suggestStatus === 'submitting' || !suggestTitle.trim()}
                      sx={{
                        border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px',
                        py: 0.875, background: 'none', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                        letterSpacing: '0.12em', color: 'var(--ink)',
                        '&:disabled': { opacity: 0.4, cursor: 'default' },
                        '&:not(:disabled):hover': { borderColor: 'rgba(216,207,184,0.55)' },
                        transition: 'border-color 0.15s',
                      }}
                    >
                      {suggestStatus === 'submitting' ? 'SUBMITTING…' : 'SUBMIT SUGGESTION'}
                    </Box>
                  </>
                )}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </>
  )
}
