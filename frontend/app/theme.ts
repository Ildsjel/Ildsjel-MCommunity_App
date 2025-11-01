'use client'

import { createTheme } from '@mui/material/styles'

// Grimr Dark Theme - Metal-inspired color palette
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
      main: '#4A9B8E', // whisper-green
      light: '#5DBAA8',
      dark: '#357A6F',
    },
    error: {
      main: '#DC143C', // blood-red
      light: '#FF6B6B',
      dark: '#A00000',
    },
    warning: {
      main: '#CD7F32', // rust-orange
      light: '#E89B5A',
      dark: '#A0522D',
    },
    background: {
      default: '#0A0A0A', // grim-black
      paper: '#1A1A1A', // deep-charcoal
    },
    text: {
      primary: '#F5F5F5', // ghost-white
      secondary: '#B0B0B0', // silver-text
      disabled: '#6B6B6B', // stone-gray
    },
    divider: '#3D3D3D', // iron-gray
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      fontSize: '3rem',
    },
    h2: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      fontSize: '2.5rem',
    },
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      fontSize: '2rem',
    },
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
      fontSize: '1.75rem',
    },
    h5: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
      fontSize: '1.25rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 24px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(139, 0, 0, 0.3)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #3D3D3D',
          backgroundImage: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
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
  },
  shape: {
    borderRadius: 8,
  },
})

