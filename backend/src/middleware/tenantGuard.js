import supabase from '../services/supabase.js'

export function tenantGuard(paramName = 'tenantId') {
  return async function (req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Dev bypass
      if (req.devBypassTenantId) {
        req.tenantId = req.devBypassTenantId
        req.isAdmin = false
        return next()
      }

      const tenantId =
        req.params[paramName] ||
        req.params.id ||
        req.body.tenant_id ||
        req.query.tenant_id

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' })
      }

      // Check if user is an admin (admins bypass tenant restriction)
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', req.user.id)
        .maybeSingle()

      if (adminData) {
        req.tenantId = tenantId
        req.isAdmin = true
        return next()
      }

      // Check tenant_users membership
      const { data: membership, error } = await supabase
        .from('tenant_users')
        .select('id, role, tenant_id')
        .eq('user_id', req.user.id)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (error) {
        console.error('tenantGuard DB error:', error)
        return res.status(500).json({ error: 'Internal server error' })
      }

      if (!membership) {
        return res.status(403).json({ error: 'Access denied to this tenant' })
      }

      req.tenantId = tenantId
      req.tenantRole = membership.role
      req.isAdmin = false
      next()
    } catch (err) {
      console.error('tenantGuard error:', err)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export async function inferTenantGuard(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Dev bypass: tenant already known from auth middleware
    if (req.devBypassTenantId) {
      req.tenantId = req.devBypassTenantId
      req.isAdmin = false
      return next()
    }

    // Check if admin
    const { data: adminData } = await supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', req.user.id)
      .maybeSingle()

    if (adminData) {
      req.isAdmin = true
      // For admins, tenantId must be explicitly provided or inferred
      const tenantId = req.params.tenantId || req.body.tenant_id || req.query.tenant_id
      req.tenantId = tenantId
      return next()
    }

    // Look up user's tenant
    const { data: membership, error } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', req.user.id)
      .single()

    if (error || !membership) {
      return res.status(403).json({ error: 'User has no associated tenant' })
    }

    req.tenantId = membership.tenant_id
    req.tenantRole = membership.role
    req.isAdmin = false
    next()
  } catch (err) {
    console.error('inferTenantGuard error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
