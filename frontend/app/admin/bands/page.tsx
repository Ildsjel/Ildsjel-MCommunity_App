'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import LoadingState from '@/app/components/LoadingState'
import { TrackPanel } from '@/app/admin/components/TrackPanel'

const PAGE_SIZE = 25

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9a8a4a',
  published: '#6a9a7a',
  archived: 'var(--muted)',
}

/** Page number strip with ellipsis */
function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages: (number | '...')[] = []

  if (totalPages <= 7) {
    for (let i = 0; i < totalPages; i++) pages.push(i)
  } else {
    pages.push(0)
    if (page > 2) pages.push('...')
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i)
    if (page < totalPages - 3) pages.push('...')
    pages.push(totalPages - 1)
  }

  const numBtn = (p: number, active: boolean) => (
    <Box
      key={p}
      component="button"
      onClick={() => onPage(p)}
      sx={{
        border: active ? '1.5px solid rgba(216,207,184,0.5)' : '1px solid rgba(216,207,184,0.15)',
        borderRadius: '2px', minWidth: 24, height: 24, px: 0.375,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'rgba(216,207,184,0.08)' : 'none',
        cursor: active ? 'default' : 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.06em',
        color: active ? 'var(--ink)' : 'var(--muted)',
        '&:hover': active ? {} : { borderColor: 'rgba(216,207,184,0.35)', color: 'var(--ink)' },
      }}
    >
      {p + 1}
    </Box>
  )

  const arrowBtn = (label: string, disabled: boolean, onClick: () => void) => (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px',
        px: 0.75, height: 24, display: 'inline-flex', alignItems: 'center',
        background: 'none', cursor: disabled ? 'default' : 'pointer',
        fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.06em',
        color: 'var(--muted)',
        '&:hover:not(:disabled)': { borderColor: 'rgba(216,207,184,0.35)', color: 'var(--ink)' },
        '&:disabled': { opacity: 0.3 },
      }}
    >
      {label}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.375, mt: 2 }}>
      {arrowBtn('←', page === 0, () => onPage(page - 1))}
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`el-${i}`} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--muted)', padding: '0 2px' }}>…</span>
          : numBtn(p as number, p === page)
      )}
      {arrowBtn('→', page >= totalPages - 1, () => onPage(page + 1))}
    </Box>
  )
}

