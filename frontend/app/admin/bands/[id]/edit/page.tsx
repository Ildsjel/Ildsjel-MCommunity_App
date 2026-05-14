'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import type { ReleaseType } from '@/lib/types/admin'
import { getErrorMessage } from '@/lib/types/apiError'
import { TrackPanel } from '@/app/admin/components/TrackPanel'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const inputSx = {
  '& .MuiInputBase-root': { fontFamily: 'var(--font-serif)', fontSize: '0.875rem', color: 'var(--ink)' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.2)', borderRadius: '3px' },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.4)' },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(216,207,184,0.6)' },
  '& .MuiInputLabel-root': { fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--muted)' },
}

const RELEASE_TYPES = ['LP', 'EP', 'Split-EP', 'Demo', 'Live', 'Single', 'Compilation']

/**
 * Auto-fit an image to target dimensions.
 *
 * fit='cover'   — center-crop to fill (band photos: always fill the 16:9 frame)
 * fit='contain' — scale to fit inside, pad the rest with transparency
 *                 (logos: never crop, just letterbox so the whole logo is visible)
 */
async function autofitImage(
  file: File,
  targetW: number,
  targetH: number,
  fit: 'cover' | 'contain' = 'cover',
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)

      const srcW = img.naturalWidth
      const srcH = img.naturalHeight

      const canvas = document.createElement('canvas')
      canvas.width  = targetW
      canvas.height = targetH
      const ctx = canvas.getContext('2d')!

      if (fit === 'cover') {
        // Center-crop: fill the target frame, trim the excess
        const targetRatio = targetW / targetH
        const srcRatio    = srcW / srcH
        let cropW: number, cropH: number
        if (srcRatio > targetRatio) {
          cropH = srcH; cropW = srcH * targetRatio
        } else {
          cropW = srcW; cropH = srcW / targetRatio
        }
        const cropX = (srcW - cropW) / 2
        const cropY = (srcH - cropH) / 2
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH)
      } else {
        // Contain: scale the image to fit entirely within the target box,
        // centred, with no cropping. Background stays transparent.
        const scale = Math.min(targetW / srcW, targetH / srcH)
        const drawW = srcW * scale
        const drawH = srcH * scale
        const drawX = (targetW - drawW) / 2
        const drawY = (targetH - drawH) / 2
        ctx.clearRect(0, 0, targetW, targetH)   // ensure transparency
        ctx.drawImage(img, 0, 0, srcW, srcH, drawX, drawY, drawW, drawH)
      }

      // Keep PNG for contain (preserves transparency); JPEG for cover (photos)
      const mime = (fit === 'contain' || file.type === 'image/png') ? 'image/png' : 'image/jpeg'
      const ext  = mime === 'image/png' ? '.png' : '.jpg'
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ext), { type: mime }))
        },
        mime,
        0.92,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

