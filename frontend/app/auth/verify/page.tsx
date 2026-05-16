'use client'

/**
 * /auth/verify — legacy redirect for old email links that used the wrong path.
 * Forwards the ?token= param to the real page at /auth/verify-email.
 */
import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Box, CircularProgress } from '@mui/material'

export default function VerifyRedirectPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      router.replace(`/auth/verify-email?token=${encodeURIComponent(token)}`)
    } else {
      router.replace('/auth/verify-email')
    }
  }, [searchParams, router])

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={20} sx={{ color: 'var(--accent, #c43a2a)' }} />
    </Box>
  )
}
