'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export default function SpotifyConnectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<any>(null)

  // Handle OAuth callback
  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    if (code && state) {
      handleCallback(code, state)
    } else {
      checkStatus()
    }
  }, [searchParams])

  const checkStatus = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await axios.get(`${API_BASE}/api/v1/spotify/status`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      setStatus(response.data)
    } catch (err: any) {
      console.error('Failed to check status:', err)
    }
  }

  const handleCallback = async (code: string, state: string) => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      await axios.post(
        `${API_BASE}/api/v1/spotify/auth/callback`,
        { code, state },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert('Spotify erfolgreich verbunden! 🎵')
      router.push('/profile')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verbindung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      const response = await axios.get(`${API_BASE}/api/v1/spotify/auth/url`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      // Redirect to Spotify authorization
      window.location.href = response.data.auth_url
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Fehler beim Verbinden')
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    // DSGVO-konforme Lösch-Bestätigung
    const confirmMessage = `⚠️ Spotify-Verbindung trennen?\n\nFolgende Daten werden innerhalb von 24h gelöscht:\n• Alle Spotify-Scrobbles (${status?.total_plays || 0})\n• Top Artists & Genres\n• Hörstatistiken\n\nDeine Metal-ID wird neu berechnet.\n\nDiese Aktion kann nicht rückgängig gemacht werden.`
    
    if (!confirm(confirmMessage)) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await axios.post(
        `${API_BASE}/api/v1/spotify/disconnect`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert(`✅ ${response.data.message}\n\nGelöscht: ${response.data.deleted_immediately.join(', ')}\nGeplant: ${response.data.scheduled_for_deletion.join(', ')}`)
      setStatus({ ...status, is_connected: false })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Fehler beim Trennen')
    }
  }

  const handleBackfill = async () => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(
        `${API_BASE}/api/v1/spotify/sync/backfill`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      alert('Synchronisierung gestartet! Dies kann einige Minuten dauern.')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Fehler beim Synchronisieren')
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-occult-crimson"></div>
        <p className="mt-4 text-stone-gray">Verbinde mit Spotify...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-ghost-white mb-2 font-serif">
            Spotify Verbinden
          </h1>
          <p className="text-stone-gray">
            Verbinde deinen Spotify Account für automatisches Scrobbling
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-blood-red bg-opacity-20 border border-blood-red rounded">
            {error}
          </div>
        )}

        {/* Status Card */}
        <div className="bg-deep-charcoal p-8 rounded-lg border border-iron-gray">
          {status?.is_connected ? (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <span className="text-whisper-green text-2xl mr-3">●</span>
                  <div>
                    <h2 className="text-xl font-bold text-ghost-white">Verbunden</h2>
                    <p className="text-sm text-stone-gray">Spotify ist aktiv</p>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 border border-blood-red text-blood-red hover:bg-blood-red hover:text-ghost-white rounded transition-all"
                >
                  Trennen
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-grim-black rounded">
                  <p className="text-sm text-stone-gray mb-1">Scrobbles</p>
                  <p className="text-2xl font-bold text-occult-crimson">
                    {status.total_plays || 0}
                  </p>
                </div>
                <div className="p-4 bg-grim-black rounded">
                  <p className="text-sm text-stone-gray mb-1">Status</p>
                  <p className="text-sm text-whisper-green">Aktiv</p>
                </div>
              </div>

              <button
                onClick={handleBackfill}
                className="w-full px-6 py-3 bg-occult-crimson hover:bg-opacity-80 text-ghost-white font-semibold rounded transition-all"
              >
                Jetzt synchronisieren
              </button>

              <p className="text-xs text-stone-gray mt-4 text-center">
                Automatische Synchronisierung läuft im Hintergrund
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                <span className="text-6xl">🎵</span>
              </div>
              <h2 className="text-xl font-bold text-ghost-white mb-2">
                Noch nicht verbunden
              </h2>
              <p className="text-stone-gray mb-6">
                Verbinde deinen Spotify Account, um deine Hörgewohnheiten zu tracken
                und deine Metal-ID zu generieren.
              </p>

              <div className="bg-grim-black p-4 rounded mb-6 text-left">
                <h3 className="text-sm font-bold text-occult-crimson mb-2">
                  🎵 Was wird getrackt?
                </h3>
                <ul className="text-sm text-stone-gray space-y-1 mb-3">
                  <li>• Aktuell abgespielte Songs</li>
                  <li>• Kürzlich gehörte Tracks</li>
                  <li>• Top Artists & Genres</li>
                  <li>• Hörstatistiken</li>
                </ul>
                
                <h3 className="text-sm font-bold text-whisper-green mb-2">
                  ✓ Deine Daten werden verwendet für:
                </h3>
                <ul className="text-sm text-stone-gray space-y-1 mb-3">
                  <li>• Generierung deiner Metal-ID</li>
                  <li>• Matching mit anderen Metalheads</li>
                  <li>• Hörstatistiken & Empfehlungen</li>
                </ul>
                
                <h3 className="text-sm font-bold text-blood-red mb-2">
                  ✗ Deine Daten werden NICHT:
                </h3>
                <ul className="text-sm text-stone-gray space-y-1">
                  <li>• An Dritte verkauft oder weitergegeben</li>
                  <li>• Für Werbung verwendet</li>
                  <li>• Für KI-Training genutzt</li>
                </ul>
                
                <p className="text-xs text-stone-gray mt-3 italic">
                  Du kannst die Verbindung jederzeit trennen. Alle Daten werden dann innerhalb von 24h gelöscht (DSGVO Art. 17).
                </p>
              </div>

              <button
                onClick={handleConnect}
                className="w-full px-6 py-3 bg-occult-crimson hover:bg-opacity-80 text-ghost-white font-semibold rounded transition-all"
              >
                Mit Spotify verbinden
              </button>
            </div>
          )}
        </div>

        <Link
          href="/profile"
          className="block text-center text-sm text-stone-gray mt-6 hover:text-silver-text"
        >
          ← Zurück zum Profil
        </Link>
      </div>
    </main>
  )
}

