'use client'

import { Box } from '@mui/material'
import { useRouter } from 'next/navigation'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

const cardBox: React.CSSProperties = {
  border: '1.5px solid rgba(216,207,184,0.2)',
  borderRadius: '3px',
  padding: '10px 12px',
  backgroundColor: '#120e18',
}

interface ServiceTileProps {
  label: string
  connected: boolean
  onClick: () => void
}

function ServiceTile({ label, connected, onClick }: ServiceTileProps) {
  const statusColor = connected ? '#6a9a7a' : 'rgba(216,207,184,0.2)'
  return (
    <Box
      onClick={onClick}
      sx={{
        flex: 1, border: '1.5px solid rgba(216,207,184,0.15)', borderRadius: '3px',
        backgroundColor: '#0d0b12', p: '10px 12px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 0.75,
        '&:hover': { borderColor: 'rgba(216,207,184,0.35)' },
        transition: 'border-color 0.15s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5625rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink)' }}>
          {label}
        </span>
        <Box sx={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          backgroundColor: statusColor,
          ...(connected ? {
            animation: 'pulse 2s infinite',
            '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
          } : {}),
        }} />
      </Box>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.08em', color: connected ? '#6a9a7a' : 'var(--muted)', textTransform: 'uppercase' }}>
        {connected ? 'Connected' : 'Not connected'}
      </span>
    </Box>
  )
}

interface Props {
  hasSpotify: boolean
  hasLastFm: boolean
}

export default function LinkListeningCard({ hasSpotify, hasLastFm }: Props) {
  const router = useRouter()
  return (
    <div style={{ ...cardBox, marginBottom: '16px' }}>
      <span style={{ ...lbl, color: 'var(--accent)', display: 'block', marginBottom: 10 }}>
        ◉ LINK YOUR LISTENING
      </span>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <ServiceTile label="Spotify" connected={hasSpotify} onClick={() => router.push('/spotify/connect')} />
        <ServiceTile label="Last.fm" connected={hasLastFm} onClick={() => router.push('/lastfm/connect')} />
      </Box>
    </div>
  )
}
