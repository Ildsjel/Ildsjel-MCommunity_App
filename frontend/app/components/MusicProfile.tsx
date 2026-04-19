'use client'

import { useState, useEffect, useCallback } from 'react'
import { Box } from '@mui/material'
import axios from 'axios'
import TopArtists from './TopArtists'
import TopAlbums from './TopAlbums'
import Favourites from './Favourites'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const TABS = ['TOP ARTISTS', 'TOP ALBUMS', 'FAVOURITES'] as const
type Tab = typeof TABS[number]

const TAB_KEYS: Record<Tab, string> = {
  'TOP ARTISTS': 'top_artists',
  'TOP ALBUMS': 'top_albums',
  'FAVOURITES': 'favourites',
}

interface Visibility {
  top_artists: boolean
  top_albums: boolean
  favourites: boolean
}

interface MusicProfileProps {
  userId?: string
  isOwnProfile: boolean
}

const mono: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
}

export default function MusicProfile({ userId, isOwnProfile }: MusicProfileProps) {
  const [activeTab, setActiveTab] = useState<Tab>('TOP ARTISTS')
  const [vis, setVis] = useState<Visibility>({ top_artists: true, top_albums: true, favourites: true })
  const [showVisSettings, setShowVisSettings] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchVis = useCallback(async () => {
    if (!isOwnProfile) return
    try {
      const token = localStorage.getItem('access_token')
      const res = await axios.get(`${API_BASE}/api/v1/favourites/visibility`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setVis(res.data)
    } catch { /* use defaults */ }
  }, [isOwnProfile])

  useEffect(() => { fetchVis() }, [fetchVis])

  const toggleVis = async (key: keyof Visibility) => {
    const next = { ...vis, [key]: !vis[key] }
    setVis(next)
    setSaving(true)
    try {
      const token = localStorage.getItem('access_token')
      await axios.patch(`${API_BASE}/api/v1/favourites/visibility`, next, {
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { setVis(vis) } finally { setSaving(false) }
  }

  const visibleTabs = TABS.filter(tab => isOwnProfile || vis[TAB_KEYS[tab] as keyof Visibility])

  // If active tab becomes hidden, switch to first visible
  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? 'TOP ARTISTS')

  return (
    <Box sx={{
      border: '1.5px solid rgba(216,207,184,0.15)',
      borderRadius: '3px',
      backgroundColor: '#120e18',
      p: '14px 16px',
    }}>
      {/* Tab bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, borderBottom: '1px solid rgba(216,207,184,0.1)', pb: 1.25 }}>
        <Box sx={{ display: 'flex', flex: 1, gap: 0.25 }}>
          {TABS.map((tab) => {
            const isVisible = visibleTabs.includes(tab)
            const isActive = tab === effectiveTab
            return (
              <Box
                key={tab}
                onClick={() => isVisible && setActiveTab(tab)}
                sx={{
                  cursor: isVisible ? 'pointer' : 'default',
                  px: 1, py: 0.5,
                  borderRadius: '3px',
                  backgroundColor: isActive ? 'rgba(216,207,184,0.07)' : 'transparent',
                  opacity: isVisible ? 1 : 0.35,
                  transition: 'background-color 0.12s, opacity 0.12s',
                }}
              >
                <span style={{
                  ...mono,
                  fontSize: '0.5rem',
                  letterSpacing: '0.12em',
                  color: isActive ? 'var(--ink, #ece5d3)' : 'var(--muted, #7A756D)',
                }}>
                  {tab}
                </span>
              </Box>
            )
          })}
        </Box>

        {isOwnProfile && (
          <Box
            onClick={() => setShowVisSettings(v => !v)}
            sx={{ cursor: 'pointer', pl: 1 }}
          >
            <span style={{ ...mono, fontSize: '0.45rem', color: showVisSettings ? 'var(--ink)' : 'var(--muted)', letterSpacing: '0.1em' }}>
              ⚙
            </span>
          </Box>
        )}
      </Box>

      {/* Visibility settings panel */}
      {isOwnProfile && showVisSettings && (
        <Box sx={{ mb: 2, border: '1px solid rgba(216,207,184,0.1)', borderRadius: '3px', p: '10px 12px', backgroundColor: '#0d0b12' }}>
          <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: 10 }}>
            Visitor visibility
          </span>
          {TABS.map((tab) => {
            const key = TAB_KEYS[tab] as keyof Visibility
            const on = vis[key]
            return (
              <Box
                key={tab}
                onClick={() => toggleVis(key)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  py: '5px', cursor: saving ? 'default' : 'pointer',
                }}
              >
                <Box sx={{
                  width: 22, height: 12, borderRadius: '6px', flexShrink: 0,
                  backgroundColor: on ? 'rgba(106,154,122,0.35)' : 'rgba(216,207,184,0.1)',
                  border: `1px solid ${on ? 'rgba(106,154,122,0.6)' : 'rgba(216,207,184,0.2)'}`,
                  position: 'relative', transition: 'all 0.15s',
                }}>
                  <Box sx={{
                    position: 'absolute', top: 1, left: on ? 'calc(100% - 11px)' : 1,
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: on ? '#6a9a7a' : 'rgba(216,207,184,0.3)',
                    transition: 'left 0.15s, background-color 0.15s',
                  }} />
                </Box>
                <span style={{ ...mono, fontSize: '0.4375rem', letterSpacing: '0.1em', color: on ? 'var(--ink)' : 'var(--muted)' }}>
                  {tab}
                </span>
              </Box>
            )
          })}
        </Box>
      )}

      {/* Tab content */}
      {effectiveTab === 'TOP ARTISTS' && <TopArtists userId={userId} isOwnProfile={isOwnProfile} />}
      {effectiveTab === 'TOP ALBUMS' && <TopAlbums />}
      {effectiveTab === 'FAVOURITES' && <Favourites isOwnProfile={isOwnProfile} />}
    </Box>
  )
}
