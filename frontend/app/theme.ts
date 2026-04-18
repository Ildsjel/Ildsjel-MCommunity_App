'use client'

import { createTheme } from '@mui/material/styles'

// Grimr — Mobile-First Metal Theme
// Fonts: Archivo Black (display) · EB Garamond (body) · JetBrains Mono (data)
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8B0000',   // occult-crimson
      light: '#B22222',
      dark: '#5C0000',
      contrastText: '#F5F5F5',
    },
    secondary: {
      main: '#D4AF37',   // shadow-gold
      light: '#FFD700',
      dark: '#B8860B',
      contrastText: '#1A1A1A',
    },
    success: { main: '#4A9B8E', light: '#5DBAA8', dark: '#357A6F' },
    error:   { main: '#DC143C', light: '#FF6B6B', dark: '#A00000' },
    warning: { main: '#CD7F32', light: '#E89B5A', dark: '#A0522D' },
    background: {
      default: '#0A0A0A',
      paper:   '#141414',
    },
    text: {
      primary:  '#F0F0F0',
      secondary: '#A8A8A8',
      disabled:  '#5A5A5A',
    },
    divider: 'rgba(255,255,255,0.08)',
  },

  // ── Typography ──────────────────────────────────────────────
  typography: {
    // Body / UI chrome → Inter (neutral, readable at small sizes)
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',

    h1: {
      fontFamily: '"Archivo Black", "Impact", sans-serif',
      fontWeight: 400,
      fontSize: 'clamp(2.5rem, 8vw, 5rem)',
      lineHeight: 1.05,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontFamily: '"Archivo Black", "Impact", sans-serif',
      fontWeight: 400,
      fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
      lineHeight: 1.1,
    },
    h3: {
      fontFamily: '"Archivo Black", "Impact", sans-serif',
      fontWeight: 400,
      fontSize: 'clamp(1.4rem, 4vw, 2rem)',
      lineHeight: 1.15,
    },
    h4: {
      fontFamily: '"Archivo Black", "Impact", sans-serif',
      fontWeight: 400,
      fontSize: 'clamp(1.2rem, 3.5vw, 1.75rem)',
      lineHeight: 1.2,
    },
    h5: {
      fontFamily: '"Archivo Black", "Impact", sans-serif',
      fontWeight: 400,
      fontSize: '1.125rem',
      lineHeight: 1.3,
    },
    h6: {
      fontFamily: '"Archivo Black", "Impact", sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.4,
    },
    body1: {
      fontFamily: '"EB Garamond", Georgia, serif',
      fontSize: '1rem',
      lineHeight: 1.75,
    },
    body2: {
      fontFamily: '"EB Garamond", Georgia, serif',
      fontSize: '0.9375rem',
      lineHeight: 1.65,
    },
    caption: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
    overline: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.6875rem',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    },
    button: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
    },
  },

  shape: { borderRadius: 10 },

  // ── Component overrides ─────────────────────────────────────
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'none',
        },
      },
    },

    // AppBar — glass blur
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10,10,10,0.85)',
          backgroundImage: 'none',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(212,175,55,0.07)',
          boxShadow: 'none',
        },
      },
    },

    // Toolbar height — 56 px on mobile (standard iOS feel), 64 px on desktop
    MuiToolbar: {
      styleOverrides: {
        root: {
          '@media (max-width: 599px)': {
            minHeight: '56px',
            paddingLeft: '16px',
            paddingRight: '16px',
          },
        },
      },
    },

    // Buttons — large tap area, glow on press
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
          minHeight: '44px',    // Apple HIG minimum
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 0 22px rgba(139,0,0,0.50), 0 4px 12px rgba(0,0,0,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)', boxShadow: 'none' },
        },
        outlined: {
          borderColor: 'rgba(212,175,55,0.35)',
          '&:hover': {
            borderColor: 'rgba(212,175,55,0.70)',
            backgroundColor: 'rgba(212,175,55,0.06)',
          },
        },
        sizeLarge: {
          minHeight: '52px',
          padding: '14px 32px',
          fontSize: '1rem',
        },
        sizeSmall: {
          minHeight: '36px',
          padding: '6px 14px',
        },
      },
    },

    // Cards — glass surface
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.07)',
          backgroundImage: 'none',
          backgroundColor: 'rgba(20,20,20,0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': { borderColor: 'rgba(212,175,55,0.12)' },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '16px',
          '&:last-child': { paddingBottom: '16px' },
        },
      },
    },

    // Inputs — 16 px font-size prevents iOS auto-zoom
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': { fontSize: '16px' },
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
            '&:hover fieldset': { borderColor: 'rgba(212,175,55,0.35)' },
            '&.Mui-focused fieldset': { borderColor: '#8B0000' },
          },
        },
      },
    },

    // Chips
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: '32px' },
      },
    },

    // Bottom Navigation
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          height: '56px',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: 'rgba(255,255,255,0.4)',
          minWidth: '60px',
          padding: '6px 0',
          '&.Mui-selected': {
            color: '#D4AF37',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.65rem',
            fontFamily: '"Inter", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.03em',
            '&.Mui-selected': { fontSize: '0.65rem' },
          },
        },
      },
    },

    // Icon buttons — bigger touch area
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding: '10px',
          transition: 'color 0.15s ease, background-color 0.15s ease',
        },
      },
    },

    // Drawer (mobile nav drawer kept for edge-cases)
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: '#111',
        },
      },
    },

    // List item buttons
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: '44px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(139,0,0,0.15)',
            '&:hover': { backgroundColor: 'rgba(139,0,0,0.22)' },
          },
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(255,255,255,0.07)' },
      },
    },
  },
})
