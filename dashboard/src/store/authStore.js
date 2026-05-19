import { create } from 'zustand'
import supabase from '../lib/supabase.js'

const useAuthStore = create((set, get) => ({
  user: null,
  session: null,
  tenant: null,
  tenantRole: null,
  isAdmin: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        set({ isLoading: false, error: error.message })
        return { success: false, error: error.message }
      }

      // Fetch tenant info from backend
      let tenant = null
      let tenantRole = null
      let isAdmin = false

      try {
        const { authAPI } = await import('../lib/api.js')
        const meResponse = await authAPI.me()
        tenant = meResponse.data.tenant
        tenantRole = meResponse.data.tenantRole
        isAdmin = meResponse.data.isAdmin
      } catch (apiErr) {
        console.warn('Could not fetch user info from API:', apiErr.message)
      }

      set({
        user: data.user,
        session: data.session,
        tenant,
        tenantRole,
        isAdmin,
        isLoading: false,
        error: null
      })

      return { success: true }
    } catch (err) {
      set({ isLoading: false, error: err.message })
      return { success: false, error: err.message }
    }
  },

  logout: async () => {
    set({ isLoading: true })
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('Logout error:', err.message)
    }
    set({
      user: null,
      session: null,
      tenant: null,
      tenantRole: null,
      isAdmin: false,
      isLoading: false,
      error: null
    })
  },

  initialize: async () => {
    set({ isLoading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        set({ isLoading: false })
        return
      }

      let tenant = null
      let tenantRole = null
      let isAdmin = false

      try {
        const { authAPI } = await import('../lib/api.js')
        const meResponse = await authAPI.me()
        tenant = meResponse.data.tenant
        tenantRole = meResponse.data.tenantRole
        isAdmin = meResponse.data.isAdmin
      } catch (apiErr) {
        console.warn('Could not fetch user info from API:', apiErr.message)
      }

      set({
        user: session.user,
        session,
        tenant,
        tenantRole,
        isAdmin,
        isLoading: false
      })
    } catch (err) {
      console.error('Auth initialization error:', err)
      set({ isLoading: false })
    }
  },

  updateTenant: (tenant) => set({ tenant }),

  clearError: () => set({ error: null })
}))

// Listen for Supabase auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    useAuthStore.setState({
      user: null,
      session: null,
      tenant: null,
      tenantRole: null,
      isAdmin: false,
      isLoading: false
    })
  } else if (event === 'TOKEN_REFRESHED' && session) {
    useAuthStore.setState({ session, user: session.user })
  }
})

export default useAuthStore
