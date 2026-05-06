import { api } from './api'

function authHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  return { Authorization: `Bearer ${token ?? ''}` }
}

export type ReleaseType = 'LP' | 'EP' | 'Split-EP' | 'Demo' | 'Single' | 'Compilation' | 'Live'

export interface Track {
  id: string
  number: number
  title: string
  duration: string
  lyrics?: string | null
}

export interface Release {
  id: string
  slug: string
  band_id: string
  title: string
  type: ReleaseType
  year: number
  label?: string | null
  status: string
  tracks: Track[]
}

export interface BandGenre {
  id: string
  slug: string
  name: string
}

/** Recursive genre tree node returned by GET /bands/genres */
export interface GenreNode extends BandGenre {
  description?: string | null
  parent_id?: string | null
  children: GenreNode[]
}

export interface BandTag {
  id: string
  slug: string
  name: string
  category: string
}

export interface Band {
  id: string
  slug: string
  name: string
  country: string
  country_code: string
  formed: number
  bio?: string | null
  status: string
  image_url?: string | null
  logo_url?: string | null
  releases: Release[]
  genres: BandGenre[]
  tags: BandTag[]
}

export interface BandSummary {
  id: string
  slug: string
  name: string
  country: string
  country_code: string
  formed: number
}

export interface ReleaseDetail {
  band: BandSummary
  release: Release
}

/** Flatten a genre tree into a plain list (depth-first), deduplicating by id. */
export function flattenGenreTree(genres: GenreNode[]): BandGenre[] {
  const seen = new Set<string>()
  const result: BandGenre[] = []
  const walk = (nodes: GenreNode[]) => {
    for (const g of nodes) {
      if (!seen.has(g.id)) {
        seen.add(g.id)
        result.push({ id: g.id, slug: g.slug, name: g.name })
        if (g.children?.length) walk(g.children)
      }
    }
  }
  walk(genres)
  return result
}

export async function listGenres(): Promise<GenreNode[]> {
  const res = await api.get<GenreNode[]>('/bands/genres')
  return res.data
}

export async function listTags(category?: string): Promise<BandTag[]> {
  const res = await api.get<BandTag[]>('/bands/tags', {
    params: category ? { category } : undefined,
  })
  return res.data
}

/**
 * Add genres and/or tags from the ontology to a band.
 * Idempotent — duplicates are silently ignored by the backend MERGE.
 */
export async function addBandTags(
  bandId: string,
  genreIds: string[],
  tagIds: string[],
): Promise<void> {
  await api.post(
    `/bands/${bandId}/tags`,
    { genre_ids: genreIds, tag_ids: tagIds },
    { headers: authHeader() },
  )
}

/** Remove a single genre or tag (by node id) from a band. */
export async function removeBandTag(bandId: string, nodeId: string): Promise<void> {
  await api.delete(`/bands/${bandId}/tags/${nodeId}`, { headers: authHeader() })
}

export async function getBand(slug: string): Promise<Band | null> {
  try {
    const res = await api.get<Band>(`/bands/${slug}`)
    return res.data
  } catch {
    return null
  }
}

export async function getRelease(bandSlug: string, releaseSlug: string): Promise<ReleaseDetail | null> {
  try {
    const res = await api.get<ReleaseDetail>(`/bands/${bandSlug}/releases/${releaseSlug}`)
    return res.data
  } catch {
    return null
  }
}

export interface BandRequestResult {
  /** 'exists' — published band found, band_slug is set and frontend can navigate
   *  'already_requested' — draft already exists, no action needed
   *  'requested' — new draft created, admin review pending */
  status: 'exists' | 'already_requested' | 'requested'
  band_slug: string | null
}

export interface AlbumSuggestionResult {
  id: string
  status: string
}

/**
 * Suggest a missing album for an existing band.
 * Returns 409 if the album already exists in the discography or was already suggested.
 */
export async function suggestAlbum(
  bandId: string,
  title: string,
  type?: string | null,
  year?: number | null,
): Promise<AlbumSuggestionResult> {
  const res = await api.post<AlbumSuggestionResult>(
    `/bands/${bandId}/suggest-album`,
    { title, type: type || null, year: year || null },
    { headers: authHeader() },
  )
  return res.data
}

/**
 * Request a band review from the admin.
 * Called when a user clicks on a streaming artist that has no linked Grimr band.
 */
export async function requestBandReview(artistName: string): Promise<BandRequestResult> {
  const res = await api.post<BandRequestResult>(
    '/bands/request',
    { artist_name: artistName },
    { headers: authHeader() },
  )
  return res.data
}
