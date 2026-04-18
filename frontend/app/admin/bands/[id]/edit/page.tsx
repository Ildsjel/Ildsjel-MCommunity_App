'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'

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

export default function EditBandPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params
  const [band, setBand] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', country: '', country_code: '', formed: '', bio: '' })

  // New release form
  const [showRelease, setShowRelease] = useState(false)
  const [relForm, setRelForm] = useState({ title: '', slug: '', type: 'LP', year: '', label: '' })

  useEffect(() => {
    adminAPI.listBands().then((bands) => {
      const found = bands.find((b: any) => b.id === id)
      if (found) {
        setBand(found)
        setForm({ name: found.name, country: found.country, country_code: found.country_code, formed: String(found.formed), bio: found.bio || '' })
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
      const updated = await adminAPI.updateBand(id, { ...form, formed: parseInt(form.formed) })
      setBand(updated)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddRelease = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await adminAPI.createRelease(id, { ...relForm, year: parseInt(relForm.year), tracks: [] })
      const bands = await adminAPI.listBands()
      const updated = bands.find((b: any) => b.id === id)
      if (updated) setBand(updated)
      setRelForm({ title: '', slug: '', type: 'LP', year: '', label: '' })
      setShowRelease(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRelease = async (releaseId: string, title: string) => {
    if (!confirm(`Delete release "${title}"?`)) return
    try {
      await adminAPI.deleteRelease(releaseId)
      setBand((prev: any) => ({ ...prev, releases: prev.releases.filter((r: any) => r.id !== releaseId) }))
    } catch (err: any) {
      alert(err.message)
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

      {/* Band info form */}
      <Box component="form" onSubmit={handleSave} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        <TextField label="Band Name" value={form.name} onChange={set('name')} required fullWidth size="small" sx={inputSx} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField label="Country" value={form.country} onChange={set('country')} required fullWidth size="small" sx={inputSx} />
          <TextField label="Code" value={form.country_code} onChange={set('country_code')} required size="small" sx={{ ...inputSx, width: 90 }} />
        </Box>
        <TextField label="Formed" type="number" value={form.formed} onChange={set('formed')} required fullWidth size="small" sx={inputSx} />
        <TextField label="Bio" value={form.bio} onChange={set('bio')} multiline rows={4} fullWidth size="small" sx={inputSx} />
        {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>{error}</Typography>}
        <Box component="button" type="submit" disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.4)', borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
          {saving ? 'SAVING…' : 'SAVE CHANGES'}
        </Box>
      </Box>

      {/* Discography */}
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
