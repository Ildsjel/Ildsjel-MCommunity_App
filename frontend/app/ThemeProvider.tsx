'use client'

import { ThemeProvider as MUIThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { theme } from './theme'
import MetalBackground from './components/MetalBackground'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      <MetalBackground />
      {children}
    </MUIThemeProvider>
  )
}

