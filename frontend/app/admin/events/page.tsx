'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Typography, CircularProgress } from '@mui/material'
import { adminAPI } from '@/lib/adminAPI'
import AdminGuard from '@/app/components/AdminGuard'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.5rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
}

interface EventRow {
  id: string
  title: string
  date: string
  venue: string
  city: string
  country: string
  ticket_url?: string
  source?: string
  headliner_name?: string
}

interface SyncStats {
  bands_checked: number
  events_new: number
  events_updated: number
  errors: number
  skipped: number
}

export default function AdminEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<EventRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncStats | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const load = useCallback(async (q = '') => {
    setLoading(true)
    try {
      const data = await adminAPI.listAdminEvents({ q: q || undefined, limit: 100 })
      setEvents(data.events)
      setTotal(data.total)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search, load])

  // Poll sync status while a sync is running
  const startPolling = useCallback((q: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const status = await adminAPI.getSyncStatus()
        if (!status.running) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setSyncing(false)
          if (status.last_error) {
            setSyncError(status.last_error)
          } else if (status.last_result) {
            setSyncResult(status.last_result)
            load(q)
          }
        }
      } catch { /* ignore polling errors */ }
    }, 3000)
  }, [load])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      await adminAPI.syncEvents()  // returns 202 immediately
      startPolling(search)
    } catch (e: unknown) {
      setSyncing(false)
      setSyncError(e instanceof Error ? e.message : 'Sync failed')
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete event "${title}"?`)) return
    setDeleting(id)
    try {
      await adminAPI.deleteAdminEvent(id)
      setEvents(prev => prev.filter(e => e.id !== id))
      setTotal(prev => prev - 1)
    } catch { /* silent */ } finally {
      setDeleting(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: '#0a0810', border: '1px solid rgba(216,207,184,0.15)',
    borderRadius: '3px', color: 'var(--ink)', fontFamily: 'var(--font-mono)',
    fontSize: '0.5rem', padding: '5px 9px', outline: 'none', width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <AdminGuard>
      <Box sx={{ maxWidth: 800, mx: 'auto', px: 2, pt: 2, pb: 10 }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Box
              component="button"
              onClick={() => router.push('/admin')}
              sx={{ border: 'none', background: 'none', cursor: 'pointer', ...lbl, mb: 0.5, display: 'block' }}
            >
              ← ADMIN
            </Box>
            <Typography sx={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '1rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Events
            </Typography>
          </Box>
          <Typography sx={{ ...lbl, fontSize: '0.4375rem' }}>{total} total</Typography>
        </Box>

        {/* Sync panel */}
        <Box sx={{
          border: '1px solid rgba(216,207,184,0.15)', borderRadius: '4px',
          backgroundColor: '#0d0b14', p: '14px 16px', mb: 2,
        }}>
          <span style={{ ...lbl, color: 'var(--ink)', fontSize: '0.5rem', display: 'block', marginBottom: 6 }}>
            ⟳ TICKETMASTER SYNC
          </span>
          <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--muted)', mb: 1.5 }}>
            Pulls upcoming events for every active band from the Ticketmaster Discovery API (free, 5 000 calls/day).
            Requires <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--ink)' }}>TICKETMASTER_API_KEY</code> in{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--ink)' }}>.env</code>.{' '}
            Get one free at{' '}
            <a
              href="https://developer.ticketmaster.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.5rem' }}
            >
              developer.ticketmaster.com
            </a>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Box
              component="button"
              onClick={handleSync}
              disabled={syncing}
              sx={{
                border: '1px solid rgba(216,207,184,0.3)', borderRadius: '3px',
                px: 1.5, height: 30, background: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-mono)', fontSize: '0.4375rem',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: syncing ? 'var(--muted)' : 'var(--ink)',
                display: 'flex', alignItems: 'center', gap: 0.75,
                '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
              }}
            >
              {syncing && <CircularProgress size={10} sx={{ color: 'var(--muted)' }} />}
              {syncing ? 'RUNNING…' : '⟳ RUN SYNC'}
            </Box>
            <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'rgba(216,207,184,0.3)', letterSpacing: '0.08em' }}>
              {syncing ? 'running in background · checking every 3s…' : 'next 180 days · all published bands'}
            </Typography>
          </Box>

          {/* Sync result */}
          {syncResult && (
            <Box sx={{
              mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap',
              borderTop: '1px solid rgba(216,207,184,0.08)', pt: 1.5,
            }}>
              {[
                { label: 'bands checked', value: syncResult.bands_checked },
                { label: 'new events', value: syncResult.events_new, color: '#4caf7d' },
                { label: 'updated', value: syncResult.events_updated },
                { label: 'errors', value: syncResult.errors, color: syncResult.errors > 0 ? 'var(--accent)' : undefined },
                { label: 'skipped', value: syncResult.skipped },
              ].map(({ label, value, color }) => (
                <Box key={label} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: color ?? 'var(--ink)', lineHeight: 1 }}>
                    {value}
                  </Typography>
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.3125rem', letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase' }}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {syncError && (
            <Box sx={{ mt: 1.25, p: '8px 12px', border: '1px solid rgba(196,58,42,0.3)', borderRadius: '3px', backgroundColor: 'rgba(196,58,42,0.07)' }}>
              <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--accent)', letterSpacing: '0.08em' }}>
                ⚠ {syncError}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Search */}
        <Box sx={{ mb: 1.5 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="search by title or city…"
            style={inputStyle}
          />
        </Box>

        {/* Events list */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
          </Box>
        ) : events.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--muted)' }}>
              No events yet — run a sync or add them via the API.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {events.map(ev => {
              const isPast = ev.date < new Date().toISOString().slice(0, 10)
              return (
                <Box
                  key={ev.id}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 1.25, py: 0.875,
                    border: '1px solid rgba(216,207,184,0.1)', borderRadius: '3px',
                    backgroundColor: '#0d0b14',
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  {/* Date */}
                  <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', color: 'var(--muted)', flexShrink: 0, width: 70 }}>
                    {ev.date}
                  </Typography>

                  {/* Title + venue */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontFamily: '"Archivo Black", sans-serif', fontSize: '0.75rem', letterSpacing: '0.02em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.headliner_name ?? ev.title}
                    </Typography>
                    <Typography sx={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.venue} · {ev.city}
                    </Typography>
                  </Box>

                  {/* Source badge */}
                  {ev.source && (
                    <Typography sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.3125rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(216,207,184,0.3)', flexShrink: 0 }}>
                      {ev.source}
                    </Typography>
                  )}

                  {/* Ticket link */}
                  {ev.ticket_url && (
                    <Box
                      component="a"
                      href={ev.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--accent)', flexShrink: 0, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      ↗
                    </Box>
                  )}

                  {/* Delete */}
                  <Box
                    component="button"
                    onClick={() => handleDelete(ev.id, ev.headliner_name ?? ev.title)}
                    disabled={deleting === ev.id}
                    sx={{
                      border: '1px solid rgba(196,58,42,0.2)', borderRadius: '2px',
                      px: 0.5, height: 18, background: 'none', cursor: 'pointer',
                      fontFamily: 'var(--font-mono)', fontSize: '0.375rem', color: 'var(--accent)',
                      flexShrink: 0,
                      '&:hover': { borderColor: 'var(--accent)' },
                      '&:disabled': { opacity: 0.4 },
                    }}
                  >
                    {deleting === ev.id ? '…' : '✕'}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </Box>
    </AdminGuard>
  )
}
