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
import UserAvatar from './UserAvatar'

interface BottomTab {
  label: string
  glyph: string
  path: string
  matchPaths?: string[]
}

const BOTTOM_TABS: BottomTab[] = [
  { label: 'Feed',     glyph: '◉', path: '/feed',    matchPaths: ['/feed'] },
  { label: 'Discover', glyph: '⌕', path: '/search',  matchPaths: ['/search'] },
  { label: 'Sigil',    glyph: '☩', path: '/sigil',   matchPaths: ['/sigil'] },
  { label: 'Gather',   glyph: '☍', path: '/events',  matchPaths: ['/events'] },
  { label: 'Me',       glyph: '✶', path: '/profile', matchPaths: ['/profile', '/gallery'] },
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
              fontFamily:    '"Archivo Black", sans-serif',
              fontWeight:    400,
              cursor:        'pointer',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              fontSize:      { xs: '1.1rem', md: '1.25rem' },
              flexGrow:      { xs: 1, md: 0 },
              mr:            { md: 4 },
              color:         'text.primary',
              textShadow:    '1px 1px 0 rgba(20,20,20,0.15)',
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
                    boxShadow:     '2px 2px 0 rgba(20,20,20,0.2)',
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
            bgcolor:      '#EBE6DC',
            borderTop:    '1.5px solid #1A1A1A',
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
                }
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </>
  )
}
