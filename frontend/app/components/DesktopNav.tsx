'use client'

import { Box } from '@mui/material'
import { useRouter, usePathname } from 'next/navigation'
import { DESKTOP_NAV_ITEMS } from '@/config/routes'

export default function DesktopNav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexGrow: 1, alignItems: 'center' }}>
      {DESKTOP_NAV_ITEMS.map((item) => {
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
  )
}
