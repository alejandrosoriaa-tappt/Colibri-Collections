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
// ACTIVACIÓN (público: quien la usa todavía no tiene cuenta)
// ================================================================
export const activacionAPI = {
  verificar: (token) => api.get(`/api/activacion/${encodeURIComponent(token)}`),
  activar: (data) => api.post('/api/activacion', data)
}

// ================================================================
// CONTACTS
// ================================================================
export const contactsAPI = {
  list: (params) => api.get('/api/contacts', { params }),
  groups: () => api.get('/api/contacts/groups'),
  catalog: () => api.get('/api/contacts/catalog'),
  get: (id) => api.get(`/api/contacts/${id}`),
  create: (data) => api.post('/api/contacts', data),
  update: (id, data) => api.patch(`/api/contacts/${id}`, data),
  deactivate: (id) => api.patch(`/api/contacts/${id}/deactivate`),
  reactivate: (id) => api.patch(`/api/contacts/${id}/reactivate`),
  bulkDeactivate: (ids) => api.post('/api/contacts/bulk-deactivate', { ids }),
  bulkReactivate: (ids) => api.post('/api/contacts/bulk-reactivate', { ids }),
  bulkDelete: (ids) => api.delete('/api/contacts/bulk-delete', { data: { ids } }),
  deleteAll: () => api.delete('/api/contacts/all'),
  sync: (formData) => api.post('/api/contacts/sync', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  }),
  cleanup: () => api.post('/api/contacts/cleanup'),
  getFamilies: (query) => api.get('/api/contacts/families/search', { params: { q: query } }),
  aiAnalyze: (formData) => api.post('/api/contacts/ai-import/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  }),
  aiCommit: (contacts, padronCompleto = false) =>
    api.post('/api/contacts/ai-import/commit', { contacts, padron_completo: padronCompleto }, { timeout: 120000 }),
  // Las bajas se aplican aparte, ya que el colegio vio la lista y confirmó
  aiBajas: (ids) => api.post('/api/contacts/ai-import/bajas', { ids }, { timeout: 60000 })
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
  downloadLayout: (orgType) =>
    api.get('/api/upload/layout', { params: orgType ? { org_type: orgType } : {}, responseType: 'blob' })
}

// ================================================================
// BROADCASTS
// ================================================================
export const broadcastsAPI = {
  list: (params) => api.get('/api/broadcasts', { params }),
  groups: () => api.get('/api/broadcasts/groups'),
  preview: (group) => api.get('/api/broadcasts/preview', { params: { group } }),
  send: (data) => api.post('/api/broadcasts', data),
  uploadMedia: (formData) => api.post('/api/broadcasts/media', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  })
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
// SETTINGS (tenant self-service)
// ================================================================
export const settingsAPI = {
  get: () => api.get('/api/settings'),
  update: (data) => api.patch('/api/settings', data),
  whatsappStatus: () => api.get('/api/settings/whatsapp-status'),
  updateSPEI: (data) => api.patch('/api/settings/spei', data)
}

// ================================================================
// TEAM (settings/users)
// ================================================================
export const teamAPI = {
  list:         ()   => api.get('/api/settings/users'),
  invite:       (data) => api.post('/api/settings/users', data),
  remove:       (userId) => api.delete(`/api/settings/users/${userId}`),
  // Invitaciones sin usar: viven aparte de los miembros porque todavía no hay
  // usuario que borrar ni al que reenviarle nada por correo.
  reenviarInvitacion: (id) => api.post(`/api/settings/invitaciones/${id}/reenviar`),
  cancelarInvitacion: (id) => api.delete(`/api/settings/invitaciones/${id}`)
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
  resendWelcome: (id) => api.post(`/api/admin/tenants/${id}/resend-welcome`),
  listMessages: (params) => api.get('/api/admin/messages', { params }),
  addUserToTenant: (tenantId, data) => api.post(`/api/admin/tenants/${tenantId}/add-user`, data),
  reenviarActivacion: (id) => api.post(`/api/admin/tenants/${id}/reenviar-activacion`),
  onboard: (data) => api.post('/api/admin/onboard', data),

  // Alta del número de WhatsApp del colegio, paso por paso contra Meta
  numeros: {
    listar:    ()             => api.get('/api/admin/numeros'),
    estado:    (id)           => api.get(`/api/admin/numeros/${id}`),
    agregar:   (data)         => api.post('/api/admin/numeros', data),
    codigo:    (id, metodo)   => api.post(`/api/admin/numeros/${id}/codigo`, { metodo }),
    verificar: (id, codigo)   => api.post(`/api/admin/numeros/${id}/verificar`, { codigo }),
    registrar: (id)           => api.post(`/api/admin/numeros/${id}/registrar`)
  }
}

export default api
