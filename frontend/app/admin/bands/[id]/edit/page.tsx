'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import type { ReleaseType } from '@/lib/types/admin'
import { getErrorMessage } from '@/lib/types/apiError'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const inputSx = {
  '& .MuiInputBase-root': { fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--ink)' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.2)', borderRadius: '3px' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.4)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.6)' },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--muted)' },
}

const RELEASE_TYPES = ['LP', 'EP', 'Split-EP', 'Demo', 'Live', 'Single', 'Compilation']

function ImageUploadZone({
  label,
  currentUrl,
  aspect,
  uploading,
  onFile,
}: {
  label: string
  currentUrl?: string | null
  aspect: '16/9' | '1/1'
  uploading: boolean
  onFile: (f: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const fullUrl = currentUrl ? `${API_BASE}${currentUrl}` : null

  return (
    <Box>
      <span style={{ ...lbl, display: 'block', marginBottom: 6 }}>{label}</span>
      <Box
        onClick={() => !uploading && inputRef.current?.click()}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspect,
          border: '1.5px dashed rgba(216,207,184,0.25)',
          borderRadius: '3px',
          overflow: 'hidden',
          cursor: uploading ? 'default' : 'pointer',
          backgroundColor: '#120e18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': { borderColor: uploading ? 'rgba(216,207,184,0.25)' : 'rgba(216,207,184,0.5)' },
          transition: 'border-color 0.15s',
        }}
      >
        {fullUrl && (
          <Box
            component="img"
            src={fullUrl}
            alt={label}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        <Box sx={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
          backgroundColor: fullUrl ? 'rgba(8,6,10,0.65)' : 'transparent',
          px: 2, py: 1.5, borderRadius: '3px',
        }}>
          {uploading ? (
            <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />
          ) : (
            <>
              <span style={{ fontSize: '1.1rem', color: 'rgba(216,207,184,0.5)' }}>↑</span>
              <span style={{ ...lbl, fontSize: '0.4375rem', color: fullUrl ? 'rgba(216,207,184,0.8)' : 'rgba(216,207,184,0.4)' }}>
                {fullUrl ? 'CLICK TO REPLACE' : 'CLICK TO UPLOAD'}
              </span>
            </>
          )}
        </Box>
      </Box>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) { onFile(f); e.target.value = '' }
        }}
      />
    </Box>
  )
}

