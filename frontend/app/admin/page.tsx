'use client'

import { useRouter } from 'next/navigation'
import { Box, Typography } from '@mui/material'
import { useUser } from '@/app/context/UserContext'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const SECTIONS = [
  { label: '◆ BANDS', desc: 'Curate the band catalogue — create, edit, publish, archive', path: '/admin/bands', adminOnly: false },
  { label: '⌕ GENRES', desc: 'Manage the genre ontology and hierarchy', path: '/admin/genres', adminOnly: false },
  { label: '◉ TAGS', desc: 'Manage tags, categories, and merge duplicates', path: '/admin/tags', adminOnly: false },
  { label: '✶ TOKENS', desc: 'Generate and revoke admin invitation tokens', path: '/admin/tokens', adminOnly: true },
  { label: '☍ USERS', desc: 'View and manage user roles', path: '/admin/users', adminOnly: true },
]

export default function AdminDashboard() {
  const router = useRouter()
  const { user } = useUser()
  const isSuperadmin = user?.role === 'superadmin'

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <span style={{ ...lbl, color: 'var(--accent)' }}>⌖ ADMIN PORTAL</span>
        <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mt: 0.5 }}>
          Signed in as {user?.handle} · {user?.role}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {SECTIONS.filter((s) => !s.adminOnly || isSuperadmin).map((section) => (
          <Box
            key={section.path}
            onClick={() => router.push(section.path)}
            sx={{
              border: '1.5px solid rgba(216,207,184,0.2)', borderRadius: '3px',
              backgroundColor: '#120e18', px: 1.5, py: 1.25,
              cursor: 'pointer',
              boxShadow: '1.5px 1.5px 0 rgba(216,207,184,.06)',
              transition: 'box-shadow 0.1s, border-color 0.1s',
              '&:hover': { borderColor: 'rgba(216,207,184,0.35)', boxShadow: '3px 3px 0 rgba(216,207,184,.1)' },
              '&:active': { transform: 'translate(1px,1px)', boxShadow: 'none' },
            }}
          >
            <span style={{ ...lbl, color: 'var(--ink)', fontSize: '0.5625rem' }}>{section.label}</span>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mt: 0.5 }}>
              {section.desc}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
