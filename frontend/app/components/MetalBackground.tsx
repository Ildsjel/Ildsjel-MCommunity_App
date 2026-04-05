'use client'

import { Box } from '@mui/material'

/**
 * Atmospheric background for Grimr — fixed SVG layers:
 *  1. Diamond grid (faint gold)
 *  2. Diagonal hatching (faint white)
 *  3. Bottom ember glow (crimson)
 *  4. Vignette (darkens edges)
 *  5. Corner ornaments (gold)
 *  6. Noise grain overlay
 */
export default function MetalBackground() {
  return (
    <Box
      component="div"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {/* SVG pattern layers */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'absolute', width: '100%', height: '100%', display: 'block' }}
      >
        <defs>
          {/* Diamond / rotated-square grid */}
          <pattern id="grimr-diamonds" width="48" height="48" patternUnits="userSpaceOnUse">
            <path
              d="M24 0 L48 24 L24 48 L0 24 Z"
              fill="none"
              stroke="rgba(212,175,55,0.055)"
              strokeWidth="0.7"
            />
          </pattern>

          {/* Fine diagonal lines */}
          <pattern id="grimr-diag" width="20" height="20" patternUnits="userSpaceOnUse">
            <line x1="0" y1="20" x2="20" y2="0" stroke="rgba(255,255,255,0.016)" strokeWidth="0.5" />
          </pattern>

          {/* Vignette — darkens corners */}
          <radialGradient id="grimr-vignette" cx="50%" cy="50%" r="72%">
            <stop offset="20%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.88)" />
          </radialGradient>

          {/* Bottom ember / crimson glow */}
          <radialGradient id="grimr-ember" cx="50%" cy="108%" r="68%">
            <stop offset="0%" stopColor="rgba(139,0,0,0.20)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          {/* Top-left accent glow */}
          <radialGradient id="grimr-topleft" cx="-5%" cy="-5%" r="55%">
            <stop offset="0%" stopColor="rgba(100,5,5,0.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        {/* Layers — order: pattern → glow → vignette */}
        <rect width="100%" height="100%" fill="url(#grimr-diamonds)" />
        <rect width="100%" height="100%" fill="url(#grimr-diag)" />
        <rect width="100%" height="100%" fill="url(#grimr-ember)" />
        <rect width="100%" height="100%" fill="url(#grimr-topleft)" />
        <rect width="100%" height="100%" fill="url(#grimr-vignette)" />
      </svg>

      {/* Corner ornaments — top left */}
      <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
        <svg width="72" height="72" fill="none">
          <line x1="4" y1="4" x2="68" y2="4" stroke="rgba(212,175,55,0.20)" strokeWidth="1" />
          <line x1="4" y1="4" x2="4" y2="68" stroke="rgba(212,175,55,0.20)" strokeWidth="1" />
          <circle cx="4" cy="4" r="3" stroke="rgba(212,175,55,0.30)" strokeWidth="1.5" />
          <line x1="4" y1="4" x2="28" y2="28" stroke="rgba(212,175,55,0.10)" strokeWidth="0.8" />
        </svg>
      </Box>

      {/* Corner ornaments — top right */}
      <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
        <svg width="72" height="72" fill="none">
          <line x1="68" y1="4" x2="4" y2="4" stroke="rgba(212,175,55,0.20)" strokeWidth="1" />
          <line x1="68" y1="4" x2="68" y2="68" stroke="rgba(212,175,55,0.20)" strokeWidth="1" />
          <circle cx="68" cy="4" r="3" stroke="rgba(212,175,55,0.30)" strokeWidth="1.5" />
          <line x1="68" y1="4" x2="44" y2="28" stroke="rgba(212,175,55,0.10)" strokeWidth="0.8" />
        </svg>
      </Box>

      {/* Corner ornaments — bottom left */}
      <Box sx={{ position: 'absolute', bottom: 12, left: 12 }}>
        <svg width="72" height="72" fill="none">
          <line x1="4" y1="68" x2="68" y2="68" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
          <line x1="4" y1="68" x2="4" y2="4" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
          <circle cx="4" cy="68" r="3" stroke="rgba(212,175,55,0.18)" strokeWidth="1.5" />
        </svg>
      </Box>

      {/* Corner ornaments — bottom right */}
      <Box sx={{ position: 'absolute', bottom: 12, right: 12 }}>
        <svg width="72" height="72" fill="none">
          <line x1="68" y1="68" x2="4" y2="68" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
          <line x1="68" y1="68" x2="68" y2="4" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
          <circle cx="68" cy="68" r="3" stroke="rgba(212,175,55,0.18)" strokeWidth="1.5" />
        </svg>
      </Box>

      {/* Noise grain overlay — adds organic texture */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.038,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
        }}
      />
    </Box>
  )
}
