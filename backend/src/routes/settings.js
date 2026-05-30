/**
 * /api/settings — Tenant self-service settings
 * Tenants can read and update their own config (no super-admin required)
 */
import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { inferTenantGuard } from '../middleware/tenantGuard.js'
import supabase from '../services/supabase.js'

const router = Router()

const TENANT_SELECT = 'id,name,display_name,slug,plan,status,admin_phone,payment_link_general,subscription_amount,logo_url,waba_phone_id,waba_business_id,org_type,email,website,address,razon_social,rfc,regimen_fiscal,uso_cfdi,fiscal_street,fiscal_colony,fiscal_city,fiscal_state,fiscal_zip,email_facturacion,contact_grace_period_days,sheets_url,created_at'

// GET /api/settings — return current tenant settings
router.get('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select(TENANT_SELECT)
      .eq('id', req.tenantId)
      .single()

    if (error) throw error
    // Mask waba_token — never send the raw token to the client
    return res.json({ tenant: { ...data, waba_token_set: false } })
  } catch (err) {
    console.error('GET /settings error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// GET /api/settings/whatsapp-status
router.get('/whatsapp-status', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('waba_phone_id,waba_business_id,waba_token')
      .eq('id', req.tenantId)
      .single()

    if (error) throw error
    return res.json({
      configured: !!(data.waba_phone_id && data.waba_token),
      phone_id_set: !!data.waba_phone_id,
      token_set: !!data.waba_token,
      business_id_set: !!data.waba_business_id,
      phone_id_preview: data.waba_phone_id || null
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

// PATCH /api/settings — update safe tenant fields
router.patch('/', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const allowed = [
      'display_name',
      'admin_phone',
      'payment_link_general',
      'logo_url',
      'org_type',
      'email',
      'website',
      'address',
      'waba_phone_id',
      'waba_token',
      'waba_business_id',
      // Contact management
      'contact_grace_period_days',
      // Google Sheets integration
      'sheets_url',
      // Fiscal data
      'razon_social',
      'rfc',
      'regimen_fiscal',
      'uso_cfdi',
      'fiscal_street',
      'fiscal_colony',
      'fiscal_city',
      'fiscal_state',
      'fiscal_zip',
      'email_facturacion'
    ]

    const updates = { updated_at: new Date().toISOString() }
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field] === '' ? null : req.body[field]
      }
    }

    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', req.tenantId)
      .select(TENANT_SELECT)
      .single()

    if (error) throw error
    return res.json({ tenant: data })
  } catch (err) {
    console.error('PATCH /settings error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// ================================================================
// TEAM MANAGEMENT  (max 5 users per tenant)
// ================================================================
const MAX_TEAM = 5

// GET /api/settings/users
router.get('/users', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    const { data: members, error } = await supabase
      .from('tenant_users')
      .select('user_id, role, created_at')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: true })

    if (error) throw error

    const users = await Promise.all(
      members.map(async (m) => {
        try {
          const { data: { user } } = await supabase.auth.admin.getUserById(m.user_id)
          return {
            user_id:    m.user_id,
            role:       m.role,
            created_at: m.created_at,
            email:      user?.email || '',
            name:       user?.user_metadata?.full_name || user?.user_metadata?.name || '',
            is_self:    m.user_id === req.user.id
          }
        } catch {
          return { user_id: m.user_id, role: m.role, created_at: m.created_at, email: '', name: '', is_self: m.user_id === req.user.id }
        }
      })
    )

    return res.json({ users, total: members.length, max: MAX_TEAM })
  } catch (err) {
    console.error('GET /settings/users error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/settings/users — invite team member
router.post('/users', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede agregar usuarios' })
    }

    const { email, role = 'comms', name = '' } = req.body
    if (!email) return res.status(400).json({ error: 'El correo es requerido' })

    const ALLOWED_ROLES = ['owner', 'billing', 'comms']
    if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' })

    // Check team limit
    const { count, error: countErr } = await supabase
      .from('tenant_users')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', req.tenantId)
    if (countErr) throw countErr
    if (count >= MAX_TEAM) {
      return res.status(400).json({ error: `Límite de ${MAX_TEAM} usuarios alcanzado` })
    }

    // Invite user (creates if new, resends if existing)
    let userId
    const frontendUrl = process.env.FRONTEND_URL || 'https://app.kollybry.com'

    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
      data: { full_name: name }
    })

    if (inviteErr) {
      const msg = inviteErr.message?.toLowerCase() || ''
      if (msg.includes('already been registered') || msg.includes('already registered')) {
        // User exists — look up by email
        const { data: { users: allUsers }, error: listErr } = await supabase.auth.admin.listUsers({ perPage: 1000 })
        if (listErr) throw listErr
        const found = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (!found) return res.status(400).json({ error: 'No se pudo encontrar el usuario' })
        userId = found.id
      } else {
        throw inviteErr
      }
    } else {
      userId = invited.user.id
    }

    // Already a member?
    const { data: existing } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', req.tenantId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) return res.status(400).json({ error: 'Este usuario ya es miembro del equipo' })

    // Add to tenant
    const { data: member, error: memberErr } = await supabase
      .from('tenant_users')
      .insert({ tenant_id: req.tenantId, user_id: userId, role })
      .select()
      .single()

    if (memberErr) throw memberErr

    return res.status(201).json({ user: { ...member, email, name } })
  } catch (err) {
    console.error('POST /settings/users error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /api/settings/users/:userId/resend-invite — resend invitation email
router.post('/users/:userId/resend-invite', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede reenviar invitaciones' })
    }

    // Verify member belongs to this tenant
    const { data: member } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', req.tenantId)
      .eq('user_id', req.params.userId)
      .maybeSingle()

    if (!member) return res.status(404).json({ error: 'Usuario no encontrado en este equipo' })

    // Get user email
    const { data: { user } } = await supabase.auth.admin.getUserById(req.params.userId)
    if (!user?.email) return res.status(400).json({ error: 'No se pudo obtener el correo del usuario' })

    const frontendUrl = process.env.FRONTEND_URL || 'https://app.kollybry.com'
    const { error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(user.email, {
      redirectTo: `${frontendUrl}/reset-password`
    })

    // "already registered" is fine — still resends the invite
    if (inviteErr && !inviteErr.message?.toLowerCase().includes('already')) {
      throw inviteErr
    }

    return res.json({ success: true, email: user.email })
  } catch (err) {
    console.error('POST /settings/users/:userId/resend-invite error:', err)
    return res.status(500).json({ error: err.message })
  }
})

// DELETE /api/settings/users/:userId — remove team member
router.delete('/users/:userId', authMiddleware, inferTenantGuard, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && !req.isAdmin) {
      return res.status(403).json({ error: 'Solo el administrador puede eliminar usuarios' })
    }

    if (req.params.userId === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
    }

    const { data: member, error: findErr } = await supabase
      .from('tenant_users')
      .select('user_id, role')
      .eq('tenant_id', req.tenantId)
      .eq('user_id', req.params.userId)
      .maybeSingle()

    if (findErr || !member) return res.status(404).json({ error: 'Usuario no encontrado en este equipo' })

    // Protect last owner
    if (member.role === 'owner') {
      const { count } = await supabase
        .from('tenant_users')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', req.tenantId)
        .eq('role', 'owner')
      if (count <= 1) return res.status(400).json({ error: 'No puedes eliminar al único administrador' })
    }

    const { error: deleteErr } = await supabase
      .from('tenant_users')
      .delete()
      .eq('tenant_id', req.tenantId)
      .eq('user_id', req.params.userId)

    if (deleteErr) throw deleteErr
    return res.json({ success: true })
  } catch (err) {
    console.error('DELETE /settings/users/:userId error:', err)
    return res.status(500).json({ error: err.message })
  }
})

export default router
