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
} from '@mui/material'
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material'
import { authAPI } from '@/lib/api'
import { useUser } from '@/app/context/UserContext'

export default function LoginPage() {
  const router = useRouter()
  const { setUser } = useUser()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(formData)
      
      // Store token and update context
      localStorage.setItem('access_token', response.access_token)
      setUser(response.user)
      
      // Redirect to profile
      router.push('/profile')
    } catch (err: any) {
      // Handle different error formats
      const detail = err.response?.data?.detail
      let errorMessage = 'Login failed'
      
      if (Array.isArray(detail)) {
        // Pydantic validation errors (array of error objects)
        errorMessage = detail.map((error: any) => error.msg).join(', ')
      } else if (typeof detail === 'string') {
        errorMessage = detail
      }
      
      // Check if it's an email verification error
      if (errorMessage.includes('verify your email')) {
        setError('Bitte verifiziere zuerst deine E-Mail-Adresse. Überprüfe deinen Posteingang.')
      } else if (errorMessage.includes('inactive')) {
        setError('Dein Account ist inaktiv. Bitte kontaktiere den Support.')
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
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h2" gutterBottom>
            Welcome Back
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Login to your Grimr account
          </Typography>
        </Box>

        {/* Form */}
        <Card>
          <CardContent sx={{ p: 4 }}>
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
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                sx={{ mb: 3 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
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
                {loading ? 'Logging in...' : 'Login'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <MuiLink
                    component={Link}
                    href="/auth/register"
                    color="primary"
                    underline="hover"
                  >
                    Sign Up
                  </MuiLink>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <MuiLink
                    component={Link}
                    href="/auth/reset-password"
                    color="primary"
                    underline="hover"
                  >
                    Forgot Password?
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <MuiLink
            component={Link}
            href="/"
            color="text.secondary"
            underline="hover"
          >
            ← Back to Home
          </MuiLink>
        </Box>
      </Box>
    </Container>
  )
}
