'use client'

import { createTheme } from '@mui/material/styles'

// Grimr — Void purple design system
// Palette: void #120e18 · cream #ece5d3 · crimson #c43a2a
// Typography: Archivo Black (display) · EB Garamond (body) · JetBrains Mono (data) · UnifrakturCook (medieval)
// Shape: 3px radius · 1.5px warm-cream borders · hard-offset shadows (no blur)

const P = {
  paper:   '#120e18',
  paper2:  '#1a1424',
  canvas:  '#08060a',
  ink:     '#ece5d3',
  ink2:    '#c9c2ae',
  muted:   '#7a7364',
  line:    '#d8cfb8',
  accent:  '#c43a2a',
  accent2: '#e05a3a',
}

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main:         P.accent,
      light:        P.accent2,
      dark:         '#9a1a1a',
      contrastText: P.ink,
    },
    secondary: {
      main:         P.ink,
      light:        '#f3ede0',
      dark:         P.ink2,
      contrastText: P.paper,
    },
    error:   { main: P.accent2 },
    warning: { main: '#c9a000' },
    success: { main: '#4a7c4a' },
    background: {
      default: P.canvas,
      paper:   P.paper,
    },
    text: {
      primary:   P.ink,
      secondary: P.ink2,
      disabled:  P.muted,
    },
    divider: 'rgba(216,207,184,0.2)',
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
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(1.75rem, 5vw, 2.8rem)',
      lineHeight:    1.0,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h3: {
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(1.4rem, 4vw, 2rem)',
      lineHeight:    1.05,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h4: {
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      'clamp(1.2rem, 3.5vw, 1.5rem)',
      lineHeight:    1.1,
      letterSpacing: '0.04em',
      textTransform: 'uppercase' as const,
    },
    h5: {
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
      fontWeight:    400,
      fontSize:      '1.125rem',
      lineHeight:    1.2,
      letterSpacing: '0.02em',
      textTransform: 'uppercase' as const,
    },
    h6: {
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
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
      fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
      fontSize:      '0.6875rem',
      lineHeight:    1.4,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
    },
    overline: {
      fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
      fontSize:      '0.6875rem',
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
    },
    button: {
      fontFamily:    'var(--font-display), "Archivo Black", sans-serif',
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
          backgroundColor: P.canvas,
          // let globals.css own the background-image (grid + radial gradients)
        },
      },
    },

    // AppBar — void purple surface, warm cream border
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor:  P.paper2,
          backgroundImage:  'none',
          backdropFilter:   'none',
          borderBottom:     `1.5px solid rgba(216,207,184,0.25)`,
          boxShadow:        'none',
          color:            P.ink,
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

    // Cards — void purple surface, warm cream border + shadow
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius:     3,
          border:           `1.5px solid rgba(216,207,184,0.2)`,
          backgroundColor:  P.paper2,
          backgroundImage:  'none',
          boxShadow:        '2px 2px 0 rgba(216,207,184,.08)',
          backdropFilter:   'none',
          transition:       'box-shadow 0.15s ease, transform 0.1s ease',
          '&:hover': {
            boxShadow: '4px 4px 0 rgba(216,207,184,.15)',
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

    // Buttons — Archivo Black, uppercase, warm cream border
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
          backgroundColor: P.accent,
          color:           '#fff',
          boxShadow:       `1.5px 1.5px 0 rgba(0,0,0,0.4)`,
          border:          `1.5px solid ${P.accent}`,
          '&:hover': {
            backgroundColor: P.ink,
            color:           P.paper,
            borderColor:     P.ink,
            boxShadow:       `3px 3px 0 rgba(0,0,0,0.4)`,
            transform:       'translate(-1px,-1px)',
          },
          '&:active': { transform: 'translate(0,0)', boxShadow: `1.5px 1.5px 0 rgba(0,0,0,0.4)` },
        },
        outlined: {
          borderWidth:   '1.5px',
          borderColor:   `rgba(216,207,184,0.4)`,
          color:         P.ink,
          '&:hover': {
            borderWidth:     '1.5px',
            borderColor:     P.line,
            backgroundColor: `rgba(236,229,211,0.06)`,
          },
        },
        text: {
          color: P.ink,
          '&:hover': { backgroundColor: `rgba(236,229,211,0.06)` },
        },
        sizeLarge: {
          minHeight: '52px',
          padding:   '14px 32px',
          fontSize:  '0.9375rem',
        },
        sizeSmall: {
          minHeight: '36px',
          padding:   '6px 14px',
          fontSize:  '0.75rem',
        },
      },
    },

    // TextField — void purple bg, warm cream border
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': { fontSize: '16px', color: P.ink },
          '& .MuiOutlinedInput-root': {
            borderRadius:    3,
            backgroundColor: P.paper2,
            '& fieldset':          { borderColor: `rgba(216,207,184,0.3)`, borderWidth: '1.5px' },
            '&:hover fieldset':    { borderColor: `rgba(216,207,184,0.6)`, borderWidth: '1.5px' },
            '&.Mui-focused fieldset': { borderColor: P.accent, borderWidth: '1.5px' },
          },
        },
      },
    },

    // Input label
    MuiInputLabel: {
      styleOverrides: {
        root: { color: P.muted },
      },
    },

    // Select
    MuiSelect: {
      styleOverrides: {
        root: { color: P.ink },
        icon: { color: P.muted },
      },
    },

    // Chips — warm cream border, pill or square
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius:    3,
          border:          `1.5px solid rgba(216,207,184,0.35)`,
          fontFamily:      'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:        '0.625rem',
          letterSpacing:   '0.12em',
          textTransform:   'uppercase',
          height:          '24px',
          backgroundColor: 'transparent',
          color:           P.ink,
        },
        filled: {
          backgroundColor: P.paper2,
          color:           P.ink,
        },
      },
    },

    // Bottom Navigation — void purple surface
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          backgroundColor: P.paper2,
          height:          '56px',
          borderTop:       `1.5px solid rgba(216,207,184,0.2)`,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color:    P.muted,
          minWidth: '60px',
          padding:  '6px 0',
          '&.Mui-selected': {
            color: P.accent,
          },
          '& .MuiBottomNavigationAction-label': {
            fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:      '0.5625rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            '&.Mui-selected': { fontSize: '0.5625rem' },
          },
        },
      },
    },

    // Paper — void purple, no ghost elevation gradients
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: P.paper,
        },
      },
    },

    // Icon buttons
    MuiIconButton: {
      styleOverrides: {
        root: {
          padding:      '10px',
          borderRadius: 3,
          color:        P.ink2,
          transition:   'color 0.15s ease, background-color 0.15s ease',
          '&:hover': { color: P.ink, backgroundColor: `rgba(236,229,211,0.06)` },
        },
      },
    },

    // Divider
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(216,207,184,0.15)' },
      },
    },

    // List
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          minHeight:    '44px',
          '&.Mui-selected': {
            backgroundColor: `rgba(196,58,42,0.12)`,
            '&:hover': { backgroundColor: `rgba(196,58,42,0.18)` },
          },
        },
      },
    },

    // Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 3,
          border:       '1.5px solid',
        },
      },
    },

    // Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 3,
          border:       `1.5px solid rgba(216,207,184,0.3)`,
          boxShadow:    `4px 4px 0 rgba(216,207,184,.15)`,
          backgroundColor: P.paper2,
        },
      },
    },

    // Menu / Dropdown
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: P.paper2,
          border:          `1.5px solid rgba(216,207,184,0.2)`,
        },
      },
    },

    // Tooltip
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: P.paper2,
          color:           P.ink,
          border:          `1px solid rgba(216,207,184,0.2)`,
          fontFamily:      'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:        '0.625rem',
          letterSpacing:   '0.1em',
        },
      },
    },
  },
})
