import axios from 'axios'
import supabase from './supabase.js'

const env = window.__env__ || {}
const api = axios.create({
  baseURL: env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: add auth token
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const { data: { session } } = await supabase.auth.refreshSession()
      if (session) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`
        return api.request(error.config)
      }
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const crmAPI = {
  stats:              ()           => api.get('/api/crm/stats'),
  upcomingFollowups:  ()           => api.get('/api/crm/followups/upcoming'),
  listClients:        (params)     => api.get('/api/crm/clients', { params }),
  getClient:          (id)         => api.get(`/api/crm/clients/${id}`),
  createClient:       (data)       => api.post('/api/crm/clients', data),
  updateClient:       (id, data)   => api.put(`/api/crm/clients/${id}`, data),
  deleteClient:       (id)         => api.delete(`/api/crm/clients/${id}`),
  logActivity:        (id, data)   => api.post(`/api/crm/clients/${id}/activities`, data),
  createFollowup:     (id, data)   => api.post(`/api/crm/clients/${id}/followups`, data),
  updateFollowup:     (id, data)   => api.put(`/api/crm/followups/${id}`, data),
  deleteFollowup:     (id)         => api.delete(`/api/crm/followups/${id}`),
  sendEmail:          (id, data)   => api.post(`/api/crm/clients/${id}/emails`, data),
}

export default api
