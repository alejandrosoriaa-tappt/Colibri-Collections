import axios from 'axios'
import supabase from './supabase.js'

const env = window.__env__ || {}
const mainBaseURL = env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: mainBaseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// CRM runs on its own Railway service; falls back to the main backend if unset
const crmApi = axios.create({
  baseURL: env.VITE_CRM_API_BASE_URL || import.meta.env.VITE_CRM_API_BASE_URL || mainBaseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: add auth token
const attachToken = async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
}

api.interceptors.request.use(attachToken, (error) => Promise.reject(error))
crmApi.interceptors.request.use(attachToken, (error) => Promise.reject(error))

// Response interceptor: handle auth errors
const handleAuthError = (instance) => async (error) => {
  if (error.response?.status === 401) {
    // Attempt token refresh
    const { data: { session } } = await supabase.auth.refreshSession()
    if (session) {
      error.config.headers.Authorization = `Bearer ${session.access_token}`
      return instance.request(error.config)
    }
    // If refresh fails, sign out
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  return Promise.reject(error)
}

api.interceptors.response.use((response) => response, handleAuthError(api))
crmApi.interceptors.response.use((response) => response, handleAuthError(crmApi))

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
  getInvoices: (id, params) => api.get(`/api/campaigns/${id}/invoices`, { params }),
  addContacts: (id, data) => api.post(`/api/campaigns/${id}/add-contacts`, data),
  populateFromGroup: (id) => api.post(`/api/campaigns/${id}/populate-from-group`),
  sendMessage: (campaignId, msgId) => api.post(`/api/campaigns/${campaignId}/messages/${msgId}/send`)
}

// ================================================================
// CONTACTS
// ================================================================
export const contactsAPI = {
  list: (params) => api.get('/api/contacts', { params }),
  groups: () => api.get('/api/contacts/groups'),
  get: (id) => api.get(`/api/contacts/${id}`),
  create: (data) => api.post('/api/contacts', data),
  update: (id, data) => api.patch(`/api/contacts/${id}`, data),
  deactivate: (id) => api.patch(`/api/contacts/${id}/deactivate`),
  reactivate: (id) => api.patch(`/api/contacts/${id}/reactivate`),
  bulkDeactivate: (ids) => api.post('/api/contacts/bulk-deactivate', { ids }),
  bulkReactivate: (ids) => api.post('/api/contacts/bulk-reactivate', { ids }),
  bulkDelete: (ids) => api.delete('/api/contacts/bulk-delete', { data: { ids } }),
  sync: (formData) => api.post('/api/contacts/sync', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000
  }),
  cleanup: () => api.post('/api/contacts/cleanup'),
  getFamilies: (query) => api.get('/api/contacts/families/search', { params: { q: query } })
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
  downloadLayout: (orgType) =>
    api.get('/api/upload/layout', { params: orgType ? { org_type: orgType } : {}, responseType: 'blob' })
}

// ================================================================
// MESSAGES
// ================================================================
export const messagesAPI = {
  list: (params) => api.get('/api/messages', { params })
}

// ================================================================
// GOOGLE SHEETS
// ================================================================
export const sheetsAPI = {
  preview: (url) => api.get('/api/sheets/preview', { params: { url } }),
  import:  (data) => api.post('/api/sheets/import', data)
}

// ================================================================
// BROADCASTS
// ================================================================
export const broadcastsAPI = {
  list: (params) => api.get('/api/broadcasts', { params }),
  groups: () => api.get('/api/broadcasts/groups'),
  preview: (group) => api.get('/api/broadcasts/preview', { params: { group } }),
  send: (data) => api.post('/api/broadcasts', data)
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
  list:         ()         => api.get('/api/settings/users'),
  invite:       (data)     => api.post('/api/settings/users', data),
  remove:       (userId)   => api.delete(`/api/settings/users/${userId}`),
  resendInvite: (userId)   => api.post(`/api/settings/users/${userId}/resend-invite`)
}

// ================================================================
// CRM
// ================================================================
export const crmAPI = {
  stats:              ()           => crmApi.get('/api/crm/stats'),
  upcomingFollowups:  ()           => crmApi.get('/api/crm/followups/upcoming'),
  listClients:        (params)     => crmApi.get('/api/crm/clients', { params }),
  getClient:          (id)         => crmApi.get(`/api/crm/clients/${id}`),
  createClient:       (data)       => crmApi.post('/api/crm/clients', data),
  updateClient:       (id, data)   => crmApi.put(`/api/crm/clients/${id}`, data),
  deleteClient:       (id)         => crmApi.delete(`/api/crm/clients/${id}`),
  logActivity:        (id, data)   => crmApi.post(`/api/crm/clients/${id}/activities`, data),
  createFollowup:     (id, data)   => crmApi.post(`/api/crm/clients/${id}/followups`, data),
  updateFollowup:     (id, data)   => crmApi.put(`/api/crm/followups/${id}`, data),
  deleteFollowup:     (id)         => crmApi.delete(`/api/crm/followups/${id}`),
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
  onboard: (data) => api.post('/api/admin/onboard', data)
}

export default api
