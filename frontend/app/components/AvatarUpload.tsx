'use client'

import { useState, useRef } from 'react'
import {
  IconButton,
  CircularProgress,
  Box,
  Tooltip,
} from '@mui/material'
import { PhotoCamera } from '@mui/icons-material'
import { galleryAPI } from '@/lib/galleryApi'
import { useUser } from '@/app/context/UserContext'
import UserAvatar from './UserAvatar'

interface AvatarUploadProps {
  size?: number
}

export default function AvatarUpload({
  size = 100,
}: AvatarUploadProps) {
  const { user, updateAvatar } = useUser()
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Bitte wähle eine Bilddatei aus')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Datei zu groß. Maximale Größe: 10MB')
      return
    }

    // Upload
    setUploading(true)
    try {
      const result = await galleryAPI.uploadAvatar(file)
      if (result.success && result.image_url) {
        // Update global user context - this will update avatar everywhere
        updateAvatar(result.image_url)
      }
    } catch (error: any) {
      alert(`Upload fehlgeschlagen: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <UserAvatar
        avatarUrl={user.profile_image_url}
        userName={user.handle}
        size={size}
        sx={{ cursor: 'pointer' }}
        onClick={handleClick}
      />
      
      <Tooltip title="Avatar ändern">
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            bgcolor: 'background.paper',
            '&:hover': { bgcolor: 'action.hover' },
            boxShadow: 2,
          }}
          size="small"
          onClick={handleClick}
          disabled={uploading}
        >
          {uploading ? (
            <CircularProgress size={20} />
          ) : (
            <PhotoCamera fontSize="small" />
          )}
        </IconButton>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
    </Box>
  )
}

