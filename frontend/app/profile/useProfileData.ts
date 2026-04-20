'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { userAPI } from '@/lib/api'
import { profileAPI, type FitUser, type TimelineItem } from '@/lib/profileAPI'

export interface ProfileUser {
  id: string
  handle: string
  email: string
  country?: string
  city?: string
  created_at: string
  source_accounts: string[]
  is_pro: boolean
  onboarding_complete: boolean
  profile_image_url?: string
  about_me?: string
  discoverable_by_name: boolean
  discoverable_by_music: boolean
  city_visible: string
}

export interface SigilData {
  genres: string[]
  artists: string[]
}

export interface UseProfileDataResult {
  user: ProfileUser | null
  setUser: React.Dispatch<React.SetStateAction<ProfileUser | null>>
  timeline: TimelineItem[]
  timelineLoading: boolean
  loading: boolean
  error: string
  lastFmConnected: boolean
  sigilData: SigilData
  fits: FitUser[]
  refetchTimeline: () => Promise<void>
}

export function useProfileData(
  onUserLoaded?: (user: ProfileUser) => void,
): UseProfileDataResult {
  const router = useRouter()
  const [user, setUser] = useState<ProfileUser | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastFmConnected, setLastFmConnected] = useState(false)
  const [sigilData, setSigilData] = useState<SigilData>({ genres: [], artists: [] })
  const [fits, setFits] = useState<FitUser[]>([])

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true)
    try {
      const res = await profileAPI.getTimeline(20)
      setTimeline(res.timeline)
    } catch {
      /* silent — timeline is a best-effort enhancement */
    } finally {
      setTimelineLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }
        const [userData, lfmStatus, sigilRes, fitsRes] = await Promise.all([
          userAPI.getMe(),
          profileAPI.getLastfmStatus().catch(() => ({ is_connected: false })),
          profileAPI.getSigil().catch(() => ({ genres: [], artists: [] })),
          profileAPI.getRandomFits(2).catch(() => []),
        ])
        if (cancelled) return
        setUser(userData)
        onUserLoaded?.(userData)
        setLastFmConnected(Boolean(lfmStatus.is_connected))
        setSigilData(sigilRes)
        setFits(fitsRes)
        if (userData.source_accounts.includes('spotify')) {
          fetchTimeline()
        }
      } catch (err: unknown) {
        if (cancelled) return
        setError('Failed to load profile')
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          router.push('/auth/login')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  return {
    user,
    setUser,
    timeline,
    timelineLoading,
    loading,
    error,
    lastFmConnected,
    sigilData,
    fits,
    refetchTimeline: fetchTimeline,
  }
}
