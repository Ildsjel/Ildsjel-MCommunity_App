export type BandStatus = 'draft' | 'published' | 'archived'

export type ReleaseType = 'LP' | 'EP' | 'Split-EP' | 'Demo' | 'Live' | 'Single' | 'Compilation'

export interface AdminToken {
  id: string
  token: string
  note: string | null
  created_by_id: string
  redeemed_by_id: string | null
  created_at: string
  expires_at: string
}

export interface AdminTokenCreateResponse {
  id: string
  token: string
  note?: string | null
  expires_at: string
}

export interface AdminUser {
  id: string
  handle: string
  email: string
  role: 'user' | 'admin' | 'superadmin'
}

export interface AdminGenreRef {
  id: string
  name: string
  slug?: string
}

export interface AdminTagRef {
  id: string
  name: string
  slug?: string
  category?: string
}

export interface AdminTrack {
  id: string
  number: number
  title: string
  duration: string
  lyrics?: string | null
}

export interface AdminRelease {
  id: string
  band_id: string
  slug: string
  title: string
  type: ReleaseType
  year: number
  label?: string | null
  status: string
  tracks: AdminTrack[]
}

export interface AdminBand {
  id: string
  slug: string
  name: string
  country: string
  country_code: string
  formed: number
  bio?: string | null
  status: BandStatus
  image_url?: string | null
  logo_url?: string | null
  releases: AdminRelease[]
  genres: AdminGenreRef[]
  tags: AdminTagRef[]
  created_by_id?: string | null
  updated_by_id?: string | null
}

export interface AdminGenre {
  id: string
  slug: string
  name: string
  description?: string | null
  parent_id?: string | null
  children: AdminGenre[]
}

export interface AdminTag {
  id: string
  slug: string
  name: string
  category: string
}

export interface AdminBandCreate {
  slug: string
  name: string
  country: string
  country_code: string
  formed: number
  bio?: string
  genre_ids?: string[]
  tag_ids?: string[]
}

export interface AdminBandUpdate {
  name?: string
  country?: string
  country_code?: string
  formed?: number
  bio?: string
  status?: BandStatus
  genre_ids?: string[]
  tag_ids?: string[]
  image_url?: string
  logo_url?: string
}

export interface AdminReleaseCreate {
  slug: string
  title: string
  type: ReleaseType
  year: number
  label?: string
  tracks?: Array<{ number: number; title: string; duration: string; lyrics?: string }>
}

export interface AdminGenreCreate {
  slug: string
  name: string
  description?: string | null
  parent_id?: string | null
}

export interface AdminGenreUpdate {
  name?: string
  description?: string | null
  parent_id?: string | null
}

export interface AdminTagCreate {
  slug: string
  name: string
  category: string
}

export interface AdminTagUpdate {
  name?: string
  category?: string
}

export interface AdminMessageResponse {
  message: string
}

export interface ImageUploadResponse {
  image_url?: string
  logo_url?: string
  url?: string
}
