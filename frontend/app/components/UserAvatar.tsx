'use client'

import { Avatar, AvatarProps } from '@mui/material'

interface UserAvatarProps extends Omit<AvatarProps, 'src' | 'children'> {
  avatarUrl?: string | null
  userName: string
  size?: number
}

/**
 * Zentrale Avatar-Komponente für die gesamte App
 * Zeigt entweder das hochgeladene Avatar-Bild oder den ersten Buchstaben des Usernamens
 */
export default function UserAvatar({ 
  avatarUrl, 
  userName, 
  size = 40,
  sx,
  ...props 
}: UserAvatarProps) {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  
  // Vollständige URL für Avatar
  const fullAvatarUrl = avatarUrl && avatarUrl.startsWith('/') 
    ? `${API_BASE}${avatarUrl}` 
    : avatarUrl

  return (
    <Avatar
      src={fullAvatarUrl || undefined}
      sx={{
        width: size,
        height: size,
        bgcolor: 'primary.main',
        fontSize: `${size / 2.5}rem`,
        ...sx,
      }}
      {...props}
    >
      {!fullAvatarUrl && userName.charAt(0).toUpperCase()}
    </Avatar>
  )
}

