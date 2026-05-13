'use client'

/**
 * AvatarGroup
 *
 * Renders up to `max` stacked avatar circles from a list of FriendRef objects.
 * If the list has more items than `max`, shows a "+N" overflow pill at the end.
 * Clicking the group calls `onExpand` (e.g. to open the full attendee modal).
 */

import { Box, Typography } from '@mui/material'
import { FriendRef } from '@/lib/eventsApi'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Props {
  users: FriendRef[]
  total?: number       // if provided, overflow = total - shown; else = users.length - max
  max?: number         // max avatars before +N, default 5
  size?: number        // px, default 22
  onExpand?: () => void
  label?: string       // optional label rendered before the avatars
}

export default function AvatarGroup({
  users,
  total,
  max = 5,
  size = 22,
  onExpand,
  label,
}: Props) {
  if (users.length === 0 && !total) return null

  const shown    = users.slice(0, max)
  const overflow = (total ?? users.length) - shown.length
  const overlap  = Math.round(size * 0.35)  // how much each avatar overlaps the next

  return (
    <Box
      onClick={onExpand}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        cursor: onExpand ? 'pointer' : 'default',
      }}
    >
      {label && (
        <Typography sx={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.375rem',
          letterSpacing: '0.08em',
          color: 'var(--muted)',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          {label}
        </Typography>
      )}

      {/* Stacked avatars */}
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {shown.map((u, i) => {
          const src = u.profile_image_url
            ? `${API_BASE}${u.profile_image_url}`
            : undefined
          const initials = (u.handle?.[0] ?? '?').toUpperCase()

          return (
            <Box
              key={u.id}
              title={u.handle}
              sx={{
                width: size,
                height: size,
                borderRadius: '50%',
                border: '1.5px solid #120e18',
                backgroundColor: '#2a1f38',
                backgroundImage: src ? `url(${src})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginLeft: i === 0 ? 0 : `-${overlap}px`,
                zIndex: shown.length - i,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {!src && (
                <Typography sx={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: `${size * 0.36}px`,
                  color: 'rgba(216,207,184,0.6)',
                  lineHeight: 1,
                  userSelect: 'none',
                }}>
                  {initials}
                </Typography>
              )}
            </Box>
          )
        })}

        {/* +N overflow pill */}
        {overflow > 0 && (
          <Box
            sx={{
              width: size,
              height: size,
              borderRadius: '50%',
              border: '1.5px solid #120e18',
              backgroundColor: '#1e1629',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginLeft: `-${overlap}px`,
              zIndex: 0,
              position: 'relative',
            }}
          >
            <Typography sx={{
              fontFamily: 'var(--font-mono)',
              fontSize: `${size * 0.3}px`,
              color: 'var(--muted)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
              userSelect: 'none',
            }}>
              +{overflow}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
