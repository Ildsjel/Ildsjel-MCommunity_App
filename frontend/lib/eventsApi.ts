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

export interface EventExplain {
  location?: string   // e.g. "5 km away", "in your city", "far away"
  taste?: string      // e.g. "2 matching bands"
  friends?: string    // e.g. "3 friends interested"
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
  location_score: number
  taste_score: number
  friends_score: number
  distance_km?: number | null
  explain: EventExplain
}

export interface EventsResponse {
  events: Event[]
  total: number
  page: number
  limit: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
  location_source: 'gps' | 'city' | 'none'
}

export interface ListEventsParams {
  lat?: number | null
  lon?: number | null
  page?: number
  limit?: number
}

export const eventsApi = {
  listEvents: ({ lat, lon, page = 1, limit = 25 }: ListEventsParams = {}) => {
    const p = new URLSearchParams()
    if (lat != null) p.set('lat', String(lat))
    if (lon != null) p.set('lon', String(lon))
    p.set('page', String(page))
    p.set('limit', String(limit))
    return req<EventsResponse>('GET', `/events/?${p}`)
  },
  getEvent: (id: string) => req<Event>('GET', `/events/${id}`),
  toggleInterest: (id: string) => req<{ interested: boolean }>('POST', `/events/${id}/interest`),
}

/** Try to get browser GPS coords. Returns null if denied or unavailable. */
export function requestGPS(): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    if (!navigator?.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      ()  => resolve(null),
      { timeout: 5000, maximumAge: 300_000 },   // cache GPS for 5 min
    )
  })
}
