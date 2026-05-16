'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import type { AdminAlbumSuggestion } from '@/lib/types/admin'
import { getErrorMessage } from '@/lib/types/apiError'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const RELEASE_TYPES = ['LP', 'EP', 'Split-EP', 'Demo', 'Live', 'Single', 'Compilation']

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`
}

/** Inline editor for a pending suggestion */
function SuggestionCard({
  s,
  onApprove,
  onReject,
  onEdit,
}: {
  s: AdminAlbumSuggestion
  onApprove: () => void
  onReject: (reason: string) => Promise<void>
  onEdit: (data: Partial<AdminAlbumSuggestion>) => Promise<void>
}) {
  const [mode, setMode] = useState<'idle' | 'edit' | 'reject'>('idle')
  const [busy, setBusy] = useState(false)

  // Edit state
  const [eTitle, setETitle] = useState(s.title)
  const [eType, setEType] = useState(s.type || '')
  const [eYear, setEYear] = useState(s.year ? String(s.year) : '')
  const [eNote, setENote] = useState(s.reviewer_note || '')

  // Reject state
  const [rejectReason, setRejectReason] = useState('')

  const [err, setErr] = useState<string | null>(null)

  const handleApprove = async () => {
    setBusy(true)
    setErr(null)
    try {
      onApprove()
    } catch (e: unknown) {
      setErr(getErrorMessage(e))
      setBusy(false)
    }
  }

  const handleSaveEdit = async () => {
    setBusy(true)
    setErr(null)
    try {
      await onEdit({
        title: eTitle.trim() || s.title,
        type: eType || null,
        year: eYear ? parseInt(eYear) : null,
        reviewer_note: eNote || null,
      })
      setMode('idle')
    } catch (e: unknown) {
      setErr(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleConfirmReject = async () => {
    setBusy(true)
    setErr(null)
    try {
      await onReject(rejectReason)
      setMode('idle')
    } catch (e: unknown) {
      setErr(getErrorMessage(e))
      setBusy(false)
    }
  }

  const isPending = s.status === 'pending'
  const isRejected = s.status === 'rejected'

  return (
    <Box sx={{
      border: `1px solid ${isPending ? 'rgba(212,160,16,0.25)' : isRejected ? 'rgba(196,58,42,0.15)' : 'rgba(216,207,184,0.12)'}`,
      borderRadius: '3px',
      backgroundColor: isPending ? 'rgba(212,160,16,0.04)' : '#120e18',
      px: 1.25, py: 1,
      opacity: isRejected ? 0.65 : 1,
    }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.8125rem', color: 'var(--ink)', lineHeight: 1.2,
            textDecoration: isRejected ? 'line-through' : 'none',
          }}>
            {mode === 'edit' ? eTitle : s.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.375, flexWrap: 'wrap' }}>
            {(s.type || s.year) && (
              <span style={{ ...lbl, fontSize: '0.5625rem' }}>
                {[s.type, s.year].filter(Boolean).join(' · ')}
              </span>
            )}
            {s.suggested_by_handle && (
              <span style={{ ...lbl, fontSize: '0.5625rem' }}>
                by {s.suggested_by_handle} · {timeAgo(s.created_at)}
              </span>
            )}
          </Box>

          {s.reviewer_note && mode !== 'edit' && (
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.6875rem', color: 'var(--muted)', mt: 0.5 }}>
              Note: {s.reviewer_note}
            </Typography>
          )}
          {isRejected && s.rejected_reason && (
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.6875rem', color: 'rgba(196,58,42,0.7)', mt: 0.375 }}>
              Rejected: {s.rejected_reason || '(no reason given)'}
            </Typography>
          )}
        </Box>

        {/* Status pill + actions */}
        <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'flex-start' }}>
          <Box sx={{ border: `1px solid ${isPending ? 'rgba(212,160,16,0.4)' : isRejected ? 'rgba(196,58,42,0.3)' : 'rgba(106,154,122,0.4)'}`, borderRadius: '2px', px: 0.625, height: 18, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: isPending ? '#d4a010' : isRejected ? 'var(--accent)' : '#6a9a7a' }}>
            {s.status.toUpperCase()}
          </Box>

          {isPending && mode === 'idle' && (
            <>
              <Box component="button" onClick={handleApprove} disabled={busy}
                sx={{ border: '1px solid rgba(106,154,122,0.5)', borderRadius: '2px', px: 0.625, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: '#6a9a7a', '&:hover': { borderColor: '#6a9a7a' }, '&:disabled': { opacity: 0.4 } }}>
                {busy ? '…' : '✓'}
              </Box>
              <Box component="button" onClick={() => setMode('edit')}
                sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.625, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
                ✎
              </Box>
              <Box component="button" onClick={() => setMode('reject')}
                sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.625, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' } }}>
                ✕
              </Box>
            </>
          )}
          {(mode === 'edit' || mode === 'reject') && (
            <Box component="button" onClick={() => setMode('idle')}
              sx={{ border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px', px: 0.625, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--muted)' }}>
              ✕
            </Box>
          )}
        </Box>
      </Box>

      {/* Edit form */}
      {mode === 'edit' && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <input
            value={eTitle}
            onChange={(e) => setETitle(e.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', padding: '5px 8px', outline: 'none' }}
          />
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            <select value={eType} onChange={(e) => setEType(e.target.value)}
              style={{ flex: 1, background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: eType ? 'var(--ink)' : 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '5px 8px', outline: 'none' }}>
              <option value="">— type —</option>
              {RELEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={eYear} onChange={(e) => setEYear(e.target.value)} placeholder="year" min={1960} max={2100}
              style={{ width: 72, boxSizing: 'border-box', background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '5px 8px', outline: 'none' }} />
          </Box>
          <textarea value={eNote} onChange={(e) => setENote(e.target.value)} placeholder="Reviewer note (internal)…" rows={2}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', background: '#0a0810', border: '1px solid rgba(216,207,184,0.15)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', padding: '5px 8px', outline: 'none' }} />
          {err && <span style={{ ...lbl, fontSize: '0.5625rem', color: 'var(--accent)' }}>⚠ {err}</span>}
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Box component="button" onClick={() => setMode('idle')} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--muted)' }}>CANCEL</Box>
            <Box component="button" onClick={handleSaveEdit} disabled={busy} sx={{ border: '1px solid rgba(216,207,184,0.4)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>{busy ? '…' : 'SAVE'}</Box>
          </Box>
        </Box>
      )}

      {/* Reject form */}
      {mode === 'reject' && (
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason (optional)…"
            style={{ width: '100%', boxSizing: 'border-box', background: '#0a0810', border: '1px solid rgba(196,58,42,0.25)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', padding: '5px 8px', outline: 'none' }} />
          {err && <span style={{ ...lbl, fontSize: '0.5625rem', color: 'var(--accent)' }}>⚠ {err}</span>}
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Box component="button" onClick={() => setMode('idle')} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--muted)' }}>CANCEL</Box>
            <Box component="button" onClick={handleConfirmReject} disabled={busy} sx={{ border: '1px solid rgba(196,58,42,0.5)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--accent)', '&:disabled': { opacity: 0.4 } }}>{busy ? '…' : 'CONFIRM REJECT'}</Box>
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default function BandAlbumsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [band, setBand] = useState<any>(null)
  const [suggestions, setSuggestions] = useState<AdminAlbumSuggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [flash, setFlash] = useState<string | null>(null)

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [found, sugs] = await Promise.all([
        adminAPI.getBand(id),
        adminAPI.listSuggestions(id),  // pending + rejected by default
      ])
      setBand(found || null)
      setSuggestions(sugs)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleApprove = async (s: AdminAlbumSuggestion) => {
    try {
      const release = await adminAPI.acceptSuggestion(s.id)
      showFlash(`✓ "${s.title}" approved — added to discography`)
      // Reload to get fresh data
      await load()
      return release
    } catch (e: unknown) {
      showFlash(`⚠ ${getErrorMessage(e)}`)
    }
  }

  const handleReject = async (s: AdminAlbumSuggestion, reason: string) => {
    await adminAPI.rejectSuggestion(s.id, reason || undefined)
    setSuggestions((prev) => prev.map((x) => x.id === s.id ? { ...x, status: 'rejected' as const, rejected_reason: reason || null } : x))
    showFlash(`Rejected "${s.title}"`)
  }

  const handleEdit = async (s: AdminAlbumSuggestion, data: Partial<AdminAlbumSuggestion>) => {
    await adminAPI.updateSuggestion(s.id, data)
    setSuggestions((prev) => prev.map((x) => x.id === s.id ? { ...x, ...data } : x))
  }

  const pending = suggestions.filter((s) => s.status === 'pending')
  const rejected = suggestions.filter((s) => s.status === 'rejected')

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />
      </Box>
    )
  }

  if (!band) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 4, textAlign: 'center' }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>Band not found</span>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

      {/* Back nav */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
        <Box component="button" onClick={() => router.push('/admin/bands')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
          ← BANDS
        </Box>
        <span style={{ ...lbl, fontSize: '0.625rem', color: 'rgba(216,207,184,0.3)' }}>›</span>
        <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--ink)' }}>{band.name}</span>
      </Box>

      {/* Band header */}
      <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1.25, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.03em', mb: 0.375 }}>
            {band.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.875, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ ...lbl, fontSize: '0.625rem' }}>{band.country_code} · est. {band.formed}</span>
            <span style={{ ...lbl, fontSize: '0.625rem' }}>{band.releases?.length ?? 0} releases</span>
            {pending.length > 0 && (
              <Box sx={{ border: '1px solid rgba(212,160,16,0.5)', borderRadius: '2px', px: 0.625, height: 16, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: '#d4a010' }}>
                {pending.length} PENDING
              </Box>
            )}
          </Box>
        </Box>
        <Box component="button" onClick={() => router.push(`/admin/bands/${id}/edit`)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
          EDIT BAND
        </Box>
      </Box>

      {/* Flash */}
      {flash && (
        <Box sx={{ border: '1px solid rgba(106,154,122,0.35)', borderRadius: '3px', backgroundColor: 'rgba(106,154,122,0.06)', px: 1.25, py: 0.75, mb: 1.5 }}>
          <span style={{ ...lbl, fontSize: '0.625rem', color: '#6a9a7a' }}>{flash}</span>
        </Box>
      )}

      {/* ── Pending suggestions ── */}
      {pending.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <span style={{ ...lbl, color: '#d4a010' }}>◉ PENDING REVIEW ({pending.length})</span>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625 }}>
            {pending.map((s) => (
              <SuggestionCard
                key={s.id}
                s={s}
                onApprove={() => handleApprove(s)}
                onReject={(reason) => handleReject(s, reason)}
                onEdit={(data) => handleEdit(s, data)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Discography (approved releases) ── */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <span style={lbl}>◈ DISCOGRAPHY ({band.releases?.length ?? 0})</span>
          <Box component="button" onClick={() => router.push(`/admin/bands/${id}/edit`)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
            + ADD RELEASE
          </Box>
        </Box>

        {(!band.releases || band.releases.length === 0) ? (
          <Box sx={{ border: '1px solid rgba(216,207,184,0.1)', borderRadius: '3px', px: 1.25, py: 1.5, textAlign: 'center' }}>
            <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--muted)' }}>No releases yet</span>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {(band.releases as any[]).map((r) => (
              <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, border: '1px solid rgba(216,207,184,0.1)', borderRadius: '3px', px: 1.25, py: 0.875, backgroundColor: '#120e18' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--ink)', lineHeight: 1.2 }}>
                    {r.title}
                  </Typography>
                  <span style={{ ...lbl, fontSize: '0.5625rem' }}>{r.type} · {r.year}</span>
                </Box>
                <Box sx={{ border: '1px solid rgba(106,154,122,0.35)', borderRadius: '2px', px: 0.625, height: 16, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: '#6a9a7a', flexShrink: 0 }}>
                  APPROVED
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* ── Rejected suggestions ── */}
      {rejected.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <span style={{ ...lbl, color: 'rgba(196,58,42,0.6)' }}>✕ REJECTED ({rejected.length})</span>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {rejected.map((s) => (
              <SuggestionCard
                key={s.id}
                s={s}
                onApprove={() => handleApprove(s)}
                onReject={(reason) => handleReject(s, reason)}
                onEdit={(data) => handleEdit(s, data)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Empty state */}
      {pending.length === 0 && rejected.length === 0 && band.releases?.length === 0 && (
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.1)', borderRadius: '3px', p: 3, textAlign: 'center' }}>
          <span style={{ ...lbl, color: 'var(--muted)' }}>No albums or suggestions yet</span>
        </Box>
      )}
    </Box>
  )
}
