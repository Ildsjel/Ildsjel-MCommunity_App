'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface User {
  id: string
  handle: string
  username?: string
  email: string
  profile_image_url?: string
  avatar_url?: string
  country?: string
  city?: string
  is_pro: boolean
  role?: 'user' | 'admin' | 'superadmin'
  created_at?: string
  source_accounts?: string[]
  about_me?: string
  onboarding_complete?: boolean
}

interface UserContextType {
  user: User | null
  setUser: (user: User | null) => void
  updateAvatar: (avatarUrl: string) => void
  isLoading: boolean
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    const token = localStorage.getItem('access_token')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('user')
      }
    } else {
      // Clear stale auth state if either half is missing
      localStorage.removeItem('user')
      localStorage.removeItem('access_token')
    }
    setIsLoading(false)
  }, [])

  const updateUser = (newUser: User | null) => {
    setUser(newUser)
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser))
    } else {
      localStorage.removeItem('user')
    }
  }

  const updateAvatar = (avatarUrl: string) => {
    if (user) {
      // If avatarUrl is empty string, set to undefined to show initials
      const updatedUser = { 
        ...user, 
        profile_image_url: avatarUrl || undefined, 
        avatar_url: avatarUrl || undefined 
      }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser: updateUser, updateAvatar, isLoading }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

