'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material'
import {
  Delete,
  Edit,
  Close,
  ZoomIn,
} from '@mui/icons-material'
import { galleryAPI, GalleryImage } from '@/lib/galleryApi'
import GalleryCarousel from './GalleryCarousel'

interface GalleryManagerProps {
  userId?: string
  isOwnProfile: boolean
  previewMode?: boolean
  onViewAll?: () => void
}

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function GalleryManager({ userId, isOwnProfile, previewMode = false, onViewAll }: GalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [captionDialogOpen, setCaptionDialogOpen] = useState(false)
  const [editingCaption, setEditingCaption] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  useEffect(() => {
    loadGallery()
  }, [userId])

  const loadGallery = async () => {
    setLoading(true)
    try {
      const gallery = isOwnProfile
        ? await galleryAPI.getMyGallery()
        : await galleryAPI.getUserGallery(userId!)
      setImages(gallery.images)
    } catch (error) {
      console.error('Failed to load gallery:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size: 10 MB.')
      return
    }

    if (images.length >= 10) {
      alert('Gallery is full. Maximum: 10 images.')
      return
    }

    setUploading(true)
    try {
      const newImage = await galleryAPI.uploadGalleryImage(file)
      setImages([...images, newImage])
    } catch (error: any) {
      alert(`Upload failed: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm('Delete this image?')) return

    try {
      await galleryAPI.deleteGalleryImage(imageId)
      setImages(images.filter((img) => img.id !== imageId))
    } catch (error: any) {
      alert(`Delete failed: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleEditCaption = (image: GalleryImage) => {
    setSelectedImage(image)
    setEditingCaption(image.caption || '')
    setCaptionDialogOpen(true)
  }

  const handleSaveCaption = async () => {
    if (!selectedImage) return

    try {
      await galleryAPI.updateImageCaption(selectedImage.id, editingCaption)
      setImages(
        images.map((img) =>
          img.id === selectedImage.id ? { ...img, caption: editingCaption } : img
        )
      )
      setCaptionDialogOpen(false)
    } catch (error: any) {
      alert(`Save failed: ${error.response?.data?.detail || error.message}`)
    }
  }

  const handleViewImage = (image: GalleryImage) => {
    setSelectedImage(image)
    setViewerOpen(true)
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    )
  }

  const displayImages = previewMode ? images.slice(0, 3) : images

  if (previewMode) {
    const handleCarouselEditCaption = (imageId: string, caption: string) => {
      const image = images.find(img => img.id === imageId)
      if (image) handleEditCaption(image)
    }

    return (
      <>
        <GalleryCarousel
          images={images}
          isOwnProfile={isOwnProfile}
          uploading={uploading}
          onUpload={() => fileInputRef.current?.click()}
          onDelete={handleDelete}
          onEditCaption={handleCarouselEditCaption}
          onViewAll={onViewAll}
          maxImages={10}
          imageOwnerId={userId}
          showComments={true}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      </>
    )
  }

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <span style={lbl}>Gallery ({images.length}/10)</span>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isOwnProfile && (
                <Box
                  component="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= 10}
                  sx={{
                    background: 'none',
                    border: '1.5px solid',
                    borderColor: uploading || images.length >= 10 ? 'rgba(216,207,184,0.1)' : 'rgba(196,58,42,0.45)',
                    borderRadius: '3px',
                    px: 1.25,
                    py: 0.5,
                    cursor: uploading || images.length >= 10 ? 'default' : 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: uploading || images.length >= 10 ? 'rgba(216,207,184,0.25)' : 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover:not(:disabled)': { borderColor: 'var(--accent)' },
                  }}
                >
                  {uploading ? <CircularProgress size={10} /> : '+'} Add image
                </Box>
              )}
              {previewMode && images.length > 3 && onViewAll && (
                <Box
                  component="button"
                  onClick={onViewAll}
                  sx={{
                    background: 'none',
                    border: '1.5px solid rgba(216,207,184,0.2)',
                    borderRadius: '3px',
                    px: 1.25,
                    py: 0.5,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink)',
                    '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
                  }}
                >
                  View all
                </Box>
              )}
            </Box>
          </Box>

          {images.length === 0 ? (
            <Typography sx={{
              fontFamily: 'var(--font-serif)', fontStyle: 'italic',
              fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center', mt: 3,
            }}>
              {isOwnProfile
                ? 'No images yet. Add up to 10 images.'
                : 'This user hasn\'t added any images yet.'}
            </Typography>
          ) : (
            <ImageList cols={3} gap={8}>
              {displayImages.map((image) => (
                <ImageListItem key={image.id}>
                  <img
                    src={`${API_BASE}${image.thumbnail_url}`}
                    alt={image.caption || 'Gallery image'}
                    loading="lazy"
                    style={{
                      height: 200,
                      objectFit: 'cover',
                      cursor: 'pointer',
                      borderRadius: 4,
                    }}
                    onClick={() => handleViewImage(image)}
                  />
                  <ImageListItemBar
                    title={image.caption || ''}
                    actionIcon={
                      isOwnProfile ? (
                        <Box>
                          <IconButton
                            size="small"
                            onClick={() => handleEditCaption(image)}
                            sx={{ color: 'white' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(image.id)}
                            sx={{ color: 'white' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <IconButton
                          size="small"
                          onClick={() => handleViewImage(image)}
                          sx={{ color: 'white' }}
                        >
                          <ZoomIn fontSize="small" />
                        </IconButton>
                      )
                    }
                  />
                </ImageListItem>
              ))}
            </ImageList>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </CardContent>
      </Card>

      {/* Image Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{selectedImage?.caption || 'Image'}</Typography>
            <IconButton onClick={() => setViewerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedImage && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={`${API_BASE}${selectedImage.image_url}`}
                alt={selectedImage.caption || 'Gallery image'}
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
              />
              {selectedImage.caption && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {selectedImage.caption}
                </Typography>
              )}
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Uploaded {new Date(selectedImage.uploaded_at).toLocaleDateString('en-GB')}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Caption Edit Dialog */}
      <Dialog open={captionDialogOpen} onClose={() => setCaptionDialogOpen(false)}>
        <DialogTitle>Edit caption</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editingCaption}
            onChange={(e) => setEditingCaption(e.target.value.slice(0, 500))}
            placeholder="Caption (optional)"
            helperText={`${editingCaption.length}/500`}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Box
            component="button"
            onClick={() => setCaptionDialogOpen(false)}
            sx={{
              background: 'none',
              border: '1.5px solid rgba(216,207,184,0.2)',
              borderRadius: '3px',
              px: 1.5,
              py: 0.75,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink)',
              '&:hover': { borderColor: 'rgba(216,207,184,0.4)' },
            }}
          >
            Cancel
          </Box>
          <Box
            component="button"
            onClick={handleSaveCaption}
            sx={{
              background: 'none',
              border: '1.5px solid rgba(196,58,42,0.45)',
              borderRadius: '3px',
              px: 1.5,
              py: 0.75,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--accent)',
              '&:hover': { borderColor: 'var(--accent)' },
            }}
          >
            Save
          </Box>
        </DialogActions>
      </Dialog>
    </>
  )
}
