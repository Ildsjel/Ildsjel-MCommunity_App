import { api } from './api'

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
