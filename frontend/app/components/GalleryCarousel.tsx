'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Close,
  ZoomIn,
  Delete,
} from '@mui/icons-material'
import { GalleryImage } from '@/lib/galleryApi'
import ImageComments from './ImageComments'

interface GalleryCarouselProps {
  images: GalleryImage[]
  isOwnProfile: boolean
  uploading: boolean
  onUpload: () => void
  onDelete: (imageId: string) => void
  onEditCaption?: (imageId: string, caption: string) => void
  onViewAll?: () => void
  maxImages?: number
  imageOwnerId?: string
  showComments?: boolean
}

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

export default function GalleryCarousel({
  images,
  isOwnProfile,
  uploading,
  onUpload,
  onDelete,
  onEditCaption,
  onViewAll,
  maxImages = 10,
  imageOwnerId,
  showComments = true,
}: GalleryCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const theme = useTheme()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleImageClick = () => {
    setViewerOpen(true)
  }

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = () => {
    const imageToDelete = images[currentIndex]
    onDelete(imageToDelete.id)
    setDeleteConfirmOpen(false)
    if (currentIndex >= images.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const isFull = images.length >= maxImages

  if (images.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
            <span style={lbl}>Gallery (0/{maxImages})</span>
            {isOwnProfile && (
              <Box
                component="button"
                onClick={onUpload}
                disabled={uploading}
                sx={{
                  background: 'none',
                  border: '1.5px solid rgba(196,58,42,0.45)',
                  borderRadius: '3px',
                  px: 1.25,
                  py: 0.5,
                  cursor: uploading ? 'default' : 'pointer',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: uploading ? 'rgba(216,207,184,0.25)' : 'var(--accent)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover:not(:disabled)': { borderColor: 'var(--accent)' },
                }}
              >
                {uploading ? <CircularProgress size={10} /> : '+'} Add image
              </Box>
            )}
          </Box>
          <Typography sx={{
            fontFamily: 'var(--font-serif)', fontStyle: 'italic',
            fontSize: '0.8125rem', color: 'var(--muted)', textAlign: 'center', mt: 3,
          }}>
            {isOwnProfile
              ? `No images yet. Add up to ${maxImages} images.`
              : 'This user hasn\'t added any images yet.'}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  const currentImage = images[currentIndex]

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
            <span style={lbl}>Gallery ({images.length}/{maxImages})</span>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isOwnProfile && (
                <Box
                  component="button"
                  onClick={onUpload}
                  disabled={uploading || isFull}
                  sx={{
                    background: 'none',
                    border: '1.5px solid',
                    borderColor: uploading || isFull ? 'rgba(216,207,184,0.1)' : 'rgba(196,58,42,0.45)',
                    borderRadius: '3px',
                    px: 1.25,
                    py: 0.5,
                    cursor: uploading || isFull ? 'default' : 'pointer',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.5rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: uploading || isFull ? 'rgba(216,207,184,0.25)' : 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    '&:hover:not(:disabled)': { borderColor: 'var(--accent)' },
                  }}
                >
                  {uploading ? <CircularProgress size={10} /> : '+'} Add image
                </Box>
              )}
              {onViewAll && (
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

          {/* Carousel */}
          <Box sx={{ position: 'relative', width: '100%', paddingTop: '75%', bgcolor: 'background.default', borderRadius: 2, overflow: 'hidden' }}>
            {/* Main Image */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={handleImageClick}
            >
              <img
                src={`${API_BASE}${currentImage.image_url}`}
                alt={currentImage.caption || `Gallery image ${currentIndex + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  margin: 'auto',
                }}
              />
            </Box>

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}

            {/* Action Buttons */}
            <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 1 }}>
              <IconButton
                onClick={handleImageClick}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                }}
              >
                <ZoomIn />
              </IconButton>
              {isOwnProfile && (
                <IconButton
                  onClick={handleDeleteClick}
                  sx={{
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(211, 47, 47, 0.8)' },
                  }}
                >
                  <Delete />
                </IconButton>
              )}
            </Box>

            {/* Image Counter */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 8,
                left: '50%',
                transform: 'translateX(-50%)',
                bgcolor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                px: 2,
                py: 0.5,
                borderRadius: 2,
              }}
            >
              <Typography variant="caption">
                {currentIndex + 1} / {images.length}
              </Typography>
            </Box>
          </Box>

          {/* Caption */}
          {currentImage.caption && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {currentImage.caption}
              </Typography>
            </Box>
          )}

          {/* Thumbnail Navigation */}
          {images.length > 1 && (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                mt: 2,
                overflowX: 'auto',
                pb: 1,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: theme.palette.divider,
                  borderRadius: 3,
                },
              }}
            >
              {images.map((image, index) => (
                <Box
                  key={image.id}
                  onClick={() => setCurrentIndex(index)}
                  sx={{
                    minWidth: 80,
                    height: 80,
                    cursor: 'pointer',
                    border: 2,
                    borderColor: index === currentIndex ? 'primary.main' : 'transparent',
                    borderRadius: 1,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                    '&:hover': { borderColor: 'primary.light' },
                  }}
                >
                  <img
                    src={`${API_BASE}${image.thumbnail_url}`}
                    alt={`Thumbnail ${index + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Viewer Dialog */}
      <Dialog
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {currentImage.caption || `Image ${currentIndex + 1}`}
            </Typography>
            <IconButton onClick={() => setViewerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            mb: 2,
          }}>
            <img
              src={`${API_BASE}${currentImage.image_url}`}
              alt={currentImage.caption || 'Gallery image'}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                display: 'block',
                margin: 'auto',
              }}
            />
            {images.length > 1 && (
              <>
                <IconButton
                  onClick={handlePrevious}
                  sx={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  onClick={handleNext}
                  sx={{
                    position: 'absolute',
                    right: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            {currentImage.caption && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {currentImage.caption}
              </Typography>
            )}
            <Typography variant="caption" display="block">
              {currentIndex + 1} / {images.length} · Uploaded {new Date(currentImage.uploaded_at).toLocaleDateString('en-GB')}
            </Typography>
          </Box>

          {showComments && (
            <Box sx={{ mt: 4 }}>
              <ImageComments
                imageId={currentImage.id}
                imageOwnerId={imageOwnerId}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete image?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this image? This action cannot be undone.
          </Typography>
          {currentImage?.caption && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Caption:
              </Typography>
              <Typography variant="body2">
                {currentImage.caption}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Box
            component="button"
            onClick={() => setDeleteConfirmOpen(false)}
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
            onClick={handleDeleteConfirm}
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
            Delete
          </Box>
        </Box>
      </Dialog>
    </>
  )
}
