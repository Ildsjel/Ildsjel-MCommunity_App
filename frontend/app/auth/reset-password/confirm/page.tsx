'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert,
} from '@mui/material'
import { Link as MuiLink } from '@mui/material'
import { Lock, Visibility, VisibilityOff } from '@mui/icons-material'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/types/apiError'

// ── Inner component needs useSearchParams → must be wrapped in Suspense ───────

function ConfirmForm() {
  const searchParams    = useSearchParams()
  const router          = useRouter()
  const [password, setPassword]         = useState('')
  const [confirm, setConfirm]           = useState('')
  const [showPw, setShowPw]             = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) { setError('Passwords do not match'); return }

    const token = searchParams.get('token')
    if (!token) { setError('Reset link is invalid or expired'); return }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setSuccess(true)
    } catch (err) {
      setError(getErrorMessage(err, 'Reset failed — the link may be invalid or expired'))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 1 }}>
        <Alert severity="success" sx={{ mb: 2.5 }}>
          Password updated successfully.
        </Alert>
        <Button fullWidth variant="contained" onClick={() => router.push('/auth/login')}>
          Go to login
        </Button>
      </Box>
    )
  }

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

      <TextField
        fullWidth label="New password" required
        type={showPw ? 'text' : 'password'}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Min. 8 characters"
        helperText="Uppercase · lowercase · number · special character"
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock sx={{ color: 'text.disabled', fontSize: 18 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowPw(v => !v)} edge="end" size="small">
                {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <TextField
        fullWidth label="Confirm password" required
        type={showConfirm ? 'text' : 'password'}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Repeat password"
        sx={{ mb: 2.5 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock sx={{ color: 'text.disabled', fontSize: 18 }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setShowConfirm(v => !v)} edge="end" size="small">
                {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <Button type="submit" fullWidth variant="contained" size="large" disabled={loading}>
        {loading ? 'Saving…' : 'Set new password'}
      </Button>
    </Box>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResetPasswordConfirmPage() {
  return (
    <Box sx={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', px: { xs: 2, sm: 4 }, py: 4,
      maxWidth: 440, mx: 'auto',
    }}>
      {/* Brand */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
        <Typography
          component={Link} href="/"
          className="grimr-glow grimr-wordmark"
          sx={{
            fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)',
            fontSize: { xs: '2.8rem', md: '3.5rem' },
            letterSpacing: '0.04em', color: 'text.primary',
            textDecoration: 'none', display: 'inline-block', mb: 1.5, lineHeight: 1,
          }}
        >
          Grimr
        </Typography>
        <Typography sx={{ fontFamily: '"EB Garamond", serif', fontStyle: 'italic', fontSize: '1.25rem', color: 'text.secondary', mb: 0.5 }}>
          Set a new password
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Suspense fallback={null}>
            <ConfirmForm />
          </Suspense>
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <MuiLink component={Link} href="/auth/login" color="text.secondary" underline="hover" sx={{ fontSize: '0.8rem' }}>
          ← Back to login
        </MuiLink>
      </Box>
    </Box>
  )
}
