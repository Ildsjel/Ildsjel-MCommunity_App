'use client'

import { Box, Paper, BottomNavigation, BottomNavigationAction } from '@mui/material'
import { useRouter, usePathname } from 'next/navigation'
import { useNotifications } from '@/app/context/NotificationContext'
import { BOTTOM_TABS, getBottomTabValue } from '@/config/routes'

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()
  const { unreadCount } = useNotifications()
  const value = getBottomTabValue(pathname ?? '/')

  return (
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
        value={value}
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
  )
}