function ImageUploadZone({
  label,
  currentUrl,
  aspect,           // '16/9' | '1/1'
  targetW,          // output pixel width
  targetH,          // output pixel height
  fit = 'cover',    // 'cover' = center-crop (photos), 'contain' = scale-to-fit (logos)
  uploading,
  onFile,
}: {
  label: string
  currentUrl?: string | null
  aspect: '16/9' | '1/1'
  targetW: number
  targetH: number
  fit?: 'cover' | 'contain'
  uploading: boolean
  onFile: (f: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  // local preview URL — shown immediately after autofit, before the server confirms
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // revoke the object URL when the component unmounts or preview changes
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const displayUrl = previewUrl ?? (currentUrl ? `${API_BASE}${currentUrl}` : null)
  const busy = uploading || processing

  const handleFile = async (file: File) => {
    setProcessing(true)
    try {
      const fitted = await autofitImage(file, targetW, targetH, fit)
      // show the preview immediately so the admin sees exactly what will be uploaded
      setPreviewUrl(URL.createObjectURL(fitted))
      onFile(fitted)
    } catch {
      // fall back to raw file if canvas fails (rare)
      onFile(file)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Box>
      <span style={{ ...lbl, display: 'block', marginBottom: 6 }}>{label}</span>
      <Box
        onClick={() => !busy && inputRef.current?.click()}
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: aspect,
          border: '1.5px dashed rgba(216,207,184,0.25)',
          borderRadius: '3px',
          overflow: 'hidden',
          cursor: busy ? 'default' : 'pointer',
          backgroundColor: '#120e18',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': { borderColor: busy ? 'rgba(216,207,184,0.25)' : 'rgba(216,207,184,0.5)' },
          transition: 'border-color 0.15s',
        }}
      >
        {displayUrl && (
          <Box
            component="img"
            src={displayUrl}
            alt={label}
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}

        <Box sx={{
          position: 'relative', zIndex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
          backgroundColor: displayUrl ? 'rgba(8,6,10,0.65)' : 'transparent',
          px: 2, py: 1.5, borderRadius: '3px',
        }}>
          {busy ? (
            <CircularProgress size={16} sx={{ color: 'var(--accent)' }} />
          ) : (
            <>
              <span style={{ fontSize: '1.1rem', color: 'rgba(216,207,184,0.5)' }}>↑</span>
              <span style={{ ...lbl, fontSize: '0.5625rem', color: displayUrl ? 'rgba(216,207,184,0.8)' : 'rgba(216,207,184,0.4)' }}>
                {displayUrl ? 'CLICK TO REPLACE' : 'CLICK TO UPLOAD'}
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
          if (f) { handleFile(f); e.target.value = '' }
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
  const [tagSearch, setTagSearch] = useState('')

  const [photoUploading, setPhotoUploading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [imageMsg, setImageMsg] = useState<string | null>(null)

  // New release form
  const [showRelease, setShowRelease] = useState(false)
  const [relForm, setRelForm] = useState({ title: '', slug: '', type: 'LP', year: '', label: '' })

  const [pendingCount, setPendingCount] = useState(0)
  const [expandedTracks, setExpandedTracks] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([adminAPI.getBand(id), adminAPI.listTags(), adminAPI.listSuggestions(id)]).then(([found, tags, sugs]) => {
      setAvailableTags(tags)
      setPendingCount(sugs.filter((s: any) => s.status === 'pending').length)
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

  const handleAddRelease = async () => {
    setSaving(true)
    try {
      await adminAPI.createRelease(id, { ...relForm, type: relForm.type as ReleaseType, year: parseInt(relForm.year), tracks: [] })
      const updated = await adminAPI.getBand(id)
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
      <Box component="button" onClick={() => router.push('/admin/bands')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
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
            targetW={1200}
            targetH={675}
            uploading={photoUploading}
            onFile={handlePhotoUpload}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Box sx={{ width: 140 }}>
              <ImageUploadZone
                label="Logo (square)"
                currentUrl={band.logo_url}
                aspect="1/1"
                targetW={400}
                targetH={400}
                fit="contain"
                uploading={logoUploading}
                onFile={handleLogoUpload}
              />
            </Box>
          </Box>
          {imageMsg && (
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: '#6a9a7a' }}>
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

        {/* ── Discography ─────────────────────────────────────────── */}
        <Box sx={{ borderTop: '1px solid rgba(216,207,184,0.1)', pt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
            <span style={lbl}>◉ RELEASES ({band.releases?.length ?? 0})</span>
            <Box component="button" type="button" onClick={() => setShowRelease(!showRelease)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.1em', color: 'var(--muted)' }}>
              + ADD
            </Box>
          </Box>

          {showRelease && (
            <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#1a1424', p: 1.5, mb: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <span style={{ ...lbl, fontSize: '0.625rem' }}>NEW RELEASE</span>
              <TextField label="Title" value={relForm.title} onChange={setRel('title')} onBlur={autoRelSlug} required fullWidth size="small" sx={inputSx} />
              <TextField label="Slug" value={relForm.slug} onChange={setRel('slug')} required fullWidth size="small" sx={inputSx} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box component="select" value={relForm.type} onChange={(e: any) => setRel('type')(e)} sx={{ flex: 1, background: '#120e18', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', px: 1, height: 40 }}>
                  {RELEASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Box>
                <TextField label="Year" type="number" value={relForm.year} onChange={setRel('year')} required size="small" sx={{ ...inputSx, width: 90 }} />
              </Box>
              <TextField label="Label" value={relForm.label} onChange={setRel('label')} fullWidth size="small" sx={inputSx} />
              <Box component="button" type="button" onClick={handleAddRelease} disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', py: 0.75, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
                {saving ? '…' : 'ADD RELEASE'}
              </Box>
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {(band.releases || []).map((r: any) => {
              const isExpanded = expandedTracks.has(r.id)
              const toggleTracks = () =>
                setExpandedTracks((prev) => {
                  const next = new Set(prev)
                  next.has(r.id) ? next.delete(r.id) : next.add(r.id)
                  return next
                })
              return (
                <Box key={r.id} sx={{ border: '1px solid rgba(216,207,184,0.12)', borderRadius: '3px', backgroundColor: '#120e18' }}>
                  {/* Release header row */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1.25, py: 0.875 }}>
                    <Box>
                      <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem' }}>{r.title}</Typography>
                      <span style={{ ...lbl, fontSize: '0.5625rem' }}>{r.type} · {r.year}</span>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.625, alignItems: 'center' }}>
                      {/* Track toggle */}
                      <Box
                        component="button"
                        type="button"
                        onClick={toggleTracks}
                        sx={{
                          border: `1px solid ${isExpanded ? 'rgba(216,207,184,0.35)' : 'rgba(216,207,184,0.18)'}`,
                          borderRadius: '2px', px: 0.75, height: 20,
                          background: isExpanded ? 'rgba(216,207,184,0.05)' : 'none',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
                          letterSpacing: '0.08em',
                          color: isExpanded ? 'var(--ink)' : 'var(--muted)',
                          '&:hover': { color: 'var(--ink)', borderColor: 'rgba(216,207,184,0.4)' },
                          transition: 'border-color 0.12s, color 0.12s',
                        }}
                      >
                        ♬ TRACKS ({(r.tracks || []).length})
                      </Box>
                      {/* Delete release */}
                      <Box
                        component="button"
                        type="button"
                        onClick={() => handleDeleteRelease(r.id, r.title)}
                        sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', color: 'var(--accent)', '&:hover': { borderColor: 'var(--accent)' } }}
                      >
                        ✕
                      </Box>
                    </Box>
                  </Box>

                  {/* Track panel — shown when expanded */}
                  {isExpanded && (
                    <Box sx={{ px: 1.25, pb: 1 }}>
                      <TrackPanel
                        release={r}
                        onRelease={(updated: any) =>
                          setBand((prev: any) => ({
                            ...prev,
                            releases: prev.releases.map((x: any) => (x.id === r.id ? updated : x)),
                          }))
                        }
                      />
                    </Box>
                  )}
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* ── Album Suggestions link ─────────────────────────────── */}
        <Box
          component="button"
          type="button"
          onClick={() => router.push(`/admin/bands/${id}/albums`)}
          sx={{
            width: '100%',
            border: pendingCount > 0 ? '1px solid rgba(212,160,16,0.4)' : '1px solid rgba(216,207,184,0.15)',
            borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em',
            color: pendingCount > 0 ? '#d4a010' : 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
            '&:hover': { borderColor: pendingCount > 0 ? 'rgba(212,160,16,0.7)' : 'rgba(216,207,184,0.3)', color: pendingCount > 0 ? '#d4a010' : 'var(--ink)' },
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          ◈ VIEW DISCOGRAPHY & ALBUM REVIEW
          {pendingCount > 0 && (
            <span style={{ border: '1px solid rgba(212,160,16,0.5)', borderRadius: '2px', padding: '0 4px', fontSize: '0.625rem' }}>
              {pendingCount} PENDING
            </span>
          )}
        </Box>

        {/* Tags */}
        {availableTags.length > 0 && (
          <Box>
            <span style={{ ...lbl, display: 'block', marginBottom: 8 }}>Tags</span>
            {/* Search field */}
            <Box sx={{ position: 'relative', mb: 1 }}>
              <input
                type="text"
                placeholder="Search tags…"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#120e18',
                  border: '1px solid rgba(216,207,184,0.2)',
                  borderRadius: '3px',
                  padding: '5px 28px 5px 8px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  letterSpacing: '0.08em',
                  color: 'var(--ink)',
                  outline: 'none',
                }}
              />
              {tagSearch && (
                <button
                  type="button"
                  onClick={() => setTagSearch('')}
                  style={{
                    position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '0.625rem',
                    color: 'var(--muted)', padding: 0, lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.625, maxHeight: 160, overflowY: 'auto' }}>
              {availableTags
                .filter((tag: any) =>
                  !tagSearch || tag.name.toLowerCase().includes(tagSearch.toLowerCase())
                )
                .map((tag: any) => {
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
                        fontFamily: 'var(--font-mono)', fontSize: '0.5625rem',
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

        {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>{error}</Typography>}
        <Box component="button" type="submit" disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.4)', borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
          {saving ? 'SAVING…' : 'SAVE CHANGES'}
        </Box>
      </Box>
    </Box>
  )
}
