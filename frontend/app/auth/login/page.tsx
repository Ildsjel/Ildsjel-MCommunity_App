'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authAPI } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(formData)
      
      // Store token
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Redirect to profile
      router.push('/profile')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-ghost-white mb-2 font-serif">
            Welcome Back
          </h1>
          <p className="text-stone-gray">
            Login to your Grimr account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-deep-charcoal p-8 rounded-lg border border-iron-gray">
          {error && (
            <div className="mb-4 p-3 bg-blood-red bg-opacity-20 border border-blood-red rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 bg-grim-black border border-iron-gray rounded focus:border-occult-crimson focus:outline-none text-silver-text"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 bg-grim-black border border-iron-gray rounded focus:border-occult-crimson focus:outline-none text-silver-text"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 px-6 py-3 bg-occult-crimson hover:bg-opacity-80 disabled:bg-opacity-50 text-ghost-white font-semibold rounded transition-all"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="text-center text-sm text-stone-gray mt-4">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-occult-crimson hover:underline">
              Sign Up
            </Link>
          </p>
        </form>

        <Link href="/" className="block text-center text-sm text-stone-gray mt-6 hover:text-silver-text">
          ← Back to Home
        </Link>
      </div>
    </main>
  )
}

