'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Box, Avatar, CircularProgress } from '@mui/material'
import Navigation from '@/app/components/Navigation'
import { messagesApi, Message, OtherUser } from '@/lib/messagesApi'
import { useUser } from '@/app/context/UserContext'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const lbl: React.CSSProperties = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: '0.5625rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--muted, #7A756D)',
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateDivider(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  if (d >= todayStart) return 'Today'
  if (d >= yesterdayStart) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function ConversationPage() {
  const router = useRouter()
  const params = useParams()
  const convId = params.conversationId as string
  const { user } = useUser()

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const PAGE = 50

  const loadConversation = useCallback(async () => {
    setLoading(true)
    try {
      const [conv, page] = await Promise.all([
        messagesApi.getConversation(convId),
        messagesApi.getMessages(convId, 0, PAGE),
      ])
      setOtherUser(conv.other_user)
      // Messages come newest-first; reverse to display oldest-first
      setMessages([...page.messages].reverse())
      setTotal(page.total)
      await messagesApi.markRead(convId).catch(() => {})
    } catch {
      router.push('/messages')
    } finally {
      setLoading(false)
    }
  }, [convId, router])

  useEffect(() => { loadConversation() }, [loadConversation])

  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'instant' })
  }, [loading])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const loadOlder = async () => {
    setLoadingMore(true)
    try {
      const page = await messagesApi.getMessages(convId, messages.length, PAGE)
      setMessages((prev) => [...[...page.messages].reverse(), ...prev])
      setTotal(page.total)
    } catch { /* silent */ } finally {
      setLoadingMore(false)
    }
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || sending) return
    setSending(true)
    setDraft('')
    try {
      const msg = await messagesApi.sendMessage(convId, text)
      setMessages((prev) => [...prev, msg])
      setTotal((t) => t + 1)
    } catch {
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <Navigation />
      <Box sx={{ maxWidth: 480, mx: 'auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', pb: 'env(safe-area-inset-bottom)' }}>

        {/* Header */}
        <Box sx={{ px: 2, pt: 2, pb: 1.5, borderBottom: '1.5px solid rgba(216,207,184,0.15)', flexShrink: 0 }}>
          <Box component="button" onClick={() => router.push('/messages')} sx={{ background: 'none', border: 'none', cursor: 'pointer', p: 0, mb: 0.5, fontFamily: 'var(--font-mono)', fontSize: '0.5rem', letterSpacing: '0.12em', color: 'var(--muted)', '&:hover': { color: 'var(--ink)' } }}>
            ← CORRESPONDENCES
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            {otherUser && (
              <>
                <Avatar
                  src={otherUser.profile_image_url ? `${API_BASE}${otherUser.profile_image_url}` : undefined}
                  sx={{ width: 32, height: 32, flexShrink: 0, bgcolor: 'var(--ink)', fontSize: 13, cursor: 'pointer' }}
                  onClick={() => router.push(`/profile/${otherUser.id}`)}
                >
                  {otherUser.handle.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Box sx={{ fontFamily: 'var(--font-medieval, "UnifrakturCook", serif)', fontSize: '1.1rem', color: 'var(--ink)', lineHeight: 1.1, cursor: 'pointer' }} onClick={() => router.push(`/profile/${otherUser.id}`)}>
                    {otherUser.handle}
                  </Box>
                  {otherUser.city && (
                    <Box sx={{ fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.08em', color: 'var(--muted)' }}>
                      {otherUser.city}{otherUser.country ? `, ${otherUser.country}` : ''}
                    </Box>
                  )}
                </Box>
              </>
            )}
            {!otherUser && !loading && <span style={{ ...lbl }}>The Exchange</span>}
          </Box>
        </Box>

        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
          {loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={20} sx={{ color: 'var(--accent)' }} />
            </Box>
          )}

          {!loading && messages.length < total && (
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Box component="button" onClick={loadOlder} disabled={loadingMore} sx={{ background: 'none', border: '1px solid rgba(216,207,184,0.2)', borderRadius: '2px', px: 1.5, py: 0.5, cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4375rem', letterSpacing: '0.1em', color: 'var(--muted)', '&:hover': { borderColor: 'rgba(216,207,184,0.4)' } }}>
                {loadingMore ? '…' : '↑ LOAD OLDER'}
              </Box>
            </Box>
          )}

          {!loading && messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <span style={{ ...lbl, color: 'var(--muted)' }}>No rites yet — send the first.</span>
            </Box>
          )}

          {!loading && messages.map((msg, i) => {
            const isMe = msg.sender_id === user?.id
            const prevMsg = messages[i - 1]
            const showDivider = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at)

            return (
              <Box key={msg.id}>
                {showDivider && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1.5 }}>
                    <Box sx={{ flex: 1, height: '1px', borderTop: '1px dashed rgba(216,207,184,0.15)' }} />
                    <span style={{ ...lbl, fontSize: '0.4375rem', color: 'rgba(216,207,184,0.3)', flexShrink: 0 }}>
                      {formatDateDivider(msg.created_at)}
                    </span>
                    <Box sx={{ flex: 1, height: '1px', borderTop: '1px dashed rgba(216,207,184,0.15)' }} />
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', mb: 0.75 }}>
                  {isMe ? (
                    <Box sx={{ maxWidth: '75%' }}>
                      <Box sx={{
                        backgroundColor: 'rgba(196,58,42,0.18)',
                        border: '1px solid rgba(196,58,42,0.3)',
                        borderRadius: '6px 6px 2px 6px',
                        px: 1.5,
                        py: 1,
                      }}>
                        <Box sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontSize: '0.875rem', color: 'var(--ink)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.text}
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right', mt: 0.25 }}>
                        <span style={{ ...lbl, fontSize: '0.4rem', color: 'rgba(216,207,184,0.3)' }}>{formatTime(msg.created_at)}</span>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ maxWidth: '75%' }}>
                      <Box sx={{
                        backgroundColor: 'rgba(216,207,184,0.06)',
                        border: '1px solid rgba(216,207,184,0.15)',
                        borderRadius: '6px 6px 6px 2px',
                        px: 1.5,
                        py: 1,
                      }}>
                        <Box sx={{ fontFamily: 'var(--font-serif, Georgia, serif)', fontStyle: 'italic', fontSize: '0.875rem', color: 'rgba(236,229,211,0.9)', lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.text}
                        </Box>
                      </Box>
                      <Box sx={{ mt: 0.25 }}>
                        <span style={{ ...lbl, fontSize: '0.4rem', color: 'rgba(216,207,184,0.3)' }}>{formatTime(msg.created_at)}</span>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            )
          })}
          <div ref={bottomRef} />
        </Box>

        {/* Input */}
        <Box sx={{ px: 2, py: 1.25, borderTop: '1.5px solid rgba(216,207,184,0.15)', flexShrink: 0, backgroundColor: '#0d0b12', display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <Box
            component="textarea"
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your rite…"
            rows={1}
            sx={{
              flex: 1,
              background: 'rgba(216,207,184,0.05)',
              border: '1.5px solid rgba(216,207,184,0.2)',
              borderRadius: '3px',
              px: 1.25,
              py: 0.875,
              fontFamily: 'var(--font-serif, Georgia, serif)',
              fontSize: '0.875rem',
              color: 'var(--ink)',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              maxHeight: '120px',
              overflowY: 'auto',
              '&::placeholder': { color: 'var(--muted)', fontStyle: 'italic' },
              '&:focus': { borderColor: 'rgba(216,207,184,0.4)' },
            }}
          />
          <Box
            component="button"
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            sx={{
              border: '1.5px solid rgba(196,58,42,0.5)',
              borderRadius: '3px',
              px: 1.25,
              height: 36,
              background: 'none',
              cursor: draft.trim() && !sending ? 'pointer' : 'default',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.4375rem',
              letterSpacing: '0.1em',
              color: draft.trim() && !sending ? 'var(--accent)' : 'rgba(196,58,42,0.3)',
              flexShrink: 0,
              transition: 'border-color 0.12s, color 0.12s',
              '&:hover:not(:disabled)': { borderColor: 'var(--accent)' },
            }}
          >
            {sending ? '…' : 'SEND →'}
          </Box>
        </Box>
      </Box>
    </>
  )
}
