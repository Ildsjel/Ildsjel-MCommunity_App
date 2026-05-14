'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import AdminGuard from '@/app/components/AdminGuard'
import LoadingState from '@/app/components/LoadingState'
import { useUser } from '@/app/context/UserContext'
import { getErrorMessage } from '@/lib/types/apiError'
import type { AdminUser } from '@/lib/types/admin'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.6875rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'var(--accent)',
  admin: '#6a9a7a',
  user: 'var(--muted)',
}

function UsersContent() {
  const router = useRouter()
  const { user: me } = useUser()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [onboardingUpdating, setOnboardingUpdating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    adminAPI.listUsers()
      .then(setUsers)
      .catch((e: unknown) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (userId: string, newRole: AdminUser['role']) => {
    setUpdating(userId)
    try {
      await adminAPI.setUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (e: unknown) { alert(getErrorMessage(e)) }
    finally { setUpdating(null) }
  }

  const handleDelete = async (userId: string, handle: string) => {
    if (!confirm(`Permanently delete user "${handle}" and all their data? This cannot be undone.`)) return
    setDeleting(userId)
    try {
      await adminAPI.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (e: unknown) { alert(getErrorMessage(e)) }
    finally { setDeleting(null) }
  }

  const handleOnboardingReset = async (userId: string) => {
    setOnboardingUpdating(userId)
    try {
      await adminAPI.setUserOnboarding(userId, false)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, onboarding_complete: false } : u)))
    } catch (e: unknown) { alert(getErrorMessage(e)) }
    finally { setOnboardingUpdating(null) }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.625rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← ADMIN
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>☍ USERS</span>

      {loading && <LoadingState />}
      {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: 'var(--accent)' }}>{error}</Typography>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {users.map((u) => (
          <Box key={u.id} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', letterSpacing: '0.03em' }}>{u.handle}</Typography>
              <span style={{ ...lbl, fontSize: '0.5625rem' }}>{u.email}</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {/* Delete button — hidden for self */}
              {u.id !== me?.id && (
                <Box
                  component="button"
                  onClick={() => handleDelete(u.id, u.handle)}
                  disabled={deleting === u.id}
                  title="Delete user"
                  sx={{
                    background: 'none', border: '1px solid rgba(196,58,42,0.35)',
                    borderRadius: '2px', cursor: 'pointer', height: 18, px: 0.75,
                    fontFamily: 'var(--font-mono)', fontSize: '0.35rem',
                    color: 'rgba(196,58,42,0.7)', letterSpacing: '0.08em',
                    '&:hover': { borderColor: 'var(--accent)', color: 'var(--accent)', background: 'rgba(196,58,42,0.08)' },
                    '&:disabled': { opacity: 0.35 },
                  }}
                >
                  {deleting === u.id ? '…' : '✕ DELETE'}
                </Box>
              )}
              {/* Onboarding reset button — only shown when onboarding is complete */}
              {u.onboarding_complete && u.id !== me?.id && (
                <Box
                  component="button"
                  onClick={() => handleOnboardingReset(u.id)}
                  disabled={onboardingUpdating === u.id}
                  title="Reset onboarding"
                  sx={{
                    background: 'none', border: '1px solid rgba(196,58,42,0.35)',
                    borderRadius: '2px', cursor: 'pointer', height: 18, px: 0.75,
                    fontFamily: 'var(--font-mono)', fontSize: '0.35rem',
                    color: 'rgba(196,58,42,0.7)', letterSpacing: '0.08em',
                    '&:hover': { borderColor: 'rgba(196,58,42,0.7)', color: 'var(--accent)' },
                    '&:disabled': { opacity: 0.35 },
                  }}
                >
                  {onboardingUpdating === u.id ? '…' : '↺ ONBOARD'}
                </Box>
              )}
              {u.id === me?.id ? (
                <Box sx={{ border: `1px solid ${ROLE_COLORS[u.role] || 'var(--muted)'}`, borderRadius: '2px', px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.625rem', color: ROLE_COLORS[u.role] || 'var(--muted)' }}>
                  {u.role} (you)
                </Box>
              ) : (
                <Box component="select" value={u.role || 'user'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(u.id, e.target.value as AdminUser['role'])} disabled={updating === u.id} sx={{ background: '#1a1424', border: `1px solid ${ROLE_COLORS[u.role || 'user'] || 'rgba(216,207,184,0.2)'}`, borderRadius: '2px', color: ROLE_COLORS[u.role || 'user'] || 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', px: 0.75, height: 24, cursor: 'pointer', '&:disabled': { opacity: 0.4 } }}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </Box>
              )}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default function AdminUsersPage() {
  return (
    <AdminGuard requireSuperadmin>
      <UsersContent />
    </AdminGuard>
  )
}
