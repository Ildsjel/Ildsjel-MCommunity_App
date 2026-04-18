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

// ── Admin tokens ──────────────────────────────────────────────────────────────

export const adminAPI = {
  generateToken: (note?: string) => req<{ id: string; token: string; note?: string; expires_at: string }>('POST', '/admin/tokens', { note }),
  listTokens: () => req<any[]>('GET', '/admin/tokens'),
  redeemToken: (token: string) => req<{ message: string }>('POST', '/admin/tokens/redeem', { token }),

  // Users
  listUsers: () => req<any[]>('GET', '/admin/users'),
  setUserRole: (userId: string, role: string) => req<{ message: string }>('PATCH', `/admin/users/${userId}/role`, { role }),

  // Bands
  listBands: (status?: string) => req<any[]>('GET', `/admin/bands${status ? `?status=${status}` : ''}`),
  createBand: (data: unknown) => req<any>('POST', '/admin/bands', data),
  updateBand: (id: string, data: unknown) => req<any>('PATCH', `/admin/bands/${id}`, data),
  deleteBand: (id: string) => req<void>('DELETE', `/admin/bands/${id}`),
  uploadBandPhoto: (id: string, file: File) => uploadFile<any>(`/admin/bands/${id}/image`, file),
  uploadBandLogo: (id: string, file: File) => uploadFile<any>(`/admin/bands/${id}/logo`, file),
  createRelease: (bandId: string, data: unknown) => req<any>('POST', `/admin/bands/${bandId}/releases`, data),
  deleteRelease: (releaseId: string) => req<void>('DELETE', `/admin/releases/${releaseId}`),

  // Genres
  listGenres: () => req<any[]>('GET', '/admin/genres'),
  createGenre: (data: unknown) => req<any>('POST', '/admin/genres', data),
  updateGenre: (id: string, data: unknown) => req<any>('PATCH', `/admin/genres/${id}`, data),
  deleteGenre: (id: string) => req<void>('DELETE', `/admin/genres/${id}`),

  // Tags
  listTags: (category?: string) => req<any[]>('GET', `/admin/tags${category ? `?category=${category}` : ''}`),
  createTag: (data: unknown) => req<any>('POST', '/admin/tags', data),
  updateTag: (id: string, data: unknown) => req<any>('PATCH', `/admin/tags/${id}`, data),
  deleteTag: (id: string) => req<void>('DELETE', `/admin/tags/${id}`),
  mergeTags: (sourceId: string, targetId: string) => req<{ message: string }>('POST', '/admin/tags/merge', { source_id: sourceId, target_id: targetId }),
}
