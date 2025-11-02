import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface GalleryImage {
  id: string
  user_id: string
  image_url: string
  thumbnail_url: string
  caption?: string
  uploaded_at: string
  position: number
}

export interface GalleryResponse {
  user_id: string
  handle: string
  images: GalleryImage[]
  total_images: number
}

export const galleryAPI = {
  /**
   * Upload avatar
   */
  uploadAvatar: async (file: File): Promise<{ success: boolean; message: string; image_url?: string }> => {
    const token = localStorage.getItem('access_token')
    const formData = new FormData()
    formData.append('file', file)

    const response = await axios.post(
      `${API_BASE}/api/v1/users/me/avatar`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Delete avatar
   */
  deleteAvatar: async (): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem('access_token')
    const response = await axios.delete(
      `${API_BASE}/api/v1/users/me/avatar`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
    return response.data
  },

  /**
   * Upload gallery image
   */
  uploadGalleryImage: async (file: File, caption?: string): Promise<GalleryImage> => {
    const token = localStorage.getItem('access_token')
    const formData = new FormData()
    formData.append('file', file)
    if (caption) {
      formData.append('caption', caption)
    }

    const response = await axios.post(
      `${API_BASE}/api/v1/users/me/gallery`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Get my gallery
   */
  getMyGallery: async (): Promise<GalleryResponse> => {
    const token = localStorage.getItem('access_token')
    const response = await axios.get(
      `${API_BASE}/api/v1/users/me/gallery`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },

  /**
   * Get user gallery (public)
   */
  getUserGallery: async (userId: string): Promise<GalleryResponse> => {
    const response = await axios.get(
      `${API_BASE}/api/v1/users/${userId}/gallery`
    )
    return response.data
  },

  /**
   * Delete gallery image
   */
  deleteGalleryImage: async (imageId: string): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem('access_token')
    const response = await axios.delete(
      `${API_BASE}/api/v1/users/me/gallery/${imageId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    return response.data
  },

  /**
   * Update image caption
   */
  updateImageCaption: async (imageId: string, caption?: string): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem('access_token')
    const formData = new FormData()
    if (caption) {
      formData.append('caption', caption)
    }

    const response = await axios.patch(
      `${API_BASE}/api/v1/users/me/gallery/${imageId}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },
}

