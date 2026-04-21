import { api } from './api'

export interface TimelineTrack {
  id: string
  name: string
  uri: string
  duration_ms: number
  progress_ms: number
}

export interface TimelineItem {
  play_id: string
  played_at: string
  track: TimelineTrack
  artist: { id: string; name: string }
  album?: { id: string; name: string; image_url?: string }
}

export interface TimelineResponse {
  timeline: TimelineItem[]
}

export interface UpdateMePayload {
  handle?: string
  about_me?: string
  country?: string
  city?: string
  discoverable_by_name?: boolean
  discoverable_by_music?: boolean
  city_visible?: string
}

export const profileAPI = {
  getTimeline: async (limit = 20): Promise<TimelineResponse> => {
    const res = await api.get<TimelineResponse>(`/spotify/timeline?limit=${limit}`)
    return res.data
  },

  getUserTimeline: async (userId: string, limit = 6): Promise<TimelineResponse> => {
    const res = await api.get<TimelineResponse>(`/spotify/timeline/${userId}?limit=${limit}`)
    return res.data
  },

  disconnectSpotify: async (): Promise<void> => {
    await api.post('/spotify/disconnect')
  },

  updateMe: async (payload: UpdateMePayload) => {
    const res = await api.patch('/users/me', payload)
    return res.data
  },

  getSpotifyStatus: async () => {
    const res = await api.get('/spotify/status')
    return res.data
  },

  getSpotifyAuthUrl: async () => {
    const res = await api.get<{ auth_url: string }>('/spotify/auth/url')
    return res.data
  },

  getLastfmStatus: async () => {
    const res = await api.get('/lastfm/status')
    return res.data
  },

  getLastfmAuthUrl: async () => {
    const res = await api.get<{ auth_url: string }>('/lastfm/auth/url')
    return res.data
  },

  disconnectLastfm: async () => {
    await api.post('/lastfm/disconnect')
  },

  getSigil: async (): Promise<{ genres: string[]; artists: string[] }> => {
    const res = await api.get<{ genres: string[]; artists: string[] }>('/sigil')
    return res.data
  },

  getRandomFits: async (limit = 2): Promise<FitUser[]> => {
    const res = await api.get<{ hits?: FitUser[] }>(`/search/random?limit=${limit}`)
    return res.data.hits ?? []
  },
}

export interface FitUser {
  user_id: string
  handle: string
  compatibility_score: number
  profile_image_url?: string
}
