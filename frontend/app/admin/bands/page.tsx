'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import LoadingState from '@/app/components/LoadingState'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#9a8a4a',
  published: '#6a9a7a',
  archived: 'var(--muted)',
}

export default function AdminBandsPage() {
  const router = useRouter()
  const [bands, setBands] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [publishingAll, setPublishingAll] = useState(false)
  const [draftCount, setDraftCount] = useState(0)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [rawData, countRes] = await Promise.all([
        adminAPI.listBands(filter === 'all' ? undefined : filter),
        adminAPI.draftCount(),
      ])
      const bandsArray: any[] = Array.isArray(rawData)
        ? rawData
        : (rawData as any)?.bands ?? []
      setBands(bandsArray)
      setDraftCount(countRes.count)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" and all its releases? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await adminAPI.deleteBand(id)
      setBands((prev) => prev.filter((b) => b.id !== id))
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
      await load()
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

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Box component="button" onClick={() => router.push('/admin')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
            ← ADMIN
          </Box>
          <span style={{ ...lbl, color: 'var(--accent)' }}>◆ BANDS</span>
        </Box>
        <Box component="button" onClick={() => router.push('/admin/bands/new')} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', px: 1.25, py: 0.5, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:hover': { borderColor: 'rgba(216,207,184,0.6)' } }}>
          + NEW BAND
        </Box>
      </Box>

      {/* Filter tabs + bulk action */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.75 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {['all', 'draft', 'published', 'archived'].map((f) => (
            <Box key={f} component="button" onClick={() => setFilter(f)} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: filter === f ? '#ece5d3' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: filter === f ? '#120e18' : 'var(--muted)', transition: 'background 0.1s' }}>
              {f}
            </Box>
          ))}
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
              fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: publishingAll ? 'rgba(106,154,122,0.4)' : '#6a9a7a',
              '&:hover:not(:disabled)': { borderColor: '#6a9a7a' },
            }}
          >
            {publishingAll ? '…' : `↑ PUBLISH ALL DRAFTS (${draftCount})`}
          </Box>
        )}
      </Box>

      {loading && <LoadingState />}
      {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>{error}</Typography>}

      {!loading && !error && bands.length === 0 && (
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
          <span style={{ ...lbl, color: 'var(--muted)' }}>No bands found</span>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {bands.map((band) => (
          <Box key={band.id} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1.25 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.75 }}>
              <Box>
                <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.875rem', letterSpacing: '0.03em', mb: 0.25 }}>
                  {band.name}
                </Typography>
                <span style={{ ...lbl, fontSize: '0.5rem' }}>
                  {band.country_code} · est. {band.formed} · {band.releases?.length ?? 0} releases
                </span>
              </Box>
              <Box sx={{ border: `1px solid ${STATUS_COLORS[band.status] || 'var(--muted)'}`, borderRadius: '2px', px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: STATUS_COLORS[band.status] || 'var(--muted)', flexShrink: 0 }}>
                {band.status}
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Box component="button" onClick={() => router.push(`/admin/bands/${band.id}/edit`)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
                EDIT
              </Box>
              <Box component="button" onClick={() => handlePublish(band.id, band.status)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: band.status === 'published' ? '#9a8a4a' : '#6a9a7a', '&:hover': { opacity: 0.8 } }}>
                {band.status === 'published' ? 'UNPUBLISH' : 'PUBLISH'}
              </Box>
              <Box component="button" onClick={() => handleDelete(band.id, band.name)} disabled={deleting === band.id} sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' }, '&:disabled': { opacity: 0.4 } }}>
                {deleting === band.id ? '…' : 'DELETE'}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
