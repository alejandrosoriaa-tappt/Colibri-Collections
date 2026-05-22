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
      // Attempt token refresh
      const { data: { session } } = await supabase.auth.refreshSession()
      if (session) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`
        return api.request(error.config)
      }
      // If refresh fails, sign out
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ================================================================
// AUTH
// ================================================================
export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  logout: () => api.post('/api/auth/logout'),
  me: () => api.get('/api/auth/me')
}

// ================================================================
// CAMPAIGNS
// ================================================================
export const campaignsAPI = {
  list: () => api.get('/api/campaigns'),
  get: (id) => api.get(`/api/campaigns/${id}`),
  create: (data) => api.post('/api/campaigns', data),
  update: (id, data) => api.patch(`/api/campaigns/${id}`, data),
  delete: (id) => api.delete(`/api/campaigns/${id}`),
  activate: (id) => api.post(`/api/campaigns/${id}/activate`),
  pause: (id) => api.post(`/api/campaigns/${id}/pause`),
  getMessages: (id) => api.get(`/api/campaigns/${id}/messages`),
  updateMessage: (campaignId, msgId, data) =>
    api.patch(`/api/campaigns/${campaignId}/messages/${msgId}`, data),
  getInvoices: (id, params) => api.get(`/api/campaigns/${id}/invoices`, { params })
}

// ================================================================
// CONTACTS
// ================================================================
export const contactsAPI = {
  list: (params) => api.get('/api/contacts', { params }),
  get: (id) => api.get(`/api/contacts/${id}`),
  update: (id, data) => api.patch(`/api/contacts/${id}`, data)
}

// ================================================================
// INVOICES
// ================================================================
export const invoicesAPI = {
  markPaid: (id, data) => api.patch(`/api/invoices/${id}/mark-paid`, data),
  addNotes: (id, data) => api.patch(`/api/invoices/${id}/notes`, data),
  suspend: (id) => api.patch(`/api/invoices/${id}/suspend`)
}

// ================================================================
// UPLOAD
// ================================================================
export const uploadAPI = {
  upload: (formData) =>
    api.post('/api/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    }),
  getStatus: (id) => api.get(`/api/upload/${id}`),
  downloadLayout: () =>
    api.get('/api/upload/layout', { responseType: 'blob' })
}

// ================================================================
// MESSAGES
// ================================================================
export const messagesAPI = {
  list: (params) => api.get('/api/messages', { params })
}

// ================================================================
// NOTIFICATIONS
// ================================================================
export const notificationsAPI = {
  list: (params) => api.get('/api/notifications', { params }),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/mark-all-read')
}

// ================================================================
// ADMIN
// ================================================================
export const adminAPI = {
  getStats: () => api.get('/api/admin/stats'),
  listTenants: () => api.get('/api/admin/tenants'),
  getTenant: (id) => api.get(`/api/admin/tenants/${id}`),
  createTenant: (data) => api.post('/api/admin/tenants', data),
  updateTenant: (id, data) => api.patch(`/api/admin/tenants/${id}`, data),
  sendMessage: (id, message) => api.post(`/api/admin/tenants/${id}/send-message`, { message }),
  listMessages: (params) => api.get('/api/admin/messages', { params }),
  addUserToTenant: (tenantId, data) => api.post(`/api/admin/tenants/${tenantId}/add-user`, data)
}

export default api