export default function AdminBandsPage() {
  const router = useRouter()
  const [bands, setBands] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [hasPendingFilter, setHasPendingFilter] = useState(false)
  const [sortMode, setSortMode] = useState<'default' | 'most_pending'>('default')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const [draftCount, setDraftCount] = useState(0)
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})

  // Inline release/track expansion
  const [expandedBandIds, setExpandedBandIds] = useState<Set<string>>(new Set())
  const [bandDetails, setBandDetails] = useState<Record<string, any>>({})   // bandId → full band
  const [loadingBandId, setLoadingBandId] = useState<string | null>(null)
  const [expandedReleaseIds, setExpandedReleaseIds] = useState<Set<string>>(new Set())

  // Core fetch — all params explicit so handlers can call it directly
  const loadPage = useCallback(async (pg: number, q: string, f: string) => {
    setLoading(true)
    setError(null)
    try {
      const [result, countRes, pcRes] = await Promise.all([
        adminAPI.listBands({
          status: f === 'all' ? undefined : f,
          q: q || undefined,
          skip: pg * PAGE_SIZE,
          limit: PAGE_SIZE,
        }),
        adminAPI.draftCount(),
        adminAPI.getBandsPendingCounts(),
      ])
      setBands(result.bands)
      setTotal(result.total)
      setDraftCount(countRes.count)
      setPendingCounts(pcRes)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce search: after 300 ms without typing, push debouncedSearch and reset page
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Re-fetch whenever page, debouncedSearch, or filter changes
  useEffect(() => {
    loadPage(page, debouncedSearch, filter)
  }, [page, debouncedSearch, filter, loadPage])

  // Filter tab: change filter and reset to page 0
  const handleFilterChange = (f: string) => {
    setFilter(f)
    setPage(0)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its releases? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await adminAPI.deleteBand(id)
      setBands((prev) => prev.filter((b) => b.id !== id))
      setTotal((prev) => prev - 1)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDeleting(null)
    }
  }

  const handlePublishAll = async () => {
    if (draftCount === 0) return
    if (!confirm(`Publish all ${draftCount} draft band${draftCount === 1 ? '' : 's'}?`)) return
    setPublishingAll(true)
    try {
      const res = await adminAPI.publishAllDrafts()
      setDraftCount(0)
      setPage(0)
      await loadPage(0, debouncedSearch, filter)
      alert(`Published ${res.published} band${res.published === 1 ? '' : 's'}.`)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setPublishingAll(false)
    }
  }

  const handlePublish = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published'
    try {
      const updated = await adminAPI.updateBand(id, { status: newStatus })
      setBands((prev) => prev.map((b) => (b.id === id ? updated : b)))
    } catch (e: any) {
      alert(e.message)
    }
  }

  const toggleBandExpand = async (bandId: string) => {
    const isOpen = expandedBandIds.has(bandId)
    setExpandedBandIds((prev) => {
      const next = new Set(prev)
      isOpen ? next.delete(bandId) : next.add(bandId)
      return next
    })
    // Lazy-load full band (with releases + tracks) on first expand
    if (!isOpen && !bandDetails[bandId]) {
      setLoadingBandId(bandId)
      try {
        const full = await adminAPI.getBand(bandId)
        if (full) setBandDetails((prev) => ({ ...prev, [bandId]: full }))
      } finally {
        setLoadingBandId(null)
      }
    }
  }

  const toggleRelease = (releaseId: string) =>
    setExpandedReleaseIds((prev) => {
      const next = new Set(prev)
      next.has(releaseId) ? next.delete(releaseId) : next.add(releaseId)
      return next
    })

  const updateBandRelease = (bandId: string, updatedRelease: any) =>
    setBandDetails((prev) => ({
      ...prev,
      [bandId]: {
        ...prev[bandId],
        releases: prev[bandId].releases.map((r: any) =>
          r.id === updatedRelease.id ? updatedRelease : r
        ),
      },
    }))

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total)

  // Client-side filter/sort derived list
  const displayedBands = (() => {
    let list = bands
    if (hasPendingFilter) list = list.filter((b) => (pendingCounts[b.id] ?? 0) > 0)
    if (sortMode === 'most_pending') {
      list = [...list].sort((a, b) => (pendingCounts[b.id] ?? 0) - (pendingCounts[a.id] ?? 0))
    }
    return list
  })()

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>◆ BANDS</span>
        <Box component="button" onClick={() => router.push('/admin/bands/new')} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', px: 1.25, py: 0.5, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:hover': { borderColor: 'rgba(216,207,184,0.6)' } }}>
          + NEW BAND
        </Box>
      </Box>

      {/* Filter tabs + bulk publish */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {['all', 'draft', 'published', 'archived'].map((f) => (
            <Box key={f} component="button" onClick={() => handleFilterChange(f)} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: filter === f ? '#ece5d3' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: filter === f ? '#120e18' : 'var(--muted)', transition: 'background 0.1s' }}>
              {f}
            </Box>
          ))}
          {/* Has Pending pill */}
          <Box component="button" onClick={() => setHasPendingFilter((v) => !v)}
            sx={{ border: `1.5px solid ${hasPendingFilter ? 'rgba(212,160,16,0.6)' : 'rgba(216,207,184,0.2)'}`, borderRadius: '3px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: hasPendingFilter ? 'rgba(212,160,16,0.1)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: hasPendingFilter ? '#d4a010' : 'var(--muted)', transition: 'background 0.1s' }}>
            Has Pending
          </Box>
          {/* Most Pending sort */}
          <Box component="button" onClick={() => setSortMode((v) => v === 'most_pending' ? 'default' : 'most_pending')}
            sx={{ border: `1.5px solid ${sortMode === 'most_pending' ? 'rgba(212,160,16,0.5)' : 'rgba(216,207,184,0.2)'}`, borderRadius: '3px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: sortMode === 'most_pending' ? 'rgba(212,160,16,0.08)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: sortMode === 'most_pending' ? '#d4a010' : 'var(--muted)', transition: 'background 0.1s' }}>
            Most Pending
          </Box>
        </Box>
        {draftCount > 0 && (
          <Box
            component="button"
            onClick={handlePublishAll}
            disabled={publishingAll}
            sx={{
              border: '1.5px solid rgba(106,154,122,0.5)',
              borderRadius: '3px', px: 1.25, height: 22,
              display: 'inline-flex', alignItems: 'center',
              background: 'none', cursor: publishingAll ? 'default' : 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.5625rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: publishingAll ? 'rgba(106,154,122,0.4)' : '#6a9a7a',
              '&:hover:not(:disabled)': { borderColor: '#6a9a7a' },
            }}
          >
            {publishingAll ? '…' : `↑ PUBLISH ALL DRAFTS (${draftCount})`}
          </Box>
        )}
      </Box>

      {/* Search */}
      <Box sx={{ mb: 1.25, position: 'relative' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="⌕  Search by name, country…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#120e18', border: '1px solid rgba(216,207,184,0.15)',
            borderRadius: '3px', color: 'var(--ink)',
            fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.06em',
            padding: '6px 32px 6px 9px', outline: 'none',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(216,207,184,0.35)')}
          onBlur={(e) => (e.target.style.borderColor = 'rgba(216,207,184,0.15)')}
        />
        {search && (
          <Box
            component="button"
            onClick={() => setSearch('')}
            sx={{
              position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--muted)',
              px: 0.25, lineHeight: 1,
              '&:hover': { color: 'var(--ink)' },
            }}
          >
            ✕
          </Box>
        )}
      </Box>

      {/* Count / range */}
      {!loading && total > 0 && (
        <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 10 }}>
          {debouncedSearch
            ? `${showingFrom}–${showingTo} of ${total} result${total !== 1 ? 's' : ''} for "${debouncedSearch}"`
            : `${showingFrom}–${showingTo} of ${total} band${total !== 1 ? 's' : ''}`}
        </span>
      )}

      {loading && <LoadingState />}
      {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>{error}</Typography>}

      {!loading && !error && bands.length === 0 && (
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
          <span style={{ ...lbl, color: 'var(--muted)' }}>
            {debouncedSearch ? `No bands match "${debouncedSearch}"` : 'No bands found'}
          </span>
        </Box>
      )}

      {/* Band cards */}
      {!loading && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {displayedBands.map((band) => {
            const isExpanded = expandedBandIds.has(band.id)
            const detail = bandDetails[band.id]
            const isLoadingDetail = loadingBandId === band.id
            const hasPending = (pendingCounts[band.id] ?? 0) > 0
            return (
              <Box key={band.id} sx={{ border: `1.5px solid ${hasPending ? 'rgba(212,160,16,0.15)' : isExpanded ? 'rgba(216,207,184,0.3)' : 'rgba(216,207,184,0.2)'}`, borderRadius: '3px', backgroundColor: hasPending ? 'rgba(212,160,16,0.025)' : '#120e18', transition: 'border-color 0.15s' }}>
                {/* ── Band header ── */}
                <Box sx={{ px: 1.5, py: 1.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                        <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.03em' }}>
                          {band.name}
                        </Typography>
                        {pendingCounts[band.id] > 0 && (
                          <Box sx={{ border: '1px solid rgba(212,160,16,0.6)', borderRadius: '2px', px: 0.625, height: 16, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: '#d4a010' }}>
                            {pendingCounts[band.id]} PENDING
                          </Box>
                        )}
                      </Box>
                      <span style={{ ...lbl, fontSize: '0.625rem' }}>
                        {band.country_code} · est. {band.formed} · {band.releases?.length ?? 0} releases
                      </span>
                    </Box>
                    <Box sx={{ border: `1px solid ${STATUS_COLORS[band.status] || 'var(--muted)'}`, borderRadius: '2px', px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: STATUS_COLORS[band.status] || 'var(--muted)', flexShrink: 0 }}>
                      {band.status}
                    </Box>
                  </Box>

                  {/* Actions */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Box component="button" onClick={() => router.push(`/admin/bands/${band.id}/edit`)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
                      EDIT
                    </Box>
                    <Box component="button" onClick={() => router.push(`/admin/bands/${band.id}/albums`)} sx={{ border: pendingCounts[band.id] > 0 ? '1px solid rgba(212,160,16,0.5)' : '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: pendingCounts[band.id] > 0 ? '#d4a010' : 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
                      ALBUMS{pendingCounts[band.id] > 0 ? ` (${pendingCounts[band.id]})` : ''}
                    </Box>
                    <Box component="button" onClick={() => router.push(`/admin/bands/${band.id}/albums`)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)', borderColor: 'rgba(216,207,184,0.4)' } }}>
                      OPEN →
                    </Box>
                    <Box component="button" onClick={() => handlePublish(band.id, band.status)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: band.status === 'published' ? '#9a8a4a' : '#6a9a7a', '&:hover': { opacity: 0.8 } }}>
                      {band.status === 'published' ? 'UNPUBLISH' : 'PUBLISH'}
                    </Box>
                    <Box component="button" onClick={() => handleDelete(band.id, band.name)} disabled={deleting === band.id} sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' }, '&:disabled': { opacity: 0.4 } }}>
                      {deleting === band.id ? '…' : 'DELETE'}
                    </Box>
                    {/* Track toggle */}
                    <Box component="button" onClick={() => toggleBandExpand(band.id)} disabled={isLoadingDetail}
                      sx={{ border: `1px solid ${isExpanded ? 'rgba(216,207,184,0.35)' : 'rgba(216,207,184,0.2)'}`, borderRadius: '2px', px: 0.875, height: 22, background: isExpanded ? 'rgba(216,207,184,0.05)' : 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: isExpanded ? 'var(--ink)' : 'var(--muted)', '&:hover': { color: 'var(--ink)', borderColor: 'rgba(216,207,184,0.4)' }, '&:disabled': { opacity: 0.5 }, transition: 'border-color 0.12s, color 0.12s' }}>
                      {isLoadingDetail ? '…' : isExpanded ? '▲ TRACKS' : '▼ TRACKS'}
                    </Box>
                  </Box>
                </Box>

                {/* ── Inline releases + tracks panel ── */}
                {isExpanded && (
                  <Box sx={{ borderTop: '1px solid rgba(216,207,184,0.1)', px: 1.5, pb: 1.25, pt: 1 }}>
                    {!detail ? (
                      <span style={{ ...lbl, fontSize: '0.5625rem' }}>Loading…</span>
                    ) : !detail.releases?.length ? (
                      <span style={{ ...lbl, fontSize: '0.5625rem' }}>No releases — add one from the edit page first</span>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {detail.releases.map((r: any) => {
                          const releaseOpen = expandedReleaseIds.has(r.id)
                          return (
                            <Box key={r.id} sx={{ border: '1px solid rgba(216,207,184,0.1)', borderRadius: '3px', backgroundColor: '#0a0810' }}>
                              {/* Release header */}
                              <Box
                                component="button"
                                onClick={() => toggleRelease(r.id)}
                                sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.125, py: 0.75, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', '&:hover': { backgroundColor: 'rgba(216,207,184,0.03)' } }}
                              >
                                <Box>
                                  <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--ink)', lineHeight: 1.2 }}>
                                    {r.title}
                                  </Typography>
                                  <span style={{ ...lbl, fontSize: '0.5625rem' }}>{r.type} · {r.year}</span>
                                </Box>
                                <span style={{ ...lbl, fontSize: '0.625rem', color: releaseOpen ? 'var(--ink)' : 'var(--muted)', flexShrink: 0 }}>
                                  ♬ {(r.tracks || []).length} {releaseOpen ? '▲' : '▼'}
                                </span>
                              </Box>
                              {/* TrackPanel */}
                              {releaseOpen && (
                                <Box sx={{ px: 1.125, pb: 1 }}>
                                  <TrackPanel
                                    release={r}
                                    onRelease={(updated) => updateBandRelease(band.id, updated)}
                                  />
                                </Box>
                              )}
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )
          })}
        </Box>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pager page={page} totalPages={totalPages} onPage={setPage} />
      )}
    </Box>
  )
}
