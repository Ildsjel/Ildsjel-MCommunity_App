'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
import { authAPI } from '@/lib/api'
import { useUser } from '@/app/context/UserContext'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useUser()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.login(formData)
      localStorage.setItem('access_token', res.access_token)
      setUser(res.user)
      router.push('/profile')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      let msg = 'Login failed'
      if (Array.isArray(detail))      msg = detail.map((e: any) => e.msg).join(', ')
      else if (typeof detail === 'string') msg = detail
      if (msg.includes('verify your email')) msg = 'Please verify your email address first. Check your inbox.'
      else if (msg.includes('inactive'))     msg = 'Your account is inactive. Please contact support.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    /* Full-screen centering — no Container, so background fills edge-to-edge */
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { xs: 2, sm: 4 },
        py: 4,
        maxWidth: 440,
        mx: 'auto',
      }}
    >
      {/* Grimr brand mark */}
      <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 5 } }}>
        <Typography
          component={Link}
          href="/"
          className="grimr-glow"
          sx={{
            fontFamily: '"Archivo Black", sans-serif',
            fontSize: { xs: '2.8rem', md: '3.5rem' },
            letterSpacing: '0.04em',
            color: 'text.primary',
            textDecoration: 'none',
            display: 'inline-block',
            mb: 1.5,
            lineHeight: 1,
          }}
        >
          Grimr
        </Typography>
        <Typography
          sx={{
            fontFamily: '"EB Garamond", serif',
            fontStyle: 'italic',
            fontSize: '1.25rem',
            color: 'text.secondary',
            mb: 0.5,
          }}
        >
          Welcome back
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sign in to your account
        </Typography>
      </Box>

      {/* Form card */}
      <Card>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Box component="form" onSubmit={handleSubmit}>
            {error && (
              <Alert severity="error" sx={{ mb: 2.5, fontSize: '0.875rem' }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth
              label="Password"
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              sx={{ mb: 2.5 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPw(!showPw)}
                      edge="end"
                      size="small"
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw
                        ? <VisibilityOff fontSize="small" />
                        : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mb: 1.5 }}
            >
              {loading ? 'Signing in…' : 'Login'}
            </Button>

            <Box sx={{ textAlign: 'right' }}>
              <MuiLink
                component={Link}
                href="/auth/reset-password"
                color="text.secondary"
                underline="hover"
                sx={{ fontSize: '0.8rem' }}
              >
                Forgot password?
              </MuiLink>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="body2" color="text.secondary" align="center" sx={{ fontSize: '0.875rem' }}>
              Don&apos;t have an account?{' '}
              <MuiLink component={Link} href="/auth/register" color="primary" underline="hover">
                Sign up
              </MuiLink>
            </Typography>
          </Box>
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
