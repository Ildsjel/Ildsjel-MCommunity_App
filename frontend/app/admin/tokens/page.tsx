'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, TextField } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import AdminGuard from '@/app/components/AdminGuard'
import LoadingState from '@/app/components/LoadingState'
import { getErrorMessage } from '@/lib/types/apiError'
import type { AdminToken } from '@/lib/types/admin'

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

function TokensContent() {
  const router = useRouter()
  const [tokens, setTokens] = useState<AdminToken[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [note, setNote] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try { setTokens(await adminAPI.listTokens()) }
    catch (e: unknown) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    setNewToken(null)
    try {
      const token = await adminAPI.generateToken(note || undefined)
      setNewToken(token.token)
      setNote('')
      await load()
    } catch (err: unknown) { setError(getErrorMessage(err)) }
    finally { setGenerating(false) }
  }

  const handleCopy = () => {
    if (!newToken) return
    navigator.clipboard.writeText(newToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← ADMIN
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 8 }}>✶ ADMIN TOKENS</span>
      <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: 2.5 }}>
        Generate one-time tokens to grant admin rights. Share out-of-band. Expires in 7 days.
      </Typography>

      {/* Generate form */}
      <Box sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', p: 1.5, mb: 2 }}>
        <span style={{ ...lbl, fontSize: '0.5rem', display: 'block', marginBottom: 12 }}>GENERATE TOKEN</span>
        <Box component="form" onSubmit={handleGenerate} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <TextField label="Note (who is this for?)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth size="small" sx={inputSx} />
          {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)' }}>{error}</Typography>}
          <Box component="button" type="submit" disabled={generating} sx={{ border: '1.5px solid rgba(216,207,184,0.3)', borderRadius: '3px', py: 0.875, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--ink)', '&:disabled': { opacity: 0.4 } }}>
            {generating ? 'GENERATING…' : 'GENERATE TOKEN'}
          </Box>
        </Box>
      </Box>

      {/* New token display */}
      {newToken && (
        <Box sx={{ border: '1.5px solid rgba(106,154,122,0.4)', borderRadius: '3px', backgroundColor: 'rgba(106,154,122,0.08)', p: 1.5, mb: 2 }}>
          <span style={{ ...lbl, fontSize: '0.4375rem', color: '#6a9a7a', display: 'block', marginBottom: 8 }}>✓ TOKEN GENERATED — COPY NOW</span>
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', color: 'var(--ink)', wordBreak: 'break-all', flex: 1 }}>
              {newToken}
            </Typography>
            <Box component="button" onClick={handleCopy} sx={{ border: '1px solid rgba(216,207,184,0.3)', borderRadius: '2px', px: 0.875, height: 28, background: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: copied ? '#6a9a7a' : 'var(--muted)', flexShrink: 0 }}>
              {copied ? 'COPIED' : 'COPY'}
            </Box>
          </Box>
        </Box>
      )}

      {/* Token list */}
      {loading && <LoadingState />}

      {!loading && tokens.length > 0 && (
        <Box>
          <span style={{ ...lbl, fontSize: '0.5rem', display: 'block', marginBottom: 8 }}>ISSUED TOKENS</span>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {tokens.map((token) => (
              <Box key={token.id} sx={{ border: '1px solid rgba(216,207,184,0.15)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.25, py: 0.875, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--ink)' }}>
                    {token.note || '—'}
                  </Typography>
                  <span style={{ ...lbl, fontSize: '0.4375rem' }}>
                    Expires {new Date(token.expires_at).toLocaleDateString()}
                  </span>
                </Box>
                <Box sx={{ border: `1px solid ${token.redeemed_by_id ? 'rgba(106,154,122,0.4)' : 'rgba(216,207,184,0.2)'}`, borderRadius: '2px', px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.1em', color: token.redeemed_by_id ? '#6a9a7a' : 'var(--muted)' }}>
                  {token.redeemed_by_id ? 'REDEEMED' : 'PENDING'}
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}

export default function AdminTokensPage() {
  return (
    <AdminGuard requireSuperadmin>
      <TokensContent />
    </AdminGuard>
  )
}
