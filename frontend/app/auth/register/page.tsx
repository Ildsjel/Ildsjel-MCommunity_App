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
  Grid,
  InputAdornment,
  IconButton,
  Snackbar,
  Divider,
} from '@mui/material'
import {
  Visibility, VisibilityOff, Email, Lock, Person, LocationOn, Public,
} from '@mui/icons-material'
import { authAPI } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    handle: '', email: '', password: '', country: '', city: '',
  })
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [showPw, setShowPw]     = useState(false)
  const [successOpen, setSuccessOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.register(formData)
      setSuccessOpen(true)
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) setError(detail.map((e: any) => e.msg).join(', '))
      else if (typeof detail === 'string') setError(detail)
      else setError('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData((f) => ({ ...f, [k]: e.target.value }))

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        px: { xs: 2, sm: 4 },
        py: { xs: 4, md: 6 },
        maxWidth: 480,
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
          Join the community
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Create your Metal-ID
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
              fullWidth label="Handle" required autoComplete="username"
              value={formData.handle} onChange={set('handle')}
              placeholder="metalhead666"
              helperText="Your unique username"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              fullWidth label="Email" type="email" required autoComplete="email"
              value={formData.email} onChange={set('email')}
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
              fullWidth label="Password" required autoComplete="new-password"
              type={showPw ? 'text' : 'password'}
              value={formData.password} onChange={set('password')}
              placeholder="••••••••"
              helperText="Min. 8 chars · 1 uppercase · 1 number · 1 special char"
              sx={{ mb: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'text.disabled', fontSize: 18 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPw(!showPw)} edge="end" size="small"
                      aria-label={showPw ? 'Hide' : 'Show'}>
                      {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Location — 2-col grid on sm+, stacked on xs */}
            <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="Country (optional)"
                  value={formData.country} onChange={set('country')}
                  placeholder="Germany"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Public sx={{ color: 'text.disabled', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth label="City (optional)"
                  value={formData.city} onChange={set('city')}
                  placeholder="Berlin"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LocationOn sx={{ color: 'text.disabled', fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Button
              type="submit" fullWidth variant="contained" size="large"
              disabled={loading} sx={{ mb: 1.5 }}
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </Button>

            <Divider sx={{ my: 2.5 }} />

            <Typography variant="body2" color="text.secondary" align="center" sx={{ fontSize: '0.875rem' }}>
              Already have an account?{' '}
              <MuiLink component={Link} href="/auth/login" color="primary" underline="hover">
                Login
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

      <Snackbar
        open={successOpen}
        autoHideDuration={5000}
        onClose={() => setSuccessOpen(false)}
        message="Account created! Please check your email to verify."
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}
