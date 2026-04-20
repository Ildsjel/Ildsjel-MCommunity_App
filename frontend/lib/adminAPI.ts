import type {
  AdminBand,
  AdminBandCreate,
  AdminBandUpdate,
  AdminGenre,
  AdminGenreCreate,
  AdminGenreUpdate,
  AdminMessageResponse,
  AdminRelease,
  AdminReleaseCreate,
  AdminTag,
  AdminTagCreate,
  AdminTagUpdate,
  AdminToken,
  AdminTokenCreateResponse,
  AdminUser,
  ImageUploadResponse,
} from './types/admin'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function uploadFile<T>(path: string, file: File): Promise<T> {
  const token = localStorage.getItem('access_token')
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Upload failed')
  }
  return res.json()
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const adminAPI = {
  // Tokens
  generateToken: (note?: string) =>
    req<AdminTokenCreateResponse>('POST', '/admin/tokens', { note }),
  listTokens: () => req<AdminToken[]>('GET', '/admin/tokens'),
  redeemToken: (token: string) =>
    req<AdminMessageResponse>('POST', '/admin/tokens/redeem', { token }),

  // Users
  listUsers: () => req<AdminUser[]>('GET', '/admin/users'),
  setUserRole: (userId: string, role: string) =>
    req<AdminMessageResponse>('PATCH', `/admin/users/${userId}/role`, { role }),

  // Bands
  listBands: (status?: string) =>
    req<AdminBand[]>('GET', `/admin/bands${status ? `?status=${status}` : ''}`),
  draftCount: () => req<{ count: number }>('GET', '/admin/bands/draft-count'),
  publishAllDrafts: () =>
    req<{ published: number }>('POST', '/admin/bands/publish-all-drafts'),
  createBand: (data: AdminBandCreate) => req<AdminBand>('POST', '/admin/bands', data),
  updateBand: (id: string, data: AdminBandUpdate) =>
    req<AdminBand>('PATCH', `/admin/bands/${id}`, data),
  deleteBand: (id: string) => req<void>('DELETE', `/admin/bands/${id}`),
  uploadBandPhoto: (id: string, file: File) =>
    uploadFile<ImageUploadResponse>(`/admin/bands/${id}/image`, file),
  uploadBandLogo: (id: string, file: File) =>
    uploadFile<ImageUploadResponse>(`/admin/bands/${id}/logo`, file),
  createRelease: (bandId: string, data: AdminReleaseCreate) =>
    req<AdminRelease>('POST', `/admin/bands/${bandId}/releases`, data),
  deleteRelease: (releaseId: string) => req<void>('DELETE', `/admin/releases/${releaseId}`),

  // Genres
  listGenres: () => req<AdminGenre[]>('GET', '/admin/genres'),
  createGenre: (data: AdminGenreCreate) => req<AdminGenre>('POST', '/admin/genres', data),
  updateGenre: (id: string, data: AdminGenreUpdate) =>
    req<AdminGenre>('PATCH', `/admin/genres/${id}`, data),
  deleteGenre: (id: string) => req<void>('DELETE', `/admin/genres/${id}`),

  // Tags
  listTags: (category?: string) =>
    req<AdminTag[]>('GET', `/admin/tags${category ? `?category=${category}` : ''}`),
  createTag: (data: AdminTagCreate) => req<AdminTag>('POST', '/admin/tags', data),
  updateTag: (id: string, data: AdminTagUpdate) =>
    req<AdminTag>('PATCH', `/admin/tags/${id}`, data),
  deleteTag: (id: string) => req<void>('DELETE', `/admin/tags/${id}`),
  mergeTags: (sourceId: string, targetId: string) =>
    req<AdminMessageResponse>('POST', '/admin/tags/merge', {
      source_id: sourceId,
      target_id: targetId,
    }),
}
