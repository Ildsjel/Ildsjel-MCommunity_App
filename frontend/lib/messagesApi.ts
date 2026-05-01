const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeaders() {
  const token = localStorage.getItem('access_token')
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export interface OtherUser {
  id: string
  handle: string
  profile_image_url?: string
  city?: string
  country?: string
}

export interface LastMessage {
  text: string
  sender_id: string
  created_at: string
}

export interface Conversation {
  id: string
  last_message_at: string
  other_user: OtherUser
  last_message?: LastMessage
  unread_count: number
}

export interface Message {
  id: string
  text: string
  sender_id: string
  created_at: string
}

export interface MessagesPage {
  messages: Message[]
  total: number
}

export const messagesApi = {
  startConversation: (friendId: string) =>
    req<{ id: string; created_at: string }>('POST', `/messages/conversations/start/${friendId}`),
  listConversations: () => req<Conversation[]>('GET', '/messages/conversations'),
  getConversation: (convId: string) =>
    req<{ id: string; created_at: string; other_user: OtherUser }>('GET', `/messages/conversations/${convId}`),
  getMessages: (convId: string, skip = 0, limit = 50) =>
    req<MessagesPage>('GET', `/messages/conversations/${convId}/messages?skip=${skip}&limit=${limit}`),
  sendMessage: (convId: string, text: string) =>
    req<Message>('POST', `/messages/conversations/${convId}/send`, { text }),
  markRead: (convId: string) =>
    req<void>('POST', `/messages/conversations/${convId}/read`),
}