export default function EditBandPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const [band, setBand] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', country: '', country_code: '', formed: '', bio: '' })

  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])

  const [photoUploading, setPhotoUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [imageMsg, setImageMsg] = useState<string | null>(null)

  // New release form
  const [showRelease, setShowRelease] = useState(false)
  const [relForm, setRelForm] = useState({ title: '', slug: '', type: 'LP', year: '', label: '' })

  useEffect(() => {
    Promise.all([adminAPI.listBands(), adminAPI.listTags()]).then(([bands, tags]) => {
      setAvailableTags(tags)
      const found = bands.find((b: any) => b.id === id)
      if (found) {
        setBand(found)
        setForm({ name: found.name, country: found.country, country_code: found.country_code, formed: String(found.formed), bio: found.bio || '' })
        setSelectedTagIds((found.tags || []).map((t: any) => t.id))
      }
    }).finally(() => setLoading(false))
  }, [id])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const setRel = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setRelForm((p) => ({ ...p, [k]: e.target.value }))

  const autoRelSlug = () => {
    if (!relForm.slug && relForm.title) {
      setRelForm((p) => ({ ...p, slug: p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await adminAPI.updateBand(id, { ...form, formed: parseInt(form.formed), tag_ids: selectedTagIds })
      setBand(updated)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (file: File) => {
    setPhotoUploading(true)
    setImageMsg(null)
    try {
      const updated = await adminAPI.uploadBandPhoto(id, file)
      setBand(updated)
      setImageMsg('Photo updated')
    } catch (err: unknown) {
      setImageMsg(getErrorMessage(err))
    } finally {
      setPhotoUploading(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true)
    setImageMsg(null)
    try {
      const updated = await adminAPI.uploadBandLogo(id, file)
      setBand(updated)
      setImageMsg('Logo updated')
    } catch (err: unknown) {
      setImageMsg(getErrorMessage(err))
    } finally {
      setLogoUploading(false)
    }
  }

  const handleAddRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminAPI.createRelease(id, { ...relForm, type: relForm.type as ReleaseType, year: parseInt(relForm.year), tracks: [] })
      const bands = await adminAPI.listBands()
      const updated = bands.find((b: any) => b.id === id)
      if (updated) setBand(updated)
      setRelForm({ title: '', slug: '', type: 'LP', year: '', label: '' })
      setShowRelease(false)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRelease = async (releaseId: string, title: string) => {
    if (!confirm(`Delete release "${title}"?`)) return
    try {
      await adminAPI.deleteRelease(releaseId)
      setBand((prev: any) => ({ ...prev, releases: prev.releases.filter((r: any) => r.id !== releaseId) }))
    } catch (err: unknown) {
      alert(getErrorMessage(err))
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress size={20} sx={{ color: 'var(--accent)' }} /></Box>
  if (!band) return <Box sx={{ p: 3, textAlign: 'center' }}><span style={{ ...lbl, color: 'var(--accent)' }}>Band not found</span></Box>

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin/bands')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← BANDS
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>EDIT · {band.name}</span>

      {/* ── Images ─────────────────────────────────────────────── */}
      <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', backgroundColor: '#120e18', p: '14px 16px', mb: 2 }}>
        <span style={{ ...lbl, display: 'block', marginBottom: 14 }}>IMAGES</span>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ImageUploadZone
            label="Band Photo (16:9)"
            currentUrl={band.image_url}
            aspect="16/9"
            uploading={photoUploading}
            onFile={handlePhotoUpload}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ width: 140 }}>
              <ImageUploadZone
                label="Logo (square)"
                currentUrl={band.logo_url}
                aspect="1/1"
                uploading={logoUploading}
                onFile={handleLogoUpload}
              />
            </Box>
          </Box>
          {imageMsg && (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: '#6a9a7a' }}>
              ✓ {imageMsg}
            </Typography>
          )}
        </Box>
      </Box>

      {/* ── Band info form ──────────────────────────────────────── */}
      <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        <TextField label="Band Name" value={form.name} onChange={set('name')} required fullWidth size="small" sx={inputSx} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField label="Country" value={form.country} onChange={set('country')} required fullWidth size="small" sx={inputSx} />
          <TextField label="Code" value={form.country_code} onChange={set('country_code')} required size="small" sx={{ ...inputSx, width: 90 }} />
        </Box>
        <TextField label="Formed" type="number" value={form.formed} onChange={set('formed')} required fullWidth size="small" sx={inputSx} />
        <TextField label="Bio" value={form.bio} onChange={set('bio')} multiline rows={4} fullWidth size="small" sx={inputSx} />

        {/* Tags */}
        {availableTags.length > 0 && (
          <Box>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>Tags</span>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625 }}>
              {availableTags.map((tag: any) => {
                const active = selectedTagIds.includes(tag.id)
                return (
                  <Box
                    key={tag.id}
                    component="button"
                    type="button"
                    onClick={() => setSelectedTagIds((prev) =>
                      active ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                    )}
                    sx={{
                      border: `1px solid ${active ? 'rgba(216,207,184,0.55)' : 'rgba(216,207,184,0.18)'}`,
                      borderRadius: '2px',
                      px: 0.875, height: 22,
                      background: active ? 'rgba(216,207,184,0.08)' : 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      color: active ? 'var(--ink)' : 'var(--muted)',
                      transition: 'border-color 0.12s, color 0.12s',
                    }}
                  >
                    {tag.name}
                  </Box>
                )
              })}
            </Box>
          </Box>
        )}

        {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>{error}</Typography>}
        <Box component="button" type="submit" disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.4)', borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
          {saving ? 'SAVING…' : 'SAVE CHANGES'}
        </Box>
      </Box>

      {/* ── Discography ─────────────────────────────────────────── */}
      <Box sx={{ borderTop: '1px solid rgba(216,207,184,0.1)', pt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
          <span style={lbl}>◉ RELEASES ({band.releases?.length ?? 0})</span>
          <Box component="button" onClick={() => setShowRelease(!showRelease)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)' }}>
            + ADD
          </Box>
        </Box>

        {showRelease && (
          <Box component="form" onSubmit={handleAddRelease} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#1a1424', p: 1.5, mb: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ ...lbl, fontSize: '0.5rem' }}>NEW RELEASE</span>
            <TextField label="Title" value={relForm.title} onChange={setRel('title')} onBlur={autoRelSlug} required fullWidth size="small" sx={inputSx} />
            <TextField label="Slug" value={relForm.slug} onChange={setRel('slug')} required fullWidth size="small" sx={inputSx} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Box component="select" value={relForm.type} onChange={(e: any) => setRel('type')(e)} sx={{ flex: 1, background: '#120e18', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', px: 1, height: 40 }}>
                {RELEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Box>
              <TextField label="Year" type="number" value={relForm.year} onChange={setRel('year')} required size="small" sx={{ ...inputSx, width: 90 }} />
            </Box>
            <TextField label="Label" value={relForm.label} onChange={setRel('label')} fullWidth size="small" sx={inputSx} />
            <Box component="button" type="submit" disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', py: 0.75, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
              {saving ? '…' : 'ADD RELEASE'}
            </Box>
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {(band.releases || []).map((r: any) => (
            <Box key={r.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(216,207,184,0.12)', borderRadius: '3px', px: 1.25, py: 0.875, backgroundColor: '#120e18' }}>
              <Box>
                <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem' }}>{r.title}</Typography>
                <span style={{ ...lbl, fontSize: '0.4375rem' }}>{r.type} · {r.year}</span>
              </Box>
              <Box component="button" onClick={() => handleDeleteRelease(r.id, r.title)} sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--accent)' }}>
                ✕
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
