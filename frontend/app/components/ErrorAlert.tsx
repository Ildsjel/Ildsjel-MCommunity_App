'use client'

import { Alert } from '@mui/material'

interface Props {
  message: string
  mb?: number
}

/** Inline error banner with standardized spacing. */
export default function ErrorAlert({ message, mb = 2 }: Props) {
  return (
    <Alert severity="error" sx={{ mb }}>
      {message}
    </Alert>
  )
}
