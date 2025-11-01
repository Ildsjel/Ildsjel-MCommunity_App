'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  ImageList,
  ImageListItem,
  ImageListItemBar,
} from '@mui/material'
import {
  Add,
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
  previewMode?: boolean // Show only 3 images preview
  onViewAll?: () => void // Callback for "View All" button
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

    // Validate
    if (!file.type.startsWith('image/')) {
      alert('Bitte wähle eine Bilddatei aus')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Datei zu groß. Maximale Größe: 10MB')
      return
    }

    if (images.length >= 10) {
      alert('Galerie ist voll. Maximale Anzahl: 10 Bilder')
      return
    }

    setUploading(true)
    try {
      const newImage = await galleryAPI.uploadGalleryImage(file)
      setImages([...images, newImage])
    } catch (error: any) {
      alert(`Upload fehlgeschlagen: ${error.response?.data?.detail || error.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm('Bild wirklich löschen?')) return

    try {
      await galleryAPI.deleteGalleryImage(imageId)
      setImages(images.filter((img) => img.id !== imageId))
    } catch (error: any) {
      alert(`Löschen fehlgeschlagen: ${error.response?.data?.detail || error.message}`)
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
      alert(`Speichern fehlgeschlagen: ${error.response?.data?.detail || error.message}`)
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

  // Use Carousel for preview mode
  if (previewMode) {
    const handleCarouselEditCaption = (imageId: string, caption: string) => {
      const image = images.find(img => img.id === imageId)
      if (image) {
        handleEditCaption(image)
      }
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
            <Typography variant="h6">
              {previewMode ? `Galerie (${images.length}/10)` : `Galerie (${images.length}/10)`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isOwnProfile && (
                <Button
                  variant="contained"
                  startIcon={uploading ? <CircularProgress size={20} /> : <Add />}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= 10}
                  size={previewMode ? "small" : "medium"}
                >
                  Bild hinzufügen
                </Button>
              )}
              {previewMode && images.length > 3 && (
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

          {images.length === 0 ? (
            <Alert severity="info">
              {isOwnProfile
                ? 'Noch keine Bilder in deiner Galerie. Füge bis zu 10 Bilder hinzu!'
                : 'Dieser User hat noch keine Bilder in der Galerie.'}
            </Alert>
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
            <Typography variant="h6">{selectedImage?.caption || 'Bild'}</Typography>
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
                Hochgeladen am {new Date(selectedImage.uploaded_at).toLocaleDateString('de-DE')}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Caption Edit Dialog */}
      <Dialog open={captionDialogOpen} onClose={() => setCaptionDialogOpen(false)}>
        <DialogTitle>Bildunterschrift bearbeiten</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={editingCaption}
            onChange={(e) => setEditingCaption(e.target.value.slice(0, 500))}
            placeholder="Bildunterschrift (optional)"
            helperText={`${editingCaption.length}/500 Zeichen`}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaptionDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSaveCaption} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

