'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import AdminGuard from '@/app/components/AdminGuard'
import { useUser } from '@/app/context/UserContext'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
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
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    adminAPI.listUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId)
    try {
      await adminAPI.setUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)))
    } catch (e: any) { alert(e.message) }
    finally { setUpdating(null) }
  }

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>
      <Box component="button" onClick={() => router.push('/admin')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 2, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
        ← ADMIN
      </Box>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 20 }}>☍ USERS</span>

      {loading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={20} sx={{ color: 'var(--accent)' }} /></Box>}
      {error && <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent)' }}>{error}</Typography>}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {users.map((u) => (
          <Box key={u.id} sx={{ border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px', backgroundColor: '#120e18', px: 1.5, py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontFamily: 'var(--font-display)', fontSize: '0.8125rem', letterSpacing: '0.03em' }}>{u.handle}</Typography>
              <span style={{ ...lbl, fontSize: '0.4375rem' }}>{u.email}</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              {u.id === me?.id ? (
                <Box sx={{ border: `1px solid ${ROLE_COLORS[u.role] || 'var(--muted)'}`, borderRadius: '2px', px: 0.75, height: 18, display: 'inline-flex', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: ROLE_COLORS[u.role] || 'var(--muted)' }}>
                  {u.role} (you)
                </Box>
              ) : (
                <Box component="select" value={u.role || 'user'} onChange={(e: any) => handleRoleChange(u.id, e.target.value)} disabled={updating === u.id} sx={{ background: '#1a1424', border: `1px solid ${ROLE_COLORS[u.role || 'user'] || 'rgba(216,207,184,0.2)'}`, borderRadius: '2px', color: ROLE_COLORS[u.role || 'user'] || 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', px: 0.75, height: 24, cursor: 'pointer', '&:disabled': { opacity: 0.4 } }}>
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
