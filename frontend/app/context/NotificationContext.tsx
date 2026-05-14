'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type SignalType =
  | 'match'           // P0, YOU — new mutual fit
  | 'message'         // P0, YOU — new message from someone
  | 'horns'           // P1, YOU — someone threw horns at your review
  | 'comment_photo'   // P1, YOU — comment on your gig photo
  | 'mention'         // P1, YOU — @mention or thread reply
  | 'profile_view'    // P3, YOU — stacked daily sigil views
  | 'album_drop'      // P1, ACTIVITY — new album from followed band
  | 'concert_nearby'  // P1, ACTIVITY — new concert near you
  | 'event_reminder'  // P0, ACTIVITY — 48h/3h event reminder
  | 'coven_join'      // P2, ACTIVITY — coven member joined
  | 'friend_going'    // P2, ACTIVITY — coven friend RSVPed to a gig
  | 'band_review'     // P2, ACTIVITY — review of band you follow
  | 'weekly_dispatch' // P2, ACTIVITY — Monday digest card

export type SignalChannel = 'you' | 'activity'

// Backward compat aliases
export type NotifType = SignalType
export type Notification = Signal

const TYPE_META: Record<SignalType, { channel: SignalChannel; priority: 0 | 1 | 2 | 3 }> = {
  match:           { channel: 'you',      priority: 0 },
  message:         { channel: 'you',      priority: 0 },
  horns:           { channel: 'you',      priority: 1 },
  comment_photo:   { channel: 'you',      priority: 1 },
  mention:         { channel: 'you',      priority: 1 },
  profile_view:    { channel: 'you',      priority: 3 },
  album_drop:      { channel: 'activity', priority: 1 },
  concert_nearby:  { channel: 'activity', priority: 1 },
  event_reminder:  { channel: 'activity', priority: 0 },
  coven_join:      { channel: 'activity', priority: 2 },
  friend_going:    { channel: 'activity', priority: 2 },
  band_review:     { channel: 'activity', priority: 2 },
  weekly_dispatch: { channel: 'activity', priority: 2 },
}

export interface Signal {
  id: string
  type: SignalType
  channel: SignalChannel
  priority: 0 | 1 | 2 | 3
  read: boolean
  createdAt: string // ISO string

  // Common person
  fromHandle?: string
  fromInitial?: string

  // match
  fromCity?: string
  fromDistanceKm?: number
  fromLevel?: number
  lastActiveAgo?: string
  compatibilityPct?: number

  // message
  snippet?: string
  unreadMsgCount?: number

  // horns / band_review
  albumTitle?: string
  artistName?: string
  weeklyHornsCount?: number
  reviewSnippet?: string
  starRating?: number
  reviewerCount?: number
  bands?: string[]

  // comment_photo
  commentSnippet?: string
  photoThumbUrl?: string

  // mention
  threadTitle?: string
  replyCount?: number

  // profile_view (stacked)
  viewCount?: number
  viewTimeRange?: string
  viewInitials?: string[]

  // album_drop
  bandName?: string
  albumName?: string
  albumYear?: string
  covenListeningCount?: number

  // concert_nearby
  eventName?: string
  eventDate?: string
  venueName?: string
  eventCity?: string
  distanceKm?: number
  priceFrom?: string

  // event_reminder
  doorsAt?: string
  covenGoingCount?: number

  // coven_join
  sharedPct?: number

  // friend_going (stacked)
  friendHandles?: string[]
  friendInitials?: string[]

  // weekly_dispatch
  weekNum?: number
  issueNum?: number
  covenReviewCount?: number
  newAlbumCount?: number
  nearbyGigCount?: number
}

// addNotification accepts a partial — channel/priority/createdAt are inferred
type SignalInput = Omit<Signal, 'id' | 'read' | 'channel' | 'priority' | 'createdAt'> & {
  channel?: SignalChannel
  priority?: 0 | 1 | 2 | 3
  createdAt?: string
}

interface NotifContextType {
  signals: Signal[]
  unreadCount: number
  youUnreadCount: number
  activityUnreadCount: number
  markRead: (id: string) => void
  markTabRead: (channel: SignalChannel) => void
  markAllRead: () => void
  addNotification: (n: SignalInput) => void
}

const NotifContext = createContext<NotifContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [signals, setSignals] = useState<Signal[]>([])

  const unreadCount         = signals.filter(s => !s.read).length
  const youUnreadCount      = signals.filter(s => !s.read && s.channel === 'you').length
  const activityUnreadCount = signals.filter(s => !s.read && s.channel === 'activity').length

  const markRead = useCallback((id: string) => {
    setSignals(prev => prev.map(s => s.id === id ? { ...s, read: true } : s))
  }, [])

  const markTabRead = useCallback((channel: SignalChannel) => {
    setSignals(prev => prev.map(s => s.channel === channel ? { ...s, read: true } : s))
  }, [])

  const markAllRead = useCallback(() => {
    setSignals(prev => prev.map(s => ({ ...s, read: true })))
  }, [])

  const addNotification = useCallback((n: SignalInput) => {
    const meta = TYPE_META[n.type]
    setSignals(prev => [{
      ...n,
      id: `s${Date.now()}`,
      read: false,
      channel: n.channel ?? meta.channel,
      priority: n.priority ?? meta.priority,
      createdAt: n.createdAt ?? new Date().toISOString(),
    } as Signal, ...prev])
  }, [])

  return (
    <NotifContext.Provider value={{
      signals, unreadCount, youUnreadCount, activityUnreadCount,
      markRead, markTabRead, markAllRead, addNotification,
    }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
