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

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

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
