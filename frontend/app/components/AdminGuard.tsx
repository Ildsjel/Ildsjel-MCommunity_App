'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, CircularProgress } from '@mui/material'
import { useUser } from '@/app/context/UserContext'

interface AdminGuardProps {
  children: React.ReactNode
  requireSuperadmin?: boolean
}

export default function AdminGuard({ children, requireSuperadmin = false }: AdminGuardProps) {
  const { user, isLoading } = useUser()
  const router = useRouter()

  const allowed = user?.role === 'superadmin' || (!requireSuperadmin && user?.role === 'admin')

  useEffect(() => {
    if (!isLoading && (!user || !allowed)) {
      router.push('/feed')
    }
  }, [user, isLoading, allowed, router])

  if (isLoading || !user || !allowed) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: 'var(--accent)' }} size={24} />
      </Box>
    )
  }

  return <>{children}</>
}
