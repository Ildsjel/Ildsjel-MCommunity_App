'use client'

import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import type { AdminTrack } from '@/lib/types/admin'
import { getErrorMessage } from '@/lib/types/apiError'

/** Duration validation: must be `m:ss` or `mm:ss` */
export function validDuration(s: string) { return /^\d+:\d{2}$/.test(s.trim()) }

/** Inline track management panel shown below a release row */
export function TrackPanel({ release, onRelease }: { release: any; onRelease: (r: any) => void }) {
  const tracks: AdminTrack[] = (release.tracks ?? [])
    .filter((t: AdminTrack) => t?.id)
    .sort((a: AdminTrack, b: AdminTrack) => a.number - b.number)

  const nextNumber = tracks.length > 0 ? Math.max(...tracks.map((t) => t.number)) + 1 : 1

  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ number: String(nextNumber), title: '', duration: '', lyrics: '' })
  const [addSaving, setAddSaving] = useState(false)
  const [addErr, setAddErr] = useState<string | null>(null)

  const [editing, setEditing] = useState<Record<string, { title: string; duration: string; lyrics: string; number: string } | null>>({})
  const [trackSaving, setTrackSaving] = useState<string | null>(null)
  const [trackErr, setTrackErr] = useState<Record<string, string>>({})

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validDuration(addForm.duration)) { setAddErr('Duration must be mm:ss — e.g. 4:32'); return }
    setAddSaving(true)
    setAddErr(null)
    try {
      const updated = await adminAPI.addTrack(release.id, {
        number: parseInt(addForm.number) || nextNumber,
        title: addForm.title.trim(),
        duration: addForm.duration.trim(),
        lyrics: addForm.lyrics.trim() || null,
      })
      onRelease(updated)
      setAddForm({ number: String((parseInt(addForm.number) || nextNumber) + 1), title: '', duration: '', lyrics: '' })
      setShowAdd(false)
    } catch (err: unknown) {
      setAddErr(getErrorMessage(err))
    } finally {
      setAddSaving(false)
    }
  }

  const startEdit = (t: AdminTrack) =>
    setEditing((p) => ({ ...p, [t.id]: { title: t.title, duration: t.duration, lyrics: t.lyrics ?? '', number: String(t.number) } }))

  const cancelEdit = (id: string) => setEditing((p) => { const n = { ...p }; delete n[id]; return n })

  const handleUpdateTrack = async (t: AdminTrack) => {
    const vals = editing[t.id]
    if (!vals) return
    if (!validDuration(vals.duration)) { setTrackErr((p) => ({ ...p, [t.id]: 'Duration must be mm:ss' })); return }
    setTrackSaving(t.id)
    setTrackErr((p) => { const n = { ...p }; delete n[t.id]; return n })
    try {
      await adminAPI.updateTrack(t.id, {
        number: parseInt(vals.number) || t.number,
        title: vals.title.trim() || t.title,
        duration: vals.duration.trim(),
        lyrics: vals.lyrics.trim() || null,
      })
      onRelease({
        ...release,
        tracks: release.tracks.map((x: AdminTrack) =>
          x.id === t.id
            ? { ...x, number: parseInt(vals.number) || t.number, title: vals.title.trim() || t.title, duration: vals.duration.trim(), lyrics: vals.lyrics.trim() || null }
            : x
        ),
      })
      cancelEdit(t.id)
    } catch (err: unknown) {
      setTrackErr((p) => ({ ...p, [t.id]: getErrorMessage(err) }))
    } finally {
      setTrackSaving(null)
    }
  }

  const handleDeleteTrack = async (t: AdminTrack) => {
    if (!confirm(`Delete track "${t.title}"?`)) return
    setTrackSaving(t.id)
    try {
      await adminAPI.deleteTrack(t.id)
      onRelease({ ...release, tracks: release.tracks.filter((x: AdminTrack) => x.id !== t.id) })
    } catch (err: unknown) {
      setTrackErr((p) => ({ ...p, [t.id]: getErrorMessage(err) }))
    } finally {
      setTrackSaving(null)
    }
  }

  const inputStyle = (border = 'rgba(216,207,184,0.15)'): React.CSSProperties => ({
    background: '#0a0810', border: `1px solid ${border}`, borderRadius: '3px',
    color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem',
    padding: '4px 7px', outline: 'none', width: '100%', boxSizing: 'border-box',
  })

  return (
    <Box sx={{ borderTop: '1px solid rgba(216,207,184,0.08)', mt: 0.75, pt: 0.75 }}>
      {tracks.length === 0 && !showAdd && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', letterSpacing: '0.1em' }}>
          No tracks yet
        </span>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.375 }}>
        {tracks.map((t) => {
          const isEditing = !!editing[t.id]
          const vals = editing[t.id]
          const isSaving = trackSaving === t.id
          return (
            <Box key={t.id}>
              {isEditing && vals ? (
                <Box sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#1a1424', p: '8px 10px', display: 'flex', flexDirection: 'column', gap: 0.625 }}>
                  <Box sx={{ display: 'flex', gap: 0.625 }}>
                    <Box sx={{ width: 44 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>#</span>
                      <input value={vals.number} onChange={(e) => setEditing((p) => ({ ...p, [t.id]: { ...vals, number: e.target.value } }))} style={{ ...inputStyle(), width: 40 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>TITLE</span>
                      <input value={vals.title} onChange={(e) => setEditing((p) => ({ ...p, [t.id]: { ...vals, title: e.target.value } }))} style={inputStyle()} />
                    </Box>
                    <Box sx={{ width: 68 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>DURATION</span>
                      <input value={vals.duration} onChange={(e) => setEditing((p) => ({ ...p, [t.id]: { ...vals, duration: e.target.value } }))} placeholder="4:32" style={inputStyle()} />
                    </Box>
                  </Box>
                  <Box>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>LYRICS (OPTIONAL)</span>
                    <textarea value={vals.lyrics} onChange={(e) => setEditing((p) => ({ ...p, [t.id]: { ...vals, lyrics: e.target.value } }))} rows={4} placeholder="Paste lyrics here…"
                      style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', lineHeight: 1.5 }} />
                  </Box>
                  {trackErr[t.id] && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--accent)', letterSpacing: '0.08em' }}>⚠ {trackErr[t.id]}</span>}
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Box component="button" type="button" onClick={() => cancelEdit(t.id)} sx={{ border: '1px solid rgba(216,207,184,0.18)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>CANCEL</Box>
                    <Box component="button" type="button" onClick={() => handleUpdateTrack(t)} disabled={isSaving} sx={{ border: '1px solid rgba(216,207,184,0.35)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--ink)', letterSpacing: '0.08em', '&:disabled': { opacity: 0.4 } }}>{isSaving ? '…' : 'SAVE'}</Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 0.625, py: 0.375, borderRadius: '2px', '&:hover': { backgroundColor: 'rgba(216,207,184,0.03)' } }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', width: 18, flexShrink: 0, textAlign: 'right' }}>{t.number}.</span>
                  <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                    {t.title}
                  </Typography>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', flexShrink: 0 }}>{t.duration}</span>
                  {t.lyrics && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'rgba(154,122,191,0.6)', letterSpacing: '0.08em', flexShrink: 0 }} title="Has lyrics">♪</span>}
                  <Box sx={{ display: 'flex', gap: 0.375, flexShrink: 0 }}>
                    <Box component="button" type="button" onClick={() => startEdit(t)} sx={{ border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px', px: 0.5, height: 16, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>✎</Box>
                    <Box component="button" type="button" onClick={() => handleDeleteTrack(t)} disabled={isSaving} sx={{ border: '1px solid rgba(196,58,42,0.2)', borderRadius: '2px', px: 0.5, height: 16, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' }, '&:disabled': { opacity: 0.4 } }}>✕</Box>
                  </Box>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>

      {/* Add track */}
      {showAdd ? (
        <Box component="form" onSubmit={handleAddTrack} sx={{ border: '1px solid rgba(216,207,184,0.18)', borderRadius: '3px', backgroundColor: '#1a1424', p: '8px 10px', mt: 0.625, display: 'flex', flexDirection: 'column', gap: 0.625 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>New track</span>
          <Box sx={{ display: 'flex', gap: 0.625 }}>
            <Box sx={{ width: 44 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>#</span>
              <input value={addForm.number} onChange={(e) => setAddForm((p) => ({ ...p, number: e.target.value }))} style={{ ...inputStyle(), width: 40 }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>TITLE *</span>
              <input value={addForm.title} onChange={(e) => setAddForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Track title" style={inputStyle()} />
            </Box>
            <Box sx={{ width: 68 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>DURATION *</span>
              <input value={addForm.duration} onChange={(e) => setAddForm((p) => ({ ...p, duration: e.target.value }))} required placeholder="4:32" style={inputStyle()} />
            </Box>
          </Box>
          <Box>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>LYRICS (OPTIONAL)</span>
            <textarea value={addForm.lyrics} onChange={(e) => setAddForm((p) => ({ ...p, lyrics: e.target.value }))} rows={4} placeholder="Paste lyrics here…"
              style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', lineHeight: 1.5 }} />
          </Box>
          {addErr && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--accent)' }}>⚠ {addErr}</span>}
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
            <Box component="button" type="button" onClick={() => { setShowAdd(false); setAddErr(null) }} sx={{ border: '1px solid rgba(216,207,184,0.18)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)', letterSpacing: '0.08em' }}>CANCEL</Box>
            <Box component="button" type="submit" disabled={addSaving} sx={{ border: '1px solid rgba(216,207,184,0.35)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--ink)', letterSpacing: '0.08em', '&:disabled': { opacity: 0.4 } }}>{addSaving ? '…' : '＋ ADD'}</Box>
          </Box>
        </Box>
      ) : (
        <Box component="button" type="button" onClick={() => { setShowAdd(true); setAddForm((p) => ({ ...p, number: String(nextNumber) })) }}
          sx={{ mt: 0.5, border: '1px dashed rgba(216,207,184,0.15)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { borderColor: 'rgba(216,207,184,0.3)', color: 'var(--ink)' }, display: 'flex', alignItems: 'center', gap: 0.5 }}>
          ＋ ADD TRACK
        </Box>
      )}
    </Box>
  )
}
