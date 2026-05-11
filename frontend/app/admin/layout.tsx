'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Box } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import AdminGuard from '@/app/components/AdminGuard'
import { adminAPI } from '@/lib/adminAPI'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.4375rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

function AdminSubNav() {
  const router = useRouter()
  const pathname = usePathname()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const c = await adminAPI.getReviewCounts()
        if (!cancelled) setPendingCount(c.pending)
      } catch {
        // silent
      }
    }
    poll()
    const id = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const isAlbumReview = pathname?.startsWith('/admin/review/albums')
  const isBands = pathname?.startsWith('/admin/bands')

  return (
    <Box sx={{
      borderBottom: '1px solid rgba(216,207,184,0.1)',
      backgroundColor: '#08060a',
      px: 2, py: 0.625,
      display: 'flex', alignItems: 'center', gap: 1.25,
    }}>
      {/* Back to admin */}
      <Box
        component="button"
        onClick={() => router.push('/admin')}
        sx={{
          background: 'none', border: 'none', cursor: 'pointer', p: 0,
          ...lbl, color: 'var(--muted)',
          '&:hover': { color: 'var(--ink)' }, transition: 'color 0.12s',
        }}
      >
        ← ADMIN
      </Box>

      <Box sx={{ width: '1px', height: 12, backgroundColor: 'rgba(216,207,184,0.15)', flexShrink: 0 }} />

      {/* Album Review */}
      <Box
        component="button"
        onClick={() => router.push('/admin/review/albums')}
        sx={{
          background: 'none', border: 'none', cursor: 'pointer', p: 0,
          display: 'flex', alignItems: 'center', gap: 0.5,
          ...lbl,
          color: isAlbumReview ? 'var(--ink)' : 'var(--muted)',
          borderBottom: isAlbumReview ? '1.5px solid var(--accent)' : '1.5px solid transparent',
          pb: 0.125,
          '&:hover': { color: 'var(--ink)' }, transition: 'color 0.12s',
        }}
      >
        ALBUM REVIEW
        {pendingCount > 0 && (
          <Box sx={{
            border: '1px solid rgba(212,160,16,0.7)', borderRadius: '2px',
            px: 0.5, height: 14, display: 'inline-flex', alignItems: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '0.375rem', letterSpacing: '0.1em',
            color: '#d4a010', lineHeight: 1,
          }}>
            {pendingCount}
          </Box>
        )}
      </Box>

      {/* Bands */}
      <Box
        component="button"
        onClick={() => router.push('/admin/bands')}
        sx={{
          background: 'none', border: 'none', cursor: 'pointer', p: 0,
          ...lbl,
          color: isBands ? 'var(--ink)' : 'var(--muted)',
          borderBottom: isBands ? '1.5px solid var(--accent)' : '1.5px solid transparent',
          pb: 0.125,
          '&:hover': { color: 'var(--ink)' }, transition: 'color 0.12s',
        }}
      >
        BANDS
      </Box>
    </Box>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <Navigation />
      <AdminSubNav />
      {children}
    </AdminGuard>
  )
}
