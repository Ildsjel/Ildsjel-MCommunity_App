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
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  Logout as LogoutIcon,
  Search as SearchIcon,
} from '@mui/icons-material'
import { useUser } from '@/app/context/UserContext'
import { useNotifications } from '@/app/context/NotificationContext'
import UserAvatar from './UserAvatar'

interface BottomTab {
  label: string
  glyph: string
  path: string
  matchPaths?: string[]
}

const BOTTOM_TABS: BottomTab[] = [
  { label: 'Feed',     glyph: '◉', path: '/feed',          matchPaths: ['/feed'] },
  { label: 'Discover', glyph: '⌕', path: '/search',        matchPaths: ['/search'] },
  { label: 'Sigil',    glyph: '☩', path: '/sigil',         matchPaths: ['/sigil'] },
  { label: 'Alerts',   glyph: '◈', path: '/notifications', matchPaths: ['/notifications'] },
  { label: 'Me',       glyph: '✶', path: '/profile',       matchPaths: ['/profile', '/gallery'] },
]

function getBottomTabValue(pathname: string, tabs: BottomTab[]): number {
  // Exact match first
  const exact = tabs.findIndex((t) => t.path === pathname)
  if (exact >= 0) return exact
  // Prefix match
  const prefix = tabs.findIndex((t) =>
    t.matchPaths?.some((p) => pathname.startsWith(p))
  )
  return prefix >= 0 ? prefix : -1
}

export default function Navigation() {
  const router   = useRouter()
  const pathname = usePathname()
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

  const bottomTabValue = getBottomTabValue(pathname ?? '/', BOTTOM_TABS)

  // Desktop nav items
  const desktopNavItems = isAuthenticated
    ? [
        { label: 'Feed',     path: '/feed' },
        { label: 'Discover', path: '/search' },
        { label: 'Sigil',    path: '/sigil' },
        { label: 'Gather',   path: '/events' },
      ]
    : []

  return (
    <>
      {/* ── AppBar ─────────────────────────────────────────── */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 52, md: 56 } }}>

          {/* Logo */}
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

          {/* Desktop inline nav */}
          {!isMobile && isAuthenticated && (
            <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, alignItems: 'center' }}>
              {desktopNavItems.map((item) => {
                const active = pathname === item.path
                return (
                  <Box
                    key={item.label}
                    component="button"
                    onClick={() => router.push(item.path)}
                    sx={{
                      background:     'none',
                      border:         'none',
                      color:          active ? 'primary.main' : 'text.secondary',
                      fontFamily:     '"JetBrains Mono", monospace',
                      fontWeight:     400,
                      fontSize:       '0.625rem',
                      letterSpacing:  '0.14em',
                      textTransform:  'uppercase',
                      cursor:         'pointer',
                      px:             1.5,
                      py:             0.75,
                      borderRadius:   '3px',
                      borderBottom:   active ? '1.5px solid' : '1.5px solid transparent',
                      borderBottomColor: active ? 'primary.main' : 'transparent',
                      transition:     'color 0.12s, border-color 0.12s',
                      '&:hover':      { color: 'text.primary' },
                      minHeight:      '36px',
                    }}
                  >
                    {item.label}
                  </Box>
                )
              })}
            </Box>
          )}

          {(isMobile || !isAuthenticated) && <Box sx={{ flexGrow: 1 }} />}

          {/* Right side — login link or avatar */}
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
                  onClick={() => { router.push('/spotify/connect'); handleProfileMenuClose() }}
                  sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.6875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}
                >
                  <ListItemIcon><MusicNoteIcon fontSize="small" /></ListItemIcon>
                  Spotify
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

      {/* ── Mobile Bottom Navigation ────────────────────────── */}
      {isMobile && isAuthenticated && (
        <Paper
          elevation={0}
          sx={{
            position:     'fixed',
            bottom:       0,
            left:         0,
            right:        0,
            zIndex:       1200,
            bgcolor:      '#1a1424',
            borderTop:    '1.5px solid rgba(216,207,184,0.2)',
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
            {BOTTOM_TABS.map((tab) => (
              <BottomNavigationAction
                key={tab.label}
                label={tab.label}
                icon={
                  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                    <Box
                      sx={{
                        fontFamily:    '"Archivo Black", sans-serif',
                        fontSize:      tab.label === 'Sigil' ? '1.35rem' : '1rem',
                        lineHeight:    1,
                        color:         'inherit',
                        transition:    'transform 0.15s',
                        '.Mui-selected &': { transform: tab.label === 'Sigil' ? 'scale(1.2)' : 'scale(1.05)' },
                      }}
                    >
                      {tab.glyph}
                    </Box>
                    {tab.label === 'Alerts' && unreadCount > 0 && (
                      <Box sx={{
                        position: 'absolute', top: -3, right: -5,
                        minWidth: 14, height: 14, borderRadius: '7px',
                        backgroundColor: 'var(--accent, #c43a2a)',
                        border: '1.5px solid #1a1424',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: '"JetBrains Mono", monospace',
                        fontSize: '0.4rem', color: '#ece5d3',
                        px: '2px',
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </>
  )
}
