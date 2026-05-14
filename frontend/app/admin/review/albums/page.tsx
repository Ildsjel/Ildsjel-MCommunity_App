'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import type { AdminAlbumSuggestion, ReviewCounts, ReviewStats } from '@/lib/types/admin'
import { getErrorMessage } from '@/lib/types/apiError'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const RELEASE_TYPES = ['LP', 'EP', 'Demo', 'Live', 'Single', 'Compilation']

const STATUS_COLOR: Record<string, string> = {
  pending: '#d4a010',
  approved: '#6a9a7a',
  rejected: 'var(--accent, #c43a2a)',
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} day${Math.floor(hrs / 24) !== 1 ? 's' : ''} ago`
}

/** Inline edit/review form that expands below a suggestion row */
function EditForm({
  suggestion,
  onSave,
  onCancel,
}: {
  suggestion: AdminAlbumSuggestion
  onSave: (updated: Partial<AdminAlbumSuggestion>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(suggestion.title)
  const [type, setType] = useState(suggestion.type || '')
  const [year, setYear] = useState(suggestion.year ? String(suggestion.year) : '')
  const [note, setNote] = useState(suggestion.reviewer_note || '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      await onSave({
        title: title.trim() || suggestion.title,
        type: type || null,
        year: year ? parseInt(year) : null,
        reviewer_note: note || null,
      })
    } catch (e: unknown) {
      setErr(getErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Box sx={{
      border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
      backgroundColor: '#1a1424', p: '12px 14px', mt: 0.5,
      display: 'flex', flexDirection: 'column', gap: 0.875,
    }}>
      <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--ink)' }}>EDIT SUGGESTION</span>

      {/* Title */}
      <Box>
        <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 3 }}>ALBUM TITLE</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)',
            borderRadius: '3px', color: 'var(--ink)',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem',
            padding: '6px 9px', outline: 'none',
          }}
        />
      </Box>

      {/* Type + Year */}
      <Box sx={{ display: 'flex', gap: 0.875 }}>
        <Box sx={{ flex: 1 }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 3 }}>TYPE</span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{
              width: '100%', background: '#0a0810',
              border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px',
              color: type ? 'var(--ink)' : 'var(--muted)',
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '6px 8px', outline: 'none',
            }}
          >
            <option value="">— optional —</option>
            {RELEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Box>
        <Box sx={{ width: 80 }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 3 }}>YEAR</span>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="—"
            min={1960}
            max={2100}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)',
              borderRadius: '3px', color: 'var(--ink)',
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem', padding: '6px 8px', outline: 'none',
            }}
          />
        </Box>
      </Box>

      {/* Reviewer note */}
      <Box>
        <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 3 }}>REVIEWER NOTE (INTERNAL)</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional — only visible to admins"
          rows={2}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            background: '#0a0810', border: '1px solid rgba(216,207,184,0.2)',
            borderRadius: '3px', color: 'var(--ink)',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem',
            padding: '6px 9px', outline: 'none',
          }}
        />
      </Box>

      {err && <span style={{ ...lbl, fontSize: '0.5625rem', color: 'var(--accent)' }}>⚠ {err}</span>}

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 0.625, justifyContent: 'flex-end' }}>
        <Box component="button" type="button" onClick={onCancel}
          sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 1, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
          CANCEL
        </Box>
        <Box component="button" type="button" onClick={handleSave} disabled={saving}
          sx={{ border: '1px solid rgba(216,207,184,0.4)', borderRadius: '2px', px: 1, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
          {saving ? '…' : 'SAVE EDITS'}
        </Box>
      </Box>
    </Box>
  )
}

/** Inline reject form */
function RejectForm({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleConfirm = async () => {
    setSaving(true)
    setErr(null)
    try {
      await onConfirm(reason)
    } catch (e: unknown) {
      setErr(getErrorMessage(e))
      setSaving(false)
    }
  }

  return (
    <Box sx={{
      border: '1.5px solid rgba(196,58,42,0.25)', borderRadius: '3px',
      backgroundColor: 'rgba(196,58,42,0.05)', p: '12px 14px', mt: 0.5,
      display: 'flex', flexDirection: 'column', gap: 0.875,
    }}>
      <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--accent)' }}>REJECT SUGGESTION</span>
      <Box>
        <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block', marginBottom: 3 }}>REASON (OPTIONAL)</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Duplicate, not a real release, out of scope…"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: '#0a0810', border: '1px solid rgba(196,58,42,0.25)',
            borderRadius: '3px', color: 'var(--ink)',
            fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem',
            padding: '6px 9px', outline: 'none',
          }}
        />
      </Box>
      {err && <span style={{ ...lbl, fontSize: '0.5625rem', color: 'var(--accent)' }}>⚠ {err}</span>}
      <Box sx={{ display: 'flex', gap: 0.625, justifyContent: 'flex-end' }}>
        <Box component="button" type="button" onClick={onCancel}
          sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 1, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
          CANCEL
        </Box>
        <Box component="button" type="button" onClick={handleConfirm} disabled={saving}
          sx={{ border: '1px solid rgba(196,58,42,0.5)', borderRadius: '2px', px: 1, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' }, '&:disabled': { opacity: 0.4 } }}>
          {saving ? '…' : 'CONFIRM REJECT'}
        </Box>
      </Box>
    </Box>
  )
}

/** Single suggestion row */
function SuggestionRow({
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
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'edit' | 'reject'>('idle')
  const [busy, setBusy] = useState(false)

  const handleApprove = async () => {
    setBusy(true)
    onApprove()
  }

  const isPending = s.status === 'pending'
  const statusColor = STATUS_COLOR[s.status] || 'var(--muted)'

  return (
    <Box sx={{ border: `1px solid ${isPending ? 'rgba(212,160,16,0.2)' : 'rgba(216,207,184,0.1)'}`, borderRadius: '3px', backgroundColor: isPending ? 'rgba(212,160,16,0.03)' : '#120e18', px: 1.25, py: 1, opacity: s.status === 'rejected' ? 0.7 : 1 }}>
      {/* Main row */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {/* Title + band */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', lineHeight: 1.2, textDecoration: s.status === 'rejected' ? 'line-through' : 'none', color: 'var(--ink)' }}>
              {s.title}
            </Typography>
            <span style={{ ...lbl, fontSize: '0.625rem', border: `1px solid ${statusColor}40`, borderRadius: '2px', padding: '0 4px', color: statusColor, letterSpacing: '0.1em' }}>
              {s.status.toUpperCase()}
            </span>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.375, flexWrap: 'wrap' }}>
            {s.band_name && (
              <Box
                component="span"
                onClick={() => router.push(`/admin/bands/${s.band_id ?? ''}/albums`)}
                sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.08em', color: 'var(--accent)', cursor: 'pointer', '&:hover': { opacity: 0.75 } }}
              >
                {s.band_name}
              </Box>
            )}
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
          {s.reviewer_note && (
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.6875rem', color: 'var(--muted)', mt: 0.5, lineHeight: 1.4 }}>
              Note: {s.reviewer_note}
            </Typography>
          )}
          {s.status === 'rejected' && s.rejected_reason && (
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.6875rem', color: 'rgba(196,58,42,0.7)', mt: 0.375, lineHeight: 1.4 }}>
              Rejected: {s.rejected_reason}
            </Typography>
          )}
        </Box>

        {/* Actions */}
        {isPending && (
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0, alignItems: 'flex-start' }}>
            <Box component="button" onClick={handleApprove} disabled={busy}
              sx={{ border: '1px solid rgba(106,154,122,0.5)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: '#6a9a7a', '&:hover': { borderColor: '#6a9a7a' }, '&:disabled': { opacity: 0.4 } }}>
              {busy ? '…' : '✓ APPROVE'}
            </Box>
            <Box component="button" onClick={() => setMode(mode === 'edit' ? 'idle' : 'edit')}
              sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
              EDIT
            </Box>
            <Box component="button" onClick={() => setMode(mode === 'reject' ? 'idle' : 'reject')}
              sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' } }}>
              REJECT
            </Box>
          </Box>
        )}
      </Box>

      {/* Expanded form */}
      {mode === 'edit' && (
        <EditForm
          suggestion={s}
          onSave={async (data) => { await onEdit(data); setMode('idle') }}
          onCancel={() => setMode('idle')}
        />
      )}
      {mode === 'reject' && (
        <RejectForm
          onConfirm={async (reason) => { await onReject(reason); setMode('idle') }}
          onCancel={() => setMode('idle')}
        />
      )}
    </Box>
  )
}

export default function AlbumReviewPage() {
  const [suggestions, setSuggestions] = useState<AdminAlbumSuggestion[]>([])
  const [counts, setCounts] = useState<ReviewCounts>({ pending: 0, approved: 0, rejected: 0 })
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('pending')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'band_az'>('newest')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  const flash = (msg: string) => {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(null), 3000)
  }

  const load = useCallback(async (sf = statusFilter, q = search, tf = typeFilter, sb = sortBy) => {
    setLoading(true)
    try {
      const [data, countsData, statsData] = await Promise.all([
        adminAPI.getReviewQueue(sf, q || undefined, tf || undefined, sb),
        adminAPI.getReviewCounts(),
        adminAPI.getReviewStats(),
      ])
      setSuggestions(data)
      setCounts(countsData)
      setStats(statsData)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [statusFilter, search, typeFilter, sortBy])

  useEffect(() => { load() }, [load])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(statusFilter, search, typeFilter, sortBy), 350)
    return () => clearTimeout(t)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApprove = async (s: AdminAlbumSuggestion) => {
    try {
      await adminAPI.acceptSuggestion(s.id)
      flash(`✓ "${s.title}" approved and added to ${s.band_name ?? 'discography'}`)
      await load()
    } catch (e: unknown) {
      flash(`⚠ ${getErrorMessage(e)}`)
    }
  }

  const handleReject = async (s: AdminAlbumSuggestion, reason: string) => {
    await adminAPI.rejectSuggestion(s.id, reason || undefined)
    flash(`Rejected "${s.title}"`)
    await load()
  }

  const handleEdit = async (s: AdminAlbumSuggestion, data: Partial<AdminAlbumSuggestion>) => {
    await adminAPI.updateSuggestion(s.id, data)
    setSuggestions((prev) => prev.map((x) => x.id === s.id ? { ...x, ...data } : x))
  }

  const TABS = [
    { key: 'pending', label: 'Pending', count: counts.pending, color: '#d4a010' },
    { key: 'approved', label: 'Approved', count: counts.approved, color: '#6a9a7a' },
    { key: 'rejected', label: 'Rejected', count: counts.rejected, color: 'var(--accent)' },
    { key: 'all', label: 'All', count: counts.pending + counts.approved + counts.rejected, color: 'var(--muted)' },
  ]

  // Band names from current pending list for banner
  const bandNames = Array.from(new Set(suggestions.filter(s => s.band_name).map(s => s.band_name!)))
    .slice(0, 3).join(', ')
  const lastSuggestion = suggestions[0]

  return (
    <Box sx={{ maxWidth: 580, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>▦ ALBUM REVIEW</span>
      </Box>

      {/* Notification banner */}
      {counts.pending > 0 && !dismissed && (
        <Box sx={{
          border: '1px solid rgba(212,160,16,0.3)', borderRadius: '3px',
          backgroundColor: 'rgba(212,160,16,0.06)', px: 1.25, py: 0.875, mb: 1.5,
          display: 'flex', alignItems: 'center', gap: 0.75,
        }}>
          <span style={{ fontSize: '0.75rem', color: '#d4a010', flexShrink: 0 }}>!</span>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'rgba(212,160,16,0.85)', lineHeight: 1.4, flex: 1 }}>
            {counts.pending} suggestion{counts.pending !== 1 ? 's' : ''} awaiting review
            {bandNames ? ` — ${bandNames}` : ''}
            {lastSuggestion ? ` · last ${timeAgo(lastSuggestion.created_at)}` : ''}
          </Typography>
          <Box component="button" onClick={() => setDismissed(true)}
            sx={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(212,160,16,0.6)', fontSize: '0.75rem', p: 0, lineHeight: 1, flexShrink: 0, '&:hover': { color: '#d4a010' } }}>
            ✕
          </Box>
        </Box>
      )}

      {/* KPI strip — 4 cells */}
      <Box sx={{ display: 'flex', gap: 0.75, mb: 2 }}>
        {/* Pending */}
        <Box onClick={() => { setStatusFilter('pending'); load('pending', search, typeFilter, sortBy) }}
          sx={{ flex: 1, border: `1.5px solid ${statusFilter === 'pending' ? '#d4a01060' : 'rgba(216,207,184,0.1)'}`, borderRadius: '3px', backgroundColor: '#120e18', px: 1, py: 0.875, cursor: 'pointer', '&:hover': { borderColor: '#d4a01040' }, transition: 'border-color 0.15s' }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block' }}>Pending</span>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: '#d4a010', lineHeight: 1.2, mt: 0.25 }}>
            {counts.pending}
          </Typography>
        </Box>

        {/* Approved 7d */}
        <Box onClick={() => { setStatusFilter('approved'); load('approved', search, typeFilter, sortBy) }}
          sx={{ flex: 1, border: `1.5px solid ${statusFilter === 'approved' ? '#6a9a7a60' : 'rgba(216,207,184,0.1)'}`, borderRadius: '3px', backgroundColor: '#120e18', px: 1, py: 0.875, cursor: 'pointer', '&:hover': { borderColor: '#6a9a7a40' }, transition: 'border-color 0.15s' }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block' }}>Approved · 7d</span>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: '#6a9a7a', lineHeight: 1.2, mt: 0.25 }}>
            {stats?.approved_7d ?? counts.approved}
          </Typography>
          {stats && stats.avg_review_hours_7d > 0 && (
            <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--muted)' }}>avg {stats.avg_review_hours_7d} h</span>
          )}
        </Box>

        {/* Rejected 7d */}
        <Box onClick={() => { setStatusFilter('rejected'); load('rejected', search, typeFilter, sortBy) }}
          sx={{ flex: 1, border: `1.5px solid ${statusFilter === 'rejected' ? 'rgba(196,58,42,0.4)' : 'rgba(216,207,184,0.1)'}`, borderRadius: '3px', backgroundColor: '#120e18', px: 1, py: 0.875, cursor: 'pointer', '&:hover': { borderColor: 'rgba(196,58,42,0.25)' }, transition: 'border-color 0.15s' }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block' }}>Rejected · 7d</span>
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--accent)', lineHeight: 1.2, mt: 0.25 }}>
            {stats?.rejected_7d ?? counts.rejected}
          </Typography>
          {stats && stats.rejection_rate_7d > 0 && (
            <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--muted)' }}>{Math.round(stats.rejection_rate_7d * 100)}% rate</span>
          )}
        </Box>

        {/* Top suggester */}
        <Box sx={{ flex: 1, border: '1.5px solid rgba(216,207,184,0.1)', borderRadius: '3px', backgroundColor: '#120e18', px: 1, py: 0.875 }}>
          <span style={{ ...lbl, fontSize: '0.5625rem', display: 'block' }}>Top · month</span>
          {stats?.top_suggester ? (
            <>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--ink)', lineHeight: 1.2, mt: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {stats.top_suggester.handle}
              </Typography>
              <span style={{ ...lbl, fontSize: '0.625rem', color: 'var(--muted)' }}>{stats.top_suggester.count} submitted</span>
            </>
          ) : (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.2, mt: 0.25 }}>—</Typography>
          )}
        </Box>
      </Box>

      {/* Action flash */}
      {actionMsg && (
        <Box sx={{ border: '1px solid rgba(106,154,122,0.35)', borderRadius: '3px', backgroundColor: 'rgba(106,154,122,0.06)', px: 1.25, py: 0.75, mb: 1.5 }}>
          <span style={{ ...lbl, fontSize: '0.625rem', color: '#6a9a7a' }}>{actionMsg}</span>
        </Box>
      )}

      {/* Toolbar: status tabs + search */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.875, flexWrap: 'wrap', alignItems: 'center' }}>
        {TABS.map((t) => (
          <Box key={t.key} component="button" onClick={() => { setStatusFilter(t.key); load(t.key, search, typeFilter, sortBy) }}
            sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', gap: 0.5, cursor: 'pointer', backgroundColor: statusFilter === t.key ? '#ece5d3' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: statusFilter === t.key ? '#120e18' : 'var(--muted)', transition: 'background 0.1s' }}>
            {t.label}
            <span style={{ opacity: 0.6 }}>{t.count}</span>
          </Box>
        ))}
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="⌕  Search title, band, user…"
            style={{
              width: '100%', boxSizing: 'border-box',
              background: '#120e18', border: '1px solid rgba(216,207,184,0.15)',
              borderRadius: '3px', color: 'var(--ink)',
              fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.06em',
              padding: '5px 9px', outline: 'none',
            }}
          />
        </Box>
      </Box>

      {/* Type filter pills + sort */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.25, flexWrap: 'wrap' }}>
        {/* Type pills */}
        <Box
          component="button"
          onClick={() => { setTypeFilter(''); load(statusFilter, search, '', sortBy) }}
          sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 0.875, height: 20, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: typeFilter === '' ? 'rgba(216,207,184,0.12)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: typeFilter === '' ? 'var(--ink)' : 'var(--muted)', transition: 'background 0.1s' }}
        >
          All Types
        </Box>
        {RELEASE_TYPES.map((rt) => (
          <Box
            key={rt}
            component="button"
            onClick={() => { setTypeFilter(rt); load(statusFilter, search, rt, sortBy) }}
            sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 0.875, height: 20, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: typeFilter === rt ? 'rgba(216,207,184,0.12)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: typeFilter === rt ? 'var(--ink)' : 'var(--muted)', transition: 'background 0.1s' }}
          >
            {rt}
          </Box>
        ))}

        {/* Spacer */}
        <Box sx={{ flex: 1 }} />

        {/* Sort dropdown */}
        <select
          value={sortBy}
          onChange={(e) => {
            const v = e.target.value as typeof sortBy
            setSortBy(v)
            load(statusFilter, search, typeFilter, v)
          }}
          style={{
            background: '#120e18', border: '1px solid rgba(216,207,184,0.2)',
            borderRadius: '3px', color: 'var(--muted)',
            fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '3px 6px', outline: 'none', cursor: 'pointer',
            height: 20,
          }}
        >
          <option value="newest">Newest ▾</option>
          <option value="oldest">Oldest ▾</option>
          <option value="band_az">Band A–Z ▾</option>
        </select>
      </Box>

      {/* List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />
        </Box>
      ) : suggestions.length === 0 ? (
        <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', p: 3, textAlign: 'center', backgroundColor: '#120e18' }}>
          <span style={{ ...lbl, color: 'var(--muted)' }}>
            {statusFilter === 'pending' ? 'All caught up — no pending suggestions' : 'Nothing found'}
          </span>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625 }}>
          {suggestions.map((s) => (
            <SuggestionRow
              key={s.id}
              s={s}
              onApprove={() => handleApprove(s)}
              onReject={(reason) => handleReject(s, reason)}
              onEdit={(data) => handleEdit(s, data)}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
