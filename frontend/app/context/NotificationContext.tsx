'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type NotifType = 'fit_match' | 'fit_received' | 'comment' | 'horns'

export interface Notification {
  id: string
  type: NotifType
  fromHandle: string
  fromInitial: string
  timestamp: string  // relative label
  read: boolean
}

interface NotifContextType {
  notifications: Notification[]
  unreadCount: number
  markRead: (id: string) => void
  markAllRead: () => void
  addNotification: (n: Omit<Notification, 'id' | 'read'>) => void
}

const NotifContext = createContext<NotifContextType | undefined>(undefined)

const SEED: Notification[] = [
  { id: 'n1', type: 'fit_received', fromHandle: 'MORDGRIMM',     fromInitial: 'M', timestamp: '12m', read: false },
  { id: 'n2', type: 'fit_match',    fromHandle: 'VOIDWALKER',    fromInitial: 'V', timestamp: '1h',  read: false },
  { id: 'n3', type: 'horns',        fromHandle: 'ASHES_42',      fromInitial: 'A', timestamp: '3h',  read: true  },
  { id: 'n4', type: 'fit_received', fromHandle: 'SKALD_EIRIK',   fromInitial: 'S', timestamp: '5h',  read: true  },
  { id: 'n5', type: 'comment',      fromHandle: 'MGLA_PURIST',   fromInitial: 'M', timestamp: '1d',  read: true  },
]

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(SEED)

  const unreadCount = notifications.filter((n) => !n.read).length

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const addNotification = useCallback((n: Omit<Notification, 'id' | 'read'>) => {
    setNotifications((prev) => [{ ...n, id: `n${Date.now()}`, read: false }, ...prev])
  }, [])

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, addNotification }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
