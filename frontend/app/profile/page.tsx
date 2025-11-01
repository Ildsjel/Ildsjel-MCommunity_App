'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { userAPI } from '@/lib/api'

interface User {
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
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) {
          router.push('/auth/login')
          return
        }

        const userData = await userAPI.getMe()
        setUser(userData)
      } catch (err: any) {
        setError('Failed to load profile')
        if (err.response?.status === 401) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('user')
          router.push('/auth/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-stone-gray">Loading...</div>
      </main>
    )
  }

  if (error || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-blood-red">{error || 'User not found'}</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-ghost-white font-serif">
            My Profile
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-iron-gray hover:border-occult-crimson text-silver-text rounded transition-all"
          >
            Logout
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-deep-charcoal p-8 rounded-lg border border-iron-gray">
          <div className="flex items-start gap-6">
            {/* Avatar Placeholder */}
            <div className="w-24 h-24 bg-iron-gray rounded-full flex items-center justify-center text-4xl font-bold text-occult-crimson">
              {user.handle.charAt(0).toUpperCase()}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-ghost-white mb-2">
                {user.handle}
              </h2>
              <p className="text-stone-gray mb-4">{user.email}</p>

              {(user.city || user.country) && (
                <p className="text-silver-text mb-4">
                  📍 {user.city}{user.city && user.country && ', '}{user.country}
                </p>
              )}

              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-stone-gray">Member since:</span>{' '}
                  <span className="text-silver-text">
                    {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
                {user.is_pro && (
                  <div className="px-3 py-1 bg-shadow-gold bg-opacity-20 border border-shadow-gold rounded text-shadow-gold">
                    PRO
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Connected Accounts */}
          <div className="mt-8 pt-8 border-t border-iron-gray">
            <h3 className="text-lg font-bold text-ghost-white mb-4">
              Connected Music Accounts
            </h3>
            {user.source_accounts.length > 0 ? (
              <div className="flex gap-3">
                {user.source_accounts.map((source) => (
                  <div
                    key={source}
                    className="px-4 py-2 bg-whisper-green bg-opacity-20 border border-whisper-green rounded text-whisper-green capitalize"
                  >
                    {source}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-stone-gray">
                No music accounts connected yet.{' '}
                <span className="text-occult-crimson cursor-pointer hover:underline">
                  Connect Spotify
                </span>
              </div>
            )}
          </div>

          {/* Metal-ID Status */}
          {!user.onboarding_complete && (
            <div className="mt-8 p-4 bg-rust-orange bg-opacity-20 border border-rust-orange rounded">
              <p className="text-rust-orange font-semibold mb-2">
                ⚠️ Complete your Metal-ID
              </p>
              <p className="text-sm text-stone-gray">
                Connect your music accounts to generate your Metal-ID and start discovering compatible Metalheads.
              </p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <button className="p-4 bg-deep-charcoal border border-iron-gray hover:border-occult-crimson rounded transition-all text-left">
            <h4 className="font-bold text-occult-crimson mb-1">Connect Spotify</h4>
            <p className="text-sm text-stone-gray">Import your listening history</p>
          </button>

          <button className="p-4 bg-deep-charcoal border border-iron-gray hover:border-occult-crimson rounded transition-all text-left">
            <h4 className="font-bold text-occult-crimson mb-1">Find Matches</h4>
            <p className="text-sm text-stone-gray">Discover compatible Metalheads</p>
          </button>

          <button className="p-4 bg-deep-charcoal border border-iron-gray hover:border-occult-crimson rounded transition-all text-left">
            <h4 className="font-bold text-occult-crimson mb-1">Browse Events</h4>
            <p className="text-sm text-stone-gray">Find concerts near you</p>
          </button>
        </div>
      </div>
    </main>
  )
}

