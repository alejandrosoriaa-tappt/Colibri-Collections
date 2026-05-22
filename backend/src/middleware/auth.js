import { createClient } from '@supabase/supabase-js'

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const bypassTenantId = process.env.DEV_BYPASS_TENANT_ID

    // Dev bypass: if env var is set and no real token, skip Supabase auth
    if (bypassTenantId && (!authHeader || authHeader === 'Bearer ')) {
      req.user = { id: 'dev-bypass', email: 'dev@colibri.local' }
      req.devBypassTenantId = bypassTenantId
      return next()
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    const token = authHeader.split(' ')[1]

    const { data: { user }, error } = await supabaseAnon.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = user
    req.token = token
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(401).json({ error: 'Authentication failed' })
  }
}
