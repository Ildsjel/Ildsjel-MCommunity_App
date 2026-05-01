'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
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

export default function NewBandPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '', slug: '', country: '', country_code: '', formed: '', bio: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }))

  const autoSlug = () => {
    if (!form.slug && form.name) {
      setForm((prev) => ({ ...prev, slug: prev.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const band = await adminAPI.createBand({
        ...form,
        formed: parseInt(form.formed),
        genre_ids: [],
        tag_ids: [],
      })
      router.push(`/admin/bands/${band.id}/edit`)
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin/bands')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← BANDS
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>+ NEW BAND</span>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <TextField label="Band Name" value={form.name} onChange={set('name')} onBlur={autoSlug} required fullWidth size="small" sx={inputSx} />
        <TextField label="Slug (url-safe, auto-generated)" value={form.slug} onChange={set('slug')} required fullWidth size="small" sx={inputSx} inputProps={{ pattern: '[a-z0-9-]+' }} helperText="e.g. bell-witch" FormHelperTextProps={{ sx: { fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)' } }} />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField label="Country" value={form.country} onChange={set('country')} required fullWidth size="small" sx={inputSx} />
          <TextField label="Code" value={form.country_code} onChange={set('country_code')} required size="small" sx={{ ...inputSx, width: 90 }} inputProps={{ maxLength: 4 }} />
        </Box>
        <TextField label="Formed (year)" type="number" value={form.formed} onChange={set('formed')} required fullWidth size="small" sx={inputSx} inputProps={{ min: 1960, max: 2100 }} />
        <TextField label="Bio" value={form.bio} onChange={set('bio')} multiline rows={4} fullWidth size="small" sx={inputSx} />

        {error && (
          <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)', letterSpacing: '0.1em' }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
          <Box component="button" type="submit" disabled={saving} sx={{ flex: 1, border: '1.5px solid rgba(216,207,184,0.4)', borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:hover': { borderColor: 'rgba(216,207,184,0.7)' }, '&:disabled': { opacity: 0.4 } }}>
            {saving ? 'SAVING…' : 'CREATE BAND'}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
