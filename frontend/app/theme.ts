'use client'

import { createTheme } from '@mui/material/styles'

// Grimr — Paper-first design system
// Palette: bone #F3EFE7 · ink #141414 · crimson #9A1A1A
// Typography: Archivo Black (display) · EB Garamond (body) · JetBrains Mono (data)
// Shape: 3px radius · 1.5px borders · hard-offset shadows (no blur)

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main:         '#9A1A1A',
      light:        '#C43A2A',
      dark:         '#6B0F0F',
      contrastText: '#F3EFE7',
    },
    secondary: {
      main:         '#141414',
      light:        '#2A2A2A',
      dark:         '#0A0A0A',
      contrastText: '#F3EFE7',
    },
    error:   { main: '#C43A2A' },
    warning: { main: '#8B5E00' },
    success: { main: '#2A5C2A' },
    background: {
      default: '#DCD6C8',
      paper:   '#F3EFE7',
    },
    text: {
      primary:   '#141414',
      secondary: '#7A756D',
      disabled:  '#B0AAA0',
    },
    divider: 'rgba(26,26,26,0.2)',
  },

  // ── Typography ──────────────────────────────────────────────
  typography: {
    fontFamily: 'var(--font-serif), "EB Garamond", Georgia, serif',

    h1: {
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(2.5rem, 8vw, 5rem)',
      lineHeight:    1.0,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h2: {
      fontFamily: 'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(1.75rem, 5vw, 2.8rem)',
      lineHeight:    1.0,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h3: {
      fontFamily: 'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(1.4rem, 4vw, 2rem)',
      lineHeight:    1.05,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h4: {
      fontFamily: 'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(1.2rem, 3.5vw, 1.5rem)',
      lineHeight:    1.1,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h5: {
      fontFamily: 'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      '1.125rem',
      lineHeight:    1.2,
      letterSpacing: '0.02em',
      textTransform: 'uppercase' as const,
    },
    h6: {
      fontFamily: 'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      '1rem',
      lineHeight:    1.3,
      letterSpacing: '0.02em',
      textTransform: 'uppercase' as const,
    },
    body1: {
      fontFamily: 'var(--font-serif), "EB Garamond", Georgia, serif',
      fontSize:   '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontFamily: 'var(--font-serif), "EB Garamond", Georgia, serif',
      fontSize:   '0.9375rem',
      lineHeight: 1.55,
    },
    caption: {
      fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
      fontSize:      '0.6875rem',
      lineHeight:    1.4,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
    },
    overline: {
      fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
      fontSize:      '0.6875rem',
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
    },
    button: {
      fontFamily: 'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      '0.8125rem',
      letterSpacing: '0.1em',
    },
  },

  shape: { borderRadius: 3 },

  // ── Component overrides ─────────────────────────────────────
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#DCD6C8',
          backgroundImage: 'none',
        },
      },
    },

    // AppBar — paper surface, hard border
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor:  '#EBE6DC',
          backgroundImage:  'none',
          backdropFilter:   'none',
          borderBottom:     '1.5px solid #1A1A1A',
          boxShadow:        'none',
          color:            '#141414',
        },
      },
    },

    MuiToolbar: {
      styleOverrides: {
        root: {
          '@media (max-width: 599px)': {
            minHeight:    '56px',
            paddingLeft:  '16px',
            paddingRight: '16px',
          },
        },
      },
    },

    // Cards — paper surface, hard-offset shadow, 1.5px border
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius:     3,
          border:           '1.5px solid #1A1A1A',
          backgroundColor:  '#F3EFE7',
          backgroundImage:  'none',
          boxShadow:        '1.5px 1.5px 0 rgba(20,20,20,0.2)',
          backdropFilter:   'none',
          transition:       'box-shadow 0.15s ease',
          '&:hover': {
            boxShadow: '3px 3px 0 rgba(20,20,20,0.25)',
          },
        },
      },
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '14px 16px',
          '&:last-child': { paddingBottom: '14px' },
        },
      },
    },

    // Buttons — Archivo Black, uppercase, 1.5px border, hard shadow
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius:  3,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight:    400,
          minHeight:     '44px',
          transition:    'box-shadow 0.15s ease, transform 0.1s ease',
        },
        contained: {
          boxShadow:       '1.5px 1.5px 0 rgba(20,20,20,0.3)',
          border:          '1.5px solid #141414',
          '&:hover': {
            boxShadow:   '3px 3px 0 rgba(20,20,20,0.3)',
            transform:   'translate(-1px,-1px)',
          },
          '&:active': { transform: 'translate(0,0)', boxShadow: '1.5px 1.5px 0 rgba(20,20,20,0.3)' },
        },
        outlined: {
          borderWidth: '1.5px',
          borderColor: '#1A1A1A',
          '&:hover': {
            borderWidth:     '1.5px',
            backgroundColor: 'rgba(20,20,20,0.04)',
          },
        },
        text: {
          '&:hover': { backgroundColor: 'rgba(20,20,20,0.04)' },
        },
        sizeLarge: {
          minHeight:  '52px',
          padding:    '14px 32px',
          fontSize:   '0.9375rem',
        },
        sizeSmall: {
          minHeight:  '36px',
          padding:    '6px 14px',
          fontSize:   '0.75rem',
        },
      },
    },

    // TextField — 1.5px border, 3px radius, paper bg
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input':    { fontSize: '16px' },
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
            backgroundColor: '#F3EFE7',
            '& fieldset':          { borderColor: '#1A1A1A', borderWidth: '1.5px' },
            '&:hover fieldset':    { borderColor: '#141414', borderWidth: '1.5px' },
            '&.Mui-focused fieldset': { borderColor: '#9A1A1A', borderWidth: '1.5px' },
          },
        },
      },
    },

    // Chips — 1.5px border, 3px radius, JetBrains Mono
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius:  3,
          border:        '1.5px solid #1A1A1A',
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:      '0.625rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          height:        '24px',
          backgroundColor: 'transparent',
        },
        filled: {
          backgroundColor: '#EBE6DC',
        },
      },
    },

    // Bottom Navigation — paper surface, hard border, JetBrains Mono
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: '#EBE6DC',
          height:          '56px',
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color:    '#7A756D',
          minWidth: '60px',
          padding:  '6px 0',
          '&.Mui-selected': {
            color: '#9A1A1A',
          },
          '& .MuiBottomNavigationAction-label': {
            fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:      '0.5625rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            '&.Mui-selected': { fontSize: '0.5625rem' },
          },
        },
      },
    },

    // Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },

    // Icon buttons
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding:    '10px',
          borderRadius: 3,
          transition: 'color 0.15s ease, background-color 0.15s ease',
        },
      },
    },

    // Divider
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(26,26,26,0.2)' },
      },
    },

    // List
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          minHeight: '44px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(154,26,26,0.08)',
            '&:hover': { backgroundColor: 'rgba(154,26,26,0.12)' },
          },
        },
      },
    },

    // Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          border: '1.5px solid',
        },
      },
    },

    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 3,
          border: '1.5px solid #1A1A1A',
          boxShadow: '4px 4px 0 #1A1A1A',
        },
      },
    },
  },
})
