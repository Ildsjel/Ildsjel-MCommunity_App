import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Auth API
export const authAPI = {
  register: async (data: {
    handle: string
    email: string
    password: string
    country?: string
    city?: string
  }) => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/auth/login', data)
    return response.data
  },
}

// User API
export const userAPI = {
  getMe: async () => {
    const response = await api.get('/users/me')
    return response.data
  },

  getUser: async (userId: string) => {
    const response = await api.get(`/users/${userId}`)
    return response.data
  },
}

