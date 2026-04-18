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

export default function AdminGenresPage() {
  const router = useRouter()
  const [genres, setGenres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', parent_id: '' })
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', parent_id: '' })

  const load = async () => {
    setLoading(true)
    try {
      setGenres(await adminAPI.listGenres())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const setE = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditForm((p) => ({ ...p, [k]: e.target.value }))

  const autoSlug = () => {
    if (!form.slug && form.name) setForm((p) => ({ ...p, slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const genre = await adminAPI.createGenre({ ...form, parent_id: form.parent_id || null })
      setGenres((prev) => [...prev, genre])
      setForm({ name: '', slug: '', description: '', parent_id: '' })
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    try {
      const updated = await adminAPI.updateGenre(id, { ...editForm, parent_id: editForm.parent_id || null })
      setGenres((prev) => prev.map((g) => (g.id === id ? updated : g)))
      setEditId(null)
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete genre "${name}"? This removes it from all bands.`)) return
    try {
      await adminAPI.deleteGenre(id)
      setGenres((prev) => prev.filter((g) => g.id !== id))
    } catch (err: any) { alert(err.message) }
  }

  // Separate roots from children for hierarchy display
  const roots = genres.filter((g) => !g.parent_id)
  const children = genres.filter((g) => g.parent_id)

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← ADMIN
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>⌕ GENRE ONTOLOGY</span>

      {/* Create form */}
      <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', p: 1.5, mb: 2 }}>
        <span style={{ ...lbl, fontSize: '0.5rem', display: 'block', marginBottom: 12 }}>ADD GENRE</span>
        <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Name" value={form.name} onChange={set('name')} onBlur={autoSlug} required fullWidth size="small" sx={inputSx} />
            <TextField label="Slug" value={form.slug} onChange={set('slug')} required fullWidth size="small" sx={inputSx} />
          </Box>
          <TextField label="Description" value={form.description} onChange={set('description')} fullWidth size="small" sx={inputSx} />
          <Box component="select" value={form.parent_id} onChange={(e: any) => setForm((p) => ({ ...p, parent_id: e.target.value }))} sx={{ background: '#120e18', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', px: 1, height: 40 }}>
            <option value="">No parent (top-level)</option>
            {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Box>
          {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)' }}>{error}</Typography>}
          <Box component="button" type="submit" disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', py: 0.75, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
            {saving ? '…' : 'ADD GENRE'}
          </Box>
        </Box>
      </Box>

      {loading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={20} sx={{ color: 'var(--accent)' }} /></Box>}

      {/* Hierarchy view */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {roots.map((genre) => (
          <Box key={genre.id}>
            {/* Root genre */}
            <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.25, py: 1 }}>
              {editId === genre.id ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <TextField value={editForm.name} onChange={setE('name')} size="small" fullWidth sx={inputSx} placeholder="Name" />
                  <TextField value={editForm.description} onChange={setE('description')} size="small" fullWidth sx={inputSx} placeholder="Description" />
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <Box component="button" onClick={() => handleUpdate(genre.id)} disabled={saving} sx={{ flex: 1, border: '1px solid rgba(216,207,184,0.3)', borderRadius: '2px', height: 24, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>SAVE</Box>
                    <Box component="button" onClick={() => setEditId(null)} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', height: 24, px: 1, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)' }}>CANCEL</Box>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.08em', color: 'var(--ink)' }}>{genre.name}</Typography>
                    {genre.description && <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)' }}>{genre.description}</Typography>}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Box component="button" onClick={() => { setEditId(genre.id); setEditForm({ name: genre.name, description: genre.description || '', parent_id: genre.parent_id || '' }) }} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)' }}>EDIT</Box>
                    <Box component="button" onClick={() => handleDelete(genre.id, genre.name)} sx={{ border: '1px solid rgba(196,58,42,0.3)', borderRadius: '2px', px: 0.75, height: 20, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--accent)' }}>✕</Box>
                  </Box>
                </Box>
              )}
            </Box>
            {/* Children indented */}
            {children.filter((c) => c.parent_id === genre.id).map((child) => (
              <Box key={child.id} sx={{ ml: 2, mt: 0.375, border: '1px solid rgba(216,207,184,0.12)', borderRadius: '3px', backgroundColor: '#0e0b14', px: 1.25, py: 0.75, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.08em', color: 'rgba(236,229,211,0.7)' }}>↳ {child.name}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Box component="button" onClick={() => { setEditId(child.id); setEditForm({ name: child.name, description: child.description || '', parent_id: child.parent_id || '' }) }} sx={{ border: '1px solid rgba(216,207,184,0.15)', borderRadius: '2px', px: 0.75, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--muted)' }}>EDIT</Box>
                  <Box component="button" onClick={() => handleDelete(child.id, child.name)} sx={{ border: '1px solid rgba(196,58,42,0.25)', borderRadius: '2px', px: 0.75, height: 18, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--accent)' }}>✕</Box>
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
