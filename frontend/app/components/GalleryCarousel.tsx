'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  useTheme,
} from '@mui/material'
import {
  ChevronLeft,
  ChevronRight,
  Add,
  Close,
  ZoomIn,
  Delete,
  Edit,
} from '@mui/icons-material'
import { GalleryImage } from '@/lib/galleryApi'

interface GalleryCarouselProps {
  images: GalleryImage[]
  isOwnProfile: boolean
  uploading: boolean
  onUpload: () => void
  onDelete: (imageId: string) => void
  onEditCaption?: (imageId: string, caption: string) => void
  onViewAll?: () => void
  maxImages?: number
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
    
    // Adjust current index if necessary
    if (currentIndex >= images.length - 1 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (images.length === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Galerie (0/{maxImages})
            </Typography>
            {isOwnProfile && (
              <Button
                variant="contained"
                startIcon={uploading ? <CircularProgress size={20} /> : <Add />}
                onClick={onUpload}
                disabled={uploading}
                size="small"
              >
                Bild hinzufügen
              </Button>
            )}
          </Box>
          <Alert severity="info">
            {isOwnProfile
              ? `Noch keine Bilder in deiner Galerie. Füge bis zu ${maxImages} Bilder hinzu!`
              : 'Dieser User hat noch keine Bilder in der Galerie.'}
          </Alert>
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="h6">
              Galerie ({images.length}/{maxImages})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isOwnProfile && (
                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={20} /> : <Add />}
                  onClick={onUpload}
                  disabled={uploading || images.length >= maxImages}
                  size="small"
                >
                  Bild hinzufügen
                </Button>
              )}
              {images.length > 0 && onViewAll && (
                <Button
                  variant="outlined"
                  onClick={onViewAll}
                  size="small"
                >
                  Alle ansehen
                </Button>
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
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
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
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}

            {/* Action Buttons */}
            <Box
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                display: 'flex',
                gap: 1,
              }}
            >
              <IconButton
                onClick={handleImageClick}
                sx={{
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
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
                    '&:hover': {
                      bgcolor: 'rgba(211, 47, 47, 0.8)',
                    },
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
                '&::-webkit-scrollbar': {
                  height: 6,
                },
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
                    '&:hover': {
                      borderColor: 'primary.light',
                    },
                  }}
                >
                  <img
                    src={`${API_BASE}${image.thumbnail_url}`}
                    alt={`Thumbnail ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
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
              {currentImage.caption || `Bild ${currentIndex + 1}`}
            </Typography>
            <IconButton onClick={() => setViewerOpen(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', position: 'relative' }}>
            <img
              src={`${API_BASE}${currentImage.image_url}`}
              alt={currentImage.caption || 'Gallery image'}
              style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            />
            
            {/* Navigation in Dialog */}
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
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
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
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.7)',
                    },
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}

            {currentImage.caption && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                {currentImage.caption}
              </Typography>
            )}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {currentIndex + 1} / {images.length} • Hochgeladen am {new Date(currentImage.uploaded_at).toLocaleDateString('de-DE')}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Bild löschen?</DialogTitle>
        <DialogContent>
          <Typography>
            Möchtest du dieses Bild wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
          {currentImage?.caption && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Bildunterschrift:
              </Typography>
              <Typography variant="body2">
                {currentImage.caption}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Löschen
          </Button>
        </Box>
      </Dialog>
    </>
  )
}

