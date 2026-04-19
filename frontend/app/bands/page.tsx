'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { useUser } from '@/app/context/UserContext'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const PAGE_SIZE = 25

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const TYPE_COLORS: Record<string, string> = {
  LP: 'var(--accent, #c43a2a)',
  EP: '#7a5c9a',
  'Split-EP': '#7a5c9a',
  Demo: '#5c7a6a',
  Live: '#7a6a3a',
}

export default function BandsPage() {
  const router = useRouter()
  const { user, isLoading } = useUser()

  const [bands, setBands] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [query, setQuery] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [bandsLoading, setBandsLoading] = useState(true)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isLoading && !user) router.push('/auth/login')
  }, [user, isLoading, router])

  const fetchBands = useCallback((q: string, p: number) => {
    setBandsLoading(true)
    const token = localStorage.getItem('access_token')
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      skip: String(p * PAGE_SIZE),
      ...(q ? { q } : {}),
    })
    axios
      .get(`${API_BASE}/api/v1/bands?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      .then((res) => {
        const data = res.data
        if (Array.isArray(data)) {
          setBands(data)
          setTotal(data.length)
        } else {
          setBands(data.bands ?? [])
          setTotal(data.total ?? 0)
        }
      })
      .catch(console.error)
      .finally(() => setBandsLoading(false))
  }, [])

  useEffect(() => {
    fetchBands(query, page)
  }, [query, page, fetchBands])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setQuery(val)
      setPage(0)
    }, 300)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <span style={lbl}>◆ BANDS</span>
          <span style={{ ...lbl, fontSize: '0.5rem' }}>
            {bandsLoading ? '…' : `${total} IN CATALOGUE`}
          </span>
        </Box>

        {/* Search */}
        <Box sx={{ mb: 2, position: 'relative' }}>
          <Box
            component="input"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Search bands…"
            sx={{
              width: '100%',
              background: '#120e18',
              border: '1.5px solid rgba(216,207,184,0.18)',
              borderRadius: '3px',
              px: 1.5,
              py: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.625rem',
              letterSpacing: '0.08em',
              color: 'var(--ink)',
              outline: 'none',
              boxSizing: 'border-box',
              '&::placeholder': { color: 'var(--muted)' },
              '&:focus': { borderColor: 'rgba(216,207,184,0.4)' },
              transition: 'border-color 0.15s',
            }}
          />
          {inputValue && (
            <Box
              component="button"
              onClick={() => { setInputValue(''); setQuery(''); setPage(0) }}
              sx={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
                color: 'var(--muted)', p: 0,
              }}
            >
              ✕
            </Box>
          )}
        </Box>

        {/* Loading */}
        {bandsLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={18} sx={{ color: 'var(--accent)' }} />
          </Box>
        )}

        {/* Empty state */}
        {!bandsLoading && bands.length === 0 && (
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center', mt: 6,
          }}>
            {query ? `No bands matching "${query}"` : 'No bands in catalogue yet.'}
          </Typography>
        )}

        {/* Band list */}
        {!bandsLoading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {bands.map((band) => {
              const sortedReleases = [...(band.releases || [])].sort((a: any, b: any) => (b.year ?? 0) - (a.year ?? 0))
              const latestRelease = sortedReleases[0]
              return (
                <Box
                  key={band.id}
                  onClick={() => router.push(`/bands/${band.slug}`)}
                  sx={{
                    display: 'flex', gap: 1.5, alignItems: 'center',
                    border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                    backgroundColor: '#120e18', px: 1.5, py: 1.25,
                    cursor: 'pointer',
                    boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.06)',
                    transition: 'box-shadow 0.1s, border-color 0.1s',
                    '&:hover': { borderColor: 'rgba(216,207,184,0.35)', boxShadow: '3px 3px 0 rgba(216,207,184,.1)' },
                    '&:active': { transform: 'translate(1px,1px)', boxShadow: 'none' },
                  }}
                >
                  {/* Logo block */}
                  <Box sx={{
                    width: 54, height: 54, flexShrink: 0,
                    border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
                    background: 'repeating-linear-gradient(135deg, #1a1424 0 4px, #120e18 4px 8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <Box sx={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(circle at 40% 40%, rgba(196,58,42,.12), transparent 70%)',
                    }} />
                    <Typography sx={{
                      fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
                      fontSize: '1.5rem', color: 'rgba(236,229,211,0.5)', lineHeight: 1,
                      position: 'relative', zIndex: 1,
                    }}>
                      {band.name.charAt(0)}
                    </Typography>
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{
                      fontFamily: 'var(--font-display)', fontSize: '0.875rem',
                      letterSpacing: '0.03em', mb: 0.375, lineHeight: 1.2,
                    }}>
                      {band.name}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
                      {(band.genres || []).slice(0, 2).map((g: any) => (
                        <Box key={g.id ?? g} sx={{
                          border: '1px solid rgba(216,207,184,0.18)', borderRadius: '2px',
                          px: 0.625, height: 16, display: 'inline-flex', alignItems: 'center',
                          fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                          letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
                        }}>
                          {g.name ?? g}
                        </Box>
                      ))}
                    </Box>
                    <span style={{ ...lbl, fontSize: '0.5rem' }}>
                      {band.country_code} · est. {band.formed} · {(band.releases || []).length} releases
                    </span>
                  </Box>

                  {/* Latest release */}
                  {latestRelease && (
                    <Box sx={{ flexShrink: 0, textAlign: 'right' }}>
                      <Box sx={{
                        border: `1px solid ${TYPE_COLORS[latestRelease.type] || 'rgba(216,207,184,0.2)'}`,
                        borderRadius: '2px', px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em',
                        color: TYPE_COLORS[latestRelease.type] || 'var(--muted)', mb: 0.5,
                      }}>
                        {latestRelease.type}
                      </Box>
                      <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--muted)', display: 'block', textAlign: 'right' }}>
                        {latestRelease.year}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        )}

        {/* Pagination */}
        {!bandsLoading && totalPages > 1 && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 3 }}>
            <Box
              component="button"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              sx={{
                background: 'none', border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                px: 1.5, py: 0.75, cursor: page === 0 ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em',
                color: page === 0 ? 'rgba(216,207,184,0.25)' : 'var(--ink)',
                borderColor: page === 0 ? 'rgba(216,207,184,0.1)' : 'rgba(216,207,184,0.2)',
                '&:hover:not(:disabled)': { borderColor: 'rgba(216,207,184,0.4)' },
              }}
            >
              ← PREV
            </Box>

            {/* Page numbers */}
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => Math.abs(i - page) <= 2 || i === 0 || i === totalPages - 1)
                .reduce<(number | '…')[]>((acc, i, idx, arr) => {
                  if (idx > 0 && i - (arr[idx - 1] as number) > 1) acc.push('…')
                  acc.push(i)
                  return acc
                }, [])
                .map((item, idx) =>
                  item === '…' ? (
                    <span key={`ellipsis-${idx}`} style={{ ...lbl, lineHeight: '28px', padding: '0 2px' }}>…</span>
                  ) : (
                    <Box
                      key={item}
                      component="button"
                      onClick={() => setPage(item as number)}
                      sx={{
                        width: 28, height: 28,
                        background: item === page ? 'rgba(216,207,184,0.08)' : 'none',
                        border: `1.5px solid ${item === page ? 'rgba(216,207,184,0.35)' : 'rgba(216,207,184,0.15)'}`,
                        borderRadius: '3px', cursor: 'pointer',
                        fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.06em',
                        color: item === page ? 'var(--ink)' : 'var(--muted)',
                        '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
                      }}
                    >
                      {(item as number) + 1}
                    </Box>
                  )
                )}
            </Box>

            <Box
              component="button"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              sx={{
                background: 'none', border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
                px: 1.5, py: 0.75, cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.1em',
                color: page >= totalPages - 1 ? 'rgba(216,207,184,0.25)' : 'var(--ink)',
                borderColor: page >= totalPages - 1 ? 'rgba(216,207,184,0.1)' : 'rgba(216,207,184,0.2)',
                '&:hover:not(:disabled)': { borderColor: 'rgba(216,207,184,0.4)' },
              }}
            >
              NEXT →
            </Box>
          </Box>
        )}

        {/* Page indicator */}
        {!bandsLoading && totalPages > 1 && (
          <Box sx={{ textAlign: 'center', mt: 1.5 }}>
            <span style={{ ...lbl, fontSize: '0.5rem' }}>
              Page {page + 1} of {totalPages} · {total} bands
            </span>
          </Box>
        )}

        {!bandsLoading && totalPages <= 1 && bands.length > 0 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <span style={{ ...lbl, letterSpacing: '0.14em' }}>· · · end of catalogue · · ·</span>
          </Box>
        )}
      </Box>
    </>
  )
}
