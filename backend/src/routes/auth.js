import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import supabase, { getTenantByUser, isAdminUser } from '../services/supabase.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })

    if (error) {
      return res.status(401).json({ error: error.message })
    }

    // Get tenant info
    let tenantInfo = null
    try {
      tenantInfo = await getTenantByUser(data.user.id)
    } catch (tenantErr) {
      // User might not have a tenant yet
      console.warn('Login: no tenant found for user', data.user.id)
    }

    // Check admin
    let admin = false
    try {
      admin = await isAdminUser(data.user.id)
    } catch (adminErr) {
      console.warn('Login: could not check admin status')
    }

    return res.json({
      session: data.session,
      user: data.user,
      tenant: tenantInfo?.tenants || null,
      isAdmin: admin
    })
  } catch (err) {
    console.error('Login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${req.token}` } } }
    )
    await supabaseClient.auth.signOut()
    return res.json({ success: true })
  } catch (err) {
    console.error('Logout error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})


// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    let tenantInfo = null
    try {
      tenantInfo = await getTenantByUser(req.user.id)
    } catch (tenantErr) {
      // no tenant
    }

    let admin = false
    try {
      admin = await isAdminUser(req.user.id)
    } catch (adminErr) {}

    return res.json({
      user: req.user,
      tenant: tenantInfo?.tenants || null,
      tenantRole: tenantInfo?.role || null,
      isAdmin: admin
    })
  } catch (err) {
    console.error('/me error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
