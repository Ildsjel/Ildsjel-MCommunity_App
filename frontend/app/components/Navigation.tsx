'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useUser } from '@/app/context/UserContext'
import { useNotifications } from '@/app/context/NotificationContext'
import UserAvatar from './UserAvatar'
import DesktopNav from './DesktopNav'
import BottomNav from './BottomNav'

export default function Navigation() {
  const router   = useRouter()
  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user, setUser } = useUser()
  const { unreadCount } = useNotifications()
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

  return (
    <>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 52, md: 56 } }}>

          <Typography
            component="div"
            onClick={() => router.push(isAuthenticated ? '/feed' : '/')}
            sx={{
              fontFamily:    'var(--font-medieval, "Archivo Black", sans-serif)',
              fontWeight:    700,
              cursor:        'pointer',
              letterSpacing: '0.02em',
              textTransform: 'none',
              fontSize:      { xs: '1.25rem', md: '1.4rem' },
              flexGrow:      { xs: 1, md: 0 },
              mr:            { md: 4 },
              color:         'text.primary',
              textShadow:    '0 0 24px rgba(196,58,42,.4)',
            }}
          >
            Grimr
          </Typography>

          {!isMobile && isAuthenticated && <DesktopNav />}

          {(isMobile || !isAuthenticated) && <Box sx={{ flexGrow: 1 }} />}

          {!isAuthenticated && (
            <Box
              component="button"
              onClick={() => router.push('/auth/login')}
              sx={{
                background:    'none',
                border:        '1.5px solid',
                borderColor:   'text.primary',
                color:         'text.primary',
                fontFamily:    '"JetBrains Mono", monospace',
                fontSize:      '0.5625rem',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                cursor:        'pointer',
                px:            1.5,
                py:            0.5,
                borderRadius:  '3px',
                minHeight:     '32px',
              }}
            >
              Sign In
            </Box>
          )}

          {isAuthenticated && (
            <Box
              component="button"
              onClick={() => router.push('/notifications')}
              sx={{
                position: 'relative', background: 'none', border: 'none',
                cursor: 'pointer', p: 0.75, borderRadius: '4px',
                color: 'text.secondary', fontSize: '1.1rem', lineHeight: 1,
                mr: 0.25,
                '&:hover': { color: 'text.primary' },
              }}
            >
              ◈
              {unreadCount > 0 && (
                <Box sx={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: 'var(--accent, #c43a2a)',
                  border: '1.5px solid var(--canvas-bg, #08060a)',
                }} />
              )}
            </Box>
          )}

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
                  size={isMobile ? 30 : 34}
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
                    minWidth:      160,
                    border:        '1.5px solid',
                    borderColor:   'divider',
                    boxShadow:     '2px 2px 0 rgba(216,207,184,.1)',
                    borderRadius:  '3px',
                  },
                }}
              >
                <MenuItem
                  onClick={() => { router.push('/profile'); handleProfileMenuClose() }}
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  Profile
                </MenuItem>
                <MenuItem
                  onClick={() => { router.push('/settings'); handleProfileMenuClose() }}
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  Settings
                </MenuItem>
                {(user.role === 'admin' || user.role === 'superadmin') && (
                  <MenuItem
                    onClick={() => { router.push('/admin'); handleProfileMenuClose() }}
                    sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent, #c43a2a)' }}
                  >
                    <ListItemIcon><AdminIcon fontSize="small" sx={{ color: 'var(--accent, #c43a2a)' }} /></ListItemIcon>
                    Admin
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => { router.push('/spotify/connect'); handleProfileMenuClose() }}
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  <ListItemIcon><MusicNoteIcon fontSize="small" /></ListItemIcon>
                  Spotify
                </MenuItem>
                <MenuItem
                  onClick={() => { router.push('/lastfm/connect'); handleProfileMenuClose() }}
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  <ListItemIcon><MusicNoteIcon fontSize="small" /></ListItemIcon>
                  Last.fm
                </MenuItem>
                <MenuItem
                  onClick={handleLogout}
                  sx={{ color: 'primary.main', fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  <ListItemIcon><LogoutIcon fontSize="small" sx={{ color: 'primary.main' }} /></ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Toolbar>
      </AppBar>

      {isMobile && isAuthenticated && <BottomNav />}
    </>
  )
}
