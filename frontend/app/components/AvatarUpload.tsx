'use client'

import { useState, useRef } from 'react'
import {
  IconButton,
  CircularProgress,
  Box,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from '@mui/material'
import { PhotoCamera, Delete, MoreVert } from '@mui/icons-material'
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
  const [deleting, setDeleting] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  const hasAvatar = !!(user.profile_image_url || user.avatar_url)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size: 10MB')
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
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleUploadClick = () => {
    setMenuAnchor(null)
    fileInputRef.current?.click()
  }

  const handleDeleteClick = () => {
    setMenuAnchor(null)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    setDeleting(true)
    try {
      await galleryAPI.deleteAvatar()
      // Update global user context to remove avatar
      updateAvatar('')
      setDeleteDialogOpen(false)
    } catch (error: any) {
      alert(`Delete failed: ${error.response?.data?.detail || error.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const handleMenuClose = () => {
    setMenuAnchor(null)
  }

  return (
    <>
      <Box sx={{ position: 'relative', display: 'inline-block' }}>
        <UserAvatar
          avatarUrl={user.profile_image_url || user.avatar_url}
          userName={user.username || user.handle}
          userId={user.id}
          size={size}
        />
        
        <Tooltip title="Avatar options">
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
            onClick={handleMenuOpen}
            disabled={uploading || deleting}
          >
            {uploading || deleting ? (
              <CircularProgress size={20} />
            ) : (
              <MoreVert fontSize="small" />
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

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleUploadClick}>
          <ListItemIcon>
            <PhotoCamera fontSize="small" />
          </ListItemIcon>
          <ListItemText>{hasAvatar ? 'Change Avatar' : 'Upload Avatar'}</ListItemText>
        </MenuItem>
        {hasAvatar && (
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            <ListItemText>Delete Avatar</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Avatar</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete your avatar? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

