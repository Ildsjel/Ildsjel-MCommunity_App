const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token ?? ''}`,
  }
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

export interface FavouriteBandSummary {
  id: string
  slug: string
  name: string
  country: string
  country_code: string
  formed: number
  bio?: string | null
  status: string
  image_url?: string | null
  genres: { id: string; slug: string; name: string }[]
  releases: unknown[]
}

export interface AddFavouriteBandResult {
  ok: boolean
  /** True when the band was matched against the user's Spotify / Last.fm library */
  matched_external: boolean
  /** The external artist name that was matched, if any */
  matched_artist_name?: string | null
  /** Which external source produced the match */
  matched_source?: 'spotify' | 'lastfm' | 'both' | null
}

export const bandFavouritesApi = {
  /** All bands the current user has favourited */
  getFavourites: () =>
    req<FavouriteBandSummary[]>('GET', '/favourites/bands'),

  /** Whether the current user has favourited a specific band */
  getStatus: (bandId: string) =>
    req<{ is_favourite: boolean }>('GET', `/favourites/band/${bandId}`),

  /** Add a band to favourites. Returns match info from the external library. */
  add: (bandId: string) =>
    req<AddFavouriteBandResult>('POST', '/favourites/band', { band_id: bandId }),

  /** Remove a band from favourites */
  remove: (bandId: string) =>
    req<{ ok: boolean }>('DELETE', `/favourites/band/${bandId}`),
}
