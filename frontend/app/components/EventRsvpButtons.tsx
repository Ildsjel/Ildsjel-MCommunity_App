'use client'

/**
 * EventRsvpButtons
 *
 * INTERESTED / GOING toggle buttons with optimistic UI.
 * Calls onRsvp(status) when a button is pressed; the parent handles the
 * API call and passes the authoritative state back via `myRsvp`.
 *
 * Uses the same-status toggle pattern:
 *   click INTERESTED when INTERESTED → remove RSVP
 *   click GOING while INTERESTED → switch to GOING
 */

import { Box, Typography } from '@mui/material'

interface Props {
  myRsvp: 'interested' | 'going' | null
  loading?: boolean
  onRsvp: (status: 'interested' | 'going') => void
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase' as const,
}

interface BtnConfig {
  status: 'interested' | 'going'
  label: string
  activeLabel: string
  activeColor: string
  activeBg: string
  activeBorder: string
}

const BUTTONS: BtnConfig[] = [
  {
    status: 'interested',
    label: '♡  Interested',
    activeLabel: '♡  Interested',
    activeColor: '#e0a840',
    activeBg: 'rgba(224,168,64,0.08)',
    activeBorder: 'rgba(224,168,64,0.45)',
  },
  {
    status: 'going',
    label: '✓  Going',
    activeLabel: '✓  Going',
    activeColor: '#4caf7d',
    activeBg: 'rgba(76,175,125,0.08)',
    activeBorder: 'rgba(76,175,125,0.45)',
  },
]

export default function EventRsvpButtons({ myRsvp, loading = false, onRsvp }: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 0.75 }}>
      {BUTTONS.map(btn => {
        const isActive = myRsvp === btn.status
        return (
          <Box
            key={btn.status}
            component="button"
            onClick={() => !loading && onRsvp(btn.status)}
            disabled={loading}
            sx={{
              border: isActive ? `1px solid ${btn.activeBorder}` : '1px solid rgba(216,207,184,0.2)',
              borderRadius: '3px',
              px: 1.5,
              height: 34,
              background: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              backgroundColor: isActive ? btn.activeBg : 'transparent',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              '&:hover:not(:disabled)': {
                backgroundColor: isActive ? btn.activeBg : 'rgba(216,207,184,0.04)',
                borderColor: isActive ? btn.activeBorder : 'rgba(216,207,184,0.35)',
              },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            <Typography
              component="span"
              sx={{
                ...mono,
                fontSize: '0.5625rem',
                color: isActive ? btn.activeColor : 'var(--muted)',
                transition: 'color 0.15s',
              }}
            >
              {loading ? '…' : isActive ? btn.activeLabel : btn.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
