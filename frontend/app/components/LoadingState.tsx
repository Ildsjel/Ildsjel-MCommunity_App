'use client'

import { Box, CircularProgress } from '@mui/material'

interface Props {
  size?: number
  py?: number
}

/** Inline loading spinner matching the Metal Community UI. */
export default function LoadingState({ size = 20, py = 4 }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py }}>
      <CircularProgress size={size} sx={{ color: 'var(--accent)' }} />
    </Box>
  )
}
