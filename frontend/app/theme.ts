'use client'

import { createTheme } from '@mui/material/styles'

// Grimr Dark Theme — Metal-inspired color palette
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8B0000', // occult-crimson
      light: '#B22222',
      dark: '#5C0000',
      contrastText: '#F5F5F5',
    },
    secondary: {
      main: '#D4AF37', // shadow-gold
      light: '#FFD700',
      dark: '#B8860B',
      contrastText: '#1A1A1A',
    },
    success: {
      main: '#4A9B8E',
      light: '#5DBAA8',
      dark: '#357A6F',
    },
    error: {
      main: '#DC143C',
      light: '#FF6B6B',
      dark: '#A00000',
    },
    warning: {
      main: '#CD7F32',
      light: '#E89B5A',
      dark: '#A0522D',
    },
    background: {
      default: '#0A0A0A', // grim-black
      paper: '#141414',   // deep charcoal — slightly lighter than before for contrast
    },
    text: {
      primary: '#F0F0F0',
      secondary: '#A8A8A8',
      disabled: '#5A5A5A',
    },
    divider: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", "IM Fell DW Pica", Georgia, serif',
      fontWeight: 700,
      fontSize: '3.5rem',
      lineHeight: 1.15,
      letterSpacing: '-0.01em',
    },
    h2: {
      fontFamily: '"Playfair Display", "IM Fell DW Pica", Georgia, serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: '"Playfair Display", "IM Fell DW Pica", Georgia, serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.25,
    },
    h4: {
      fontFamily: '"Playfair Display", "IM Fell DW Pica", Georgia, serif',
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.3,
    },
    h5: {
      fontFamily: '"Playfair Display", "IM Fell DW Pica", Georgia, serif',
      fontWeight: 600,
      fontSize: '1.375rem',
      lineHeight: 1.4,
    },
    h6: {
      fontFamily: '"Playfair Display", "IM Fell DW Pica", Georgia, serif',
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.45,
    },
    body1: {
      lineHeight: 1.7,
    },
    body2: {
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Ensure body has no competing background
        body: {
          backgroundColor: '#0A0A0A',
          backgroundImage: 'none',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(10,10,10,0.82)',
          backgroundImage: 'none',
          backdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(212,175,55,0.08)',
          boxShadow: '0 1px 0 rgba(0,0,0,0.5)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
          transition: 'all 0.2s ease',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 0 20px rgba(139,0,0,0.45), 0 4px 12px rgba(0,0,0,0.4)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        outlined: {
          borderColor: 'rgba(212,175,55,0.35)',
          '&:hover': {
            borderColor: 'rgba(212,175,55,0.7)',
            backgroundColor: 'rgba(212,175,55,0.06)',
            boxShadow: '0 0 14px rgba(212,175,55,0.15)',
          },
        },
        sizeLarge: {
          padding: '13px 32px',
          fontSize: '1rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.07)',
          backgroundImage: 'none',
          backgroundColor: 'rgba(20,20,20,0.88)',
          backdropFilter: 'blur(8px)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(212,175,55,0.12)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(212,175,55,0.35)',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#8B0000',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'color 0.15s ease, background-color 0.15s ease',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: 'rgba(139,0,0,0.15)',
            '&:hover': {
              backgroundColor: 'rgba(139,0,0,0.22)',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.07)',
        },
      },
    },
  },
})
