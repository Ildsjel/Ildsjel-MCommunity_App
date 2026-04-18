'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Home as HomeIcon,
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
  GraphicEq as SigilIcon,
} from '@mui/icons-material'
import { useUser } from '@/app/context/UserContext'
import UserAvatar from './UserAvatar'

// Bottom tab definition
interface BottomTab {
  label: string
  icon: React.ReactNode
  path: string
  matchPaths?: string[] // extra paths that should highlight this tab
}

const BOTTOM_TABS: BottomTab[] = [
  { label: 'Home',     icon: <HomeIcon   />, path: '/' },
  { label: 'Discover', icon: <SearchIcon />, path: '/search' },
  { label: 'Metal-ID', icon: <SigilIcon  />, path: '/profile', matchPaths: ['/profile/'] },
  { label: 'Me',       icon: <PersonIcon />, path: '/profile', matchPaths: ['/gallery'] },
]

function getBottomTabValue(pathname: string, tabs: BottomTab[]): number {
  // Find first tab whose path or matchPaths matches the current route
  const idx = tabs.findIndex((t) => {
    if (t.path === pathname) return true
    if (t.matchPaths?.some((p) => pathname.startsWith(p))) return true
    return false
  })
  return idx >= 0 ? idx : 0
}

export default function Navigation() {
  const router    = useRouter()
  const pathname  = usePathname()
  const theme     = useTheme()
  const isMobile  = useMediaQuery(theme.breakpoints.down('md'))
  const { user, setUser } = useUser()

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const isAuthenticated = !!user

  const handleProfileMenuOpen  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleProfileMenuClose = () => setAnchorEl(null)

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
    handleProfileMenuClose()
    router.push('/')
  }

  // ── Desktop nav items ──────────────────────────────────────
  const desktopNavItems = isAuthenticated
    ? [
        { label: 'Home',    path: '/' },
        { label: 'Search',  path: '/search' },
        { label: 'Profile', path: '/profile' },
      ]
    : []

  const bottomTabValue = getBottomTabValue(pathname ?? '/', BOTTOM_TABS)

  return (
    <>
      {/* ── AppBar ─────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 56, sm: 56, md: 64 } }}>

          {/* Logo */}
          <Typography
            variant="h5"
            component="div"
            onClick={() => router.push('/')}
            sx={{
              fontFamily: '"Archivo Black", sans-serif',
              fontWeight: 400,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              fontSize: { xs: '1.25rem', md: '1.4rem' },
              flexGrow: { xs: 1, md: 0 },
              mr: { md: 4 },
              // subtle glow matching brand
              textShadow: '0 0 20px rgba(139,0,0,0.4)',
            }}
          >
            Grimr
          </Typography>

          {/* Desktop inline nav */}
          {!isMobile && isAuthenticated && (
            <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1 }}>
              {desktopNavItems.map((item) => {
                const active = pathname === item.path
                return (
                  <Box
                    key={item.label}
                    component="button"
                    onClick={() => router.push(item.path)}
                    sx={{
                      background: 'none',
                      border: 'none',
                      color: active ? 'secondary.main' : 'text.secondary',
                      fontFamily: '"Inter", sans-serif',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 2,
                      borderBottom: active ? '2px solid' : '2px solid transparent',
                      borderBottomColor: active ? 'secondary.main' : 'transparent',
                      transition: 'color 0.15s, border-color 0.15s',
                      '&:hover': { color: 'text.primary' },
                      minHeight: '44px',
                    }}
                  >
                    {item.label}
                  </Box>
                )
              })}
            </Box>
          )}

          {/* Spacer (desktop without nav, or unauthenticated) */}
          {(isMobile || !isAuthenticated) && <Box sx={{ flexGrow: 1 }} />}

          {/* Avatar menu — always visible */}
          {isAuthenticated && user && (
            <>
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{ p: 0.5, ml: 1 }}
                aria-label="Account menu"
                size="small"
              >
                <UserAvatar
                  avatarUrl={user.profile_image_url}
                  userName={user.handle}
                  size={isMobile ? 32 : 36}
                />
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleProfileMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 180,
                    bgcolor: 'background.paper',
                    border: '1px solid rgba(255,255,255,0.08)',
                  },
                }}
              >
                <MenuItem onClick={() => { router.push('/profile'); handleProfileMenuClose() }}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  Profile
                </MenuItem>
                <MenuItem onClick={() => { router.push('/spotify/connect'); handleProfileMenuClose() }}>
                  <ListItemIcon><MusicNoteIcon fontSize="small" /></ListItemIcon>
                  Spotify
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ color: 'error.light' }}>
                  <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'error.light' }} /></ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* ── Mobile Bottom Navigation ────────────────────────── */}
      {/* Only show when authenticated on mobile */}
      {isMobile && isAuthenticated && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            bgcolor: 'rgba(10,10,10,0.92)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(212,175,55,0.10)',
            // iOS home indicator safe area
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            value={bottomTabValue}
            onChange={(_, idx) => {
              const tab = BOTTOM_TABS[idx]
              if (tab) router.push(tab.path)
            }}
            showLabels
          >
            {BOTTOM_TABS.map((tab, i) => (
              <BottomNavigationAction
                key={tab.label}
                label={tab.label}
                icon={tab.icon}
                sx={{
                  // Selected: gold + subtle glow
                  '&.Mui-selected .MuiSvgIcon-root': {
                    filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.6))',
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </>
  )
}
