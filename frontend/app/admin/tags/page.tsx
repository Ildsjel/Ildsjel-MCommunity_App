'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import LoadingState from '@/app/components/LoadingState'
import { getErrorMessage } from '@/lib/types/apiError'

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

const TAG_CATEGORIES = ['mood', 'theme', 'era', 'technique', 'production', 'instrument', 'other']

export default function AdminTagsPage() {
  const router = useRouter()
  const [tags, setTags] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState<string>('all')
  const [form, setForm] = useState({ name: '', slug: '', category: 'mood' })
  const [mergeSource, setMergeSource] = useState('')
  const [mergeTarget, setMergeTarget] = useState('')

  const load = async () => {
    setLoading(true)
    try { setTags(await adminAPI.listTags()) }
    catch (e: unknown) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [k]: e.target.value }))
  const autoSlug = () => { if (!form.slug && form.name) setForm((p) => ({ ...p, slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') })) }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null)
    try {
      const tag = await adminAPI.createTag(form)
      setTags((prev) => [...prev, tag])
      setForm({ name: '', slug: '', category: 'mood' })
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete tag "${name}"?`)) return
    try { await adminAPI.deleteTag(id); setTags((prev) => prev.filter((t) => t.id !== id)) }
    catch (err: unknown) { alert(getErrorMessage(err)) }
  }

  const handleMerge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mergeSource || !mergeTarget || mergeSource === mergeTarget) return
    if (!confirm('Merge tags? The source tag will be deleted.')) return
    setSaving(true)
    try {
      await adminAPI.mergeTags(mergeSource, mergeTarget)
      await load()
      setMergeSource(''); setMergeTarget('')
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setSaving(false) }
  }

  const displayed = catFilter === 'all' ? tags : tags.filter((t) => t.category === catFilter)
  const grouped = TAG_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = displayed.filter((t) => t.category === cat)
    return acc
  }, {} as Record<string, any[]>)

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← ADMIN
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>◉ TAGS</span>

      {/* Create form */}
      <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', p: 1.5, mb: 2 }}>
        <span style={{ ...lbl, fontSize: '0.5rem', display: 'block', marginBottom: 12 }}>ADD TAG</span>
        <Box component="form" onSubmit={handleCreate} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField label="Name" value={form.name} onChange={set('name')} onBlur={autoSlug} required fullWidth size="small" sx={inputSx} />
            <TextField label="Slug" value={form.slug} onChange={set('slug')} required fullWidth size="small" sx={inputSx} />
          </Box>
          <Box component="select" value={form.category} onChange={(e: any) => set('category')(e)} sx={{ background: '#120e18', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', px: 1, height: 40 }}>
            {TAG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Box>
          {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)' }}>{error}</Typography>}
          <Box component="button" type="submit" disabled={saving} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', py: 0.75, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
            {saving ? '…' : 'ADD TAG'}
          </Box>
        </Box>
      </Box>

      {/* Merge form */}
      <Box sx={{ border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px', backgroundColor: '#120e18', p: 1.5, mb: 2 }}>
        <span style={{ ...lbl, fontSize: '0.5rem', display: 'block', marginBottom: 12 }}>MERGE TAGS</span>
        <Box component="form" onSubmit={handleMerge} sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <Box component="select" value={mergeSource} onChange={(e: any) => setMergeSource(e.target.value)} sx={{ flex: 1, background: '#120e18', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', px: 1, height: 40 }}>
            <option value="">Source (delete)</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Box>
          <span style={{ ...lbl, flexShrink: 0 }}>→</span>
          <Box component="select" value={mergeTarget} onChange={(e: any) => setMergeTarget(e.target.value)} sx={{ flex: 1, background: '#120e18', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', px: 1, height: 40 }}>
            <option value="">Target (keep)</option>
            {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Box>
          <Box component="button" type="submit" disabled={saving || !mergeSource || !mergeTarget} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 1, height: 40, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', flexShrink: 0, '&:disabled': { opacity: 0.3 } }}>
            MERGE
          </Box>
        </Box>
      </Box>

      {/* Category filter */}
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1.5 }}>
        {['all', ...TAG_CATEGORIES].map((c) => (
          <Box key={c} component="button" onClick={() => setCatFilter(c)} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', backgroundColor: catFilter === c ? '#ece5d3' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: catFilter === c ? '#120e18' : 'var(--muted)' }}>
            {c}
          </Box>
        ))}
      </Box>

      {loading && <LoadingState />}

      {/* Tags grouped by category */}
      {TAG_CATEGORIES.map((cat) => {
        const catTags = grouped[cat]
        if (!catTags?.length) return null
        return (
          <Box key={cat} sx={{ mb: 1.5 }}>
            <span style={{ ...lbl, fontSize: '0.4375rem', display: 'block', marginBottom: 6 }}>{cat}</span>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {catTags.map((tag) => (
                <Box key={tag.id} sx={{ border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 0.875, height: 22, display: 'inline-flex', alignItems: 'center', gap: 0.75, backgroundColor: '#120e18' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.08em', color: 'var(--ink)' }}>{tag.name}</span>
                  <Box component="button" onClick={() => handleDelete(tag.id, tag.name)} sx={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.4375rem', p: 0, lineHeight: 1, opacity: 0.6, '&:hover': { opacity: 1 } }}>✕</Box>
                </Box>
              ))}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}
