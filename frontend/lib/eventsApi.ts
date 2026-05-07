const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
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

export interface BandRef {
  id: string
  name: string
  slug: string
}

export interface FriendRef {
  id: string
  handle: string
  profile_image_url?: string
}

export interface Event {
  id: string
  title: string
  date: string              // "YYYY-MM-DD"
  venue: string
  city: string
  country: string
  country_code?: string
  ticket_url?: string
  headliner?: BandRef
  supporting: BandRef[]
  friends_interested: FriendRef[]
  is_interested: boolean
  match_score: number       // 0.0–1.0
  distance_km?: number | null
}

export interface EventsResponse {
  events: Event[]
}

export const eventsApi = {
  listEvents: () => req<EventsResponse>('GET', '/events/'),
  getEvent: (id: string) => req<Event>('GET', `/events/${id}`),
  toggleInterest: (id: string) => req<{ interested: boolean }>('POST', `/events/${id}/interest`),
}
