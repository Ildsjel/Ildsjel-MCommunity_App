'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box, Card, CardContent, TextField, Button,
  Typography, Alert, Link as MuiLink,
} from '@mui/material'
import { Email } from '@mui/icons-material'
import InputAdornment from '@mui/material/InputAdornment'
import { api } from '@/lib/api'
import { getErrorMessage } from '@/lib/types/apiError'

const COOLDOWN_SEC = 60

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [now, setNow]                 = useState(() => Date.now())

  useEffect(() => {
    if (!cooldownUntil) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [cooldownUntil])

  const remaining   = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0
  const isCooling   = remaining > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isCooling) return
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/request-password-reset', { email })
      setSuccess(true)
      setEmail('')
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; headers?: Record<string, string> } }
      if (e.response?.status === 429) {
        const sec = parseInt(e.response?.headers?.['retry-after'] ?? '', 10)
        setCooldownUntil(Date.now() + (Number.isFinite(sec) && sec > 0 ? sec : COOLDOWN_SEC) * 1000)
        setNow(Date.now())
        setError('Too many attempts — please try again in a minute.')
      } else {
        setError(getErrorMessage(err, 'Something went wrong'))
      }
    } finally {
      setLoading(false)
    }
  }

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
          Reset your password
        </Typography>
        <Typography variant="caption" color="text.secondary">
          We&apos;ll send you a link to set a new one
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          {success ? (
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Alert severity="success" sx={{ mb: 2.5 }}>
                If that email is registered, a reset link is on its way. Check your inbox (and spam).
              </Alert>
              <Button fullWidth variant="outlined" onClick={() => router.push('/auth/login')}>
                Back to login
              </Button>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleSubmit}>
              {error && <Alert severity="error" sx={{ mb: 2.5 }}>{error}</Alert>}

              <TextField
                fullWidth label="Email address" type="email" required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                sx={{ mb: 2.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.disabled', fontSize: 18 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading || isCooling}
                sx={{ mb: 2 }}
              >
                {loading ? 'Sending…' : isCooling ? `Try again in ${remaining}s` : 'Send reset link'}
              </Button>

              <Typography variant="body2" color="text.secondary" align="center" sx={{ fontSize: '0.875rem' }}>
                Remembered it?{' '}
                <MuiLink component={Link} href="/auth/login" color="primary" underline="hover">
                  Back to login
                </MuiLink>
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <MuiLink component={Link} href="/" color="text.secondary" underline="hover" sx={{ fontSize: '0.8rem' }}>
          ← Back to Home
        </MuiLink>
      </Box>
    </Box>
  )
}
