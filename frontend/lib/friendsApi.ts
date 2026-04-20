const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
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

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted'

export interface FriendUser {
  id: string
  handle: string
  profile_image_url?: string
  created_at?: string
}

export const friendsApi = {
  getStatus: (otherId: string) => req<{ status: FriendStatus }>('GET', `/friends/status/${otherId}`),
  sendRequest: (targetId: string) => req<{ message: string }>('POST', `/friends/request/${targetId}`),
  respond: (requesterId: string, action: 'accept' | 'decline') =>
    req<{ message: string }>('POST', `/friends/respond/${requesterId}`, { action }),
  cancelRequest: (otherId: string) => req<void>('DELETE', `/friends/request/${otherId}`),
  unfriend: (friendId: string) => req<void>('DELETE', `/friends/${friendId}`),
  listFriends: () => req<FriendUser[]>('GET', '/friends/'),
  listPending: () => req<FriendUser[]>('GET', '/friends/pending'),
}
