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

/** Full attendee entry returned by GET /events/{id}/attendees */
export interface AttendeeRef {
  id: string
  handle: string
  profile_image_url?: string
  is_friend: boolean
  shared_bands: number
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
  // RSVP
  my_rsvp: 'interested' | 'going' | null
  going_count: number
  interested_count: number
  going_avatars: FriendRef[]      // friends going (up to 8)
  interested_avatars: FriendRef[] // friends interested (up to 8)
  // Ranking
  match_score: number       // 0.0–1.0
  location_score?: number
  taste_score?: number
  friends_score?: number
  distance_km?: number | null
  explain?: EventExplain     // only present in list view, not detail view
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

export interface RsvpResponse {
  rsvp: 'interested' | 'going' | null
  going_count: number
  interested_count: number
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

  /** Toggle-style RSVP. Same status = toggle off (returns null). */
  rsvp: (id: string, status: 'interested' | 'going') =>
    req<RsvpResponse>('POST', `/events/${id}/rsvp`, { status }),

  /** Full attendee list for modal — sorted friends → shared bands → alpha. */
  getAttendees: (id: string, status: 'interested' | 'going') =>
    req<AttendeeRef[]>('GET', `/events/${id}/attendees?status=${status}`),

  // Legacy — kept so old code doesn't break at runtime
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
