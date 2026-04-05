'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Container,
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(formData)
      localStorage.setItem('access_token', response.access_token)
      setUser(response.user)
      router.push('/profile')
    } catch (err: any) {
      const detail = err.response?.data?.detail
      let errorMessage = 'Login failed'
      if (Array.isArray(detail)) {
        errorMessage = detail.map((e: any) => e.msg).join(', ')
      } else if (typeof detail === 'string') {
        errorMessage = detail
      }
      if (errorMessage.includes('verify your email')) {
        setError('Please verify your email address first. Check your inbox.')
      } else if (errorMessage.includes('inactive')) {
        setError('Your account is inactive. Please contact support.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: 4,
        }}
      >
        {/* Grimr logo / brand */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Typography
            variant="h1"
            className="grimr-glow"
            component={Link}
            href="/"
            sx={{
              fontSize: { xs: '3rem', md: '4rem' },
              letterSpacing: '0.05em',
              display: 'inline-block',
              color: 'text.primary',
              textDecoration: 'none',
              mb: 2,
            }}
          >
            Grimr
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 400, fontStyle: 'italic', mb: 0.5 }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Login to your Grimr account
          </Typography>
        </Box>

        {/* Form card */}
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Box component="form" onSubmit={handleSubmit}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
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
                sx={{ mb: 2.5 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: 'text.disabled', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
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
                sx={{ mb: 2 }}
              >
                {loading ? 'Signing in…' : 'Login'}
              </Button>

              <Box sx={{ textAlign: 'right' }}>
                <MuiLink
                  component={Link}
                  href="/auth/reset-password"
                  color="text.secondary"
                  underline="hover"
                  variant="body2"
                >
                  Forgot Password?
                </MuiLink>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary" align="center">
                Don&apos;t have an account?{' '}
                <MuiLink component={Link} href="/auth/register" color="primary" underline="hover">
                  Sign Up
                </MuiLink>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <MuiLink component={Link} href="/" color="text.secondary" underline="hover" variant="body2">
            ← Back to Home
          </MuiLink>
        </Box>
      </Box>
    </Container>
  )
}
